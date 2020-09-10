import {IQuery} from './IQuery';

export interface IQueryProcessor {
    processQuery: (query: IQuery) => string[]
}