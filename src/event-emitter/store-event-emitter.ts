import { EventEmitter } from 'events';
import { STORE_EE_EVENT_NAME, STORE_EE_EVENT_TIMER } from '@const';
import { store } from '@store';
import { config } from '@config';
import { storeStrategies } from '@store-strategy';
import { logger } from '@logger';
import { ErrorFactory } from '@error';
import { wal } from '../wal';

const handlers: Map<string, any> = new Map<string, any>();
const rootHandlers: Map<string, any> = new Map<string, any>();

const addStoreHandler = (database: string, handler: () => void) => {
  handlers.set(database, handler);
};

const addRootHandler = (key: string, handler: () => void) => {
  rootHandlers.set(key, handler);
};

const removeStoreHandler = (database: string) => {
  handlers.delete(database);
};

const writeStore = async () => {
  if (!store.get('db')) {
    store.set('db', {});
  }
  if (!store.get('migrations')) {
    store.set('migrations', {});
  }
  handlers.forEach((handler: () => any, database: string) => {
    store.set(`db.${database}`, handler());
  });
  rootHandlers.forEach((handler: () => any, prop: string) => {
    store.set(prop, handler());
  });
  // The state is captured above, synchronously: log entries up to here are contained in this snapshot.
  const obsoleteLogFiles: string[] = wal.rotate();
  switch (config.storeStrategy) {
    case 's3':
      await storeStrategies.s3.store(store, config.currentDumpName);
      break;
    case 'local':
      await storeStrategies.local.store(store, `${config.dumpDirectory}/${config.currentDumpName}`);
      break;
  }
  // Snapshot is on disk: the log files it covers are no longer needed.
  wal.removeFiles(obsoleteLogFiles);
};

let running: Promise<void> = Promise.resolve();

/**
 * Persists all databases. Calls are serialised, so the periodic save and a shutdown save
 * never write the same file at the same time.
 */
const persist = (): Promise<void> => {
  running = running.then(writeStore, writeStore);
  return running;
};

const storeEventEmitter: EventEmitter = new EventEmitter();

storeEventEmitter.on(STORE_EE_EVENT_NAME, async () => {
  await persist().catch((e: Error) => {
    logger.error(ErrorFactory.storeError(e.message));
  });
  setTimeout(() => {
    storeEventEmitter.emit(STORE_EE_EVENT_NAME);
  }, STORE_EE_EVENT_TIMER);
});

export { addStoreHandler, removeStoreHandler, addRootHandler, storeEventEmitter, persist };
