import winston from 'winston';
import { resolve } from 'path';
require('winston-daily-rotate-file');

import { config } from '../config';
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
   // @ts-ignore
    new winston.transports.DailyRotateFile({
      dirname: resolve(__dirname, config.logsDirectory),
      filename: 'di-db',
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      maxFiles: config.logsTtlValue,
      extension: '.error.log'
    }),
    // @ts-ignore
    new winston.transports.DailyRotateFile({
      dirname: resolve(__dirname, config.logsDirectory),
      filename: 'di-db',
      level: 'info',
      datePattern: 'YYYY-MM-DD',
      maxFiles: config.logsTtlValue,
      extension: '.access.log'
    }),
  ],
});
