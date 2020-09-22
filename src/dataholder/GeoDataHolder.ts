import { IDataHolderMethodsParams } from '../params';
import { BaseQueryProcessor, PointQueryProcessor } from '../queryProcessor';
import { IDataHolder, IPoint, IPointDataHolderStorePart, IQuery } from '../structures';

export class GeoDataHolder implements IDataHolder {
  protected queryProcessorConstructor: PointQueryProcessor;
  protected queryProcessor: PointQueryProcessor;
  protected data: Map<string, IPoint>;
  protected identifiers: string[];

  constructor(queryProcessor: PointQueryProcessor) {
    this.queryProcessorConstructor = queryProcessor;
    this.init();
  }

  protected init() {
    this.data = new Map<string, IPoint>();
    this.identifiers = [];
    this.queryProcessor = new PointQueryProcessor({ data: this.data })
  }

  public create(params: IDataHolderMethodsParams<IPoint>) {
    this.set(params);
  }

  public update(params: IDataHolderMethodsParams<IPoint>, data: IDataHolderMethodsParams<IPoint>) {
    this.remove(params)
    this.set(data);
  }

  protected set(params: IDataHolderMethodsParams<IPoint>) {
    const { identifier, value } = params;
    if ( !this.identifiers.includes(identifier)) {
      this.identifiers.push(identifier)
    }
    this.data.set(identifier, value);
  }

  public remove(params: IDataHolderMethodsParams<IPoint>) {
    const { identifier } = params;
    if ( this.identifiers.includes(identifier)) {
      this.identifiers.splice(this.identifiers.indexOf(identifier), 1)
    }
    this.data.delete(identifier);
  }


  public get(params: string[]): { [key: string]: IPoint }[] {
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

  public store(): IPointDataHolderStorePart {
    const result: any = {
      identifiers: this.identifiers,
      data: {}
    };
    this.data.forEach((item: IPoint, key: string) => {
      result.data[key] = item;
    });
    return result;
  }

  public restore(data: IPointDataHolderStorePart) {
    this.identifiers = data.identifiers;
    for ( const key in data.data ) {
      this.data.set(key, data.data[key]);
    }
  }
}
