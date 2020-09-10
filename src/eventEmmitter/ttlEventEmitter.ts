import { EventEmitter } from 'events';
import { TTL_EE_EVENT_NAME, TTL_EE_EVENT_TIMER } from '../constants';

const ttlEventEmitter: EventEmitter = new EventEmitter();
const handlers: Map<string, any> = new Map<string, any>();

const addTTLHandler = (collection: string, handler: () => void) => {
  handlers.set(collection, handler);
};
const removeTTLHandler = (collection: string) => {
  handlers.delete(collection);
};

ttlEventEmitter.on(TTL_EE_EVENT_NAME, () => {
  handlers.forEach((handler: () => void) => handler());
  setTimeout(() => {
    ttlEventEmitter.emit(TTL_EE_EVENT_NAME)
  }, TTL_EE_EVENT_TIMER)
});

ttlEventEmitter.emit(TTL_EE_EVENT_NAME);

export { addTTLHandler, removeTTLHandler };
