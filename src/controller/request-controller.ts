import { DianaDB } from '@application';
import {
  clientAccess,
  ClientActions,
  DatabaseAccess,
  MigrationStatus,
  ServerActions,
  TransactionStatus,
  VERSION,
} from '@const';
import { Database } from '@database';
import { ErrorFactory } from '@error';
import { RequestControllerOptions } from '@options';
import { RemoveResult, Request, Response, TransformQuery, UpdateResult } from '@dto';
import { store } from '@store';
import { logger } from '@logger';
import { userStore } from '@user-store';
import { state } from '@state';
import { wal } from '../wal';

export class RequestController {
  protected databases: Map<string, Database>;
  protected dianaDB: DianaDB;

  protected nonRequiredCollectionActions: string[] = [
    ClientActions.GET_HEALTH,
    ClientActions.GET_DATABASE_NAMES,
    ClientActions.MIGRATE_DOWN,
    ClientActions.MIGRATE_UP,
    ClientActions.GET_MIGRATIONS,
    ClientActions.START_TRANSACTION,
    ClientActions.COMMIT_TRANSACTION,
    ClientActions.ROLLBACK_TRANSACTION,
    ClientActions.GET_COLLECTION_NAMES,
    ClientActions.CREATE_DATABASE,
    ClientActions.REMOVE_DATABASE,
    ClientActions.GET_COLLECTION_NAMES,
    ClientActions.ADD_USER,
    ClientActions.REMOVE_USER,
    ClientActions.GRANT_ACCESS,
    ClientActions.GET_VERSION,
  ];
  // Actions that run without a database and therefore without database access checks.
  // Migrations are not listed: they change global state and require WRITE access to the request's database.
  protected nonRequiredDbActions: string[] = [
    ClientActions.ADD_USER,
    ClientActions.REMOVE_USER,
    ClientActions.GET_DATABASE_NAMES,
    ClientActions.GET_HEALTH,
    ClientActions.GET_VERSION,
  ];

  constructor(options: RequestControllerOptions) {
    const { databases, dianaDB } = options;
    this.dianaDB = dianaDB;
    this.databases = databases;
  }

