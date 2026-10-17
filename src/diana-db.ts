#!/usr/bin/env node

/**
 DianaDB Command‑Line Tool

 Usage:
   diana-db start   [-c /path/to/config]
   diana-db stop    [-c /path/to/config]
   diana-db add-user    -u <username> -p <password>
   diana-db grant-access    -u <username> -db <db:level>
   diana-db remove-access    -u <username> -db <db>
   diana-db remove-user -u <username>
   diana-db list-backups
   diana-db create-backup -n <name>
   diana-db apply-backup -n <name>

 Notes:
   - Requires `pidof` (procps) on Linux.  Falls back to `/proc` scan if unavailable.
 */

import {
  readdirSync,
  existsSync,
  readFileSync,
  copyFileSync,
  accessSync,
  constants,
  unlinkSync
} from 'fs';
import { execSync, spawn } from 'child_process';
import { Datanautics } from 'datanautics';

// Must stay the first import: it loads the config file into process.env.
import { parseConfigFile, resolveConfPath } from './cli-env';

import { deriveUserKey } from '@user-store';
import { config } from '@config';
import { DEFAULT_DIANA_DB_USER_FILE_NAME, StoreStrategy, VERSION } from '@const';
import { restoreStrategies } from '@restore-strategy';
import { storeStrategies } from '@store-strategy';
import { logger } from '@logger';
import { ErrorFactory } from '@error';
import { S3Driver } from '@s3-driver';
import { touch } from '@helper';


const userStore: Datanautics = new Datanautics({});

const SERVER_PROC_NAME = 'diana-db-server';

function echoInfo() {
  console.log(`DianaDB Management Tool ${VERSION}`);
}

function warn(error: string) {
  console.warn(`\u26a0 ${error}`);
}

function parseConfig(confPath: string) {
  if (!existsSync(confPath)) {
    warn(`Config file not found: ${confPath}`);
    process.exit(1);
  }
  return parseConfigFile(confPath);
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function getServerPids(): string {
  try {
    return execSync(`pidof ${SERVER_PROC_NAME}`, {
      stdio: [
        'ignore',
        'pipe',
        'ignore',
      ],
    })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

const STOP_TIMEOUT_MS = 30000;

/** SIGTERM lets the server save its databases; SIGKILL is only a last resort after STOP_TIMEOUT_MS. */
function stopServer() {
  const pid: string = getServerPids();
  if (!pid) {
    console.log('No running instance detected.');
    return;
  }
  console.log(`Stopping DianaDB Server (PID ${pid})…`);
  execSync(`kill -TERM ${pid}`);
  const deadline: number = Date.now() + STOP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!getServerPids()) {
      return;
    }
    sleep(200);
  }
  const remaining: string = getServerPids();
  if (remaining) {
    warn(`Server didn't stop within ${STOP_TIMEOUT_MS / 1000}s, killing it. Unsaved changes may be lost.`);
    execSync(`kill -9 ${remaining}`);
  }
}

function startServer(env) {
  const binPath = env.BIN_PATH;
  if (!binPath) {
    warn('Cannot start: DianaDb Server binary path missing in config.');
    process.exit(1);
  }
  console.log(`Launching ${binPath}…`);
  for (const key in env) {
    console.log(`${key}: ${env[key]}`);
  }
  const child = spawn(binPath, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, ...env },
  });
  child.unref();
  console.log(`Server started (PID ${child.pid}).`);
}

// Only the derived key is stored, never the plaintext password.
function addUser(username: string, password: string) {
  userStore.set(`user.${username}.user`, username);
  userStore.set(`user.${username}.key`, deriveUserKey(password));
  if (userStore.get(`user.${username}.password`) !== undefined) {
    userStore.set(`user.${username}.password`, undefined);
  }
}

function grantAccess(username: string, db: string, access: string) {
  userStore.set(`user.${username}.db.${db}`, access);
}
function removeAccess(username: string, db: string) {
  userStore.set(`user.${username}.db.${db}`, undefined);
}
function removeUser(username: string) {
  userStore.set(`user.${username}`, undefined);
}

const argv = process.argv.slice(2);
if (argv.length === 0) {
  warn('Usage: diana-db <start|stop|add-user|remove-user> [options]');
  process.exit(0);
}

const [
  command,
  ...rest
] = argv;
const confPath: string = resolveConfPath(rest);

