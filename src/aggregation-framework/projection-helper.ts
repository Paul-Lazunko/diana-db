import { AggregationFramework } from './aggregation-framework';
import { ArrayProjectionHelper } from './array-projection-helper';
import { MathProjectionHelper } from './math-projection-helper';
import { StringProjectionHelper } from './string-projection-helper';
import { TimeProjectionHelper } from './time-projection-helper';
import { ProjectionHelperOptions } from '@options';
import { evaluatePointer, isPointer } from '@helper';
import { ErrorFactory } from '@error';

export class ProjectionHelper {
  protected aggregationFramework: AggregationFramework;
  protected mathProjectionHelper: MathProjectionHelper;
  protected arrayProjectionHelper: ArrayProjectionHelper;
  protected stringProjectionHelper: StringProjectionHelper;
  protected timeProjectionHelper: TimeProjectionHelper;

  protected mathProjectionKeys: string[] = [
    '$sum',
    '$multiply',
    '$divide',
    '$subtract',
    '$ifNull',
    '$round',
    '$max',
    '$min',
    '$avg',
  ];

  protected arrayProjectionKeys: string[] = [
    '$push',
    '$addToSet',
    '$concatArray',
  ];

  protected stringProjectionsKeys: string[] = [
    '$first',
    '$last',
    '$concat',
    '$replace',
  ];

  protected timeProjectionsKeys: string[] = [
    '$year',
    '$month',
    '$date',
    '$hours',
    '$minutes',
    '$seconds',
    '$dayOfWeek',
    '$dayOfYear',
    '$week',
    '$timestamp',
  ];

  constructor(options: ProjectionHelperOptions) {
    this.aggregationFramework = options.aggregationFramework;
    this.mathProjectionHelper = new MathProjectionHelper();
    this.arrayProjectionHelper = new ArrayProjectionHelper();
    this.stringProjectionHelper = new StringProjectionHelper();
    this.timeProjectionHelper = new TimeProjectionHelper();
  }

  public project(items: any[], projectionSchema: any, aggregate: boolean = false) {
    const result: any[] = [];
    const root: any = {};
    const itemsLength: number = items?.length || 0;
    if (aggregate) {
      for (const key in projectionSchema) {
        switch (typeof projectionSchema[key]) {
          case 'object':
            const method: string = Object.keys(projectionSchema[key])[0];
            if (this.mathProjectionKeys.includes(method)) {
              this.mathProjectionHelper[method](items, key, projectionSchema[key][method], root, itemsLength);
            } else if (this.arrayProjectionKeys.includes(method)) {
              this.arrayProjectionHelper[method](items, key, projectionSchema[key][method], root);
            } else if (this.stringProjectionsKeys.includes(method)) {
              this.stringProjectionHelper[method](items, key, projectionSchema[key][method], root);
            } else if (this.timeProjectionsKeys.includes(method)) {
              this.timeProjectionHelper[method](items, key, projectionSchema[key][method], root);
            }
            break;
          default:
            throw ErrorFactory.collectionError(
              `$group requires to use aggregation functions instead of pointers or scalar values`,
            );
            break;
        }
      }
      return root;
    } else {
      for (let i = 0; i < itemsLength; i = i + 1) {
        const resultItem = {};
        for (const key in projectionSchema) {
          switch (typeof projectionSchema[key]) {
            case 'object':
              const method: string = Object.keys(projectionSchema[key])[0];
              if (this.mathProjectionKeys.includes(method)) {
                this.mathProjectionHelper[method](
                  [items[i]],
                  key,
                  projectionSchema[key][method],
                  aggregate ? root : resultItem,
                  itemsLength,
                  i,
                );
              } else if (this.arrayProjectionKeys.includes(method)) {
                this.arrayProjectionHelper[method](
                  [items[i]],
                  key,
                  projectionSchema[key][method],
                  aggregate ? root : resultItem,
                );
              } else if (this.stringProjectionsKeys.includes(method)) {
                this.stringProjectionHelper[method](
                  [items[i]],
                  key,
                  projectionSchema[key][method],
                  aggregate ? root : resultItem,
                );
              } else if (this.timeProjectionsKeys.includes(method)) {
                this.timeProjectionHelper[method](
                  [items[i]],
                  key,
                  projectionSchema[key][method],
                  aggregate ? root : resultItem,
                );
              }
              break;
            case 'string':
              resultItem[key] = isPointer(projectionSchema[key])
                ? evaluatePointer(projectionSchema[key], items[i])
                : projectionSchema[key];
              break;
            case 'boolean':
              if (aggregate && projectionSchema[key]) {
                resultItem[key] = resultItem[key] || items[i][key];
              } else if (projectionSchema[key]) {
                resultItem[key] = items[i][key];
              }
              break;
            default:
              break;
          }
        }
        result.push(resultItem);
      }
    }

    return result;
  }
}
