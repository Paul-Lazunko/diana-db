import {
  DEFAULT_DIANA_DB_BACKUP_NAME,
  DEFAULT_DIANA_DB_DUMP_CREATE_INTERVAL,
  DEFAULT_DIANA_DB_DUMP_CURRENT_NAME,
  DEFAULT_DIANA_DB_DUMP_DIRECTORY,
  DEFAULT_DIANA_DB_LOG_DIRECTORY,
  DEFAULT_DIANA_DB_LOG_TTL,
  DEFAULT_DIANA_DB_PORT,
} from '@const';
import * as console from 'console';

const data: { [key: string]: string | number } = process.env;

for (const variable in data) {
  try {
    if (/^\d+$/.test(data[variable].toString())) {
      data[variable] = parseInt(data[variable].toString(), 10);
    }
  } catch (e) {
    console.error(e);
  }
}

export const config: Record<string, any> = {
  port: data.DIANA_DB_PORT || DEFAULT_DIANA_DB_PORT,
  dumpCreateInterval: data.DIANA_DB_DUMP_CREATE_INTERVAL || DEFAULT_DIANA_DB_DUMP_CREATE_INTERVAL,
  dumpDirectory: process.env.DIANA_DB_DUMP_DIRECTORY || DEFAULT_DIANA_DB_DUMP_DIRECTORY,
  logsDirectory: process.env.DIANA_DB_LOG_DIRECTORY || DEFAULT_DIANA_DB_LOG_DIRECTORY,
  logsTtlValue: data.DIANA_DB_LOG_TTL || DEFAULT_DIANA_DB_LOG_TTL,
  currentDumpName: process.env.DIANA_DB_DUMP_CURRENT_NAME || DEFAULT_DIANA_DB_DUMP_CURRENT_NAME,
  backupName: process.env.DIANA_DB_BACKUP_NAME || DEFAULT_DIANA_DB_BACKUP_NAME,
  transactionsMinAutoRollBackValue: data.DIANA_DB_TRANSACTION_AUTOROLLBACK_MIN || 1000,
  transactionsMaxAutoRollBackValue: data.DIANA_DB_TRANSACTION_AUTOROLLBACK_MAX || 60000,
  logger: process.env.DIANA_DB_LOGGER || 'winston',
  storeStrategy: process.env.DIANA_DB_STORE_STRATEGY || 'local',
  s3: {
    bucket: process.env.DIANA_DB_STORE_S3_BUCKET,
    endpoint: process.env.DIANA_DB_STORE_S3_ENDPOINT,
    region: process.env.DIANA_DB_STORE_S3_REGION,
    credentials: {
      accessKeyId: process.env.DIANA_DB_STORE_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.DIANA_DB_STORE_S3_SECRET_ACCESS_KEY,
    },
  },
  tls: {
    cert: process.env.DIANA_DB_SSL_CERT_FILE,
    key: process.env.DIANA_DB_SSL_KEY_FILE,
    ca: process.env.DIANA_DB_SSL_CA_FILE,
    requestCert: [
      '1',
      'yes',
      'true',
    ].includes(process.env.DIANA_DB_SSL_REQUEST_CERT?.toString().toLowerCase()),
    rejectUnauthorized: [
      '1',
      'yes',
      'true',
    ].includes(process.env.DIANA_DB_SSL_REJECT_UNAUTHORISED?.toString().toLowerCase()),
  },
};
