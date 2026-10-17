import { EventEmitter } from 'events';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { mkdirSync } from 'fs';
import { config } from '@config';

const eventEmitter: EventEmitter = new EventEmitter();

if (config.logger === 'winston') {
  const logsDir = config.logsDirectory;

  if (logsDir) {
    mkdirSync(logsDir, { recursive: true });
  }

  const createDailyRotateTransport = (level: string) =>
    new DailyRotateFile({
      level,
      dirname: logsDir,
      filename: `%DATE%-${level}.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    });

  const transports: winston.transport[] = [
    createDailyRotateTransport('info'),
    createDailyRotateTransport('error'),
  ];

  const _logger = winston.createLogger({
    level: 'info',
    transports,
  });

  eventEmitter.on('info', (msg: string, ...meta: any[]) => _logger.info(msg, ...meta));
  eventEmitter.on('error', (error: Error) => _logger.error(error));
} else {
  eventEmitter.on('info', (msg: string, ...meta: any[]) => console.info(msg, ...meta));
  eventEmitter.on('error', (error: Error) => console.error(error));
}

const logger = {
  info(...args: any[]) {
    eventEmitter.emit('info', ...args);
  },
  error(error: Error) {
    eventEmitter.emit('error', error);
  },
};

export { logger };
