import { EventEmitter } from 'events';
import { resolve } from 'path';
import { existsSync, copyFile } from 'fs';
import { config } from '@config';
import { DUMP_EE_EVENT_NAME, StoreStrategy } from '@const';
import { logger } from '@logger';
import { getMillisecondsFromDumpInterval } from '@helper';

const dataPath: string = resolve(`${config.dumpDirectory}/${config.currentDumpName}`);
const dumpPath: string = resolve(`${config.dumpDirectory}/${config.backupName}`);

const dumpEventEmitter: EventEmitter = new EventEmitter();

dumpEventEmitter.on(DUMP_EE_EVENT_NAME, () => {
  if (config.storeStrategy === StoreStrategy.LOCAL) {
    if (existsSync(dataPath)) {
      if (!existsSync(dumpPath)) {
        copyFile(dataPath, dumpPath, (error) => {
          if (error) {
            logger.error(error);
          }
        });
      }
    }
    if (config.dumpCreateInterval) {
      setTimeout(() => {
        dumpEventEmitter.emit(DUMP_EE_EVENT_NAME);
      }, getMillisecondsFromDumpInterval(config.dumpCreateInterval));
    }
  }
});

dumpEventEmitter.emit(DUMP_EE_EVENT_NAME);

export { dumpEventEmitter };
