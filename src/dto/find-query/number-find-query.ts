import { QueryOperands } from '../index';

export type NumberFindQuery = Pick<
  QueryOperands<number>,
  '$eq' | '$ne' | '$in' | '$nin' | '$gt' | '$gte' | '$lt' | '$lte'
>;
