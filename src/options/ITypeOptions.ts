import {Types} from '../constants';
import { Database } from '../database';

export interface ITypeOptions {
  type: Types,
  database?: Database;
}
