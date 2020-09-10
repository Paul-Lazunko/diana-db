import { EClientActions, EServerActions } from '../constants';
import { ISchema } from './ISchema';

export interface IInfo {
  database: string,
  collection: string,
  action: EClientActions,
  schema?: ISchema
  affectedId?: string[],
  updatedFields?: { [key: string]: any },
}

export interface IResponse {
  socket: string,
  requestId?: string
  operationTime?: number,
  action: EServerActions,
  error?: string,
  data?: any|any[],
  info?: IInfo,
  nFound?: number,
  nModified?: number,
  nRemoved?: number,
}
