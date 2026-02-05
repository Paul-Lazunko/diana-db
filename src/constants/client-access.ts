import { ClientActions } from './client-actions';
import { DatabaseAccess } from './database-access';

export const clientAccess: Record<ClientActions, DatabaseAccess> = {
  addCollection: DatabaseAccess.WRITE,
  addUser: DatabaseAccess.RESTRICTED, // cli-only
  commitTransaction: DatabaseAccess.WRITE,
  count: DatabaseAccess.READ,
  createDatabase: DatabaseAccess.MODIFY, //
  distinct: DatabaseAccess.READ,
  find: DatabaseAccess.READ,
  getCollectionNames: DatabaseAccess.READ,
  getCollectionSchema: DatabaseAccess.READ,
  getDatabaseNames: DatabaseAccess.READ, //
  getMigrations: DatabaseAccess.WRITE,
  grantAccess: DatabaseAccess.RESTRICTED, // cli-only action
  insert: DatabaseAccess.WRITE,
  max: DatabaseAccess.READ,
  migrateDown: DatabaseAccess.WRITE,
  migrateUp: DatabaseAccess.WRITE,
  min: DatabaseAccess.READ,
  remove: DatabaseAccess.WRITE,
  removeCollection: DatabaseAccess.MODIFY,
  removeUser: DatabaseAccess.RESTRICTED, // cli-only action
  rollbackTransaction: DatabaseAccess.WRITE,
  startTransaction: DatabaseAccess.WRITE,
  update: DatabaseAccess.WRITE,
  updateCollection: DatabaseAccess.WRITE,
};
