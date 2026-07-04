import { ClientActions } from './client-actions';
import { DatabaseAccess } from './database-access';

export const clientAccess: Record<ClientActions, DatabaseAccess> = {
  [ClientActions.REMOVE_VIEW]: DatabaseAccess.WRITE,
  [ClientActions.ADD_VIEW]: DatabaseAccess.READ,
  [ClientActions.FIND_BY_VIEW]: DatabaseAccess.READ,
  [ClientActions.COUNT_BY_VIEW]: DatabaseAccess.READ,
  [ClientActions.ADD_COLLECTION]: DatabaseAccess.WRITE,
  [ClientActions.ADD_USER]: DatabaseAccess.RESTRICTED,
  [ClientActions.COMMIT_TRANSACTION]: DatabaseAccess.WRITE, //
  [ClientActions.COUNT]: DatabaseAccess.READ,
  [ClientActions.CREATE_DATABASE]: DatabaseAccess.MODIFY,
  [ClientActions.DISTINCT]: DatabaseAccess.READ,
  [ClientActions.FIND]: DatabaseAccess.READ,
  [ClientActions.GET_COLLECTION_NAMES]: DatabaseAccess.READ, //
  [ClientActions.GET_COLLECTION_SCHEMA]: DatabaseAccess.READ,
  [ClientActions.GET_DATABASE_NAMES]: DatabaseAccess.READ,
  [ClientActions.GET_HEALTH]: DatabaseAccess.READ,
  [ClientActions.GET_MIGRATIONS]: DatabaseAccess.WRITE,
  [ClientActions.GRANT_ACCESS]: DatabaseAccess.RESTRICTED,
  [ClientActions.INSERT]: DatabaseAccess.WRITE,
  [ClientActions.MAX]: DatabaseAccess.READ,
  [ClientActions.MIGRATE_DOWN]: DatabaseAccess.WRITE,
  [ClientActions.MIGRATE_UP]: DatabaseAccess.WRITE,
  [ClientActions.MIN]: DatabaseAccess.READ,
  [ClientActions.REMOVE]: DatabaseAccess.WRITE,
  [ClientActions.REMOVE_COLLECTION]: DatabaseAccess.MODIFY,
  [ClientActions.REMOVE_USER]: DatabaseAccess.RESTRICTED,
  [ClientActions.ROLLBACK_TRANSACTION]: DatabaseAccess.WRITE,
  [ClientActions.START_TRANSACTION]: DatabaseAccess.WRITE,
  [ClientActions.UPDATE]: DatabaseAccess.WRITE,
  [ClientActions.UPDATE_COLLECTION]: DatabaseAccess.MODIFY,
  [ClientActions.LOCK_COLLECTION_SCHEMA]: DatabaseAccess.MODIFY,
  [ClientActions.UNLOCK_COLLECTION_SCHEMA]: DatabaseAccess.MODIFY,
  [ClientActions.GET_COLLECTION_SCHEMA_LOCK]: DatabaseAccess.MODIFY,
};
