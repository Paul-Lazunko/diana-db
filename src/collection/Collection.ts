import { EClientActions, Types } from '../constants';
import { IConstructItems, IDataHolder, IRemoveResult, ISchema, ISorting, IUpdateResult } from '../structures';
import { Database } from '../database';
import { Field } from '../field';
import { AggregationFramework } from '../aggregationFramework';
import { arrayConcatenation, arrayExcluding, arrayIntersection, objectIdHelper } from '../helpers';
import { Validator } from '../validator';
import { TransactionsData } from './TransactionsData';
import { publishEventEmitter } from '../eventEmmitter';

export class Collection {
  public name: string;
  public schema: ISchema;
  public db: Database;
  public identifiers: string[];
  protected validate: Validator;

  public transactionsData: Map<string, TransactionsData>;
  protected transactionsTimers: Map<string, NodeJS.Timeout>;

  private aggregationFrameWork: AggregationFramework;
  private refs: Map<string,string|string[]>[] = [];
  private refsHolder: Map<string,string|string[]>[] = [];
  private relatedCollections: {[key: string]: string}[] = [];

  constructor(name: string, schema: ISchema, db: Database) {
    this.name = name;
    this.db = db;
    this.schema = schema;
    this.identifiers = [];
    this.transactionsData = new Map<string, TransactionsData>();
    this.transactionsTimers = new Map<string, NodeJS.Timeout>();
    this.aggregationFrameWork = new AggregationFramework({ collection: this });
    this.validate = new Validator({ collection: this })
  }

  public startTransaction(transactionId: string, ttl: number) {
    this.transactionsData.set(transactionId, new TransactionsData());
    this.db.Types.forEach((type: Field) => {
      if (type.transactions.has(this.name) ) {
        type.transactions.get(this.name).forEach((item: Map<string, IDataHolder>, key: string) => {
          item.set(transactionId, type.getDataHolder())
        });
      }
    });
    this.transactionsTimers.set(transactionId,
      setTimeout(() => {
      this.clearTransactionTimer(transactionId);
      this.removeTransactionData(transactionId)
    }, ttl))
  }

  public rollBackTransaction(transactionId: string) {
    this.clearTransactionTimer(transactionId);
    this.removeTransactionData(transactionId);
  }

  protected clearTransactionTimer(transactionId: string) {
    if ( this.transactionsTimers.has(transactionId) ) {
      clearTimeout(this.transactionsTimers.get(transactionId));
      this.transactionsTimers.delete(transactionId);
    }
  }

  protected removeTransactionData(transactionId: string) {
    if ( this.transactionsData.has(transactionId) ) {
      this.transactionsData.delete(transactionId);
    }
    this.db.Types.forEach((type: Field) => {
      if (  type.transactions.has(this.name) ) {
        type.transactions.get(this.name).forEach((item: Map<string, IDataHolder>) => {
          item.delete(transactionId)
        });
      }
    });
  }

  protected insertTransactionItems(transactionId: string) {
    if ( this.transactionsData.has(transactionId) ) {
      const transactionData: TransactionsData = this.transactionsData.get(transactionId);
      const { inserted } = transactionData;
      for (let i = 0; i < inserted.length; i = i + 1) {
        this.identifiers.push(inserted[i])
        for (const key in this.schema) {
          const propertyType: Types = this.schema[key].type;
          let type: Field;
          let dataHolder: any;
          let transactionHolder: any;
          let data: any[];
          switch (propertyType) {
            case Types.ARRAY:
              type = this.db.Types.get(this.schema[key].items);
              dataHolder = type.data;
              transactionHolder = type.transactions;
              data = transactionHolder.get(this.name).get(key).get(transactionId).get([inserted[i]]);
              // @ts-ignore
              dataHolder.get(this.name).get(key).create({
                identifier: inserted[i],
                // @ts-ignore
                value: data[inserted[i]]
              });
              break;
            default:
              type = this.db.Types.get(this.schema[key].type);
              dataHolder = type.data;
              transactionHolder = type.transactions;
              data = transactionHolder.get(this.name).get(key).get(transactionId).get([inserted[i]]);
              // @ts-ignore
              dataHolder.get(this.name).get(key).create({
                identifier: inserted[i],
                // @ts-ignore
                value: data[inserted[i]]
              });
              break;
          }
        }
      }
      if ( inserted.length ) {
        publishEventEmitter.emit('publish', {
          database: this.db.name,
          collection: this.name,
          action: EClientActions.INSERT,
          affectedIds: inserted,
        })
      }
    }
  }

