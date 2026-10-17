/**
 * Loads the CLI config file into process.env.
 * Imported first by the CLI, so @config and the store/restore strategies (which read process.env
 * when their modules load) see the same paths and S3 settings as the config file.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export const DEFAULT_CONF = '/etc/diana-db/diana-db.conf';

export const envMapping = {
  binary_path: 'BIN_PATH',
  port: 'DIANA_DB_PORT',
  dump_create_interval: 'DIANA_DB_DUMP_CREATE_INTERVAL',
  logger: 'DIANA_DB_LOGGER',
  logs_directory: 'DIANA_DB_LOG_DIRECTORY',
  dump_directory: 'DIANA_DB_DUMP_DIRECTORY',
  logs_ttl_value: 'DIANA_DB_LOG_TTL',
  current_dump_name: 'DIANA_DB_DUMP_CURRENT_NAME',
  backup_name: 'DIANA_DB_BACKUP_NAME',
  transactions_min_auto_rollback_value: 'DIANA_DB_TRANSACTION_AUTOROLLBACK_MIN',
  transactions_max_auto_rollback_value: 'DIANA_DB_TRANSACTION_AUTOROLLBACK_MAX',
  store_strategy: 'DIANA_DB_STORE_STRATEGY',
  store_s3_endpoint: 'DIANA_DB_STORE_S3_ENDPOINT',
  store_s3_bucket: 'DIANA_DB_STORE_S3_BUCKET',
  store_s3_region: 'DIANA_DB_STORE_S3_REGION',
  store_s3_access_key_id: 'DIANA_DB_STORE_S3_ACCESS_KEY_ID',
  store_s3_secret_access_key: 'DIANA_DB_STORE_S3_SECRET_ACCESS_KEY',
  ssl_cert_file: 'DIANA_DB_SSL_CERT_FILE',
  ssl_key_file: 'DIANA_DB_SSL_KEY_FILE',
  ssl_ca_file: 'DIANA_DB_SSL_CA_FILE',
  ssl_request_cert: 'DIANA_DB_SSL_REQUEST_CERT',
  ssl_reject_unauthorized: 'DIANA_DB_SSL_REJECT_UNAUTHORISED',
};

export function resolveConfPath(args: string[]): string {
  let confPath = DEFAULT_CONF;
  const cIdx = args.indexOf('-c');
  const cIdxLong = args.indexOf('--config');
  if (cIdx !== -1 && args[cIdx + 1]) {
    confPath = resolve(args[cIdx + 1]);
  }
  if (cIdxLong !== -1 && args[cIdxLong + 1]) {
    confPath = resolve(args[cIdxLong + 1]);
  }
  return confPath;
}

export function parseConfigFile(confPath: string): Record<string, any> {
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

const confPath: string = resolveConfPath(process.argv.slice(2));
if (existsSync(confPath)) {
  const env = parseConfigFile(confPath);
  for (const key in env) {
    process.env[key] = String(env[key]);
  }
}
