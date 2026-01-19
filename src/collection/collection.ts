import { ClientActions, ServerActions, Types } from '@const';
import { ConstructItems, FindQuery, RemoveResult, Sorting, UpdateData, UpdateResult } from '@dto';
import { DataHolder } from '@data-holder';
import { Database } from '@database';
import { Field } from '@field';
import { AggregationFramework } from '@framework';
import {
  arrayConcatenation,
  arrayExcluding,
  arrayIntersection,
  ensurePointer,
  evaluatePointer,
  findValueWithMode,
  isPointer,
  objectIdHelper,
  projectIncomingValue,
  projectOutgoingValue,
} from '@helper';
import { Validator } from '@validator';
import { TransactionsData } from './transactions-data';
import { publishEventEmitter } from '@event-emitter';
import {
  ArrayFieldDefinition,
  NumberFieldDefinition,
  ReferenceFieldDefinition,
  Schema,
  TimeFieldDefinition,
} from './schema';
import { TransformQuery } from '@dto';
import { ErrorFactory } from '@error';
import { string } from 'joi';

export class Collection<T> {
  public name: string;
  public schema: Schema<T>;
  public schemaUpdated: Record<string, number>;
  public db: Database;
  public identifiers: Set<string>;
  protected validate: Validator;

  public transactionsData: Map<string, TransactionsData>;
  protected transactionsTimers: Map<string, NodeJS.Timeout>;

  private aggregationFrameWork: AggregationFramework;
  private refs: Map<string, string | string[]>[] = [];
  private refsHolder: Map<string, string | string[]>[] = [];
  private relatedCollections: { [key: string]: string }[] = [];

  constructor(name: string, schema: Schema<T>, db: Database, schemaUpdated?: Record<string, number>) {
    this.name = name;
    this.db = db;
    this.schemaUpdated = schemaUpdated || {};
    this.schema = Object.assign({ _id: { type: Types.OBJECT_ID, unique: true } }, schema);
    for (const key in this.schema) {
      this.schemaUpdated[key] = Date.now();
    }
    this.identifiers = new Set();
    this.transactionsData = new Map<string, TransactionsData>();
    this.transactionsTimers = new Map<string, NodeJS.Timeout>();
    this.aggregationFrameWork = new AggregationFramework({ collection: this });
    this.validate = new Validator({ collection: this });
  }

  public startTransaction(transactionId: string, ttl: number) {
    this.transactionsData.set(transactionId, new TransactionsData());
    this.db.Types.forEach((type: Field) => {
      if (type.transactions.has(this.name)) {
        type.transactions.get(this.name).forEach((item: Map<string, DataHolder>, key: string) => {
          item.set(transactionId, type.getDataHolder());
        });
      }
    });
    this.transactionsTimers.set(
      transactionId,
      setTimeout(() => {
        this.clearTransactionTimer(transactionId);
        this.removeTransactionData(transactionId);
      }, ttl),
    );
  }

  public rollBackTransaction(transactionId: string) {
    this.clearTransactionTimer(transactionId);
    this.removeTransactionData(transactionId);
  }

  protected clearTransactionTimer(transactionId: string) {
    if (this.transactionsTimers.has(transactionId)) {
      clearTimeout(this.transactionsTimers.get(transactionId));
      this.transactionsTimers.delete(transactionId);
    }
  }

  protected removeTransactionData(transactionId: string) {
    if (this.transactionsData.has(transactionId)) {
      this.transactionsData.delete(transactionId);
    }
    this.db.Types.forEach((type: Field) => {
      if (type.transactions.has(this.name)) {
        type.transactions.get(this.name).forEach((item: Map<string, DataHolder>) => {
          item.delete(transactionId);
        });
      }
    });
  }

