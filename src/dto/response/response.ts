import { ClientActions, ServerActions } from '@const';
import { Schema } from '../../collection/schema';

export interface IInfo {
  database: string;
  collection: string;
  action: ClientActions;
  schema?: Schema<any>;
  affectedId?: string[];
  updatedFields?: { [key: string]: any };
}

export interface Response {
  socket: string;
  requestId?: string;
  clientRequestId?: string;
  requestGroupId?: string;
  executionTime?: number;
  action: ServerActions;
  error?: string;
  data?: any | any[];
  info?: IInfo;
  found?: number;
  modified?: number;
  removed?: number;
}
