import { EventEmitter } from 'events';
import { QUEUE_DEFAULT_TICK_EVENT_NAME } from '../constants/queue';
import { IQueueHandlerOptions } from '../options';
import { IRequest } from '../structures';


export abstract class AbstractQueueHandler<T> {

  protected queue: T[];
  protected eventEmitter: EventEmitter;
  protected tickEventName: string = QUEUE_DEFAULT_TICK_EVENT_NAME;
  protected handler: (data: any) => void;

  protected constructor(options: IQueueHandlerOptions) {
    this.queue = [];
    this.eventEmitter = new EventEmitter();
    const { handler } = options;
    this.handler = handler;
  }

  public enQueue(item: T) {
    this.queue.push(item);
  }

  public start() {
    this.eventEmitter.on(this.tickEventName, this.handleQueue.bind(this));
    this.emitTick();
  }

  public stop() {
    this.eventEmitter.removeAllListeners(this.tickEventName);
  }

  protected emitTick() {
    this.eventEmitter.emit(this.tickEventName, this.queue);
  }

  protected async handleQueue(queue: IRequest[]) {
    if ( this.queue.length ) {
      const item: T = this.queue.shift();
      await this.handler(item);
    }
    setTimeout(this.emitTick.bind(this), 0);
  }

}
