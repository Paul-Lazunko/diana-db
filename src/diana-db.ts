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

import { readdirSync, existsSync, readFileSync, copyFileSync, accessSync, constants, statSync } from 'fs';
import { resolve } from 'path';
import { execSync, spawn } from 'child_process';

// const { version } = require('../../package.json');
const version = '1.6.0';
import { userWriteStore } from '@user-store';

const envMapping = {
  binary_path: 'BIN_PATH',
  port: 'DIANA_DB_PORT',
  dump_create_interval: 'DIANA_DB_DUMP_CREATE_INTERVAL',
  logs_directory: 'DIANA_DB_LOG_DIRECTORY',
  dump_directory: 'DIANA_DB_DUMP_DIRECTORY',
  logs_ttl_value: 'DIANA_DB_LOG_TTL',
  current_dump_name: 'DIANA_DB_DUMP_CURRENT_NAME',
  transactions_min_auto_rollback_value: 'DIANA_DB_TRANSACTION_AUTOROLLBACK_MIN',
  transactions_max_auto_rollback_value: 'DIANA_DB_TRANSACTION_AUTOROLLBACK_MAX',
  ssl_cert: 'DIANA_DB_SSL_CERT',
  ssl_key: 'DIANA_DB_SSL_KEY',
};

const DEFAULT_CONF = '/etc/diana-db/diana-db.conf';
const SERVER_PROC_NAME = 'diana-db-server';

function echoName() {
  console.log(`DianaDB Management Tool ${version}`);
}

function warn(error: string) {
  console.warn(`\u26a0 ${error}`);
}

function parseConfig(confPath: string) {
  if (!existsSync(confPath)) {
    warn(`Config file not found: ${confPath}`);
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(confPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) {
      continue;
    }
    const idx = t.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = t.slice(0, idx).trim();
    const value = t
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['";]?$/g, '');
    if (Object.prototype.hasOwnProperty.apply(envMapping, [key])) {
      if (/^\d+$/.test(value)) {
        env[envMapping[key]] = parseInt(value, 10);
      } else {
        env[envMapping[key]] = value;
      }
    }
  }
  return env;
}

function stopServer() {
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
    console.log('No running instance detected.');
    return;
  }
  if (pid) {
    console.log(`Stopping DianaDB Server (PID ${pid})…`);
    execSync(`kill -9 ${pid}`);
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

const argv = process.argv.slice(2);
if (argv.length === 0) {
  warn('Usage: diana-db <start|stop|add-user|remove-user> [options]');
  process.exit(0);
}

const [
  command,
  ...rest
] = argv;
let confPath = DEFAULT_CONF;

const cIdx = rest.indexOf('-c');
const cIdxLong = rest.indexOf('--config');
if (cIdx !== -1 && rest[cIdx + 1]) {
  confPath = resolve(rest[cIdx + 1]);
}
if (cIdxLong !== -1 && rest[cIdxLong + 1]) {
  confPath = resolve(rest[cIdxLong + 1]);
}
try {
  switch (command) {
    case 'start': {
      echoName();
      stopServer();
      const envObj: Record<string, string> = parseConfig(confPath);
      startServer(envObj);
      break;
    }
    case 'stop': {
      echoName();
      stopServer();
      console.log('Stopped the Server');
      break;
    }
    case 'add-user': {
      echoName();
      const uIdx = rest.indexOf('-u');
      const pIdx = rest.indexOf('-p');
      const username = uIdx !== -1 ? rest[uIdx + 1] : undefined;
      const password = pIdx !== -1 ? rest[pIdx + 1] : undefined;
      if (!username || !password) {
        warn('add-user requires -u <username> -p <password>');
        process.exit(1);
      }
      userWriteStore.set(`user.${username}.user`, username);
      userWriteStore.set(`user.${username}.password`, password);
      userWriteStore.store();
      console.log(`Added user "${username}"`);
      break;
    }
    case 'grant-access': {
      echoName();
      const uIdx = rest.indexOf('-u');
      const dbIdx = rest.indexOf('-db');
      const username = uIdx !== -1 ? rest[uIdx + 1] : undefined;
      const dbAccess = dbIdx !== -1 ? rest[dbIdx + 1] : undefined;
      if (!username || !dbIdx) {
        warn('grant-access requires -u <username> -db <database:accessLevel>');
        process.exit(1);
      }
      if (!/[\w_\-]+:[1,2,3]{1}$/.test(dbAccess)) {
        warn('grant-access -db parameter should be <database_name:1|2|3>');
        process.exit(1);
      }
      const [
        db,
        access,
      ] = dbAccess.split(':');
      userWriteStore.set(`user.${username}.db.${db}`, access);
      userWriteStore.store();
      console.log(`Granted access to database "${db}" level ${access} for user "${username}"`);
      break;
    }
    case 'remove-access': {
      echoName();
      const uIdx = rest.indexOf('-u');
      const dbIdx = rest.indexOf('-db');
      const username = uIdx !== -1 ? rest[uIdx + 1] : undefined;
      const db = dbIdx !== -1 ? rest[dbIdx + 1] : undefined;
      if (!username || !db) {
        warn('remove-access requires -u <username> -db <database>');
        process.exit(1);
      }
      userWriteStore.set(`user.${username}.db.${db}`, undefined);
      userWriteStore.store();
      console.log(`Removed access to database "${db}" for user "${username}"`);
      break;
    }
    case 'remove-user': {
      echoName();
      const uIdx = rest.indexOf('-u');
      const username = uIdx !== -1 ? rest[uIdx + 1] : undefined;
      if (!username) {
        warn('remove-user requires -u <username>');
        process.exit(1);
      }
      userWriteStore.set(`user.${username}`, undefined);
      userWriteStore.store();
      console.log(`Removed user "${username}"`);
      break;
    }
    case '-v':
    case '--version': {
      echoName();
      break;
    }
    case 'list-backups': {
      echoName();
      const envObj: Record<string, string> = parseConfig(confPath);
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
      break;
    }
    case 'create-backup': {
      echoName();
      const envObj: Record<string, string> = parseConfig(confPath);
      const nIdx = rest.indexOf('-n');
      const name = nIdx !== -1 ? rest[nIdx + 1] : undefined;
      if (!name) {
        warn('create-backup requires -n <backup_name>');
        process.exit(1);
      }
      copyFileSync(`${envObj.DIANA_DB_DUMP_DIRECTORY}/current.didb`, `${envObj.DIANA_DB_DUMP_DIRECTORY}/${name}.didb`);
      console.log(`${envObj.DIANA_DB_DUMP_DIRECTORY}/${name}.didb`);
      break;
    }
    case 'apply-backup': {
      echoName();
      const envObj: Record<string, string> = parseConfig(confPath);
      const nIdx = rest.indexOf('-n');
      const name = nIdx !== -1 ? rest[nIdx + 1] : undefined;
      if (!name) {
        warn('create-backup requires -n <backup_name>');
        process.exit(1);
      }
      const backupPath: string = `${envObj.DIANA_DB_DUMP_DIRECTORY}/${name}.didb`;
      const currentPath: string = `${envObj.DIANA_DB_DUMP_DIRECTORY}/current.didb`;
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
      break;
    }

    default:
      warn(`Unknown command ${command}`);
      process.exit(1);
      break;
  }
} catch (e) {
  warn(e.message);
}

setTimeout(() => {
  process.exit(0);
}, 500);
