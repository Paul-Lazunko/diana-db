import { PositionFindQuery } from './position-find-query';
import { TimeFindQuery } from './time-find-query';
import { BooleanFindQuery } from './boolean-find-query';
import { StringFindQuery } from './string-find-query';
import { NumberFindQuery } from './number-find-query';
import { ReferenceQuery } from './reference-query';

export type FindQuery =
  | BooleanFindQuery
  | StringFindQuery
  | NumberFindQuery
  | TimeFindQuery
  | PositionFindQuery
  | ReferenceQuery;
