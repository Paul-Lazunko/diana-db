import { IProjectionHelperOptions } from '../options';
import { AggregationFramework } from './AggregationFramework';
import { ArrayProjectionHelper } from './ArrayProjectionHelper';
import { MathProjectionHelper } from './MathProjectionHelper';
import { StringProjectionHelper } from './StringProjectionHelper';
import { TimeProjectionHelper } from './TimeProjectionHelper';

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
    '$ifNull'
  ];

  protected arrayProjectionKeys: string[] = [
    '$push',
    '$addToSet',
    '$concatArray'
  ];

  protected stringProjectionsKeys: string[] = [
    '$first',
    '$concat'
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
    '$timestamp'
  ];

  constructor(options: IProjectionHelperOptions) {
    this.aggregationFramework = options.aggregationFramework;
    this.mathProjectionHelper = new MathProjectionHelper();
    this.arrayProjectionHelper = new ArrayProjectionHelper();
    this.stringProjectionHelper = new StringProjectionHelper();
    this.timeProjectionHelper = new TimeProjectionHelper();
  }

  public project(items: any[], projectionSchema: any, root?: any) {
    let isRootReset: boolean = false;
    if ( !root ) {
      root = items[0];
      isRootReset = true;
    }
    const itemsLength: number = items.length;
    for ( let i = 0; i < itemsLength; i = i + 1 ) {
      for ( const key in projectionSchema ) {
        switch ( typeof projectionSchema[key] ) {
          case 'object':
            const method: string = Object.keys( projectionSchema[key])[0];
            if ( this.mathProjectionKeys.includes(method) ) {
              // @ts-ignore
              this.mathProjectionHelper[method]([items[i]], key, projectionSchema[key][method], root )
            } else if ( this.arrayProjectionKeys.includes(method) ) {
              // @ts-ignore
              this.arrayProjectionHelper[method]([items[i]], key, projectionSchema[key][method], root )
            } else if ( this.stringProjectionsKeys.includes(method) ) {
              // @ts-ignore
              this.stringProjectionHelper[method]([items[i]], key, projectionSchema[key][method], root )
            } else if ( this.timeProjectionsKeys.includes(method) ) {
              // @ts-ignore
              this.timeProjectionHelper[method]([items[i]], key, projectionSchema[key][method], root )
            }
            break;
          case 'string':
            root[key] = items[i][projectionSchema[key]] || projectionSchema[key];
            break;
          case 'boolean':
            root[key] = items[i][key];
            break;
          default:
            break
        }
      }
    }
    return isRootReset ? [root] : root;
  }

}