  protected insertTransactionItems(transactionId: string) {
    if (this.transactionsData.has(transactionId)) {
      const transactionData: TransactionsData = this.transactionsData.get(transactionId);
      const { inserted } = transactionData;
      for (let i = 0; i < inserted.length; i = i + 1) {
        this.identifiers.add(inserted[i]);
        for (const key in this.schema) {
          const propertyType: Types = this.schema[key]?.type;
          let type: Field;
          let dataHolder: any;
          let transactionHolder: any;
          let data: any[];
          switch (propertyType) {
            case Types.ARRAY:
              type = this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items);
              dataHolder = type.data;
              transactionHolder = type.transactions;
              data = transactionHolder.get(this.name).get(key).get(transactionId).get([inserted[i]]);

              dataHolder.get(this.name).get(key).create({
                identifier: inserted[i],

                value: data[inserted[i]],
              });
              break;
            default:
              type = this.db.Types.get(this.schema[key]?.type);
              dataHolder = type.data;
              transactionHolder = type.transactions;
              data = transactionHolder.get(this.name).get(key).get(transactionId).get([inserted[i]]);

              dataHolder.get(this.name).get(key).create({
                identifier: inserted[i],

                value: data[inserted[i]],
              });
              break;
          }
        }
      }
      if (inserted.length) {
        publishEventEmitter.emit('publish', {
          database: this.db.name,
          collection: this.name,
          action: ClientActions.INSERT,
          affectedIds: inserted,
        });
      }
    }
  }

  protected updateTransactionItems(transactionId: string) {
    if (this.transactionsData.has(transactionId)) {
      const transactionData: TransactionsData = this.transactionsData.get(transactionId);
      const { updated } = transactionData;
      updated.forEach((item: { [key: string]: any }, id: string) => {
        const setData: any = {};
        for (const k in item) {
          setData[k] = item[k];
        }
        this.update(
          [
            {
              _id: {
                $eq: id,
              },
            },
          ],
          setData,
        );
      });
    }
  }

  protected removeTransactionItems(transactionId: string) {
    if (this.transactionsData.has(transactionId)) {
      const transactionData: TransactionsData = this.transactionsData.get(transactionId);
      const { removed } = transactionData;
      this.remove([
        {
          _id: {
            $in: removed,
          },
        },
      ]);
    }
  }

  public commitTransaction(transactionId: string) {
    this.clearTransactionTimer(transactionId);
    this.insertTransactionItems(transactionId);
    this.removeTransactionItems(transactionId);
    this.updateTransactionItems(transactionId);
    this.removeTransactionData(transactionId);
  }

  public initRefs(
    refs: Map<string, string | string[]>,
    refsHolder: Map<string, string | string[]>,
    options: { [key: string]: string },
  ) {
    this.refs.push(refs);
    this.refsHolder.push(refsHolder);
    this.relatedCollections.push(options);
  }

  protected validateData(data: any, transactionId: string, update: boolean = false) {
    const transactionExists: boolean = transactionId && this.transactionsData.has(transactionId);
    for (const key in this.schema) {
      // data[key] - possible pointer
      if (this.schema[key].unique && Object.prototype.hasOwnProperty.apply(data, [key])) {
        const type = this.db.Types.get(this.schema[key].type);
        const dataHolder = transactionExists
          ? type.transactions.get(this.name).get(key).get(transactionId)
          : type.data.get(this.name).get(key);
        if (typeof dataHolder.hasValue === 'function' && dataHolder.hasValue(data[key])) {
          throw ErrorFactory.collectionError(`property '${key}' with value ${data[key]} is used already`);
        }
      }
      if (update && this.schema[key].mutable === false && Object.prototype.hasOwnProperty.apply(data, [key])) {
        throw ErrorFactory.collectionError(
          `property '${key}' of the '${this.name}' collection's Schema is not mutable`,
        );
      }
      if (!update && this.schema[key].required && !Object.prototype.hasOwnProperty.apply(data, [key])) {
        throw ErrorFactory.collectionError(`property '${key}' is required in the '${this.name}' collection's Schema`);
      }
    }
  }

  public insert(data: any, transactionId?: string): any {
    const _id = objectIdHelper();
    this.validate.data(data, false);
    this.validateData(data, transactionId);
    data._id = _id;
    const result: any = { _id: data._id };

    const transactionExists: boolean = transactionId && this.transactionsData.has(transactionId);
    if (transactionExists) {
      this.transactionsData.get(transactionId).inserted.push(data._id);
    } else {
      this.identifiers.add(result._id);
    }
    for (const key in this.schema) {
      const propertyType: Types = this.schema[key].type;
      let type: Field;
      let dataHolder: DataHolder;
      switch (propertyType) {
        case Types.ARRAY:
          type = this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items);
          dataHolder = transactionExists
            ? type.transactions.get(this.name).get(key).get(transactionId)
            : type.data.get(this.name).get(key);

          for (let i = 0; i < data[key]?.length; i = i + 1) {
            dataHolder.create({
              identifier: result._id,
              value: data[key][i],
            });
          }
          result[key] = data[key];
          break;
        default:
          let value = data[key];
          if (propertyType === Types.NUMBER) {
            const { precision } = this.schema[key] as NumberFieldDefinition;
            value = projectIncomingValue(value, precision);
          }
          type = this.db.Types.get(this.schema[key].type);
          dataHolder = transactionExists
            ? type.transactions.get(this.name).get(key).get(transactionId)
            : type.data.get(this.name).get(key);

          dataHolder.create({
            identifier: result._id,
            value,
          });

          result[key] = data[key];
          break;
      }
    }
    if (!transactionExists) {
      publishEventEmitter.emit('publish', {
        database: this.db.name,
        collection: this.name,
        action: ClientActions.INSERT,
        affectedIds: [result._id],
      });
    }
    return result;
  }

  public distinct(key: string): any[] {
    if (!this.schema[key]) {
      throw ErrorFactory.collectionError(`property '${key}' doesn't exist in the '${this.name}' collection's Schema`);
    }
    const propertyType: Types = this.schema[key].type;
    const type: Field =
      propertyType === Types.ARRAY
        ? this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items)
        : this.db.Types.get(this.schema[key].type);
    return type.data.get(this.name).get(key).distinct();
  }

  public max(key: string): any[] {
    return this.getMaxOrMin(key, 'max');
  }

  public min(key: string): any[] {
    return this.getMaxOrMin(key, 'min');
  }

  protected getMaxOrMin(key: string, mode: 'min' | 'max') {
    if (!this.schema[key]) {
      throw ErrorFactory.collectionError(`property '${key}' doesn't exist in the '${this.name}' collection's Schema`);
    }
    const propertyType: Types = this.schema[key].type;
    const type: Field =
      propertyType === Types.ARRAY
        ? this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items)
        : this.db.Types.get(this.schema[key].type);
    const values = type.data.get(this.name).get(key).distinct();
    const value = findValueWithMode(values, mode);
    return this.find([{ [key]: { $in: [value] } }]);
  }

  public find(
    filterQueries: FindQuery[],
    transformQueries?: TransformQuery[],
    sortQuery?: Sorting,
    skip?: number,
    limit?: number,
    transactionId?: string,
  ): any[] {
    if (!filterQueries) {
      filterQueries = [{}];
    } else if (!Array.isArray(filterQueries)) {
      filterQueries = [filterQueries];
    }
    const isFilterQueryEmpty =
      !filterQueries ||
      !filterQueries.length ||
      filterQueries.every((filterQuery: FindQuery) => !Object.keys(filterQuery).length);

    if (!isFilterQueryEmpty) {
      filterQueries = filterQueries.filter((filterQuery: FindQuery) => !!Object.keys(filterQuery).length);
      this.validate.filterQueries(filterQueries);
      for (const query of filterQueries) {
        for (const key in query) {
          if (this.schema[key]?.type === Types.NUMBER) {
            const precision = (this.schema[key] as NumberFieldDefinition)?.precision;
            if (typeof query[key] === 'object') {
              for (const k in query[key]) {
                switch (k) {
                  case '$gt':
                  case '$gte':
                  case '$lt':
                  case '$lte':
                  case '$eq':
                  case '$ne':
                    query[key][k] = projectIncomingValue(query[key][k], precision);
                    break;
                  case '$in':
                  case '$nin':
                    query[key][k] = query[key][k].map((item: number) => projectIncomingValue(item, precision));
                    break;
                }
              }
            } else {
              query[key] = projectIncomingValue(query[key], precision);
            }
          }
        }
      }
    }
    this.validate.filterQueries(filterQueries);
    if (transformQueries) {
      this.validate.transformQueries(transformQueries);
    }
    if (sortQuery) {
      this.validate.sortQuery(sortQuery);
    }
    if (skip) {
      this.validate.skip(skip);
    }
    if (limit) {
      this.validate.limit(limit);
    }

    const base: string[] = isFilterQueryEmpty ? Array.from(this.identifiers) : this.getItemsIdArray(filterQueries);
    const transaction: string[] =
      transactionId && this.transactionsData.has(transactionId)
        ? this.getTransactionItemsIdArray(filterQueries, transactionId)
        : undefined;
    return this.constructItems({ base, transaction, transactionId }, transformQueries, sortQuery, skip, limit);
  }

  public remove(filterQueries: FindQuery[], transactionId?: string): RemoveResult {
    const items: any[] = this.find(filterQueries, [], null, null, null, transactionId);
    const result: RemoveResult = {
      found: 0,
      removed: 0,
      executionTime: Date.now(),
    };
    result.found = items.length;
    if (transactionId && this.transactionsData.has(transactionId)) {
      this.transactionsData.get(transactionId).removed.push(...items.map((item: any) => item._id));
    } else {
      for (const item of items) {
        let doRemove: boolean = true;
        this.transactionsData.forEach((td: TransactionsData) => {
          const { updated } = td;
          updated.forEach((item: any, id: string) => {
            if (id === item._id) {
              doRemove = false;
            }
          });
        });
        if (doRemove) {
          this.identifiers.delete(item._id);
          this.removeRefs(item._id);
          for (const key in this.schema) {
            const propertyType: Types = this.schema[key].type;
            const type: Field =
              propertyType === Types.ARRAY
                ? this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items)
                : this.db.Types.get(this.schema[key].type);
            type.data.get(this.name).get(key).remove({ identifier: item._id, value: item[key] });
          }
        }
      }
    }
    result.removed = items.length;
    result.executionTime = Date.now() - result.executionTime;
    if (!transactionId && items.length) {
      publishEventEmitter.emit(ServerActions.PUBLISH, {
        database: this.db.name,
        collection: this.name,
        action: ClientActions.REMOVE,
        affectedIds: items.map((item: any) => item._id),
      });
    }
    return result;
  }

  public update(filterQueries: FindQuery[], updateData: UpdateData<any>, transactionId?: string): UpdateResult {
    this.validate.filterQueries(filterQueries);
    this.validateData(updateData, transactionId, true);
    this.validate.data(updateData, true);
    const result: UpdateResult = {
      found: 0,
      modified: 0,
      executionTime: Date.now(),
    };
    const items: any[] = this.find(filterQueries, [], null, null, null, transactionId);
    result.found = items.length;
    const transactionExists: boolean = transactionId && this.transactionsData.has(transactionId);
    for (const item of items) {
      let isUpdated: boolean = false;
      if (transactionExists) {
        this.transactionsData.get(transactionId).updated.set(item._id, {});
      }
      for (const key in updateData) {
        const evaluatedValue = isPointer(updateData[key]) ? evaluatePointer(updateData[key], item) : updateData[key];
        updateData[key] = evaluatedValue;
        if (this.schema[key] && item && item[key] !== evaluatedValue) {
          const propertyType: Types = this.schema[key].type;
          const type: Field =
            propertyType === Types.ARRAY
              ? this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items)
              : this.db.Types.get(this.schema[key].type);
          if (
            [
              null,
              undefined,
            ].includes(evaluatedValue) ||
            (Array.isArray(evaluatedValue) && !evaluatedValue.length)
          ) {
            transactionExists
              ? type.transactions
                  .get(this.name)
                  .get(key)
                  .get(transactionId)
                  .remove({ identifier: item._id, value: item[key] })
              : type.data.get(this.name).get(key).remove({ identifier: item._id, value: item[key] });
          } else {
            transactionExists
              ? type.transactions
                  .get(this.name)
                  .get(key)
                  .get(transactionId)
                  .update(
                    { identifier: item._id, value: item[key] },
                    {
                      identifier: item._id,
                      value: evaluatedValue,
                    },
                    this.schema[key] as NumberFieldDefinition,
                  )
              : type.data
                  .get(this.name)
                  .get(key)
                  .update(
                    { identifier: item._id, value: item[key] },
                    {
                      identifier: item._id,
                      value: evaluatedValue,
                    },
                    this.schema[key] as NumberFieldDefinition,
                  );
          }
          isUpdated = true;
          if (transactionExists) {
            this.transactionsData.get(transactionId).updated.get(item._id)[key] = evaluatedValue;
          }
        }
      }
      if (isUpdated) {
        result.modified = result.modified + 1;
      }
    }
    result.executionTime = Date.now() - result.executionTime;
    if (!transactionExists && result.modified) {
      publishEventEmitter.emit('publish', {
        database: this.db.name,
        collection: this.name,
        action: ClientActions.UPDATE,
        affectedIds: items.map((item: any) => item._id),
        data: updateData,
      });
    }
    return result;
  }

  public getItemsIdArray(filterQueries: any[]): string[] {
    let results: any[] = [];
    for (let i = 0; i < filterQueries.length; i = i + 1) {
      const filterQuery = filterQueries[i];
      if (Object.keys(filterQuery).length) {
        const accumulator: any = {};
        for (const key in filterQuery) {
          if (Object.prototype.hasOwnProperty.apply(this.schema, [key])) {
            const propertyType: Types = this.schema[key].type;
            const type: Field =
              propertyType === Types.ARRAY
                ? this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items)
                : this.db.Types.get(this.schema[key].type);
            accumulator[key] = type.data.get(this.name).get(key).createCursor(filterQuery[key]);
          }
        }
        results = arrayConcatenation(results, arrayIntersection(...(Object.values(accumulator) as any[])));
      } else {
        results = arrayConcatenation(results, this.identifiers);
      }
    }
    this.transactionsData.forEach((t: TransactionsData) => {
      const { inserted } = t;
      results = arrayExcluding(results, inserted);
    });
    return results;
  }

  private getTransactionItemsIdArray(filterQueries: any[], transactionId: string): string[] {
    let results: any[] = [];
    for (let i = 0; i < filterQueries.length; i = i + 1) {
      const filterQuery = filterQueries[i];
      if (Object.keys(filterQuery).length) {
        const accumulator: any = {};
        for (const key in filterQuery) {
          if (Object.prototype.hasOwnProperty.apply(this.schema, [key])) {
            const propertyType: Types = this.schema[key].type;
            const type: Field =
              propertyType === Types.ARRAY
                ? this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items)
                : this.db.Types.get(this.schema[key].type);
            accumulator[key] = type.transactions
              .get(this.name)
              .get(key)
              .get(transactionId)
              .createCursor(filterQuery[key]);
          }
        }
        results = arrayConcatenation(results, arrayIntersection(...(Object.values(accumulator) as any[])));
        results = arrayExcluding(results, this.transactionsData.get(transactionId).removed);
      } else {
        results = arrayExcluding(
          this.transactionsData.get(transactionId).inserted,
          this.transactionsData.get(transactionId).removed,
        );
      }
    }
    return results;
  }

  public count(filterQueries: any[], transformQueries?: any[], transactionId?: string): number {
    this.validate.filterQueries(filterQueries);
    if (transformQueries) {
      this.validate.transformQueries(transformQueries);
    }
    const items: any[] = this.find(filterQueries, transformQueries, undefined, undefined, undefined, transactionId);
    return items.length;
  }

  private constructItems(
    constructItems: ConstructItems,
    transformQueries?: TransformQuery[],
    sortQuery?: Sorting,
    skip?: number,
    limit?: number,
  ) {
    let { base } = constructItems;
    const { transactionId, transaction } = constructItems;
    let result: any[] = [];
    const data: any = {};
    const transactionsData: any = {};
    if (transactionId && this.transactionsData.has(transactionId)) {
      base = arrayExcluding(base, this.transactionsData.get(transactionId).removed);
    }
    for (const key in this.schema) {
      const propertyType: Types = this.schema[key].type;
      const type: Field =
        propertyType === Types.ARRAY
          ? this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items)
          : this.db.Types.get(this.schema[key].type);
      data[key] = type.data.get(this.name).get(key).get(base);
      if (transaction && transactionId) {
        transactionsData[key] = type.transactions.get(this.name).get(key).get(transactionId).get(transaction);
      }
    }
    for (const _id of base) {
      const item: any = { _id };
      for (const key in data) {
        let override: boolean = false;
        let overrideValue: any;
        if (transactionId && this.transactionsData.has(transactionId)) {
          if (this.transactionsData.get(transactionId).updated.has(_id)) {
            override = Object.prototype.hasOwnProperty.apply(
              this.transactionsData.get(transactionId).updated.get(_id),
              [key],
            );
            overrideValue = this.transactionsData.get(transactionId).updated.get(_id)[key];
          }
        }
        if (override) {
          item[key] = overrideValue;
        } else {
          if (this.schema[key]?.type === Types.ARRAY) {
            item[key] = item[key] || [];
            if (data[key][_id]) {
              if (Array.isArray(data[key][_id])) {
                item[key].push(...data[key][_id]);
              } else {
                item[key].push(data[key][_id]);
              }
            }
          } else {
            if (data[key][_id]) {
              item[key] = data[key][_id];
            }
          }
        }
      }
      result.push(item);
    }
    if (transaction && transactionId) {
      for (const _id of transaction) {
        const item: any = { _id };
        for (const key in transactionsData) {
          if (this.schema[key]?.type === Types.ARRAY) {
            item[key] = item[key] || [];
            if (transactionsData[key][_id]) {
              if (Array.isArray(transactionsData[key][_id])) {
                item[key].push(...transactionsData[key][_id]);
              } else {
                item[key].push(transactionsData[key][_id]);
              }
            }
          } else {
            if (transactionsData[key][_id]) {
              item[key] = transactionsData[key][_id];
            }
          }
        }
        result.push(item);
      }
    }

    if (transformQueries) {
      result = this.aggregationFrameWork.aggregate(result, transformQueries);
    }

    if (sortQuery) {
      const keys: string[] = Object.keys(sortQuery);
      for (let i = 0; i < keys.length; i = i + 1) {
        const key: string = keys[i];
        const previousKey: string = keys[i - 1];
        result.sort((a: any, b: any) => {
          if (i === 0 || a[previousKey] === b[previousKey]) {
            const compareResult: boolean = a[key] > b[key];
            if (sortQuery[key] === -1) {
              return compareResult ? -1 : 1;
            }
            return compareResult ? 1 : -1;
          }
        });
      }
    }
    if (skip) {
      result = result.slice(skip, result.length);
    }
    if (limit) {
      result = result.slice(0, limit > result.length ? result.length : limit);
    }

    result = result.map((item: any) => {
      for (const key in item) {
        if (this.schema[key]?.type === Types.NUMBER) {
          item[key] = projectOutgoingValue(item[key], (this.schema[key] as NumberFieldDefinition).precision);
        }
      }
      return item;
    });

    return result;
  }

  protected removeRefs(id: string) {
    this.refs.forEach((ref) => {
      if (ref.has(id)) {
        ref.delete(id);
      }
    });
    this.refsHolder.forEach((holder, index) => {
      holder.forEach((item, key) => {
        if (Array.isArray(item)) {
          if (item.includes(id)) {
            item.splice(item.indexOf(id), 1);
          }
        } else {
          if (item === id) {
            holder.delete(key);
            const options: { [key: string]: string } = this.relatedCollections[index];
            const k: string = Object.keys(options)[0];
            const collection: Collection<T> = this.db.collections.get(options[k]);
            if ((collection.schema[k] as ReferenceFieldDefinition).triggerRemove) {
              collection.remove([{ _id: { $eq: key } }]);
            }
          }
        }
      });
    });
  }

  public ttlHandler() {
    const ttlKeys: string[] = [];
    for (const key in this.schema) {
      if (this.schema[key]?.type === Types.TIME && (this.schema[key] as TimeFieldDefinition).ttl) {
        ttlKeys.push(key);
      }
    }
    const ts: number = Date.now();
    for (let i = 0; i < ttlKeys.length; i = i + 1) {
      const key: string = ttlKeys[i];
      const filterQuery: any = {};
      filterQuery[key] = {
        $timestamp: {
          $lte: ts,
        },
      };
      this.remove([filterQuery]);
    }
  }
}
