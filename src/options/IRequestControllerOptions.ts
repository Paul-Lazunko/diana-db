import { DiDB } from '../application';
import { Database } from '../database';

export interface IRequestControllerOptions {
  diDb: DiDB,
  databases: Map<string, Database>
}
