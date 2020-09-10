import {IQueryOperands} from '../structures';

export type TNumberQuery = Exclude<IQueryOperands<number>, '$regex'>
