import { AbstractQueryProcessor } from './abstract-query-processor';
import { QueryProcessorOptions } from '@options';
import { arrayIntersection } from '@helper';
import { FindQuery } from '@dto';
import { IdEntry, forEachId, idsOf } from '../helpers/id-entry';

/**
 * rawDataKeys maps a value to the ids holding it (a string for one id, a Set for more).
 * Single-value lookups go through the Map; range operators scan the distinct values once
 * and merge their id sets.
 */
export class BaseQueryProcessor<T> extends AbstractQueryProcessor {
  public constructor(options: QueryProcessorOptions) {
    super(options);
  }

  public processQuery(query: FindQuery): string[] {
    const results: any = {};
    if (typeof query !== 'object') {
      query = { $eq: query };
    }
    for (const key in query) {
      results[key] = this[key](query[key]);
    }
    return arrayIntersection(...(Object.values(results) as any[]));
  }

  protected idsOf(value: T): string[] {
    return idsOf(this.rawDataKeys.get(value));
  }

  protected collect(predicate: (key: T) => boolean): string[] {
    const result: Set<string> = new Set<string>();
    this.rawDataKeys.forEach((entry: IdEntry, key: T) => {
      if (predicate(key)) {
        forEachId(entry, (id: string) => result.add(id));
      }
    });
    return Array.from(result);
  }

  $eq(value: T) {
    return this.idsOf(value);
  }

  $ne(value: T) {
    return this.collect((key: T) => key !== value);
  }

  protected $in(values: T[]) {
    const result: Set<string> = new Set<string>();
    for (let i = 0; i < values.length; i = i + 1) {
      forEachId(this.rawDataKeys.get(values[i]), (id: string) => result.add(id));
    }
    return Array.from(result);
  }

  protected $nin(values: T[]) {
    const ids: Set<string> = new Set<string>(this.$in(values));
    return Array.from(this.rawDataValues.keys()).filter((identifier: string) => !ids.has(identifier));
  }

  protected $gte(value: T) {
    return this.collect((key: T) => key >= value);
  }

  protected $lte(value: T) {
    return this.collect((key: T) => key <= value);
  }

  protected $gt(value: T) {
    return this.collect((key: T) => key > value);
  }

  protected $lt(value: T) {
    return this.collect((key: T) => key < value);
  }
}
