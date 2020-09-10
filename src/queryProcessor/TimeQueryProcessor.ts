import { NumberQueryProcessor } from './NumberQueryProcessor';
import { StringQueryProcessor } from './StringQueryProcessor';
import { arrayIntersection } from '../helpers';
import {
    ITimeQueryProcessorOptionsKeys,
    ITimeQueryProcessorOptionsValues
} from '../options';
import { TIME_PARAMS } from '../constants';
import { ITimeQuery } from '../structures';

export class TimeQueryProcessor {

    private queryProcessors: any | {
         $year: NumberQueryProcessor,
         $month: NumberQueryProcessor,
         $date: NumberQueryProcessor,
         $hours: NumberQueryProcessor,
         $minutes: NumberQueryProcessor,
         $seconds: NumberQueryProcessor,
         $week: NumberQueryProcessor,
         $dayOfWeek: NumberQueryProcessor,
         $dayOfYear: NumberQueryProcessor,
         $timestamp: NumberQueryProcessor,
         $raw: StringQueryProcessor
    };

    private readonly rawDataKeys: ITimeQueryProcessorOptionsKeys

    private readonly rawDataValues: ITimeQueryProcessorOptionsValues

    constructor(rawDataKeys: ITimeQueryProcessorOptionsKeys, rawDataValues: ITimeQueryProcessorOptionsValues) {
        this.rawDataKeys = rawDataKeys;
        this.rawDataValues = rawDataValues;
        this.queryProcessors = {};
        TIME_PARAMS.forEach((param: string) => {
            if ( param === 'raw' ) {
                this.queryProcessors[`$${param}`] = new StringQueryProcessor({
                    rawDataKeys: this.rawDataKeys[param],
                    rawDataValues: this.rawDataValues[param]
                })
            } else {
                // @ts-ignore
                this.queryProcessors[`$${param}`] = new NumberQueryProcessor({
                    // @ts-ignore
                    rawDataKeys: this.rawDataKeys[param],
                    // @ts-ignore
                    rawDataValues: this.rawDataValues[param]
                })
            }
        });
    }

    public processQuery(query: ITimeQuery): string[] {
        const results: any = {};
        for( const key in query ) {
            // @ts-ignore
            results[key] = this.queryProcessors[key].processQuery(query[key]);
        }
        return arrayIntersection(...Object.values(results));
    }

}
