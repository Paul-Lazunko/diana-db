import {
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
  transactionsMinAutoRollBackValue: data.DIANA_DB_TRANSACTION_AUTOROLLBACK_MIN || 1000,
  transactionsMaxAutoRollBackValue: data.DIANA_DB_TRANSACTION_AUTOROLLBACK_MAX || 60000,
  loggingAs: process.env.DIANA_DB_LOGGING_AS || 'console',
};
