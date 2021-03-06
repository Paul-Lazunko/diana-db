import {
  DEFAULT_DIANA_DB_DUMP_CREATE_INTERVAL,
  DEFAULT_DIANA_DB_DUMP_CURRENT_NAME,
  DEFAULT_DIANA_DB_DUMPS_DIRECTORY,
  DEFAULT_DIANA_DB_LOGS_DIRECTORY,
  DEFAULT_DIANA_DB_LOGS_TTL,
  DEFAULT_DIANA_DB_PORT,
  DEFAULT_DIANA_DB_WORKERS_COUNT
} from '../constants';

const data: { [key: string]: string | number } = process.env;

for ( const variable in data ) {
  try {
    if ( /^\d+$/.test( data[variable].toString() ) ) {
      data[variable] = parseInt(data[variable].toString(), 10);
    }
  } catch(e) {}
}

export const config: any = {
  port: process.env.DIANA_DB_PORT || DEFAULT_DIANA_DB_PORT,
  workersCount: process.env.DIANA_DB_WORKERS_COUNT || DEFAULT_DIANA_DB_WORKERS_COUNT,
  dumpCreateInterval: process.env.DIANA_DB_DUMP_CREATE_INTERVAL || DEFAULT_DIANA_DB_DUMP_CREATE_INTERVAL,
  dumpDirectory: process.env.DIANA_DB_DUMPS_DIRECTORY || DEFAULT_DIANA_DB_DUMPS_DIRECTORY,
  logsDirectory: process.env.DIANA_DB_LOGS_DIRECTORY || DEFAULT_DIANA_DB_LOGS_DIRECTORY,
  logsTtlValue: process.env.DIANA_DB_LOGS_TTL || DEFAULT_DIANA_DB_LOGS_TTL,
  currentDumpName: process.env.DIANA_DB_DUMP_CURRENT_NAME || DEFAULT_DIANA_DB_DUMP_CURRENT_NAME,
  transactionsMinAutoRollBackValue: process.env.DIANA_DB_TRANSACTION_AUTOROLLBACK_MIN || 1000,
  transactionsMaxAutoRollBackValue: process.env.DIANA_DB_TRANSACTION_AUTOROLLBACK_MAX || 60000,
  secretKey: process.env.DIANA_DB_SECRET_KEY
};
