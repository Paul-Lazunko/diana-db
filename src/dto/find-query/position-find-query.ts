import { Point } from '../index';

export type PositionFindQuery = {
  $insideCircle: {
    center: Point;
    radius: number;
  };
  $outsideCircle: {
    center: Point;
    radius: number;
  };
  $insidePolygon: Point[];
  $outsidePolygon: Point[];
  $nearLines: {
    lines: Point[][];
    distance: number;
  };
  $farFromLines: {
    lines: Point[][];
    distance: number;
  };
};
