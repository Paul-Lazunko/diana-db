import { ArrayUpdateQuery } from './array-update-query';
import { NumberUpdateQuery } from './number-update-query';
import { StringUpdateQuery } from './string-update-query';
import { TimeUpdateQuery } from './time-update-query';

export type UpdateData<T> = ArrayUpdateQuery | TimeUpdateQuery | NumberUpdateQuery | StringUpdateQuery | Partial<T>;
