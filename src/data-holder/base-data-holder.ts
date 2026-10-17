import { Database } from '@database';
import { FindQuery } from '@dto';
import { BaseDataHolderStorePart, DataHolder } from './index';
import { DataHolderMethodsParams } from '@parameters';
import { BaseQueryProcessor } from '@query-processor';
import { NumberFieldDefinition } from '@collection';
import { Types } from '@const';
import { IdEntry, addId, deleteId, entryFromStored, idsOf } from '../helpers/id-entry';

export class BaseDataHolder<T> implements DataHolder {
  protected type: Types;
  protected database: Database;
  protected rawDataValues: Map<string, T | T[]>;
  // value -> ids holding it (a string for one id, a Set for more). O(1) add/remove; arrays made removal
  // O(ids with that value), which made updates of low-cardinality fields (booleans, enums) quadratic.
  protected rawDataKeys: Map<T, IdEntry>;
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
    this.rawDataKeys = new Map<T, IdEntry>();
    this.rawDataValues = new Map<string, T | T[]>();
    this.identifiers = new Set<string>();
    this.queryProcessor = new this.queryProcessorConstructor({
      rawDataValues: this.rawDataValues,
      rawDataKeys: this.rawDataKeys,
    });
  }

  public hasValue(value: any) {
    return this.rawDataKeys.has(value);
  }

  protected addKey(value: T, identifier: string) {
    addId(this.rawDataKeys, value, identifier);
  }

  public create(params: DataHolderMethodsParams<T>, fieldDefinition?: NumberFieldDefinition) {
    const { identifier, value } = params;
    this.identifiers.add(identifier);
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
        this.addKey(value[i], identifier);
      }
    } else {
      this.addKey(value as T, identifier);
    }
  }

  public getRawValue(identifier: string): T | T[] {
    return this.rawDataValues.get(identifier);
  }

  /**
   * Removes the identifier using its stored value(s) to find the index entries,
   * instead of scanning every distinct value of the field.
   */
  public remove(params: DataHolderMethodsParams<T>) {
    const { identifier } = params;
    this.identifiers.delete(identifier);
    const stored = this.rawDataValues.get(identifier);
    this.rawDataValues.delete(identifier);
    if (stored === undefined) {
      return;
    }
    const values: T[] = Array.isArray(stored) ? stored : [stored];
    for (const value of new Set(values)) {
      if (!deleteId(this.rawDataKeys, value, identifier)) {
        // Index key and stored value disagree (e.g. a dump from an older version): fall back to a full scan.
        this.removeFromAllKeys(identifier);
        return;
      }
    }
  }

  protected removeFromAllKeys(identifier: string) {
    for (const key of Array.from(this.rawDataKeys.keys())) {
      deleteId(this.rawDataKeys, key, identifier);
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

  public get(identifiers: string[], precision?: number) {
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

  /** Dump format is unchanged: id lists are written as arrays. */
  public store(): BaseDataHolderStorePart {
    const result: any = {
      rawDataKeys: {},
      rawDataValues: {},
      // Not needed to rebuild the index (never read); kept as an empty list so the dump format is unchanged.
      identifiers: [],
    };
    this.rawDataValues.forEach((value: T, key: string) => {
      if (key !== undefined && value !== undefined) {
        result.rawDataValues[key.toString()] = value;
      }
    });
    this.rawDataKeys.forEach((entry: IdEntry, key: T) => {
      if (key !== undefined && entry !== undefined) {
        result.rawDataKeys[key.toString()] = idsOf(entry);
      }
    });
    return result;
  }

  public restore(data: BaseDataHolderStorePart): void {
    const { rawDataKeys, rawDataValues, identifiers } = data;
    if (identifiers) {
      this.identifiers = new Set(Array.from(identifiers as any)) || this.identifiers;
    }
    for (const key in rawDataKeys) {
      let k: any = key.trim();
      if (this.type === Types.BOOLEAN && /^(true|false)$/.test(k)) {
        k = k === 'true';
      } else if (this.type === Types.NUMBER && /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(k)) {
        // Negative and fractional keys used to stay strings and stopped matching equality queries.
        k = Number(k);
      } else if (this.type === Types.REFERENCE && /^undefined$/.test(k)) {
        continue;
      }
      const entry: IdEntry = entryFromStored(rawDataKeys[key]);
      if (entry !== undefined) {
        this.rawDataKeys.set(k, entry);
      }
    }
    for (const key in rawDataValues) {
      if (this.type === Types.REFERENCE && /^undefined$/.test(key)) {
        continue;
      }
      this.rawDataValues.set(key, rawDataValues[key]);
    }
  }
}
