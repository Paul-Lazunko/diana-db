import { ClientActions } from '@const';

export type PublishParams = {
  database: string;
  collection: string;
  action: ClientActions;
  affectedIds: string[];
  data?: any;
};
