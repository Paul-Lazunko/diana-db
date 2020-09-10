import { IRequest } from '../structures';

export interface IServerOptions {
  port: number,
  handler: (request: IRequest) => void
}
