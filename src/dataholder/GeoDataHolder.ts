import { IDataHolderMethodsParams } from '../params';
import { BaseQueryProcessor, GeoQueryProcessor } from '../queryProcessor';
import { IDataHolder, IGeo, IGeoDataHolderStorePart, IQuery } from '../structures';

export class GeoDataHolder implements IDataHolder {
  protected queryProcessorConstructor: GeoQueryProcessor;
  protected queryProcessor: GeoQueryProcessor;
  protected data: Map<string, IGeo>;
  protected identifiers: string[];

  constructor(queryProcessor: GeoQueryProcessor) {
    this.queryProcessorConstructor = queryProcessor;
    this.init();
  }

  protected init() {
    this.data = new Map<string, IGeo>();
    this.identifiers = [];
    this.queryProcessor = new GeoQueryProcessor({ data: this.data })
  }

  public create(params: IDataHolderMethodsParams<IGeo>) {
    this.set(params);
  }

  public update(params: IDataHolderMethodsParams<IGeo>, data: IDataHolderMethodsParams<IGeo>) {
    this.remove(params)
    this.set(data);
  }

  protected set(params: IDataHolderMethodsParams<IGeo>) {
    const { identifier, value } = params;
    if ( !this.identifiers.includes(identifier)) {
      this.identifiers.push(identifier)
    }
    this.data.set(identifier, value);
  }

  public remove(params: IDataHolderMethodsParams<IGeo>) {
    const { identifier } = params;
    if ( this.identifiers.includes(identifier)) {
      this.identifiers.splice(this.identifiers.indexOf(identifier), 1)
    }
    this.data.delete(identifier);
  }


  public get(params: string[]): { [key: string]: IGeo }[] {
    const result: any = {};
    const paramsLength: number = params.length;
    for ( let i=0; i < paramsLength; i = i + 1) {
      result[params[i]] = this.data.get(params[i]);
    }
    return result;
  }

  public createCursor(query: IQuery) {
    return this.queryProcessor.processQuery(query);
  }

  public store(): IGeoDataHolderStorePart {
    const result: any = {
      identifiers: this.identifiers,
      data: {}
    };
    this.data.forEach((item: IGeo, key: string) => {
      result.data[key] = item;
    });
    return result;
  }

  public restore(data: IGeoDataHolderStorePart) {
    this.identifiers = data.identifiers;
    for ( const key in data.data ) {
      this.data.set(key, data.data[key]);
    }
  }
}
