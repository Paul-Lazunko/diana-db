import { ClientActions } from '@const';

export type DatabaseUpdate = {
  database: string;
  collection: string;
  action: ClientActions;
  affectedIds: string[];
  data?: any;
};
