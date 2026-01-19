import { DianaDB } from '@application';
import { Database } from '@database';

export interface RequestControllerOptions {
  dianaDB: DianaDB;
  databases: Map<string, Database>;
}
