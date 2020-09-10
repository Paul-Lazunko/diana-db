import { IGeo } from './IGeo';

export interface IGeoDataHolderStorePart {
  data: { [key: string ] : IGeo },
  identifiers: string[]
}
