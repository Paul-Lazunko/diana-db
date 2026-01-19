import { FindQuery } from '../dto/find-query/find-query';

export interface QueryProcessor {
  processQuery: (query: FindQuery) => string[];
}
