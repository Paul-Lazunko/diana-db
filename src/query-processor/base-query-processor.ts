import { AbstractQueryProcessor } from './abstract-query-processor';
import { QueryProcessorOptions } from '@options';
import { arrayConcatenation, arrayIntersection, ensurePointer } from '@helper';
import { FindQuery } from '@dto';

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

  $eq(value: T) {
    const keys: T[] = Array.from(this.rawDataKeys.keys());
    const compared: T[] = keys.filter((key: T) => (key as T) === value);
    return compared.length ? this.rawDataKeys.get(compared[0]) : [];
  }

  $ne(value: T) {
    const keys: T[] = Array.from(this.rawDataKeys.keys());
    const compared: T[] = keys.filter((key: T) => key !== value);
    return compared.length ? this.rawDataKeys.get(compared[0]) : [];
  }

  protected $in(values: T[]) {
    const data: string[] = [];
    for (let i = 0; i < values.length; i = i + 1) {
      if (this.rawDataKeys.has(values[i])) {
        const items: string[] = this.rawDataKeys.get(values[i]);
        items.filter((item: string) => !data.includes(item)).forEach((item: string) => data.push(item));
      }
    }
    return data;
  }

  protected $nin(values: T[]) {
    const ids: string[] = this.$in(values);
    return Array.from(this.rawDataValues.keys()).filter((identifier: string) => !ids.includes(identifier));
  }

  protected $gte(value: T) {
    const ids: string[][] = [];
    const keys: T[] = Array.from(this.rawDataKeys.keys());
    const compared: T[] = keys.filter((key: T) => (key as T) >= value);
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }

  protected $lte(value: T) {
    const ids: string[][] = [];
    const keys: T[] = Array.from(this.rawDataKeys.keys());
    const compared: T[] = keys.filter((key: T) => key <= value);
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }

  protected $gt(value: T) {
    const ids: string[][] = [];
    const keys: T[] = Array.from(this.rawDataKeys.keys());
    const compared: T[] = keys.filter((key: T) => key > value);
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }

  protected $lt(value: T) {
    const ids: string[][] = [];
    const keys: T[] = Array.from(this.rawDataKeys.keys());
    const compared: T[] = keys.filter((key: T) => key < value);
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }
}
