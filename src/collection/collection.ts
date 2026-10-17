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
  evaluatePointer,
  findValueWithMode,
  isPointer,
  objectIdHelper,
  projectIncomingValue,
  projectOutgoingValue,
} from '@helper';
import { Validator } from '@validator';
import { TransactionsData } from './transactions-data';
import { publishEventEmitter, viewEventEmitter } from '@event-emitter';
import {
  ArrayFieldDefinition,
  NumberFieldDefinition,
  ReferenceFieldDefinition,
  Schema,
  StringFieldDefinition,
  TimeFieldDefinition,
} from './schema';
import { TransformQuery } from '@dto';
import { ErrorFactory } from '@error';
import { triggerEventNamesExtractor } from '../helpers/trigger-event-names-extractor';
import { logger } from '@logger';

export class Collection<T> {
  public db: Database;
  public name: string;
  public viewTriggerEventName: string;
  public schema: Schema<T>;
  public isSchemaLocked: boolean;
  public schemaUpdated: Record<string, number>;
  public identifiers: Set<string>;
  protected validate: Validator;

  public transactionsData: Map<string, TransactionsData>;
  protected transactionsTimers: Map<string, NodeJS.Timeout>;

  protected transactionsLocks: Map<string, string>;
  protected transactionsLocksGroups: Map<string, string[]>; // transactionId, keys[]

  private aggregationFrameWork: AggregationFramework;
  private refs: Map<string, string | string[]>[] = [];
  private refsHolder: Map<string, string | string[]>[] = [];
  private relatedCollections: { [key: string]: string }[] = [];
  public views: Record<string, { transformQueries: TransformQuery[]; items?: any[] }>;
  private readonly viewTriggerEventHandlers: Record<string, () => void>;
  private readonly viewTriggerEventHandlersStates: Record<string, boolean>;

  constructor(
    name: string,
    schema: Schema<T>,
    db: Database,
    schemaUpdated?: Record<string, number>,
    views?: Record<string, { transformQueries: TransformQuery[]; schema: Schema<any>; items?: any[] }>,
  ) {
    this.name = name;
    this.db = db;
    this.viewTriggerEventName = `${db.name}.${name}`;
    this.schemaUpdated = schemaUpdated || {};
    this.schema = Object.assign({ _id: { type: Types.OBJECT_ID, unique: true } }, schema);
    for (const key in this.schema) {
      this.schemaUpdated[key] = Date.now();
    }
    this.identifiers = new Set();
    this.transactionsData = new Map<string, TransactionsData>();
    this.transactionsTimers = new Map<string, NodeJS.Timeout>();
    this.transactionsLocksGroups = new Map<string, string[]>();
    this.transactionsLocks = new Map<string, string>();
    this.aggregationFrameWork = new AggregationFramework({ collection: this });
    this.validate = new Validator({ collection: this });
    this.views = {};
    this.viewTriggerEventHandlers = {};
    this.viewTriggerEventHandlersStates = {};
    for (const view in views) {
      this.createView(view, views[view].transformQueries);
    }
  }

  public lockSchema() {
    this.isSchemaLocked = true;
  }

  public unlockSchema() {
    this.isSchemaLocked = false;
  }

  public getViews() {
    const response = {};
    for ( const view in this.views) {
      response[view] = { transformQueries: this.views[view].transformQueries }
    }
    return response;
  }

  public createView(name: string, transformQueries: TransformQuery[]) {
    this.validate.transformQueries(transformQueries);
    this.views[name] = { transformQueries, items: [] };
    this.db.addName(name);
    let events = triggerEventNamesExtractor(transformQueries, this.db.name);
    events.push(this.viewTriggerEventName);
    events = Array.from(new Set(events));
    for (const event of events) {
      this.viewTriggerEventHandlers[name] = () => {
        if (!this.viewTriggerEventHandlersStates[name]) {
          this.viewTriggerEventHandlersStates[name] = true;
          setTimeout(() => {
            try {
              this.constructViewItems(name);
            } catch(e) {
              logger.error(e);
            }
            this.viewTriggerEventHandlersStates[name] = false;
          }, 0);
        }
      };
      viewEventEmitter.on(event, this.viewTriggerEventHandlers[name]);
    }
    setTimeout(() => {
      try {
        this.constructViewItems(name);
      } catch (e) {
        logger.error(e);
      }
    }, 0);
  }

  public removeView(name: string) {
    if (this.views[name]) {
      for (const event of viewEventEmitter.eventNames().slice()) {
        viewEventEmitter.off(event, this.viewTriggerEventHandlers[name]);
      }
      delete this.views[name];
      this.db.removeName(name);
    }
  }

