import { TQuery } from '../constants';
import { arrayIntersection } from '../helpers';
import { IGeoQueryProcessorOptions, INearLineOptions } from '../options';
import { IPoint, IInsideCircleOptions, IQuery } from '../structures';

export class PointQueryProcessor {

  protected data: Map<string, IPoint>;

  constructor(options: IGeoQueryProcessorOptions) {
    this.data = options.data;
  }


  public processQuery(query: IQuery): string[] {
    const results: any = {};
    for( const key in query ) {
      // @ts-ignore
      results[key] = this[key](query[key]);
    }
    return arrayIntersection(...Object.values(results));
  }

  public $insideCircle(options: IInsideCircleOptions): string[] {
    const { center, radius } = options;
    const result: string[] = [];
    this.data.forEach((item: IPoint, key: string) => {
      const distance: number = this.getDistanceBetweenPoints(item, center);
      if ( distance <= radius ) {
        result.push(key);
      }
    });
    return result;
  }

  public $outsideCircle(options: IInsideCircleOptions) {
    const { center, radius } = options;
    const result: string[] = [];
    this.data.forEach((item: IPoint, key: string) => {
      const distance: number = this.getDistanceBetweenPoints(item, center);
      if ( distance > radius ) {
        if ( !result.includes(key) ) {
          result.push(key)
        }
      }
    });
    return result;
  }

  public $insidePolygon(points: IPoint[]): string[] {
    const result: string[] = [];
    this.data.forEach((item: IPoint, key: string) => {
      if ( this.checkIfPointInsidePolygon(item, points) ) {
        if ( !result.includes(key) ) {
          result.push(key)
        }
      }
    });
    return result;
  }

  public $outsidePolygon(points: IPoint[]): string[] {
    const result: string[] = [];
    this.data.forEach((item: IPoint, key: string) => {
      if ( !this.checkIfPointInsidePolygon(item, points) ) {
        if ( !result.includes(key) ) {
          result.push(key)
        }
      }
    });
    return result;
  }

  public $nearLines(options: INearLineOptions): string[] {
    const { lines, distance } = options;
    const result: string[] = [];
    const linesLength: number = lines.length;
    for ( let i = 0; i < linesLength; i = i + 1) {
      const line = lines[i];
      this.data.forEach((item: IPoint, key: string) => {
        const d: number = this.getDistanceToLine(item, line);
        if ( d <= distance ) {
          if ( !result.includes(key) ) {
            result.push(key)
          }
        }
      });
    }
    return result;
  }

  public $farFromLines(options: INearLineOptions): string[] {
    const { lines, distance } = options;
    const result: string[] = [];
    const linesLength: number = lines.length;
    for ( let i = 0; i < linesLength; i = i + 1) {
      const line = lines[i];
      this.data.forEach((item: IPoint, key: string) => {
        const d: number = this.getDistanceToLine(item, line);
        if ( d > distance ) {
          if ( !result.includes(key) ) {
            result.push(key)
          }
        }
      });
    }
    return result;
  }

  protected getDistanceBetweenPoints(point: IPoint, anotherPoint: IPoint): number {
    return Math.sqrt(
      Math.pow(Math.abs(point.x - anotherPoint.x), 2) + Math.pow(Math.abs(point.y - anotherPoint.y), 2)
    );
  }

  protected getDistanceToLine(point: IPoint, linePoints: IPoint[] ) {
    const [ a,b ]: IPoint[] = linePoints;
    const ab = this.getDistanceBetweenPoints(a,b);
    const bc = this.getDistanceBetweenPoints(point,b);
    const ac = this.getDistanceBetweenPoints(point,a);
    const p: number = (ab + bc + ac)/2;
    const s: number = Math.sqrt(p * (p - ab) * (p - ac) * (p - bc));
    return 2*s/ab;
  }

  protected checkIfPointInsidePolygon(item: IPoint, points: IPoint[]): boolean {
    const { x, y } = item;
    const pointsCount = points.length;
    let j = pointsCount - 1;
    let c: boolean = false;
    for ( let i = 0; i < pointsCount ; i = i + 1 ) {
      if (
        ((( points[i].y <= y ) && ( y < points[j].y )) || ( ( points[j].y <=y ) && ( y < points[i].y))) &&
        (x > (points[j].x - points[i].x) * (y - points[i].y) / (points[j].y - points[i].y) + points[i].x)) {
        c = !c
      }
      j = i;
    }
    return c;
  }


}
