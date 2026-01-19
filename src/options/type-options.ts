import { Types } from '@const';
import { Database } from '@database';

export interface TypeOptions {
  type: Types;
  database?: Database;
}
