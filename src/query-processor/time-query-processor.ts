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

  constructor(rawDataKeys: TimeQueryProcessorOptionsKeys, rawDataValues: Map<string, any>) {
    this.rawDataKeys = rawDataKeys;
    this.rawDataValues = Object.fromEntries(rawDataValues.entries()) as TimeQueryProcessorOptionsValues;
    this.queryProcessors = {};
    TIME_PARAMS.forEach((param: string) => {
      switch (param) {
        case 'raw':
          this.queryProcessors[`$${param}`] = new StringQueryProcessor({
            rawDataKeys: this.rawDataKeys[param],
            rawDataValues: this.rawDataValues[param],
          });
          break;
        case 'in':
        case 'nin':
        case 'eq':
        case 'ne':
        case 'gt':
        case 'lt':
        case 'gte':
        case 'lte':

          this.queryProcessors[`$${param}`] = new NumberQueryProcessor({
            rawDataKeys: this.rawDataKeys[param],
            rawDataValues: this.rawDataValues[param],
          });

          break
        default:
          this.queryProcessors[`$${param}`] = new NumberQueryProcessor({
            rawDataKeys: this.rawDataKeys[param],
            rawDataValues: this.rawDataValues[param],
          });
          break;
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
