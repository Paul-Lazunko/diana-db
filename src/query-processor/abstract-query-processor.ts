import { FindQuery } from '@dto';
import { QueryProcessorOptions } from '@options';
import { QueryProcessor } from './query-processor';

export abstract class AbstractQueryProcessor implements QueryProcessor {
  protected rawDataValues: any;
  protected rawDataKeys: any;

  protected constructor(options: QueryProcessorOptions) {
    const { rawDataValues, rawDataKeys } = options;
    this.rawDataValues = rawDataValues;
    this.rawDataKeys = rawDataKeys;
  }

  public abstract processQuery(query: FindQuery): string[];
}
