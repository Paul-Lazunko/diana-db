import { EventEmitter } from 'events';
import { STORE_EE_EVENT_NAME, STORE_EE_EVENT_TIMER } from '@const';
import { store } from '@store';
import { createWriteStream } from 'fs';
import { config } from '@config';
import { AbstractStoreStrategy, storeStrategies } from '@store-strategy';

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

const storeEventEmitter: EventEmitter = new EventEmitter();

storeEventEmitter.on(STORE_EE_EVENT_NAME, async () => {
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
  switch (config.storeStrategy) {
    case 's3':
      await storeStrategies.s3.store(store);
      break;
    case 'local':
      await storeStrategies.local.store(store);
      break;
  }
  setTimeout(() => {
    storeEventEmitter.emit(STORE_EE_EVENT_NAME);
  }, STORE_EE_EVENT_TIMER);
});

export { addStoreHandler, removeStoreHandler, addRootHandler, storeEventEmitter };
