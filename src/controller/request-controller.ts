import { DianaDB } from '@application';
import { clientAccess, ClientActions, DatabaseAccess, MigrationStatus, ServerActions, TransactionStatus } from '@const';
import { Database } from '@database';
import { ErrorFactory } from '@error';
import { RequestControllerOptions } from '@options';
import {RemoveResult, Request, Response, TransformQuery, UpdateResult} from '@dto';
import { store } from '@store';
import { logger } from '@logger';
import { userReadStore } from '@user-store';

export class RequestController {
  protected databases: Map<string, Database>;
  protected dianaDB: DianaDB;

  protected nonRequiredCollectionActions: string[] = [
    ClientActions.MIGRATE_DOWN,
    ClientActions.MIGRATE_UP,
    ClientActions.GET_MIGRATIONS,
    ClientActions.START_TRANSACTION,
    ClientActions.COMMIT_TRANSACTION,
    ClientActions.ROLLBACK_TRANSACTION,
    ClientActions.GET_COLLECTION_NAMES,
    ClientActions.ADD_USER,
    ClientActions.REMOVE_USER,
  ];
  protected nonRequiredDbActions: string[] = [
    ClientActions.MIGRATE_DOWN,
    ClientActions.MIGRATE_UP,
    ClientActions.GET_MIGRATIONS,
    ClientActions.ADD_USER,
    ClientActions.REMOVE_USER,
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
      } = request;
      const db: Database = this.getDatabase(database, !this.nonRequiredDbActions.includes(action));
      const hasGeneralDbAccess: boolean = this.checkDbAccess(user, database, DatabaseAccess.READ);
      if (!hasGeneralDbAccess) {
        throw new Error(`User "${user}" doesn't have access to the database "${database}"`);
      }
      const hasAccessToAction: boolean = this.checkClientActionAccess(user, database, action);
      if (!hasAccessToAction) {
        throw new Error(`Action "${action}" not allowed for user "${user}" in database "${database}"`);
      }
      if (action !== ClientActions.ADD_COLLECTION && !this.nonRequiredCollectionActions.includes(action)) {
        this.checkCollectionExistence(db, collection);
      }
      if (Array.isArray(transformQueries) && transformQueries.length) {
        const databases = transformQueries
          .filter((item: TransformQuery) => item && item.$lookup && item.$lookup.database)
          .map((item: TransformQuery) => item.$lookup.database);
        const hasNoAccessTOThisDatabase: string = databases.find((database: string) => !this.checkDbAccess(user, database, DatabaseAccess.READ))
        if (hasNoAccessTOThisDatabase) {
          throw new Error(`User "${user}" doesn't have read access to the database "${hasNoAccessTOThisDatabase}"`);
        }
      }
      switch (action) {
        case ClientActions.GET_MIGRATIONS:
          response.data = Object.keys(this.dianaDB.migrations);
          break;
        case ClientActions.MIGRATE_UP:
          if (migration) {
            this.dianaDB.migrations[migration] = Date.now();
            response.data = { migration: { name: migration, status: MigrationStatus.UP } };
          }
          break;
        case ClientActions.MIGRATE_DOWN:
          if (migration) {
            delete this.dianaDB.migrations[migration];
            response.data = { migration: { name: migration, status: MigrationStatus.DOWN } };
          }
          break;
        case ClientActions.ADD_COLLECTION:
          db.createCollection(collection, schema);
          response.data = { createdCollection: collection };
          break;
        case ClientActions.UPDATE_COLLECTION:
          db.updateCollection(collection, schema);
          response.data = [{ updatedCollection: collection }];
          break;
        case ClientActions.REMOVE_COLLECTION:
          db.removeCollection(collection);
          response.data = [{ removedCollection: collection }];
          break;
        case ClientActions.GET_COLLECTION_NAMES:
          response.data = db.getCollectionNames();
          break;
        case ClientActions.GET_COLLECTION_SCHEMA:
          response.data = db.getCollectionSchema(collection);
          break;
        case ClientActions.FIND:
          const resultFind: any[] = db.collections
            .get(collection)
            .find(filterQueries, transformQueries, sortQuery, skip, limit, transactionId);
          response.data = resultFind;
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

  private getDatabase(name: string, throwError?: boolean) {
    if (!name && throwError) {
      throw ErrorFactory.databaseError('Database name is required');
    }
    if (name && !this.databases.has(name)) {
      const database = new Database({ name, dianaDB: this.dianaDB });
      this.databases.set(name, database);
      store.set(`db.${name}`, database.store());
    }
    return this.databases.get(name);
  }

  private checkCollectionExistence(db: Database, collection: string) {
    if (!db.collections.has(collection)) {
      throw ErrorFactory.databaseError(`collection '${collection}' doesn't exist`);
    }
  }

  private checkDbAccess(user: string, db: string, databaseAccess: DatabaseAccess): boolean {
    const currentAccess = userReadStore.get(`user.${user}.db.${db}`);
    if (!currentAccess) {
      return false;
    }
    return parseInt(currentAccess, 10) >= databaseAccess;
  }

  private checkClientActionAccess(user: string, db: string, action: ClientActions): boolean {
    const currentAccess = userReadStore.get(`user.${user}.db.${db}`);
    const requiredAccess = clientAccess[action];
    if (!currentAccess || !requiredAccess) {
      return false;
    }
    return parseInt(currentAccess, 10) >= requiredAccess;
  }
}
