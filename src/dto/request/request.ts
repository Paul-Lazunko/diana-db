import { ClientActions } from '@const';
import { Schema } from '@collection';
import { FindQuery } from '../find-query';
import { TransformQuery } from '../transform-query';
import { Sorting } from '../sorting';

export interface Request {
  addressInfo?: any;
  socket?: string;
  requestId?: string;
  requestGroupId?: string;
  clientRequestId?: string;
  user?: string;
  database: string;
  collection: string;
  view?: string;
  action: ClientActions;
  filterQueries?: FindQuery[];
  distinctKey?: string;
  transformQueries?: TransformQuery[];
  setData?: any;
  sortQuery?: Sorting;
  skip?: number;
  limit?: number;
  schema?: Schema<any>;
  transactionId?: string;
  autoRollbackAfterMS?: number;
  migration?: number;
}