  protected updateTransactionItems(transactionId: string) {
    if ( this.transactionsData.has(transactionId) ) {
      const transactionData: TransactionsData = this.transactionsData.get(transactionId);
      const { updated } = transactionData;
      updated.forEach((item: { [key: string]: any }, id: string) => {
        const setData: any = {};
        for ( const k in item ) {
          // @ts-ignore
          setData[k] = item[k]
        }
        this.update([{
          _id: {
            $eq: id
          }
        }], setData)
      });
    }
  }

  protected removeTransactionItems(transactionId: string) {
    if ( this.transactionsData.has(transactionId) ) {
      const transactionData: TransactionsData = this.transactionsData.get(transactionId);
      const { removed } = transactionData;
      this.remove([{
        _id: {
          $in: removed
        }
      }]);
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
    refs: Map<string, string|string[]>,
    refsHolder:Map<string, string|string[]>,
    options: { [ key: string ]: string}) {
    this.refs.push(refs);
    this.refsHolder.push(refsHolder);
    this.relatedCollections.push(options)
  }

  public insert(data: any, transactionId?: string): any {
    this.validate.data(data);
    this.validate.requiredFields(data);
    this.validate.uniqueFields(data, transactionId);
    data._id =  objectIdHelper();
    const result: any = { _id: data._id };
    const transactionExists: boolean = transactionId && this.transactionsData.has(transactionId);
    if ( transactionExists ) {
      this.transactionsData.get(transactionId).inserted.push(data._id)
    }
    if ( !transactionExists ) {
      this.identifiers.push(result._id);
    }
    for ( const key in this.schema ) {
      const propertyType: Types = this.schema[key].type;
      let type: Field;
      let dataHolder: IDataHolder;
      switch( propertyType ) {
        case Types.ARRAY:
          type = this.db.Types.get(this.schema[key].items);
          dataHolder
            = transactionExists ? type.transactions.get(this.name).get(key).get(transactionId) : type.data.get(this.name).get(key);
          // @ts-ignore
          for (let i =0; i < data[key].length; i = i + 1 ) {
            dataHolder.create({
              identifier: result._id,
              // @ts-ignore
              value: data[key][i]
            });
          }
          result[key] = data[key];
          break;
        default:
          type = this.db.Types.get(this.schema[key].type);
          dataHolder
            = transactionExists ? type.transactions.get(this.name).get(key).get(transactionId) : type.data.get(this.name).get(key);
          // @ts-ignore
          dataHolder.create({
            identifier: result._id,
            // @ts-ignore
            value: data[key]
          });
          // @ts-ignore
          result[key] = data[key];
          break;
      }
    }
    if ( !transactionExists ) {
      publishEventEmitter.emit('publish', {
        database: this.db.name,
        collection: this.name,
        action: EClientActions.INSERT,
        affectedIds: [result._id],
      });
    }
    return result;
  }

  public find(
    filterQueries: any[],
    transformQueries?: any[],
    sortQuery?: any,
    skip?: number,
    limit?: number,
    transactionId?: string): any[] {
    if ( !filterQueries ) {
      filterQueries = [{}];
    }
    this.validate.filterQueries(filterQueries);
    if ( transformQueries ) {
      this.validate.transformQueries(transformQueries);
    }
    if ( sortQuery ) {
      this.validate.sortQuery(sortQuery)
    }
    if ( skip ) {
      this.validate.skip(skip)
    }
    if ( limit ) {
      this.validate.limit(limit)
    }
    const base: string[] = this.getItemsIdArray(filterQueries);
    const transaction: string[]
      = transactionId && this.transactionsData.has(transactionId) ?
      this.getTransactionItemsIdArray(filterQueries, transactionId) : undefined;
    return this.constructItems(
      { base, transaction, transactionId },
      transformQueries,
      sortQuery,
      skip,
      limit);
  }

  public remove(filterQueries: any[], transactionId?:string): IRemoveResult {
    const items: any[] = this.find(filterQueries,[], null, null,null, transactionId);
    const result: IRemoveResult = {
      nFound: 0,
      nRemoved: 0,
      operationTime: new Date().getTime()
    };
    result.nFound = items.length;
    if ( transactionId && this.transactionsData.has(transactionId) ) {
      this.transactionsData.get(transactionId).removed.push(...items.map((item: any) => item._id))
    } else {
      for ( const item of items ) {
        let doRemove: boolean = true;
        this.transactionsData.forEach((td: TransactionsData) => {
          const { updated } = td;
          updated.forEach((item: any, id: string) => {
            if ( id === item._id ) {
              doRemove = false;
            }
          })
        });
        if ( doRemove ) {
          this.identifiers.splice(this.identifiers.indexOf(item._id), 1);
          this.removeRefs(item._id);
          for ( const key in this.schema ) {
            const propertyType: Types = this.schema[key].type;
            const type: Field
              = propertyType === Types.ARRAY
              ? this.db.Types.get(this.schema[key].items)
              : this.db.Types.get(this.schema[key].type);
            type.data.get(this.name).get(key).remove({ identifier: item._id, value: item[key] })
          }
        }
      }
    }
    result.nRemoved = items.length;
    result.operationTime = new Date().getTime() - result.operationTime;
    if ( !transactionId && items.length ) {
      publishEventEmitter.emit('publish', {
        database: this.db.name,
        collection: this.name,
        action: EClientActions.REMOVE,
        affectedIds: items.map((item: any) => item._id),
      });
    }
    return result;
  }

  public update(filterQueries: any[], updateData: any, transactionId?: string): IUpdateResult {
    this.validate.filterQueries(filterQueries);
    this.validate.uniqueFields(updateData, transactionId);
    this.validate.mutableFields(updateData);
    this.validate.data(updateData);
    const result: IUpdateResult = {
      nFound: 0,
      nModified: 0,
      operationTime: new Date().getTime()
    };
    const items: any[] = this.find(filterQueries,[], null, null,null, transactionId);
    result.nFound = items.length;
    const transactionExists: boolean = transactionId && this.transactionsData.has(transactionId);
    for ( const item of items ) {
      let isUpdated: boolean = false;
      if ( transactionExists ) {
        this.transactionsData.get(transactionId).updated.set(item._id, {});
      }
      for ( const key in updateData ) {
        if ( this.schema[key] && item[key] !== updateData[key] ) {
          const propertyType: Types = this.schema[key].type;
          const type: Field
            = propertyType === Types.ARRAY
            ? this.db.Types.get(this.schema[key].items)
            : this.db.Types.get(this.schema[key].type);
          if (
            [null, undefined].includes(updateData[key])
            || ( Array.isArray(updateData[key]) && !updateData[key].length )
          ) {
            transactionExists
              ? type.transactions.get(this.name).get(key).get(transactionId).remove({ identifier: item._id, value: item[key] })
              : type.data.get(this.name).get(key).remove({ identifier: item._id, value: item[key] });
          } else {
            transactionExists
              ?
              type.transactions.get(this.name).get(key).get(transactionId).update({ identifier: item._id, value: item[key] }, {
                identifier: item._id, value: updateData[key]
              })
              : type.data.get(this.name).get(key).update({ identifier: item._id, value: item[key] }, {
              identifier: item._id, value: updateData[key]
            });
          }
          isUpdated = true;
          if ( transactionExists ) {
            this.transactionsData.get(transactionId).updated.get(item._id)[key] = updateData[key];
          }
        }
      }
      if ( isUpdated ) {
        result.nModified = result.nModified + 1;
      }
    }
    result.operationTime = new Date().getTime() - result.operationTime;
    if ( !transactionExists && result.nModified ) {
      publishEventEmitter.emit('publish', {
        database: this.db.name,
        collection: this.name,
        action: EClientActions.UPDATE,
        affectedIds: items.map((item: any) => item._id),
        data: updateData
      });
    }
    return result;
  }

  public getItemsIdArray(filterQueries: any[]): string[] {
    let results: any[] = [];
    for ( let i =0; i < filterQueries.length; i = i + 1 ) {
      const filterQuery = filterQueries[i];
      if ( Object.keys(filterQuery).length ) {
        const accumulator: any = {};
        for ( const key in filterQuery ) {
          if ( this.schema.hasOwnProperty(key) ) {
            const propertyType: Types = this.schema[key].type;
            const type: Field
              = propertyType === Types.ARRAY
              ? this.db.Types.get(this.schema[key].items)
              : this.db.Types.get(this.schema[key].type);
            accumulator[key] = type.data.get(this.name).get(key).createCursor(filterQuery[key])
          }
        }
        results = arrayConcatenation(results, arrayIntersection(...Object.values(accumulator)));
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

  private getTransactionItemsIdArray(filterQueries: any[], transactionId:string): string[] {
    let results: any[] = [];
    for ( let i =0; i < filterQueries.length; i = i + 1 ) {
      const filterQuery = filterQueries[i];
      if ( Object.keys(filterQuery).length ) {
        const accumulator: any = {};
        for ( const key in filterQuery ) {
          if ( this.schema.hasOwnProperty(key) ) {
            const propertyType: Types = this.schema[key].type;
            const type: Field
              = propertyType === Types.ARRAY
              ? this.db.Types.get(this.schema[key].items)
              : this.db.Types.get(this.schema[key].type);
            accumulator[key] = type.transactions.get(this.name).get(key).get(transactionId).createCursor(filterQuery[key]);
          }
        }
        results = arrayConcatenation(results, arrayIntersection(...Object.values(accumulator)));
        results = arrayExcluding(results, this.transactionsData.get(transactionId).removed);
      } else {
        results = arrayExcluding(this.transactionsData.get(transactionId).inserted, this.transactionsData.get(transactionId).removed);
      }
    }
    return results;
  }

  public count(filterQueries: any[], transformQueries?: any[], transactionId?: string): number {
    this.validate.filterQueries(filterQueries);
    if ( transformQueries ) {
      this.validate.transformQueries(transformQueries);
    }
    const items: any[] = this.find(filterQueries, transformQueries, transactionId);
    return items.length;
  }

  private constructItems(constructItems: IConstructItems, transformQueries?: any[], sortQuery?: ISorting,  skip?: number, limit?: number) {
    let { base } = constructItems;
    const { transactionId } = constructItems;
    let { transaction } = constructItems;
    let result: any[] = [];
    const data: any = {};
    const transactionsData: any = {};
    if ( transactionId && this.transactionsData.has(transactionId)) {
      console.log(base, this.transactionsData.get(transactionId).removed,'r')
      base = arrayExcluding(base, this.transactionsData.get(transactionId).removed);
    }
    for ( const key in this.schema ) {
      const propertyType: Types = this.schema[key].type;
      const type: Field
        = propertyType === Types.ARRAY
        ? this.db.Types.get(this.schema[key].items)
        : this.db.Types.get(this.schema[key].type);
      data[key] = type.data.get(this.name).get(key).get(base);
      if ( transaction && transactionId ) {
        transactionsData[key] = type.transactions.get(this.name).get(key).get(transactionId).get(transaction)
      }
    }
    for ( const _id of base ) {
      const item: any = { _id };
      for ( const key in data ) {
        let override: boolean = false;
        let overrideValue: any;
        if ( transactionId && this.transactionsData.has(transactionId) ) {
          if ( this.transactionsData.get(transactionId).updated.has(_id) ) {
            override = this.transactionsData.get(transactionId).updated.get(_id).hasOwnProperty(key);
            overrideValue = this.transactionsData.get(transactionId).updated.get(_id)[key];
          }
        }
        if ( override ) {
          item[key] = overrideValue;
        } else {
          if ( this.schema[key].type === Types.ARRAY ) {
            item[key] = item[key] || [];
            if (data[key][_id]) {
              if (  Array.isArray(data[key][_id]) ) {
                item[key].push(...data[key][_id])
              } else {
                item[key].push(data[key][_id])
              }
            }
          } else {
            if (  data[key][_id] ) {
              item[key] = data[key][_id]
            }
          }
        }
      }
      result.push(item)
    }
    if ( transaction && transactionId ) {
      for ( const _id of transaction ) {
        const item: any = { _id };
        for ( const key in transactionsData ) {
          if ( this.schema[key].type === Types.ARRAY ) {
            item[key] = item[key] || [];
            if (transactionsData[key][_id]) {
              if (  Array.isArray(transactionsData[key][_id]) ) {
                item[key].push(...transactionsData[key][_id])
              } else {
                item[key].push(transactionsData[key][_id])
              }
            }
          } else {
            if (  transactionsData[key][_id] ) {
              item[key] = transactionsData[key][_id]
            }
          }
        }
        result.push(item)
      }
    }

    if ( transformQueries ) {
      result = this.aggregationFrameWork.aggregate(result, transformQueries);
    }

    if ( sortQuery ) {
      const keys: string[] = Object.keys(sortQuery);
      for ( let i=0; i < keys.length; i = i + 1 ) {
        const key: string = keys[i];
        const previousKey: string = keys[i - 1];
        result.sort((a: any, b: any ) => {
          if ( i === 0 || a[previousKey] === b[previousKey] ) {
            const compareResult: boolean = a[key] > b[key];
            if ( sortQuery[key] === -1 ) {
              return compareResult ? -1 : 1
            }
            return compareResult ? -1 : 1
          }
        });
      }
    }
    if ( skip ) {
      result = result.slice(skip, result.length )
    }
    if ( limit ) {
      result = result.slice(0, limit > result.length ? result.length : limit);
    }
    return result;
  }


  protected removeRefs(id: string) {
    this.refs.forEach(ref => {
      if ( ref.has(id) ) {
        ref.delete(id);
      }
    });
    this.refsHolder.forEach((holder, index) => {
      holder.forEach((item, key) => {
        if ( Array.isArray(item) ) {
          if ( item.includes(id) ) {
            item.splice(item.indexOf(id), 1)
          }
        } else {
          if ( item === id ) {
            holder.delete(key);
            const options: {[key: string]: string} = this.relatedCollections[index];
            const k: string = Object.keys(options)[0];
            const collection: Collection = this.db.collections.get(options[k]);
            if ( collection.schema[k].triggerRemove ) {
              collection.remove([{ _id: { $eq: key }}])
            }
          }
        }
      })
    })
  }

  public ttlHandler() {
    const ttlKeys: string [] = [];
    for ( const key in this.schema ) {
      if ( this.schema[key].type === Types.TIME && this.schema[key].ttl ) {
        ttlKeys.push(key);
      }
    }
    const ts: number = new Date().getTime();
    for ( let i = 0; i < ttlKeys.length; i = i + 1 ) {
      const key: string = ttlKeys[i];
      const filterQuery: any = {};
      filterQuery[key] = {
        $timestamp: {
          $lte: ts
        }
      };
      this.remove([filterQuery]);
    }
  }

}
