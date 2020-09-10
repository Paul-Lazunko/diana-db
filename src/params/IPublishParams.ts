import { EClientActions } from '../constants';

export interface IPublishParams {
  database: string;
  collection: string;
  action: EClientActions,
  affectedIds: string[],
  data?: any
}
