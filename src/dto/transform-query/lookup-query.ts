import { FindQuery } from '../find-query';
import { Sorting } from '../sorting';

export type LookupQuery = {
  collection: string;
  database: string;
  as: string;
  localField: string;
  foreignField: string;
  filter: FindQuery;
  sort: Sorting;
  replaceRoot?: string;
  skip: number;
  limit: number;
};
