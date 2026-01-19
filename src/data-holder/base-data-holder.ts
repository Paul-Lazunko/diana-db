import { Database } from '@database';
import { FindQuery } from '@dto';
import { BaseDataHolderStorePart, DataHolder } from './index';
import { DataHolderMethodsParams } from '@parameters';
import { BaseQueryProcessor } from '@query-processor';
import { NumberFieldDefinition } from '@collection';

export class BaseDataHolder<T> implements DataHolder {
  protected isBooleanHolder: boolean = false;
  protected database: Database;
  protected rawDataValues: Map<string, T | T[]>;
  protected rawDataTime: Map<string, number>;
  protected rawDataKeys: Map<T, string[]>;
  protected identifiers: Set<string>;
  protected readonly queryProcessorConstructor: any;
  protected queryProcessor: BaseQueryProcessor<T>;

  constructor(queryProcessor: BaseQueryProcessor<T>, database?: Database) {
    this.queryProcessorConstructor = queryProcessor;
    if (database) {
      this.database = database;
    }
    this.init();
  }

  public init() {
    this.rawDataKeys = new Map<T, string[]>();
    this.rawDataValues = new Map<string, T | T[]>();
    this.rawDataTime = new Map<string, number>();
    this.identifiers = new Set<string>();
    this.queryProcessor = new this.queryProcessorConstructor({
      rawDataValues: this.rawDataValues,
      rawDataKeys: this.rawDataKeys,
      rawDataTime: this.rawDataTime,
    });
  }

  public hasValue(value: any) {
    return this.rawDataKeys.has(value);
  }

  public create(params: DataHolderMethodsParams<T>, fieldDefinition?: NumberFieldDefinition) {
    const { identifier, value } = params;
    this.identifiers.add(identifier);
    this.rawDataTime.set(identifier, Date.now());
    if (this.rawDataValues.has(identifier)) {
      const oldValue: T | T[] = this.rawDataValues.get(identifier);
      if (Array.isArray(oldValue)) {
        if (Array.isArray(value)) {
          oldValue.push(...value);
        } else {
          oldValue.push(value);
        }
      } else {
        if (Array.isArray(value)) {
          this.rawDataValues.set(identifier, [
            oldValue,
            ...value,
          ]);
        } else {
          this.rawDataValues.set(identifier, [
            oldValue,
            value,
          ]);
        }
      }
    } else {
      this.rawDataValues.set(identifier, value);
    }

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i = i + 1) {
        if (this.rawDataKeys.has(value[i])) {
          this.rawDataKeys.get(value[i]).push(identifier);
        } else {
          this.rawDataKeys.set(value[i], [identifier]);
        }
      }
    } else {
      if (this.rawDataKeys.has(value)) {
        this.rawDataKeys.get(value).push(identifier);
      } else {
        this.rawDataKeys.set(value, [identifier]);
      }
    }
  }

  public remove(params: DataHolderMethodsParams<T>) {
    const { identifier, value } = params;
    this.identifiers.delete(identifier);
    this.rawDataTime.delete(identifier);
    this.rawDataValues.delete(identifier);
    for (const key of this.rawDataKeys.keys()) {
      const item = this.rawDataKeys.get(key);
      if (Array.isArray(item)) {
        if (item.includes(identifier)) {
          item.splice(item.indexOf(identifier), 1);
          if (!item.length) {
            this.rawDataKeys.delete(key as T);
          }
        }
      } else {
        if (item === identifier) {
          this.rawDataKeys.delete(key as T);
        }
      }
    }
  }

  public update(
    params: DataHolderMethodsParams<T>,
    data: DataHolderMethodsParams<T>,
    fieldDefinition?: NumberFieldDefinition,
  ) {
    this.remove(params);
    this.create(data, fieldDefinition);
  }

  public createCursor(query: FindQuery) {
    return this.queryProcessor.processQuery(query);
  }

  public get(identifiers: string[]) {
    const result: { [key: string]: T | T[] } = {};
    for (const identifier of identifiers) {
      if (this.rawDataValues.has(identifier)) {
        result[identifier] = this.rawDataValues.get(identifier);
      }
    }
    return result;
  }

  public distinct(): T[] {
    return Array.from(this.rawDataKeys.keys());
  }

  public store(): BaseDataHolderStorePart {
    const result: any = {
      rawDataKeys: {},
      rawDataValues: {},
      rawDataTime: {},
      identifiers: this.identifiers,
    };
    this.rawDataValues.forEach((value: T, key: string) => {
      result.rawDataValues[key.toString()] = value;
    });
    this.rawDataTime.forEach((value: number, key: string) => {
      result.rawDataTime[key.toString()] = value;
    });
    this.rawDataKeys.forEach((value: any, key: T) => {
      result.rawDataKeys[key.toString()] = value;
    });
    return result;
  }

  public restore(data: BaseDataHolderStorePart): void {
    const { rawDataKeys, rawDataValues, identifiers, rawDataTime } = data;
    if (identifiers) {
      this.identifiers = new Set(Array.from(identifiers)) || this.identifiers;
    }
    for (const key in rawDataKeys) {
      let k: any = key.trim();
      if (/^(true|false)$/.test(k)) {
        k = k === 'true';
      } else if (/^(\d+)$/.test(k)) {
        k = parseInt(k, 10);
      }
      console.log(`rawDK`, k, typeof k, rawDataKeys[key]);
      this.rawDataKeys.set(k, rawDataKeys[key]);
    }
    for (const key in rawDataValues) {
      let k: any = `${key}`;
      if (/^(true|false)$/.test(key)) {
        k = key === 'true';
      } else if (/^(\d+)$/.test(key)) {
        k = parseInt(key.toString(), 10);
      }
      this.rawDataValues.set(key, rawDataValues[key]);
    }
    for (const key in rawDataTime) {
      this.rawDataTime.set(key, rawDataTime[key]);
    }
  }
}
