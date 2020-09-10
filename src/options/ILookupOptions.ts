import { IQuery } from '../structures';

export interface ILookupOptions {
  collection: string
  database?: string
  as: string,
  localField: string
  foreignField: string
  filter?: IQuery
}
