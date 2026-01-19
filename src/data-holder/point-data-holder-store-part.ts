import { Point } from '@dto';

export interface PointDataHolderStorePart {
  data: Record<string, Point>;
  identifiers: Set<string>;
}
