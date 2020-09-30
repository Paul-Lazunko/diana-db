import { Database } from '../database';
import { IBaseDataHolderStorePart, IDataHolder, IQuery } from '../structures';
import {IDataHolderMethodsParams} from '../params';
import { BaseQueryProcessor } from '../queryProcessor';
import { BooleanHolder } from './BooleanHolder';

export class BaseDataHolder<T> implements IDataHolder {

  protected isBooleanHolder: boolean = false;
  protected database: Database;
  protected rawDataValues: Map<string, T|T[]>;
  protected rawDataKeys: Map<T, string[]>;
  protected identifiers: string[];
  protected readonly queryProcessorConstructor: any;
  protected queryProcessor: BaseQueryProcessor<T>;

  constructor(queryProcessor: BaseQueryProcessor<T>, database?: Database) {
    this.queryProcessorConstructor = queryProcessor;
    if ( database ) {
      this.database = database;
    }
    this.init();
  }

  public init() {
    this.rawDataKeys = new Map<T, string[]>();
    this.rawDataValues =  new Map<string, T|T[]>();
    this.identifiers = [];
    this.queryProcessor = new this.queryProcessorConstructor({
      rawDataValues: this.rawDataValues,
      rawDataKeys: this.rawDataKeys
    })
  }

  public create(params: IDataHolderMethodsParams<T>) {
    const { identifier, value } = params;
    this.identifiers.push(identifier);
    if ( this.rawDataValues.has(identifier) ) {
      const oldValue: T | T[] = this.rawDataValues.get(identifier);
      if ( Array.isArray(oldValue) ) {
        if ( Array.isArray(value) ) {
          oldValue.push(...value);
        } else {
          oldValue.push(value);
        }
      } else {
        if ( Array.isArray(value) ) {
          // @ts-ignore
          this.rawDataValues.set(identifier, [ oldValue, ...value ])
        } else {
          // @ts-ignore
          this.rawDataValues.set(identifier, [ oldValue, value ])
        }
      }
    } else {
      this.rawDataValues.set(identifier, value);
    }

    if ( Array.isArray(value)) {
      for ( let i =0; i < value.length; i = i + 1 ) {
        if ( this.rawDataKeys.has(value[i]) ) {
          this.rawDataKeys.get(value[i]).push(identifier)
        } else {
          this.rawDataKeys.set(value[i], [identifier])
        }
      }
    } else {
      if ( this.rawDataKeys.has(value) ) {
        this.rawDataKeys.get(value).push(identifier)
      } else {
        this.rawDataKeys.set(value, [identifier])
      }
    }

  }

  public remove(params: IDataHolderMethodsParams<T>) {
    const { identifier, value } = params;
    this.identifiers.splice(this.identifiers.indexOf(identifier), 1);
    this.rawDataValues.delete(identifier);
    for ( const key of this.rawDataKeys.keys() ) {
      const item = this.rawDataKeys.get(key);
      if ( Array.isArray(item) ) {
        if ( item.includes(identifier)) {
          item.splice(item.indexOf(identifier), 1);
          if ( !item.length ) {
            this.rawDataKeys.delete(key as T)
          }
        }
      } else {
        if ( item === identifier ) {
          this.rawDataKeys.delete(key as T)
        }
      }
    }

  }

  public update(params: IDataHolderMethodsParams<T>, data: IDataHolderMethodsParams<T>) {
    this.remove(params);
    this.create(data);
  }

  public createCursor(query: IQuery) {
    return this.queryProcessor.processQuery(query);
  }

  public get(identifiers: string[]) {
    const result: {[key: string]: T|T[] } = {};
    for ( const identifier of identifiers ) {
      if( this.rawDataValues.has(identifier) ) {
        result[identifier] = this.rawDataValues.get(identifier);
      }
    }
    return result;
  }

  public store(): IBaseDataHolderStorePart {
    const result: any = {
      rawDataKeys: {},
      rawDataValues: {},
      identifiers: this.identifiers
    };

    this.rawDataValues.forEach((value: T, key: string) => {
      result.rawDataValues[key] = value;
    });
    this.rawDataKeys.forEach((value: any, key: T) => {
      result.rawDataKeys[key] = value;
    });
    return result;

  }

  public restore(data: IBaseDataHolderStorePart): void {
    const {
      rawDataKeys,
      rawDataValues,
      identifiers
    } = data;
    this.identifiers = identifiers;
    for ( const key in rawDataKeys ) {
      let k: any = key;
      if ( /^(true|false)$/.test(key) ) {
        k = key === 'true';
      } else if (/^(\d+|\.)$/.test(key) ) {
        k = /\./.test(key) ? parseFloat(key) : parseInt(key, 10);
      }
      this.rawDataKeys.set(k, rawDataKeys[key]);
    }
    for ( const key in rawDataValues ) {
      // @ts-ignore
      this.rawDataValues.set(key, rawDataValues[key]);
    }
  }


}