  protected constructViewItems(name: string) {
    if (this.views[name] && typeof this.views[name] === 'object') {
      this.views[name].items = this.find([{}], this.views[name].transformQueries);
    }
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
        try {
          this.removeLocks(transactionId);
          this.clearTransactionTimer(transactionId);
          this.removeTransactionData(transactionId);
        } catch(e) {
          logger.error(e);
        }
      }, ttl),
    );
  }

  public rollBackTransaction(transactionId: string) {
    this.removeLocks(transactionId);
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
              data = transactionHolder.get(this.name).get(key).get(transactionId).get([inserted[i]], (this.schema[key] as NumberFieldDefinition).precision);
              // Fields the document never set are skipped, as in a plain insert (undefined TIME values threw here).
              if (data[inserted[i]] === undefined) {
                break;
              }
              dataHolder.get(this.name).get(key).create({
                  identifier: inserted[i],
                  value: data[inserted[i]],
                },
                this.schema[key] as NumberFieldDefinition
                );
              break;
            default:
              type = this.db.Types.get(this.schema[key]?.type);
              dataHolder = type.data;
              transactionHolder = type.transactions;
              data = transactionHolder.get(this.name).get(key).get(transactionId).get([inserted[i]], (this.schema[key] as NumberFieldDefinition).precision);
              // Fields the document never set are skipped, as in a plain insert (undefined TIME values threw here).
              if (data[inserted[i]] === undefined) {
                break;
              }
              dataHolder.get(this.name).get(key).create({
                  identifier: inserted[i],
                  value: data[inserted[i]],
                },
                this.schema[key] as NumberFieldDefinition
              );
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
          undefined,
          true
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

  /** Throws if committing would duplicate a unique value that was committed after the transaction wrote it. */
  public validateTransactionCommit(transactionId: string) {
    if (!this.transactionsData.has(transactionId)) {
      return;
    }
    const { inserted } = this.transactionsData.get(transactionId);
    for (const key in this.schema) {
      if (!this.schema[key].unique || key === '_id') {
        continue;
      }
      const type: Field = this.db.Types.get(this.schema[key].type);
      const committed: any = type.data.get(this.name).get(key);
      const pending: any = type.transactions.get(this.name).get(key).get(transactionId);
      if (typeof committed?.hasValue !== 'function' || typeof pending?.getRawValue !== 'function') {
        continue;
      }
      for (const id of inserted) {
        const value = pending.getRawValue(id);
        if (value !== undefined && committed.hasValue(value)) {
          throw ErrorFactory.schemaError(`property '${key}' with value ${value} is used already`);
        }
      }
    }
  }

  public commitTransaction(transactionId: string) {
    this.clearTransactionTimer(transactionId);
    this.insertTransactionItems(transactionId);
    this.removeTransactionItems(transactionId);
    this.updateTransactionItems(transactionId);
    this.removeTransactionData(transactionId);
    this.removeLocks(transactionId);
    viewEventEmitter.emit(this.viewTriggerEventName);
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
        // Committed data is always checked; inside a transaction its pending data is checked as well.
        const holders = [type.data.get(this.name).get(key)];
        if (transactionExists) {
          holders.push(type.transactions.get(this.name).get(key).get(transactionId));
        }
        for (const dataHolder of holders) {
          if (typeof dataHolder.hasValue === 'function' && dataHolder.hasValue(data[key])) {
            throw ErrorFactory.schemaError(`property '${key}' with value ${data[key]} is used already`);
          }
        }
      }
      if (update && this.schema[key].mutable === false && Object.prototype.hasOwnProperty.apply(data, [key])) {
        throw ErrorFactory.schemaError(
          `property '${key}' of the '${this.name}' collection's Schema is not mutable`,
        );
      }
      if (!update && this.schema[key].required && !Object.prototype.hasOwnProperty.apply(data, [key])) {
        throw ErrorFactory.schemaError(`property '${key}' is required in the '${this.name}' collection's Schema`);
      }
      if ((this.schema[key] as StringFieldDefinition).uppercase && data[key]) {
        data[key] = data[key].toString().toUpperCase();
      }
      if ((this.schema[key] as StringFieldDefinition).lowercase && data[key]) {
        data[key] = data[key].toString().toLowerCase();
      }
    }
  }

  public insert(data: any, transactionId?: string, skip?: boolean): any {
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
      if (data[key] === undefined) {
        continue;
      }
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
            }, this.schema[key] as NumberFieldDefinition);
          }
          result[key] = data[key];
          break;
        default:
          const value = data[key];
          type = this.db.Types.get(this.schema[key].type);
          dataHolder = transactionExists
            ? type.transactions.get(this.name).get(key).get(transactionId)
            : type.data.get(this.name).get(key);

          dataHolder.create({
              identifier: result._id,
              value,
            },
            this.schema[key] as NumberFieldDefinition,
          );
          result[key] = data[key];
          break;
      }
    }
    if (!transactionExists) {
      viewEventEmitter.emit(this.viewTriggerEventName);
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
      throw ErrorFactory.schemaError(`property '${key}' doesn't exist in the '${this.name}' collection's Schema`);
    }
    const propertyType: Types = this.schema[key].type;
    const type: Field =
      propertyType === Types.ARRAY
        ? this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items)
        : this.db.Types.get(this.schema[key].type);
    return type.data.get(this.name).get(key).distinct((this.schema[key] as NumberFieldDefinition)?.precision);
  }

  public max(key: string): any[] {
    return this.getMaxOrMin(key, 'max');
  }

  public min(key: string): any[] {
    return this.getMaxOrMin(key, 'min');
  }

  protected getMaxOrMin(key: string, mode: 'min' | 'max') {
    if (!this.schema[key]) {
      throw ErrorFactory.schemaError(`property '${key}' doesn't exist in the '${this.name}' collection's Schema`);
    }
    const propertyType: Types = this.schema[key].type;
    const type: Field =
      propertyType === Types.ARRAY
        ? this.db.Types.get((this.schema[key] as ArrayFieldDefinition).items)
        : this.db.Types.get(this.schema[key].type);
    const values = type.data.get(this.name).get(key).distinct();

    const value: any[] = findValueWithMode(values, mode);
    return this.find([{ [key]: { $in: value } }], undefined, undefined, undefined, undefined, undefined, true );
  }

  public find(
    filterQueries: FindQuery[],
    transformQueries?: TransformQuery[],
    sortQuery?: Sorting,
    skip?: number,
    limit?: number,
    transactionId?: string,
    skipConversions?: boolean
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
            const precision = skipConversions ? undefined : (this.schema[key] as NumberFieldDefinition)?.precision;
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
    this.checkLocks(items, transactionId || '');
    if(transactionId) {
      this.setLocks(items, transactionId);
    }
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
    result.removed = items.length;
    result.executionTime = Date.now() - result.executionTime;
    if (!transactionId && items.length) {
      viewEventEmitter.emit(this.viewTriggerEventName);
      publishEventEmitter.emit(ServerActions.PUBLISH, {
        database: this.db.name,
        collection: this.name,
        action: ClientActions.REMOVE,
        affectedIds: items.map((item: any) => item._id),
      });
    }
    return result;
  }

  findByView(view: string, $match: FindQuery, $sort?: Sorting, $skip?: number, $limit?: number) {
    if (!this.views[view]) {
      throw ErrorFactory.schemaError(`view "${view}" doesn't exist`);
    }
    const transformQueries: TransformQuery[] = [
      {
        $match,
      },
    ];
    if ($sort) {
      transformQueries.push({
        $sort,
      });
    }
    if ($skip) {
      transformQueries.push({
        $skip,
      });
    }
    if ($limit) {
      transformQueries.push({
        $limit,
      });
    }
    return this.aggregationFrameWork.aggregate(this.views[view].items, transformQueries);
  }

  countByView(view: string, $match: FindQuery): number {
    if (!this.views[view]) {
      throw ErrorFactory.schemaError(`view "${view}" doesn't exist`);
    }
    const transformQueries: TransformQuery[] = [
      {
        $match,
      },
      {
        $group: {
          _id: '',
          count: { $sum: [1] },
        },
      },
    ];
    const result = this.aggregationFrameWork.aggregate(this.views[view].items, transformQueries);
    return (result && result[0] && result[0].count) || 0;
  }

  public update(filterQueries: FindQuery[], updateData: UpdateData<any>, transactionId?: string, skipCheckLocks?: boolean): UpdateResult {
    this.validate.filterQueries(filterQueries);
    this.validateData(updateData, transactionId, true);
    this.validate.data(updateData, true);
    const result: UpdateResult = {
      found: 0,
      modified: 0,
      executionTime: Date.now(),
    };
    const items: any[] = this.find(filterQueries, [], null, null, null, transactionId);
    if (!skipCheckLocks) {
      this.checkLocks(items, transactionId || '');
    }
    if (transactionId) {
      this.setLocks(items, transactionId);
    }
    result.found = items.length;
    const transactionExists: boolean = transactionId && this.transactionsData.has(transactionId);
    for (const item of items) {
      let isUpdated: boolean = false;
      if (transactionExists && !this.transactionsData.get(transactionId).updated.has(item._id)) {
        this.transactionsData.get(transactionId).updated.set(item._id, {});
      }
      for (const key in updateData) {
        // Pointers are evaluated per document; writing the result back into updateData
        // made every following document get the first document's value.
        const evaluatedValue = isPointer(updateData[key]) ? evaluatePointer(updateData[key], item) : updateData[key];
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
                    true
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
                    skipCheckLocks
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
      viewEventEmitter.emit(this.viewTriggerEventName);
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
      data[key] = type.data.get(this.name).get(key).get(base, (this.schema[key] as any).precision);
      if (transaction && transactionId) {
        transactionsData[key] = type.transactions.get(this.name).get(key).get(transactionId).get(transaction, (this.schema[key] as any).precision);
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
            if (data[key][_id] !== undefined) {
              if (Array.isArray(data[key][_id])) {
                item[key].push(...data[key][_id]);
              } else {
                item[key].push(data[key][_id]);
              }
            }
          } else {
            if (data[key][_id] !== undefined) {
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
            if (transactionsData[key][_id] !== undefined) {
              if (Array.isArray(transactionsData[key][_id])) {
                item[key].push(...transactionsData[key][_id]);
              } else {
                item[key].push(transactionsData[key][_id]);
              }
            }
          } else {
            if (transactionsData[key][_id] !== undefined) {
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
      result.sort((a: any, b: any) => {
        for (const key of keys) {
          const compareResult: number = this.compareValues(key, a[key], b[key]);
          if (compareResult !== 0) {
            return sortQuery[key] === -1 ? -compareResult : compareResult;
          }
        }
        return 0;
      });
    }
    if (skip) {
      result = result.slice(skip, result.length);
    }
    if (limit) {
      result = result.slice(0, limit > result.length ? result.length : limit);
    }

    return result;
  }

  /** Ascending comparison of two values of a schema field; missing values sort first. */
  protected compareValues(key: string, a: any, b: any): number {
    if (a === b) {
      return 0;
    }
    if (a === undefined || a === null) {
      return -1;
    }
    if (b === undefined || b === null) {
      return 1;
    }
    switch (this.schema[key]?.type) {
      case Types.TIME:
        return Math.sign(new Date(a).getTime() - new Date(b).getTime());
      case Types.OBJECT_ID:
      case Types.REFERENCE: {
        const result: number = Math.sign(parseInt(String(a).split('-')[2], 16) - parseInt(String(b).split('-')[2], 16));
        return Number.isNaN(result) ? String(a).localeCompare(String(b)) : result;
      }
      case Types.STRING:
        return String(a).localeCompare(String(b));
      case Types.NUMBER:
        return Math.sign(a - b);
      case Types.ARRAY:
        return Math.sign((a?.length || 0) - (b?.length || 0));
      case Types.BOOLEAN:
        return (a ? 1 : 0) - (b ? 1 : 0);
      default:
        return 0;
    }
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
          $lte: ts - (this.schema[key] as TimeFieldDefinition).ttl,
        },
      };
      this.remove([filterQuery]);
    }
  }


  protected checkLocks(items, transactionId) {
    const lockedItems = items
      .map((item: T & { _id }) => item._id)
      .filter((id: string) => this.transactionsLocks.has(id) && this.transactionsLocks.get(id) !== transactionId);

    if (lockedItems.length) {
      throw ErrorFactory.lockError(`some of requested documents are locked by transactions`);
    }
  }

  protected setLocks(items, transactionId) {
    const ids = items.map((item: T & { _id }) => item._id);
    const revisedIds: string[] = [];
    for (const id of ids) {
      if (this.transactionsLocks.has(id)) {
        continue;
      }
      this.transactionsLocks.set(id, transactionId);
      revisedIds.push(id);
    }
    if (this.transactionsLocksGroups.has(transactionId)) {
      const existing = this.transactionsLocksGroups.get(transactionId);
      this.transactionsLocksGroups.set(transactionId, [...existing, ...revisedIds]);
    } else {
      this.transactionsLocksGroups.set(transactionId, revisedIds);
    }
  }

  protected removeLocks(transactionId) {
    const ids = this.transactionsLocksGroups.get(transactionId);
    if (Array.isArray(ids)) {
      for (const id of ids) {
        this.transactionsLocks.delete(id);
      }
    }
    this.transactionsLocksGroups.delete(transactionId);
  }
}
