import { DianaDB } from '../application';
import { Database } from '../database';

export interface IRequestControllerOptions {
  dianaDB: DianaDB,
  databases: Map<string, Database>
}
