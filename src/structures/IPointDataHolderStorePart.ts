import { IPoint } from './IPoint';

export interface IPointDataHolderStorePart {
  data: { [key: string ] : IPoint },
  identifiers: string[]
}
