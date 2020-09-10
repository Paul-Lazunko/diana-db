import {
  IDataHolder, ITimeHolderStorePart,
  ITimeQuery
} from '../structures';
import {
  TimeQueryProcessor
} from '../queryProcessor';
import { getDayOfYear, getWeek } from '../helpers';
import {ITimeParams, IDataHolderMethodsParams } from '../params';
import {TIME_PARAMS} from '../constants';

export class TimeHolder implements IDataHolder {
  private identifiersMap: Map<string, Map<string, number|string>>
  private year: Map<number, string[]>;
  private month: Map<number, string[]>;
  private date: Map<number, string[]>;
  private hours: Map<number, string[]>;
  private minutes: Map<number, string[]>;
  private seconds: Map<number, string[]>;
  private week: Map<number, string[]>;
  private dayOfWeek: Map<number, string[]>;
  private dayOfYear: Map<number, string[]>;
  private timestamp: Map<number, string[]>;
  private raw: Map<string, string[]>;
  private identifiers: string[];
  private readonly queryProcessorConstructor: any;
  private queryProcessor: TimeQueryProcessor;

  constructor(queryProcessor: TimeQueryProcessor) {
    this.queryProcessorConstructor = queryProcessor;
    this.init();
  }

  public init() {
    this.identifiersMap = new Map<string, Map<string, number|string>>();
    this.year = new Map<number, string[]>();
    this.month = new Map<number, string[]>();
    this.date = new Map<number, string[]>();
    this.hours = new Map<number, string[]>();
    this.minutes = new Map<number, string[]>();
    this.seconds = new Map<number, string[]>();
    this.week = new Map<number, string[]>();
    this.dayOfWeek = new Map<number, string[]>();
    this.dayOfYear = new Map<number, string[]>();
    this.timestamp = new Map<number, string[]>();
    this.raw = new Map<string, string[]>();
    this.identifiers = [];

    this.queryProcessor = new this.queryProcessorConstructor( {
        year: this.year,
        month: this.month,
        date: this.date,
        hours: this.hours,
        minutes: this.minutes,
        seconds: this.seconds,
        week: this.week,
        dayOfWeek: this.dayOfWeek,
        dayOfYear: this.dayOfYear,
        timestamp: this.timestamp,
        raw: this.raw
      },
      this.identifiersMap
    )
  }

  public create(params: IDataHolderMethodsParams<string>) {
    const { value, identifier } = params;
    this.identifiers.push(identifier);
    if ( Array.isArray(value) ) {
      for ( const v of value ) {
        const timeParams: ITimeParams = this.processDate(v);
        this.setData(timeParams, identifier);
      }
    } else {
      const timeParams: ITimeParams = this.processDate(value);
      this.setData(timeParams, identifier);
    }
  }

  protected processDate(dateString: string): ITimeParams {
    const processedValue = new Date(dateString);
    const year: number = processedValue.getFullYear();
    const month: number = processedValue.getMonth();
    const date: number = processedValue.getDate();
    const hours: number = processedValue.getHours();
    const minutes: number = processedValue.getMinutes();
    const seconds: number = processedValue.getSeconds();
    const week: number = getWeek(processedValue);
    const dayOfWeek: number = processedValue.getDay();
    const dayOfYear: number = getDayOfYear(processedValue);
    const timestamp: number = processedValue.getTime();
    const raw: string = new Date(dateString).toISOString();
    return {
      year,
      month,
      date,
      hours,
      minutes,
      seconds,
      week,
      dayOfWeek,
      dayOfYear,
      timestamp,
      raw
    };

  }

  protected setData(data: ITimeParams, identifier: string) {
    for ( const param in data ) {
      // @ts-ignore
      if ( this[param] ) {
        // @ts-ignore
        if ( this[param].has(data[param]) ) {
          // @ts-ignore
          this[param].get(data[param]).push(identifier)
        } else {
          // @ts-ignore
          this[param].set(data[param], [identifier])
        }
        // @ts-ignore
        if ( this.identifiersMap.has(param) ) {
          // @ts-ignore
          this.identifiersMap.get(param).set(identifier, data[param])
        } else {
          this.identifiersMap.set(param, new Map<string, number|string>())
          // @ts-ignore
          this.identifiersMap.get(param).set(identifier, data[param])
        }
      }
    }
  }

  remove(params: IDataHolderMethodsParams<string>) {
    const { identifier } = params;
    this.identifiers.splice(this.identifiers.indexOf(identifier), 1);
    TIME_PARAMS.forEach((param: string) => {
      // @ts-ignore
      const keys = this[param].keys();
      let value: any = true;
      while( value ) {
        value = keys.next().value;
        // @ts-ignore
        const data = this[param].get(value);
        if ( data ) {
          data.splice(data.indexOf(identifier),1);
        }
        // @ts-ignore
        this.identifiersMap.get(param).delete(identifier)
      }
    })
  }

  update(params: IDataHolderMethodsParams<string>, data: IDataHolderMethodsParams<string>) {
    this.remove(params);
    this.create(data);
  }

  createCursor(query: ITimeQuery) {
    return this.queryProcessor.processQuery(query);
  }

  get(identifiers: string[]) {
    const result: {[key: string]: string } = {};
    for ( const identifier of identifiers ) {
      // @ts-ignore
      if( this.identifiersMap.has('raw') && this.identifiersMap.get('raw').has(identifier) ) {
        // @ts-ignore
        result[identifier] =  this.identifiersMap.get('raw').get(identifier) as string;
      }
    }
    return result;
  }

  public store(): ITimeHolderStorePart {
    const result: any = {
      year: {},
      month: {},
      date: {},
      hours: {},
      minutes: {},
      seconds: {},
      week: {},
      dayOfWeek: {},
      dayOfYear: {},
      timestamp: {},
      raw: {},
    };
    for ( const key in result ) {
      // @ts-ignore
      if ( this[key] instanceof Map) {
        // @ts-ignore
        this[key].forEach((item: string[], k: number) => {
          result[key][k] = item;
        })
      }
    }
    result.identifiersMap = {};
    this.identifiersMap.forEach((item:Map<string, number|string>, j: string) => {
      result.identifiersMap[j] = {};
      item.forEach((v: number|string, k: string) => {
        result.identifiersMap[j][k] = v;
      })
    });
    result.identifiers = this.identifiers;
    return result;
  }

  public restore(data: ITimeHolderStorePart): void {
    const {
      year,
      month,
      date,
      hours,
      minutes,
      seconds,
      week,
      dayOfWeek,
      dayOfYear,
      timestamp,
      raw,
      identifiers,
      identifiersMap
    } = data;
    this.identifiers = identifiers;
    [
      {year},
      {month},
      {date},
      {hours},
      {minutes},
      {seconds},
      {week},
      {dayOfWeek},
      {dayOfYear},
      {timestamp},
      {raw}
      ].forEach((item: { [key: string]: any }) => {
        const key = Object.keys(item)[0];
        for ( const k in item[key] ) {
         if ( key === 'raw' ) {
           // @ts-ignore
           this[key].set(k, item[key][k])
         } else {
           // @ts-ignore
           this[key].set(parseInt(k,10), item[key][k])
         }
        }
    });
    for ( const key in identifiersMap ) {
      this.identifiersMap.set(key, new Map<string, string>())
      for ( const k in identifiersMap[key] ) {
        this.identifiersMap.get(key).set(k, identifiersMap[key][k])
      }
    }
  }


}
