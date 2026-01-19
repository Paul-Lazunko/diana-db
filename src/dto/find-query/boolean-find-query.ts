import { QueryOperands } from '../index';

export type BooleanFindQuery = Pick<QueryOperands<boolean>, '$eq' | '$ne'>;
