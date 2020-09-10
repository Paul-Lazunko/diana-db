import { EventEmitter } from 'events';
import { STORE_EE_EVENT_NAME, STORE_EE_EVENT_TIMER } from '../constants';
import { store } from '../store';

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

storeEventEmitter.on(STORE_EE_EVENT_NAME, () => {
  if ( !store.get('db') ) {
    store.set('db', {});
  }
  handlers.forEach((handler: () => void, database: string) => {
    store.set(`db.${database}`, handler());
  });
  rootHandlers.forEach((handler: () => void, prop: string) => {
    store.set(prop, handler());
  });
  setTimeout(() => {
    storeEventEmitter.emit(STORE_EE_EVENT_NAME)
  }, STORE_EE_EVENT_TIMER)
});

storeEventEmitter.emit(STORE_EE_EVENT_NAME);

export { addStoreHandler, removeStoreHandler, addRootHandler }