  public processRequest(request: Request): Response {
    const response: Response = {
      socket: request?.socket,
      requestId: request?.requestId,
      clientRequestId: request?.clientRequestId,
      requestGroupId: request?.requestGroupId,
      executionTime: Date.now(),
      action: ServerActions.RESPONSE,
      data: [],
    };
    try {
      const {
        database,
        collection,
        action,
        filterQueries,
        transformQueries,
        setData,
        sortQuery,
        skip,
        limit,
        transactionId,
        autoRollbackAfterMS,
        schema,
        migration,
        distinctKey,
        user,
        view,
      } = request;
      const requiresDb: boolean = !this.nonRequiredDbActions.includes(action);
      if (requiresDb && !database) {
        throw ErrorFactory.requestError('database name is required');
      }
      // Access is checked before the database is looked up, so users can't create databases they have no rights to.
      const hasGeneralDbAccess: boolean = this.checkDbAccess(user, database, DatabaseAccess.READ);
      if (!hasGeneralDbAccess && requiresDb) {
        throw ErrorFactory.accessError(`User "${user}" doesn't have access to the database "${database}"`);
      }
      const hasAccessToAction: boolean = this.checkClientActionAccess(user, database, action);
      if (!hasAccessToAction && requiresDb) {
        throw ErrorFactory.accessError(`Action "${action}" not allowed for user "${user}" in database "${database}"`);
      }
      const db: Database = requiresDb ? this.getDatabase(database) : undefined;
      if (
        action !== ClientActions.ADD_COLLECTION &&
        action !== ClientActions.CREATE_COLLECTION &&
        !this.nonRequiredCollectionActions.includes(action)
      ) {
        this.checkCollectionExistence(db, collection);
      }
      if (Array.isArray(transformQueries) && transformQueries.length) {
        const databases = transformQueries
          .filter((item: TransformQuery) => item && item.$lookup && item.$lookup.database)
          .map((item: TransformQuery) => item.$lookup.database);
        const hasNoAccessToThisDatabase: string = databases.find(
          (database: string) => !this.checkDbAccess(user, database, DatabaseAccess.READ),
        );
        if (hasNoAccessToThisDatabase) {
          throw ErrorFactory.accessError(
            `User "${user}" doesn't have read access to the database "${hasNoAccessToThisDatabase}"`,
          );
        }
      }
      const dbExists: boolean = database && this.databases.has(database);

      switch (action) {
        case ClientActions.GET_VERSION:
          response.data = { version: VERSION };
          break;
        case ClientActions.GET_HEALTH:
          response.data = state.injected.health;
          break;
        case ClientActions.GET_DATABASE_NAMES:
          response.data = this.getDatabases(user);
          break;
        case ClientActions.CREATE_DATABASE:
          if (!dbExists) {
            this.databases.set(database, new Database({ name: database, dianaDB: this.dianaDB }));
            userStore.set(`user.${user}.db.${database}`, DatabaseAccess.MODIFY);
            wal.append({ op: 'createDatabase', db: database });
          }
          response.data = { database, action: 'created' };
          break;
        case ClientActions.REMOVE_DATABASE:
          if (dbExists) {
            this.databases.get(database).destroy();
            this.databases.delete(database);
            store.set(`db.${database}`, undefined);
            wal.append({ op: 'removeDatabase', db: database });
          }
          response.data = { database, action: 'removed' };
          break;
        case ClientActions.GET_MIGRATIONS:
          response.data = Object.keys(this.dianaDB.migrations);
          break;
        case ClientActions.MIGRATE_UP:
          if (migration) {
            this.dianaDB.migrations[migration] = Date.now();
            wal.append({ op: 'migrateUp', name: migration, at: this.dianaDB.migrations[migration] });
            response.data = { migration: { name: migration, status: MigrationStatus.UP } };
            this.dianaDB.store();
          }
          break;
        case ClientActions.MIGRATE_DOWN:
          if (migration) {
            delete this.dianaDB.migrations[migration];
            wal.append({ op: 'migrateDown', name: migration });
            response.data = { migration: { name: migration, status: MigrationStatus.DOWN } };
            this.dianaDB.store();
          }
          break;
        case ClientActions.ADD_VIEW:
          db.collections.get(collection).createView(view, transformQueries);
          wal.append({ op: 'addView', db: database, c: collection, view, transformQueries });
          response.data = { view, action: 'created' };
          break;
        case ClientActions.REMOVE_VIEW:
          db.collections.get(collection).removeView(view);
          wal.append({ op: 'removeView', db: database, c: collection, view });
          response.data = { view, action: 'removed' };
          break;
        case ClientActions.ADD_COLLECTION:
        case ClientActions.CREATE_COLLECTION:
          const createdSchema: any = JSON.parse(JSON.stringify(schema || {})); // createCollection modifies schema
          db.createCollection(collection, schema);
          wal.append({ op: 'createCollection', db: database, c: collection, schema: createdSchema });
          response.data = { collection, action: 'created' };
          break;
        case ClientActions.UPDATE_COLLECTION:
          if (db.isCollectionSchemaLocked(collection)) {
            response.error = `Schema of the collection'${collection}' is locked`;
          } else {
            const updatedSchema: any = JSON.parse(JSON.stringify(schema || {}));
            db.updateCollection(collection, schema);
            wal.append({ op: 'updateCollection', db: database, c: collection, schema: updatedSchema });
            response.data = { collection, action: 'updated' };
          }
          break;
        case ClientActions.LOCK_COLLECTION_SCHEMA:
          db.lockCollectionSchema(collection);
          wal.append({ op: 'lockCollection', db: database, c: collection });
          response.data = { collection, locked: true };
          break;
        case ClientActions.GET_COLLECTION_VIEWS:
          response.data = db.getCollectionViews(collection);
          break;
        case ClientActions.GET_COLLECTION_SCHEMA_LOCK:
          const locked: boolean = db.getCollectionSchemaLock(collection);
          response.data = { collection, locked };
          break;
        case ClientActions.UNLOCK_COLLECTION_SCHEMA:
          db.unlockCollectionSchema(collection);
          wal.append({ op: 'unlockCollection', db: database, c: collection });
          response.data = { collection: collection, locked: false };
          break;
        case ClientActions.REMOVE_COLLECTION:
          db.removeCollection(collection);
          wal.append({ op: 'removeCollection', db: database, c: collection });
          response.data = { collection, action: 'removed' };
          break;
        case ClientActions.GET_COLLECTION_NAMES:
          response.data = db.getCollectionNames();
          break;
        case ClientActions.GET_COLLECTION_SCHEMA:
          response.data = {
            schema: db.getCollectionSchema(collection),
            locked: db.getCollectionSchemaLock(collection),
          };
          break;
        case ClientActions.FIND:
          const resultFind: any[] = db.collections
            .get(collection)
            .find(filterQueries, transformQueries, sortQuery, skip, limit, transactionId);
          response.data = resultFind;
          break;
        case ClientActions.FIND_BY_VIEW:
          const result: any[] = db.collections
            .get(collection)
            .findByView(view, filterQueries[0], sortQuery, skip, limit);
          response.data = result;
          break;
        case ClientActions.COUNT_BY_VIEW:
          response.data = db.collections.get(collection).countByView(view, filterQueries[0]);
          break;
        case ClientActions.DISTINCT:
          const resultDistinct: any[] = db.collections.get(collection).distinct(distinctKey);
          response.data = resultDistinct;
          break;
        case ClientActions.MAX:
          response.data = db.collections.get(collection).max(distinctKey);
          break;
        case ClientActions.MIN:
          response.data = db.collections.get(collection).min(distinctKey);
          break;
        case ClientActions.COUNT:
          const resultCount: number = db.collections
            .get(collection)
            .count(filterQueries, transformQueries, transactionId);
          response.data = resultCount;
          break;
        case ClientActions.INSERT:
          const resultInsert: any[] = db.collections.get(collection).insert(setData, transactionId);
          response.data = resultInsert;
          break;
        case ClientActions.UPDATE:
          const resultUpdate: UpdateResult = db.collections
            .get(collection)
            .update(filterQueries, setData, transactionId);
          response.found = resultUpdate.found;
          response.modified = resultUpdate.modified;
          break;
        case ClientActions.REMOVE:
          const resultRemove: RemoveResult = db.collections.get(collection).remove(filterQueries, transactionId);
          response.found = resultRemove.found;
          response.removed = resultRemove.removed;
          break;
        case ClientActions.START_TRANSACTION:
          const id: string = db.startTransaction(autoRollbackAfterMS);
          response.data = { transactionId: id };
          break;
        case ClientActions.ROLLBACK_TRANSACTION:
          db.rollbackTransaction(transactionId);
          response.data = { transactionId, status: TransactionStatus.ROLLED_BACK };
          break;
        case ClientActions.COMMIT_TRANSACTION:
          db.commitTransaction(transactionId);
          response.data = { transactionId, status: TransactionStatus.COMMITTED };
          break;
      }
    } catch (e) {
      logger.error(e);
      response.error = e.message;
    }
    response.executionTime = Date.now() - response.executionTime;
    return response;
  }

