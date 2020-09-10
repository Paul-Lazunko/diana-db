import { DiDB } from '../application';
import { EClientActions, EMigrationStatus, EServerActions, ETransactionStatus } from '../constants';
import { Database } from '../database';
import { ErrorFactory } from "../error";
import { IRequestControllerOptions } from '../options';
import { IRemoveResult, IRequest, IResponse, IUpdateResult } from '../structures';

export class RequestController {

  protected databases: Map<string, Database>;
  protected diDb: DiDB;

  protected nonRequiredDbActions: string[] = [
    EClientActions.MIGRATE_DOWN,
    EClientActions.MIGRATE_UP,
    EClientActions.GET_MIGRATIONS,
    EClientActions.START_TRANSACTION,
    EClientActions.COMMIT_TRANSACTION,
    EClientActions.ROLLBACK_TRANSACTION,
    EClientActions.GET_COLLECTION_NAMES
  ];

  constructor(options: IRequestControllerOptions) {
    const { databases, diDb } = options;
    this.diDb = diDb;
    this.databases = databases;
  }

  public processRequest(request: IRequest): IResponse {
    // validate request
    const {
      socket,
      requestId,
      database,
      collection,
      action,
      filterQueries,
      updateQuery,
      transformQueries,
      sortQuery,
      skip,
      limit,
      transactionId,
      autoRollbackAfterMS,
      schema,
      migration
    } = request;
    const response: IResponse = {
      socket,
      requestId,
      operationTime: new Date().getTime(),
      action: EServerActions.RESPONSE,
      data: []
    };
    try {
      const db: Database = this.getDatabase(database);
      if ( action !== EClientActions.ADD_COLLECTION && !this.nonRequiredDbActions.includes(action) ) {
        this.checkCollectionExistence(db, collection);
      }
      switch ( action ) {
        case EClientActions.GET_MIGRATIONS:
          response.data = Object.keys(this.diDb.migrations);
          break;
        case EClientActions.MIGRATE_UP:
          if ( migration ) {
            this.diDb.migrations[migration] = new Date().getTime();
            response.data = { migration: { name: migration, status: EMigrationStatus.UP } };
          }
          break;
        case EClientActions.MIGRATE_DOWN:
          if ( migration ) {
            delete this.diDb.migrations[migration];
            response.data = { migration: { name: migration, status: EMigrationStatus.DOWN } };
          }
          break;
        case EClientActions.ADD_COLLECTION:
          db.createCollection(collection, schema);
          response.data = { createdCollection: collection };
          break;
        case EClientActions.UPDATE_COLLECTION:
          db.updateCollection(collection, schema);
          response.data = [{ updatedCollection: collection }];
          break;
        case EClientActions.REMOVE_COLLECTION:
          db.removeCollection(collection);
          response.data = [{ removedCollection: collection }];
          break;
        case EClientActions.GET_COLLECTION_NAMES:
          response.data = db.getCollectionNames();
          break;
        case EClientActions.GET_COLLECTION_SCHEMA:
          response.data = db.getCollectionSchema(collection);
          break;
        case EClientActions.FIND:
          const resultFind: any[] = db.collections.get(collection).find(filterQueries, transformQueries, sortQuery, skip, limit, transactionId);
          response.data = resultFind;
          break;
        case EClientActions.COUNT:
          const resultCount: number = db.collections.get(collection).count(filterQueries, transformQueries, transactionId);
          response.data = resultCount;
          break;
        case EClientActions.INSERT:
          const resultInsert: any[] = db.collections.get(collection).insert(updateQuery, transactionId);
          response.data = resultInsert;
          break;
        case EClientActions.UPDATE:
          const resultUpdate: IUpdateResult = db.collections.get(collection).update(filterQueries, updateQuery, transactionId);
          response.nFound = resultUpdate.nFound;
          response.nModified = resultUpdate.nModified;
          break;
        case EClientActions.REMOVE:
          const resultRemove: IRemoveResult = db.collections.get(collection).remove(filterQueries, transactionId);
          response.nFound = resultRemove.nFound;
          response.nRemoved = resultRemove.nRemoved;
          break;
        case EClientActions.START_TRANSACTION:
          const id: string = db.startTransaction(autoRollbackAfterMS);
          response.data = { transactionId: id };
          break;
        case EClientActions.ROLLBACK_TRANSACTION:
          db.rollbackTransaction(transactionId);
          response.data = { transactionId, status: ETransactionStatus.ROLLED_BACK };
          break;
        case EClientActions.COMMIT_TRANSACTION:
          db.commitTransaction(transactionId);
          response.data = { transactionId, status: ETransactionStatus.COMMITTED };
          break;
      }

    } catch(e) {
      console.log({e})
      response.error  = e.message;
      response.operationTime = new Date().getTime() - response.operationTime;
      return response;
    }
    response.operationTime = new Date().getTime() - response.operationTime;
    return response;
  }

  private getDatabase(name: string) {
    if ( name && !this.databases.has(name) ) {
      this.databases.set(name, new Database({ name, diDb: this.diDb }))
    }
    return name ? this.databases.get(name) : undefined;
  }

  private checkCollectionExistence(db: Database, collection: string) {
    if ( !db.collections.has(collection) ) {
      throw ErrorFactory.databaseError(`collection '${collection}' doesn't exist`)
    }
  }

}
