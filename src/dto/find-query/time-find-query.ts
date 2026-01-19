import { QueryOperands } from './query-operands';

export type TimeFindQuery = {
  $year: Exclude<QueryOperands<number>, '$regex'>;
  $month: Exclude<QueryOperands<number>, '$regex'>;
  $date: Exclude<QueryOperands<number>, '$regex'>;
  $hours: Exclude<QueryOperands<number>, '$regex'>;
  $minutes: Exclude<QueryOperands<number>, '$regex'>;
  $seconds: Exclude<QueryOperands<number>, '$regex'>;
  $week: Exclude<QueryOperands<number>, '$regex'>;
  $dayOfWeek: Exclude<QueryOperands<number>, '$regex'>;
  $dayOfYear: Exclude<QueryOperands<number>, '$regex'>;
  $timestamp: Exclude<QueryOperands<number>, '$regex'>;
  $raw: Pick<QueryOperands<string>, '$in' | '$nin' | '$startsWith' | '$endsWith'>;
};
