import { IRequest, IResponse } from '../structures';

export interface IClientRequestOptions {
  executionHandler: (request: IRequest) => Promise<IResponse>
}
