import { AQueryProcessor } from './AQueryProcessor';
import { IQueryProcessorOptions } from '../options';
import { TBooleanQuery, TQuery, TStringQuery } from '../constants';
import { arrayConcatenation, arrayIntersection } from '../helpers';

export class BaseQueryProcessor<T> extends AQueryProcessor {
    public constructor(options: IQueryProcessorOptions) {
        super(options);
    }

    public processQuery(query: TQuery): string[] {
        const results: any = {};
        for( const key in query ) {
            // @ts-ignore
            results[key] = this[key](query[key]);
        }
        return arrayIntersection(...Object.values(results));
    }

    $eq(value: T) {
        const keys: T[] = Array.from(this.rawDataKeys.keys());
        const compared: T[] = keys.filter((key: T) => key as T === value);
        return compared.length ? this.rawDataKeys.get(compared[0]) : []

    }

    $ne(value: T) {
        const keys: T[] = Array.from(this.rawDataKeys.keys());
        const compared: T[] = keys.filter((key: T) => key !== value);
        return compared.length ? this.rawDataKeys.get(compared[0]) : []
    }

    protected $in(values: T[]) {
        const data: string[] = [];
        for (let i = 0; i < values.length; i = i + 1 ) {
            if ( this.rawDataKeys.has(values[i]) ) {
                const items: string[] = this.rawDataKeys.get(values[i]);
                items.filter((item: string) => !data.includes(item)).forEach((item: string) => data.push(item))
            }
        }
        return data;
    }

    protected $nin(values: T[]) {
        const ids: string[] = this.$in(values);
        const identifiers: string[] = Object.keys(this.rawDataValues);
        return identifiers.filter(identifier => !ids.includes(identifier));
    }

    protected $gte(value: T) {
        const ids: string[][] = [];
        const keys: T[] = Array.from(this.rawDataKeys.keys());
        const compared: T[] = keys.filter((key: T) => key  as T >= value);
        for ( let i =0; i < compared.length; i = i + 1 ) {
            ids.push(this.rawDataKeys.get(compared[i]));
        }
        return arrayConcatenation(...ids);
    }

    protected  $lte(value: T) {
        const ids: string[][] = [];
        const keys: T[] = Array.from(this.rawDataKeys.keys());
        const compared: T[] = keys.filter((key: T) => key <= value);
        for ( let i =0; i < compared.length; i = i + 1 ) {
            ids.push(this.rawDataKeys.get(compared[i]));
        }
        return arrayConcatenation(...ids);
    }


    protected $gt(value: T) {
        const ids: string[][] = [];
        const keys: T[] = Array.from(this.rawDataKeys.keys());
        const compared: T[] = keys.filter((key: T) => key > value);
        for ( let i =0; i < compared.length; i = i + 1 ) {
            ids.push(this.rawDataKeys.get(compared[i]));
        }
        return arrayConcatenation(...ids);
    }

    protected  $lt(value: T) {
        const ids: string[][] = [];
        const keys: T[] = Array.from(this.rawDataKeys.keys());
        const compared: T[] = keys.filter((key: T) => key < value);
        for ( let i =0; i < compared.length; i = i + 1 ) {
            ids.push(this.rawDataKeys.get(compared[i]));
        }
        return arrayConcatenation(...ids);
    }


}