async function main() {
  try {
    await touch(`${config.dumpDirectory}/${config.currentDumpName}`);
    await touch(`${config.dumpDirectory}/${DEFAULT_DIANA_DB_USER_FILE_NAME}`);

    const envObj: Record<string, string> = parseConfig(confPath);
    let s3Driver: S3Driver;


    const s3Options = {
      bucket: envObj.DIANA_DB_STORE_S3_BUCKET,
      endpoint: envObj.DIANA_DB_STORE_S3_ENDPOINT,
      region: envObj.DIANA_DB_STORE_S3_REGION,
      credentials: {
        accessKeyId: envObj.DIANA_DB_STORE_S3_ACCESS_KEY_ID,
        secretAccessKey: envObj.DIANA_DB_STORE_S3_SECRET_ACCESS_KEY,
      },
    }

    if (envObj.DIANA_DB_STORE_STRATEGY === StoreStrategy.S3) {
      s3Driver = new S3Driver(s3Options);
    }

    switch (envObj.DIANA_DB_STORE_STRATEGY) {
      case StoreStrategy.LOCAL:
        await restoreStrategies.local.restore(userStore, `${envObj.DIANA_DB_DUMP_DIRECTORY}/${DEFAULT_DIANA_DB_USER_FILE_NAME}`).catch((e) => {
          logger.error(ErrorFactory.requestError(e.message))
        });
        break;
      case StoreStrategy.S3:
        await restoreStrategies.s3.restore(userStore, DEFAULT_DIANA_DB_USER_FILE_NAME).catch((e) => {
          logger.error(ErrorFactory.requestError(e.message))
        });;
        break;
    }

    switch (command) {
      case 'start': {
        echoInfo();
        stopServer();
        startServer(envObj);
        break;
      }
      case 'stop': {
        echoInfo();
        stopServer();
        console.log('Stopped the Server');
        break;
      }
      case 'add-user': {
        echoInfo();
        const uIdx = rest.indexOf('-u');
        const pIdx = rest.indexOf('-p');
        const username = uIdx !== -1 ? rest[uIdx + 1] : undefined;
        const password = pIdx !== -1 ? rest[pIdx + 1] : undefined;
        if (!username || !password) {
          warn('add-user requires -u <username> -p <password>');
          process.exit(1);
        }
        addUser(username, password);
        console.log(`Added user "${username}"`);
        break;
      }
      case 'grant-access': {
        echoInfo();
        const uIdx = rest.indexOf('-u');
        const dbIdx = rest.indexOf('-db');
        const username = uIdx !== -1 ? rest[uIdx + 1] : undefined;
        const dbAccess = dbIdx !== -1 ? rest[dbIdx + 1] : undefined;
        if (!username || !dbAccess) {
          warn('grant-access requires -u <username> -db <database:accessLevel>');
          process.exit(1);
        }
        if (!/^[\w-]+:[123]$/.test(dbAccess)) {
          warn('grant-access -db parameter should be <database_name:1|2|3>');
          process.exit(1);
        }
        const [
          db,
          access,
        ] = dbAccess.split(':');
        grantAccess(username, db, access);
        console.log(`Granted access to database "${db}" level ${access} for user "${username}"`);
        break;
      }
      case 'remove-access': {
        echoInfo();
        const uIdx = rest.indexOf('-u');
        const dbIdx = rest.indexOf('-db');
        const username = uIdx !== -1 ? rest[uIdx + 1] : undefined;
        const db = dbIdx !== -1 ? rest[dbIdx + 1] : undefined;
        if (!username || !db) {
          warn('remove-access requires -u <username> -db <database>');
          process.exit(1);
        }
        removeAccess(username, db);
        console.log(`Removed access to database "${db}" for user "${username}"`);
        break;
      }
      case 'remove-user': {
        echoInfo();
        const uIdx = rest.indexOf('-u');
        const username = uIdx !== -1 ? rest[uIdx + 1] : undefined;
        if (!username) {
          warn('remove-user requires -u <username>');
          process.exit(1);
        }
        removeUser(username);
        console.log(`Removed user "${username}"`);
        break;
      }
      case '-v':
      case '--version': {
        echoInfo();
        break;
      }
      case '-s':
      case '--settings': {
        echoInfo();
        const content = readFileSync(confPath)
        console.log(content.toString('utf8'));
        break;
      }
      case 'list-backups': {
        echoInfo();
        if (envObj.DIANA_DB_STORE_STRATEGY === 's3') {
          const objects = await s3Driver?.listObjects();
          console.log(
            objects
              .filter(
                (key: string) =>
                  ![
                    'users',
                    'current.didb',
                  ].includes(key),
              )
              .join('\r\n'),
          );
        } else {
          const backups = readdirSync(envObj.DIANA_DB_DUMP_DIRECTORY);
          console.log(
            backups
              .filter(
                (filename: string) =>
                  ![
                    'users',
                    'current.didb',
                  ].includes(filename),
              )
              .join('\r\n'),
          );
        }
        break;
      }
      case 'create-backup': {
        echoInfo();
        const nIdx = rest.indexOf('-n');
        const nameString = nIdx !== -1 ? rest[nIdx + 1] : undefined;
        const name = nameString?.replace(/\.didb$/, '');
        if (!name) {
          warn('create-backup requires -n <backup_name>');
          process.exit(1);
        }
        if (envObj.DIANA_DB_STORE_STRATEGY === 's3') {
          await s3Driver?.copyObject(`${name}.didb`, 'current.didb');
          console.log(`${name}.didb created`);
        } else {
          copyFileSync(
            `${envObj.DIANA_DB_DUMP_DIRECTORY}/current.didb`,
            `${envObj.DIANA_DB_DUMP_DIRECTORY}/${name}.didb`,
          );
          console.log(`${envObj.DIANA_DB_DUMP_DIRECTORY}/${name}.didb created`);
        }
        break;
      }
      case 'apply-backup': {
        echoInfo();
        const envObj: Record<string, string> = parseConfig(confPath);
        const nIdx = rest.indexOf('-n');
        const nameString = nIdx !== -1 ? rest[nIdx + 1] : undefined;
        const name = nameString?.replace(/\.didb$/, '');
        if (!name) {
          warn('create-backup requires -n <backup_name>');
          process.exit(1);
        }

        let pid: string;
        try {
          pid = execSync(`pidof ${SERVER_PROC_NAME}`, {
            stdio: [
              'ignore',
              'pipe',
              'ignore',
            ],
          })
            .toString()
            .trim();
        } catch {
          //
        }
        if (pid) {
          warn(`DianaDb Server should be stopped before the applying of the backup`);
          process.exit(1);
        }

        if (envObj.DIANA_DB_STORE_STRATEGY === 's3') {
          const backupKey = `${name}.didb`;
          const exists = await s3Driver?.objectExists(backupKey);
          if (!exists) {
            warn(`Backup ${backupKey} doesn't exist`);
            process.exit(1);
          }
          await s3Driver?.copyObject('current.didb', backupKey);
          console.log(`Backup applied ${backupKey}`);
        } else {
          const backupPath: string = `${envObj.DIANA_DB_DUMP_DIRECTORY}/${name}.didb`;
          const currentPath: string = `${envObj.DIANA_DB_DUMP_DIRECTORY}/current.didb`;
          try {
            accessSync(currentPath, constants.W_OK);
          } catch {
            warn(`Couldn't write the file ${currentPath}`);
            process.exit(1);
          }
          if (!existsSync(backupPath)) {
            warn(`File ${backupPath} doesn't exist`);
            process.exit(1);
          }
          try {
            accessSync(backupPath, constants.R_OK);
          } catch {
            console.warn(`Couldn't read the file ${backupPath}`);
            process.exit(1);
          }
          copyFileSync(backupPath, `${envObj.DIANA_DB_DUMP_DIRECTORY}/current.didb`);
          console.log(`Backup applied ${envObj.DIANA_DB_DUMP_DIRECTORY}/${name}.didb`);
        }
        break;
      }

      case 'remove-backup': {
        echoInfo();
        const nIdx = rest.indexOf('-n');
        const nameString = nIdx !== -1 ? rest[nIdx + 1] : undefined;
        const name = nameString?.replace(/\.didb$/, '');
        if (!name) {
          warn('remove-backup requires -n <backup_name>');
          process.exit(1);
        }

        if (envObj.DIANA_DB_STORE_STRATEGY === 's3') {
          const backupKey = `${name}.didb`;
          const exists = await s3Driver?.objectExists(backupKey);
          if (!exists) {
            warn(`Backup ${backupKey} doesn't exist`);
            process.exit(1);
          }
          await s3Driver?.deleteObject(backupKey);
          console.log(`Backup removed ${backupKey}`);
        } else {
          const backupPath: string = `${envObj.DIANA_DB_DUMP_DIRECTORY}/${name}.didb`;
          if (!existsSync(backupPath)) {
            warn(`Backup ${backupPath} doesn't exist`);
            process.exit(1);
          }
          try {
            accessSync(backupPath, constants.W_OK);
          } catch {
            warn(`Couldn't remove the file ${backupPath}`);
            process.exit(1);
          }
          unlinkSync(backupPath);
          console.log(`Backup removed ${backupPath}`);
        }
        break;
      }

      default:
        warn(`Unknown command ${command}`);
        process.exit(1);
        break;
    }


    switch (config.storeStrategy) {
      case StoreStrategy.LOCAL:
        await storeStrategies.local.store(userStore, `${config.dumpDirectory}/${DEFAULT_DIANA_DB_USER_FILE_NAME}`);
        break;
      case StoreStrategy.S3:
        await storeStrategies.s3.store(userStore, DEFAULT_DIANA_DB_USER_FILE_NAME);
        break;
    }


  } catch (e) {
    warn(e.message);
  }
}
main()
  .catch(console.error)
  .finally(() => {
    process.exit(0);
  });
