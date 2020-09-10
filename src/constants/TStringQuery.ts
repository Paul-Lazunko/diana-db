import {IQueryOperands} from '../structures';

export type TStringQuery = Exclude<IQueryOperands<string>, '$gt'| '$gte' | '$lt' | '$lte' >
