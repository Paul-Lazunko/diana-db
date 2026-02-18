import { EventEmitter } from 'events';
import { STORE_EE_EVENT_NAME, STORE_EE_EVENT_TIMER } from '@const';
import { store } from '@store';
import { writeFileSync } from 'fs';
import { config } from '@config';

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
  handlers.forEach((handler: () => any, database: string) => {
    store.set(`db.${database}`, handler());
  });
  rootHandlers.forEach((handler: () => any, prop: string) => {
    store.set(prop, handler());
  });
  await store.store();
  setTimeout(() => {
    storeEventEmitter.emit(STORE_EE_EVENT_NAME);
  }, STORE_EE_EVENT_TIMER);
});

export { addStoreHandler, removeStoreHandler, addRootHandler, storeEventEmitter };