  protected getDatabases(user: string): string[] {
    if (!user) {
      return [];
    }
    const databases = Array.from(state.injected.dianaDB.databases.keys());
    return databases.filter((database: string) => this.checkDbAccess(user, database, DatabaseAccess.READ));
  }

  /** Returns the database, creating it on first use. Callers must check access first. */
  private getDatabase(name: string) {
    if (name && !this.databases.has(name)) {
      const database = new Database({ name, dianaDB: this.dianaDB });
      this.databases.set(name, database);
      wal.append({ op: 'createDatabase', db: name });
      store.set(`db.${name}`, database.store());
    }
    return this.databases.get(name);
  }

  private checkCollectionExistence(db: Database, collection: string) {
    if (!db.collections.has(collection)) {
      throw ErrorFactory.requestError(`collection with name '${collection}' doesn't exist`);
    }
  }

  private checkDbAccess(user: string, db: string, databaseAccess: DatabaseAccess): boolean {
    const currentAccess = userStore.get(`user.${user}.db.${db}`);
    if (!currentAccess) {
      return false;
    }
    return parseInt(currentAccess, 10) >= databaseAccess;
  }

  private checkClientActionAccess(user: string, db: string, action: ClientActions): boolean {
    const currentAccess = userStore.get(`user.${user}.db.${db}`);
    const requiredAccess = clientAccess[action];
    if (!currentAccess || !requiredAccess) {
      return false;
    }
    return parseInt(currentAccess, 10) >= requiredAccess;
  }
}
