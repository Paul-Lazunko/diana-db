import { EventEmitter } from 'events';
import { monitor } from '@helper';
import { state } from '@state';

export const monitorEventEmitter = new EventEmitter();

monitorEventEmitter.on('monitor', () => {
  const health = monitor();
  state.inject({ health });
  setTimeout(() => monitorEventEmitter.emit('monitor'), 1000);
});
