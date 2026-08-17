import { QueryOperands } from './query-operands';

export type TimeFindQuery = {
  $year: Exclude<QueryOperands<number>, '$regex' | '$contains' | '$startsWith' | '$endsWith'>;
  $month: Exclude<QueryOperands<number>, '$regex' | '$contains' | '$startsWith' | '$endsWith'>;
  $date: Exclude<QueryOperands<number>, '$regex' | '$contains' | '$startsWith' | '$endsWith'>;
  $hours: Exclude<QueryOperands<number>, '$regex' | '$contains' | '$startsWith' | '$endsWith'>;
  $minutes: Exclude<QueryOperands<number>, '$regex' | '$contains' | '$startsWith' | '$endsWith'>;
  $seconds: Exclude<QueryOperands<number>, '$regex' | '$contains' | '$startsWith' | '$endsWith'>;
  $week: Exclude<QueryOperands<number>, '$regex' | '$contains' | '$startsWith' | '$endsWith'>;
  $dayOfWeek: Exclude<QueryOperands<number>, '$regex' | '$contains' | '$startsWith' | '$endsWith'>;
  $dayOfYear: Exclude<QueryOperands<number>, '$regex' | '$contains' | '$startsWith' | '$endsWith'>;
  $timestamp: Exclude<QueryOperands<number>, '$regex' | '$contains' | '$startsWith' | '$endsWith'>;
  $raw: Pick<QueryOperands<string>, '$in' | '$nin' | '$contains' | '$startsWith' | '$endsWith'>;
};

