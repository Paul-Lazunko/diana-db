import { ProjectQuery } from './project-query';

export type GroupQuery = {
  _id: string;
} & ProjectQuery;
