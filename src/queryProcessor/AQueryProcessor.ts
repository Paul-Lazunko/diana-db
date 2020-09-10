import {
    IQueryProcessor,
} from '../structures';
import {
    IQueryProcessorOptions
} from '../options';
import {
    TQuery
} from '../constants';

export abstract class AQueryProcessor implements IQueryProcessor {

    protected rawDataValues: any;
    protected rawDataKeys: any;
    protected structData: any;

    protected constructor(options: IQueryProcessorOptions) {
        const { structData, rawDataValues, rawDataKeys } = options;
        this.rawDataValues = rawDataValues;
        this.rawDataKeys = rawDataKeys;
        this.structData = structData;
    }

    public abstract processQuery(query: TQuery): string[]

}
