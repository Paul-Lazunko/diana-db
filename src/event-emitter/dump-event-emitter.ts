import { EventEmitter } from 'events';
import { config } from '@config';
import { DUMP_EE_EVENT_NAME } from '@const';
import { logger } from '@logger';
import { getMillisecondsFromDumpInterval } from '@helper';
import { storeStrategies } from '@store-strategy';
import { store } from '@store';
import { ErrorFactory } from '@error';


const dumpEventEmitter: EventEmitter = new EventEmitter();

dumpEventEmitter.on(DUMP_EE_EVENT_NAME, async () => {
  switch (config.storeStrategy) {
    case 's3':
      await storeStrategies.s3.store(store, config.backupName).catch((e: Error) => {
        logger.error(ErrorFactory.backupError(e.message))
      });
      break;
    case 'local':
      await storeStrategies.local.store(store, `${config.dumpDirectory}/${config.backupName}`).catch((e: Error) => {
        logger.error(ErrorFactory.backupError(e.message))
      });
      break;
  }
  if (config.dumpCreateInterval) {
    setTimeout(() => {
      dumpEventEmitter.emit(DUMP_EE_EVENT_NAME);
    }, getMillisecondsFromDumpInterval(config.dumpCreateInterval));
  }
});

dumpEventEmitter.emit(DUMP_EE_EVENT_NAME);

export { dumpEventEmitter };
