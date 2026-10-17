import { DataHolder, TimeHolderStorePart } from './index';
import { TimeFindQuery, UpdateTimeHolderItem } from '@dto';
import { TimeQueryProcessor } from '@query-processor';
import { addUnitOfTime, getDayOfYear, getWeek, toEndOf, toLastWeekday, toNextWeekday, toStartOf } from '@helper';
import { TimeParams, DataHolderMethodsParams } from '@parameters';
import { TIME_PARAMS, Types } from '@const';

export class TimeHolder implements DataHolder {
  protected type: Types = Types.TIME;
  private identifiersMap: Map<string, Map<string, number | string>>;
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
  private identifiers: Set<string>;
  private readonly queryProcessorConstructor: any;
  private queryProcessor: TimeQueryProcessor;

  constructor(queryProcessor: TimeQueryProcessor) {
    this.queryProcessorConstructor = queryProcessor;
    this.init();
  }

  public distinct(): string[] {
    return Array.from(this.raw.keys());
  }

  public hasValue(value: Date | number) {
    if (Object.prototype.hasOwnProperty.apply(value, ['getTime'])) {
      return this.timestamp.has((value as Date).getTime());
    }
    return this.timestamp.has(value as number);
  }

  public init() {
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
    this.identifiers = new Set<string>();
    this.identifiersMap = new Map<string, Map<string, number | string>>();
    this.initQueryProcessor();
  }

  protected initQueryProcessor() {
    this.queryProcessor = new this.queryProcessorConstructor(
      {
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
        raw: this.raw,
      },
      this.identifiersMap,
    );
  }

  public create(params: DataHolderMethodsParams<string>) {
    const { value, identifier } = params;
    this.identifiers.add(identifier);
    if (Array.isArray(value)) {
      for (const v of value) {
        const timeParams: TimeParams = this.processDate(v);
        this.setData(timeParams, identifier);
      }
    } else {
      const timeParams: TimeParams = this.processDate(value);
      this.setData(timeParams, identifier);
    }
  }

  protected processDate(dateString: string | number): TimeParams {

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
      raw,
    };
  }

  protected setData(data: TimeParams, identifier: string) {
    for (const param in data) {
      if (this[param]) {
        if (this[param].has(data[param])) {
          this[param].get(data[param]).push(identifier);
        } else {
          this[param].set(data[param], [identifier]);
        }
        if (this.identifiersMap.has(param)) {
          this.identifiersMap.get(param).set(identifier, data[param]);
        } else {
          this.identifiersMap.set(param, new Map<string, number | string>());
          this.identifiersMap.get(param).set(identifier, data[param]);
        }
      }
    }
  }

  remove(params: DataHolderMethodsParams<string>) {
    const { identifier } = params;
    this.identifiers.delete(identifier);
    TIME_PARAMS.forEach((param: string) => {
      // for...of instead of `while (value)`: keys such as hour 0 or weekday 0 ended the loop early.
      const values: any[] =  Array.from(this[param].keys());
      for (const value of values) {
        const data = this[param].get(value);
        if (Array.isArray(data) && data.includes(identifier)) {
          data.splice(data.indexOf(identifier), 1);
        }
      }
      this.identifiersMap.get(param)?.delete(identifier);
    });
  }

  update(params: DataHolderMethodsParams<string>, data: DataHolderMethodsParams<string>) {
    if (data.value && typeof data.value === 'object') {
      let value: number = 0;
      for (const action in data.value) {
        const oldValue: number = this.identifiersMap.get('timestamp').get(data.identifier) as number;
        switch (action) {
          case '$add':
          case '$subtract':
            const { amount, unit } = data.value[action] as UpdateTimeHolderItem;
            const multiplier = action === '$add' ? 1 : -1;
            value = addUnitOfTime(value || oldValue, amount, unit, multiplier);
            break;
          case '$toStartOf':
            value = toStartOf(value || oldValue, data.value[action]);
            break;
          case '$toEndOf':
            value = toEndOf(value || oldValue, data.value[action]);
            break;
          case '$toLastWeekday':
            value = toLastWeekday(value || oldValue, data.value[action]);
            break;
          case '$toNextWeekday':
            value = toNextWeekday(value || oldValue, data.value[action]);
            break;
        }
      }
      const date = new Date();
      date.setTime(value);
      data.value = date.toISOString();
    }
    this.remove(params);
    this.create(data);
  }

  createCursor(query: TimeFindQuery) {
    return this.queryProcessor.processQuery(query);
  }

  get(identifiers: string[]) {
    const result: { [key: string]: string } = {};
    for (const identifier of identifiers) {
      if (this.identifiersMap.has('raw') && this.identifiersMap.get('raw').has(identifier)) {
        result[identifier] = this.identifiersMap.get('raw').get(identifier) as string;
      }
    }
    return result;
  }

  public store(): TimeHolderStorePart {
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
    for (const key in result) {
      if (this[key] instanceof Map) {
        this[key].forEach((item: string[], k: number) => {
          result[key][k] = item;
        });
      }
    }
    result.identifiersMap = {};
    this.identifiersMap.forEach((item: Map<string, number | string>, j: string) => {
      result.identifiersMap[j] = {};
      item.forEach((v: number | string, k: string) => {
        result.identifiersMap[j][k] = v;
      });
    });
    result.identifiers = this.identifiers;
    return result;
  }

  public restore(data: TimeHolderStorePart): void {
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
      identifiersMap,
    } = data;
    if (identifiers) {
      this.identifiers = new Set(Array.from(identifiers)) || this.identifiers;
    }
    [
      { year },
      { month },
      { date },
      { hours },
      { minutes },
      { seconds },
      { week },
      { dayOfWeek },
      { dayOfYear },
      { timestamp },
      { raw },
    ].forEach((item: { [key: string]: any }) => {
      const key = Object.keys(item)[0];
      for (const k in data[key]) {
        if (key === 'raw') {
          this[key].set(k, data[key][k]);
        } else {
          this[key].set(parseInt(k, 10), data[key][k]);
        }
      }
    });
    for (const key in identifiersMap) {
      this.identifiersMap.set(key, new Map<string, string>());
      for (const k in identifiersMap[key]) {
        this.identifiersMap.get(key).set(k, identifiersMap[key][k]);
      }
    }
    this.initQueryProcessor();
  }
}
