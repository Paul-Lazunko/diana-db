import { arrayIntersection } from '@helper';
import { GeoQueryProcessorOptions } from '@options';
import { Point, FindQuery } from '@dto';
import { InsideCircleParameters, NearLineParameters } from '@parameters';

export class PositionQueryProcessor {
  protected data: Map<string, Point>;

  constructor(options: GeoQueryProcessorOptions) {
    this.data = options.data;
  }

  public processQuery(query: FindQuery): string[] {
    const results: any = {};
    for (const key in query) {
      results[key] = this[key](query[key]);
    }
    return arrayIntersection(...(Object.values(results) as any[]));
  }

  public $insideCircle(options: InsideCircleParameters): string[] {
    const { center, radius } = options;
    const result: string[] = [];
    this.data.forEach((item: Point, key: string) => {
      const distance: number = this.getDistanceBetweenPoints(item, center);
      if (distance <= radius) {
        result.push(key);
      }
    });
    return result;
  }

  public $outsideCircle(options: InsideCircleParameters) {
    const { center, radius } = options;
    const result: string[] = [];
    this.data.forEach((item: Point, key: string) => {
      const distance: number = this.getDistanceBetweenPoints(item, center);
      if (distance > radius) {
        if (!result.includes(key)) {
          result.push(key);
        }
      }
    });
    return result;
  }

  public $insidePolygon(points: Point[]): string[] {
    const result: string[] = [];
    this.data.forEach((item: Point, key: string) => {
      if (this.checkIfPointInsidePolygon(item, points)) {
        if (!result.includes(key)) {
          result.push(key);
        }
      }
    });
    return result;
  }

  public $outsidePolygon(points: Point[]): string[] {
    const result: string[] = [];
    this.data.forEach((item: Point, key: string) => {
      if (!this.checkIfPointInsidePolygon(item, points)) {
        if (!result.includes(key)) {
          result.push(key);
        }
      }
    });
    return result;
  }

  public $nearLines(options: NearLineParameters): string[] {
    const { lines, distance } = options;
    const result: string[] = [];
    const linesLength: number = lines.length;
    for (let i = 0; i < linesLength; i = i + 1) {
      const line = lines[i];
      this.data.forEach((item: Point, key: string) => {
        const d: number = this.getDistanceToLine(item, line);
        if (d <= distance) {
          if (!result.includes(key)) {
            result.push(key);
          }
        }
      });
    }
    return result;
  }

  public $farFromLines(options: NearLineParameters): string[] {
    const { lines, distance } = options;
    const result: string[] = [];
    const linesLength: number = lines.length;
    for (let i = 0; i < linesLength; i = i + 1) {
      const line = lines[i];
      this.data.forEach((item: Point, key: string) => {
        const d: number = this.getDistanceToLine(item, line);
        if (d > distance) {
          if (!result.includes(key)) {
            result.push(key);
          }
        }
      });
    }
    return result;
  }

  protected getDistanceBetweenPoints(point: Point, anotherPoint: Point): number {
    return Math.sqrt(Math.pow(Math.abs(point.x - anotherPoint.x), 2) + Math.pow(Math.abs(point.y - anotherPoint.y), 2));
  }

  protected getDistanceToLine(point: Point, linePoints: Point[]) {
    const [
      a,
      b,
    ]: Point[] = linePoints;
    const ab = this.getDistanceBetweenPoints(a, b);
    const bc = this.getDistanceBetweenPoints(point, b);
    const ac = this.getDistanceBetweenPoints(point, a);
    const p: number = (ab + bc + ac) / 2;
    const s: number = Math.sqrt(p * (p - ab) * (p - ac) * (p - bc));
    return (2 * s) / ab;
  }

  protected checkIfPointInsidePolygon(item: Point, points: Point[]): boolean {
    const { x, y } = item;
    const pointsCount = points.length;
    let j = pointsCount - 1;
    let c: boolean = false;
    for (let i = 0; i < pointsCount; i = i + 1) {
      if (
        ((points[i].y <= y && y < points[j].y) || (points[j].y <= y && y < points[i].y)) &&
        x > ((points[j].x - points[i].x) * (y - points[i].y)) / (points[j].y - points[i].y) + points[i].x
      ) {
        c = !c;
      }
      j = i;
    }
    return c;
  }
}
