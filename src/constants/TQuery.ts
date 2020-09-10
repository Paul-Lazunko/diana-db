import {TBooleanQuery} from './TBooleanQuery';
import {TStringQuery} from './TStringQuery';
import {TNumberQuery} from './TNumberQuery';
import {ITimeQuery} from '../structures';

export type TQuery = TBooleanQuery | TStringQuery | TNumberQuery | ITimeQuery;