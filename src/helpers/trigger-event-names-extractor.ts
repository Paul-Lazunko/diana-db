import { TransformQuery } from '@dto';

export function triggerEventNamesExtractor(transformQueries: TransformQuery[], defaultDatabase: string): string[] {
  return transformQueries
    .filter((item: TransformQuery) => typeof item?.$lookup === 'object' && item?.$lookup?.collection)
    .map((item: TransformQuery) => `${item.$lookup.database || defaultDatabase}.${item.$lookup.collection}`);
}
