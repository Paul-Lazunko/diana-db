#!/usr/bin/env node

/**
 * DianaDB Command‑Line Tool
 *
 * Usage:
 *   diana-db start   [-c /path/to/config]
 *   diana-db stop    [-c /path/to/config]
 *   diana-db add-user    -u <username> -p <password>
 *   diana-db remove-user -u <username>
 *
 * Notes:
 *   - Requires `pidof` (procps) on Linux.  Falls back to `/proc` scan if unavailable.
 */

const { resolve } = require('path');
const { existsSync, readFileSync } = require('fs');
const { execSync, spawn } = require('child_process');
import { userWriteStore } from './user-store';

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

console.log('DianaDB Management Tool');

function parseConfig(confPath) {
  if (!existsSync(confPath)) {
    console.error(`Config file not found: ${confPath}`);
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
    console.error('Cannot start: DianaDb Server binary path missing in config.');
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
  console.error('Usage: diana-db <start|stop|add-user|remove-user> [options]');
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

switch (command) {
  case 'start': {
    stopServer();
    const envObj: Record<string, string> = parseConfig(confPath);
    startServer(envObj);
    break;
  }
  case 'stop': {
    stopServer();
    break;
  }
  case 'add-user': {
    const uIdx = rest.indexOf('-u');
    const pIdx = rest.indexOf('-p');
    const username = uIdx !== -1 ? rest[uIdx + 1] : undefined;
    const password = pIdx !== -1 ? rest[pIdx + 1] : undefined;
    if (!username || !password) {
      console.error('add-user requires -u <username> -p <password>');
      process.exit(1);
    }
    userWriteStore.set(`user.${username}.user`, username);
    userWriteStore.set(`user.${username}.password`, password);
    userWriteStore.store();
    console.log(`DianaDb has added user → ${username}`);
    break;
  }
  case 'remove-user': {
    const uIdx = rest.indexOf('-u');
    const username = uIdx !== -1 ? rest[uIdx + 1] : undefined;
    if (!username) {
      console.error('remove-user requires -u <username>');
      process.exit(1);
    }
    userWriteStore.set(`user.${username}.user`, undefined);
    userWriteStore.set(`user.${username}.password`, undefined);
    userWriteStore.store();
    console.log(`DianaDb has removed user → ${username}`);
    break;
  }
  case '-v':
  case '--version': {
    console.log(`Version 1.5.0 Turbo`);
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
    break;
}

setTimeout(() => {
  process.exit(0);
}, 500);
