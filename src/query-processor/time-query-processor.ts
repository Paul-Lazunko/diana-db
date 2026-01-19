import { NumberQueryProcessor } from './number-query-processor';
import { StringQueryProcessor } from './string-query-processor';
import { arrayIntersection } from '@helper';
import { TimeQueryProcessorOptionsKeys, TimeQueryProcessorOptionsValues } from '@options';
import { TIME_PARAMS } from '@const';
import { TimeFindQuery } from '@dto';

export class TimeQueryProcessor {
  private queryProcessors:
    | any
    | {
        $year: NumberQueryProcessor;
        $month: NumberQueryProcessor;
        $date: NumberQueryProcessor;
        $hours: NumberQueryProcessor;
        $minutes: NumberQueryProcessor;
        $seconds: NumberQueryProcessor;
        $week: NumberQueryProcessor;
        $dayOfWeek: NumberQueryProcessor;
        $dayOfYear: NumberQueryProcessor;
        $timestamp: NumberQueryProcessor;
        $raw: StringQueryProcessor;
      };

  private readonly rawDataKeys: TimeQueryProcessorOptionsKeys;

  private readonly rawDataValues: TimeQueryProcessorOptionsValues;
  private readonly rawDataTime: TimeQueryProcessorOptionsValues;

  constructor(rawDataKeys: TimeQueryProcessorOptionsKeys, rawDataValues: Map<string, any>) {
    this.rawDataKeys = rawDataKeys;
    this.rawDataValues = Object.fromEntries(rawDataValues.entries()) as TimeQueryProcessorOptionsValues;
    this.queryProcessors = {};
    TIME_PARAMS.forEach((param: string) => {
      if (param === 'raw' || param === 'rawDataTime') {
        this.queryProcessors[`$${param}`] = new StringQueryProcessor({
          rawDataKeys: this.rawDataKeys[param],
          rawDataValues: this.rawDataValues[param],
          rawDataTime: this.rawDataTime,
        });
      } else {
        this.queryProcessors[`$${param}`] = new NumberQueryProcessor({
          rawDataKeys: this.rawDataKeys[param],
          rawDataValues: this.rawDataValues[param],
          rawDataTime: this.rawDataKeys.rawDataTime,
        });
      }
    });
  }

  public processQuery(query: TimeFindQuery): string[] {
    const results: any = {};
    for (const key in query) {
      results[key] = this.queryProcessors[key].processQuery(query[key]);
    }
    return arrayIntersection(...(Object.values(results) as any[]));
  }
}
