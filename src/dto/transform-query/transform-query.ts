import { FindQuery } from '../find-query';
import { Sorting } from '../sorting';
import { GroupQuery } from './group-query';
import { LookupQuery } from './lookup-query';
import { ProjectQuery } from './project-query';

export type TransformQuery = {
  $match?: FindQuery;
  $group?: GroupQuery;
  $lookup?: LookupQuery;
  $project?: ProjectQuery;
  $unwind?: string;
  $replaceRoot?: string;
  $sort?: Sorting;
  $skip?: number;
  $limit?: number;
};
