import { EventEmitter } from 'events';
import { config } from '@config';
import { DUMP_EE_EVENT_NAME } from '@const';
import { logger } from '@logger';
import { getMillisecondsFromDumpInterval } from '@helper';
import { storeStrategies } from '@store-strategy';
import { store } from '@store';
import { ErrorFactory } from '@error';

const dumpEventEmitter: EventEmitter = new EventEmitter();
let dumpsStarted: boolean = false;

const scheduleNextDump = () => {
  if (config.dumpCreateInterval) {
    setTimeout(() => {
      dumpEventEmitter.emit(DUMP_EE_EVENT_NAME);
    }, getMillisecondsFromDumpInterval(config.dumpCreateInterval));
  }
};

dumpEventEmitter.on(DUMP_EE_EVENT_NAME, async () => {
  switch (config.storeStrategy) {
    case 's3':
      await storeStrategies.s3.store(store, config.backupName).catch((e: Error) => {
        logger.error(ErrorFactory.backupError(e.message));
      });
      break;
    case 'local':
      await storeStrategies.local.store(store, `${config.dumpDirectory}/${config.backupName}`).catch((e: Error) => {
        logger.error(ErrorFactory.backupError(e.message));
      });
      break;
  }
  scheduleNextDump();
});

/**
 * Starts the backup cycle after the databases have been restored. The first backup is taken one interval
 * after start, so a damaged or empty current dump can't overwrite the last good backup at boot.
 */
const startDumps = () => {
  if (dumpsStarted) {
    return;
  }
  dumpsStarted = true;
  scheduleNextDump();
};

export { dumpEventEmitter, startDumps };
