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
    return this.rawDataKeys.get(value) || [];
  }

  $ne(value: T) {
    const ids: string[][] = [];
    this.rawDataKeys.forEach((items: string[], key: T) => {
      if (key !== value) {
        ids.push(items);
      }
    });
    return arrayConcatenation(...ids);
  }

  protected $in(values: T[]) {
    const data: Set<string> = new Set<string>();
    for (let i = 0; i < values.length; i = i + 1) {
      const items: string[] = this.rawDataKeys.get(values[i]);
      if (items) {
        items.forEach((item: string) => data.add(item));
      }
    }
    return Array.from(data);
  }

  protected $nin(values: T[]) {
    const ids: Set<string> = new Set<string>(this.$in(values));
    return Array.from(this.rawDataValues.keys()).filter((identifier: string) => !ids.has(identifier));
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
