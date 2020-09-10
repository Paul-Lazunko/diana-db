import {IQueryOperands} from './IQueryOperands';

export interface ITimeQuery {
    year: Exclude<IQueryOperands<number>, '$regex'>;
    month: Exclude<IQueryOperands<number>, '$regex'>;
    date: Exclude<IQueryOperands<number>, '$regex'>;
    hours: Exclude<IQueryOperands<number>, '$regex'>;
    minutes: Exclude<IQueryOperands<number>, '$regex'>;
    seconds: Exclude<IQueryOperands<number>, '$regex'>;
    week: Exclude<IQueryOperands<number>, '$regex'>;
    dayOfWeek: Exclude<IQueryOperands<number>, '$regex'>;
    dayOfYear: Exclude<IQueryOperands<number>, '$regex'>;
    timestamp: Exclude<IQueryOperands<number>, '$regex'>;
    raw: Exclude<IQueryOperands<string>, '$gt'| '$gte' | '$lt' | '$lte' >;
}