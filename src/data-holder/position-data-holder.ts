import { DataHolderMethodsParams } from '@parameters';
import { PositionQueryProcessor } from '@query-processor';
import { Point, FindQuery } from '@dto';
import { DataHolder, PointDataHolderStorePart } from './index';

export class PositionDataHolder implements DataHolder {
  protected queryProcessorConstructor: PositionQueryProcessor;
  protected queryProcessor: PositionQueryProcessor;
  protected data: Map<string, Point>;
  protected identifiers: Set<string>;

  constructor(queryProcessor: PositionQueryProcessor) {
    this.queryProcessorConstructor = queryProcessor;
    this.init();
  }

  public distinct(): Point[] {
    return Array.from(this.data.values());
  }

  public hasValue(value: Point) {
    return false;
  }

  protected init() {
    this.data = new Map<string, Point>();
    this.identifiers = new Set<string>();
    this.queryProcessor = new PositionQueryProcessor({ data: this.data });
  }

  public create(params: DataHolderMethodsParams<Point>) {
    this.set(params);
  }

  public update(params: DataHolderMethodsParams<Point>, data: DataHolderMethodsParams<Point>) {
    this.remove(params);
    this.set(data);
  }

  protected set(params: DataHolderMethodsParams<Point>) {
    const { identifier, value } = params;
    this.identifiers.add(identifier);
    this.data.set(identifier, value);
  }

  public remove(params: DataHolderMethodsParams<Point>) {
    const { identifier } = params;
    this.identifiers.delete(identifier);
    this.data.delete(identifier);
  }

  public get(params: string[]): { [key: string]: Point }[] {
    const result: any = {};
    const paramsLength: number = params.length;
    for (let i = 0; i < paramsLength; i = i + 1) {
      result[params[i]] = this.data.get(params[i]);
    }
    return result;
  }

  public createCursor(query: FindQuery) {
    return this.queryProcessor.processQuery(query);
  }

  public store(): PointDataHolderStorePart {
    const result: any = {
      identifiers: this.identifiers,
      data: {},
    };
    this.data.forEach((item: Point, key: string) => {
      result.data[key] = item;
    });
    return result;
  }

  public restore(data: PointDataHolderStorePart) {
    if (data?.identifiers) {
      this.identifiers = new Set(Array.from(data?.identifiers)) || this.identifiers;
    }
    for (const key in data.data) {
      this.data.set(key, data.data[key]);
    }
  }
}
