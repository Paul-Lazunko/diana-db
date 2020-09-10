import { IRequest, IResponse } from '../structures';

export interface IQueueHandlerOptions {
  handler: (data: IRequest | IResponse) => void
}
