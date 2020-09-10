import {IQuery} from './IQuery';

export interface IArrayQuery extends IQuery {
    $eq?:string,
    $ne?: string,
    $cn?: string,
    $nc?:string
    $in?: string[],
    $nin?: string
}
