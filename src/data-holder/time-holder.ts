import { DataHolder, TimeHolderStorePart } from './index';
import { TimeFindQuery, UpdateTimeHolderItem } from '@dto';
import { TimeQueryProcessor } from '@query-processor';
import { addUnitOfTime, getDayOfYear, getWeek, toEndOf, toLastWeekday, toNextWeekday, toStartOf } from '@helper';
import { TimeParams, DataHolderMethodsParams } from '@parameters';
import { TIME_PARAMS, Types } from '@const';
import { IdEntry, addId, deleteId, entryFromStored, forEachId, idsOf } from '../helpers/id-entry';

export class TimeHolder implements DataHolder {
  protected type: Types = Types.TIME;
  private identifiersMap: Map<string, Map<string, number | string>>;
  // One index per time part: value -> ids. Sets give O(1) removal.
  private year: Map<number, IdEntry>;
  private month: Map<number, IdEntry>;
  private date: Map<number, IdEntry>;
  private hours: Map<number, IdEntry>;
  private minutes: Map<number, IdEntry>;
  private seconds: Map<number, IdEntry>;
  private week: Map<number, IdEntry>;
  private dayOfWeek: Map<number, IdEntry>;
  private dayOfYear: Map<number, IdEntry>;
  private timestamp: Map<number, IdEntry>;
  private raw: Map<string, IdEntry>;
  // id -> the time parts it was indexed under (several for array fields), so removal touches only those entries.
  private valuesById: Map<string, TimeParams[]>;
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
    this.year = new Map<number, IdEntry>();
    this.month = new Map<number, IdEntry>();
    this.date = new Map<number, IdEntry>();
    this.hours = new Map<number, IdEntry>();
    this.minutes = new Map<number, IdEntry>();
    this.seconds = new Map<number, IdEntry>();
    this.week = new Map<number, IdEntry>();
    this.dayOfWeek = new Map<number, IdEntry>();
    this.dayOfYear = new Map<number, IdEntry>();
    this.timestamp = new Map<number, IdEntry>();
    this.raw = new Map<string, IdEntry>();
    this.identifiers = new Set<string>();
    this.valuesById = new Map<string, TimeParams[]>();
    this.identifiersMap = new Map<string, Map<string, number | string>>();
    // Created up front: the query processor captures these maps once, so a lazily created map was never seen by it.
    TIME_PARAMS.forEach((param: string) => this.identifiersMap.set(param, new Map<string, number | string>()));
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
        this.indexKey(param, data[param], identifier);
        if (!this.identifiersMap.has(param)) {
          this.identifiersMap.set(param, new Map<string, number | string>());
        }
        this.identifiersMap.get(param).set(identifier, data[param]);
      }
    }
    const values: TimeParams[] = this.valuesById.get(identifier);
    if (values) {
      values.push(data);
    } else {
      this.valuesById.set(identifier, [data]);
    }
  }

  protected indexKey(param: string, key: number | string, identifier: string) {
    addId(this[param], key, identifier);
  }

  /** Removes the id from the index entries it was stored under, instead of scanning every key of 11 indexes. */
  remove(params: DataHolderMethodsParams<string>) {
    const { identifier } = params;
    this.identifiers.delete(identifier);
    const values: TimeParams[] = this.valuesById.get(identifier);
    this.valuesById.delete(identifier);
    TIME_PARAMS.forEach((param: string) => {
      let found: boolean = !!values;
      for (const timeParams of values || []) {
        if (!deleteId(this[param], timeParams[param], identifier)) {
          found = false;
        }
      }
      if (!found) {
        // Entry not where expected (e.g. restored under a different time zone): scan this index.
        for (const key of Array.from(this[param].keys())) {
          deleteId(this[param], key, identifier);
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
        this[key].forEach((entry: IdEntry, k: number) => {
          result[key][k] = idsOf(entry);
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
    // Never read; kept empty so the dump format is unchanged.
    result.identifiers = [];
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
        const entry: IdEntry = entryFromStored(data[key][k]);
        if (entry === undefined) {
          continue;
        }
        if (key === 'raw') {
          this[key].set(k, entry);
        } else {
          this[key].set(parseInt(k, 10), entry);
        }
      }
    });
    // Rebuild id -> time parts from the raw values (not stored in the dump).
    this.valuesById.clear();
    this.raw.forEach((entry: IdEntry, rawValue: string) => {
      const timeParams: TimeParams = this.processDate(rawValue);
      forEachId(entry, (id: string) => {
        const values: TimeParams[] = this.valuesById.get(id);
        if (values) {
          values.push(timeParams);
        } else {
          this.valuesById.set(id, [timeParams]);
        }
      });
    });
    for (const key in identifiersMap) {
      this.identifiersMap.set(key, new Map<string, string>());
      for (const k in identifiersMap[key]) {
        this.identifiersMap.get(key).set(k, identifiersMap[key][k]);
      }
    }
    TIME_PARAMS.forEach((param: string) => {
      if (!this.identifiersMap.has(param)) {
        this.identifiersMap.set(param, new Map<string, number | string>());
      }
    });
    this.initQueryProcessor();
  }
}
