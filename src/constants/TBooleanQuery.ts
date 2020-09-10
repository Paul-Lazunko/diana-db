import { IQueryOperands } from '../structures';

export type TBooleanQuery = Exclude<IQueryOperands<boolean>, '$gt'| '$gte' | '$lt' | '$lte' | '$regex' | '$nin' | '$in'>
