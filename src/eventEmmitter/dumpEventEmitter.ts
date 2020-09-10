import { EventEmitter } from 'events';
import { resolve } from 'path';
import { existsSync, copyFile } from 'fs'
import { config } from '../config';
import { DUMP_EE_EVENT_NAME, DUMP_EE_EVENT_TIMER } from '../constants';
import { getDateString } from '../helpers';

const dataPath: string = resolve(__dirname, `${config.dumpDirectory}/${config.currentDumpName}`);

const dumpEventEmitter: EventEmitter = new EventEmitter();

dumpEventEmitter.on(DUMP_EE_EVENT_NAME, () => {
  if ( existsSync(dataPath) ) {
    const dumpName: string = getDateString(config.dumpCreateInterval);
    const dumpPath: string = resolve(__dirname, `${config.dumpDirectory}/${dumpName}.json`);
    if ( !existsSync(dumpPath) ) {
      copyFile(dataPath, dumpPath, (error) => {
        if ( error ) {
          console.error(error);
        }
      })
    }
  }
  setTimeout(() => {
    dumpEventEmitter.emit(DUMP_EE_EVENT_NAME)
  }, DUMP_EE_EVENT_TIMER)
});

dumpEventEmitter.emit(DUMP_EE_EVENT_NAME);

export { dumpEventEmitter }
