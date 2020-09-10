import { EClientActions } from '../constants';
import { IQuery } from './IQuery';
import { ISchema } from './ISchema';

export interface IRequest {
  addressInfo?: any,
  socket?: string,
  requestId: string
  user?: string,
  database: string,
  collection: string,
  action: EClientActions,
  filterQueries?: IQuery[],
  transformQueries?: any[],
  updateQuery?: any,
  sortQuery?: any,
  skip?: number,
  limit?: number,
  schema?: ISchema,
  transactionId?: string
  autoRollbackAfterMS?: number,
  migration?: string
}
