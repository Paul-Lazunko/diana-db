import { DiDB } from '../application';
import { Collection } from '../collection';
import { Types } from '../constants'
import { ErrorFactory } from "../error";
import { Field } from '../field';
import { randomStringGenerator } from '../helpers';
import { IDatabaseOptions } from '../options';
import { IDataHolder, ISchema } from '../structures';
import { autoRollbackValidator, schemaItemValidator } from '../validator';
import { addTTLHandler, removeTTLHandler, addStoreHandler, removeStoreHandler } from '../eventEmmitter';

export class Database {
  public name: string;
  public diDb: DiDB;
  public collections: Map<string, Collection>;
  public Types: Map<Types, Field>;

  constructor(options: IDatabaseOptions) {
    const {
      name,
      diDb
    } = options;
    this.collections = new Map<string, Collection>();
    this.name = name;
    this.diDb = diDb;
    this.init();
    addStoreHandler(this.name, this.store.bind(this));
  }

  private init() {
    this.collections = new Map<string, Collection>();
    this.Types = new Map<Types, Field>();
    for ( const key in Types ) {
      if ( key !== Types.ARRAY ) {
        this.Types.set( key as Types, new Field({
          type: key as Types,
          database: this
        }))
      }
    }
  }

  public createCollection(collection: string, schema: ISchema) {
    if ( this.collections.has(collection) ) {
      throw ErrorFactory.databaseError(`collection ${collection} already exists`)
    } else {
      this.validateSchema(schema);
      this.collections.set(collection, new Collection(collection, schema, this));
    }
    schema._id = {
      type: Types.OBJECT_ID
    };
    for ( const key in schema ) {
      switch (schema[key].type) {
        case Types.ARRAY:
          if ( schema[key].items === Types.REFERENCE ) {
            this.Types.get(schema[key].items).addCollectionKey(collection, key, schema[key].reference)
            this.Types.get(schema[key].type).addCollectionTransactionKey(collection, key)
          } else {
            this.Types.get(schema[key].items).addCollectionKey(collection, key)
            this.Types.get(schema[key].type).addCollectionTransactionKey(collection, key)
          }
          break;
        case Types.REFERENCE:
          this.Types.get(schema[key].type).addCollectionKey(collection, key, schema[key].reference)
          this.Types.get(schema[key].type).addCollectionTransactionKey(collection, key)
          break;
        default:
          this.Types.get(schema[key].type).addCollectionKey(collection, key)
          this.Types.get(schema[key].type).addCollectionTransactionKey(collection, key)
          break;
      }
    }
    addTTLHandler(collection, this.collections.get(collection).ttlHandler.bind(this.collections.get(collection)))
  }

  public removeCollection(collection: string) {
    if ( this.collections.has(collection) ) {
      removeTTLHandler(collection)
      const c: Collection = this.collections.get(collection);
      for ( const key in c.schema ) {
        this.Types.get(c.schema[key].type).removeCollectionKey(collection);
      }
    }
  }

  public updateCollection(collection: string, schema: ISchema) {
    if ( this.collections.has(collection) ) {
      this.validateSchema(schema);
      const c: Collection = this.collections.get(collection);
      for ( const key in c.schema ) {
        if ( !schema[key] && key !== '_id' ) {
          this.Types.get(c.schema[key].type).removeCollectionKey(collection);
        }
      }
      for ( const key in schema ) {
       if ( !c.schema[key] && key !== '_id' ) {
         switch (schema[key].type) {
           case Types.ARRAY:
             if ( schema[key].items === Types.REFERENCE ) {
               this.Types.get(schema[key].items).addCollectionKey(collection, key, schema[key].reference)
             } else {
               this.Types.get(schema[key].items).addCollectionKey(collection, key)
             }
             break;
           case Types.REFERENCE:
             this.Types.get(schema[key].type).addCollectionKey(collection, key, schema[key].reference)
             break;
           default:
             this.Types.get(schema[key].type).addCollectionKey(collection, key)
             break;
         }
       }
      }
    } else {
      this.createCollection(collection, schema)
    }
  }

  public getCollectionNames() {
    return Array.from(this.collections.keys());
  }

  public getCollectionSchema(collection: string) {
    if ( this.collections.has(collection) ) {
      return this.collections.get(collection).schema;
    }
  }

  private validateSchema(schema: ISchema): void {
    for ( const key in schema ) {
      const validationResult: any = schemaItemValidator(schema[key]);
      if ( validationResult.error ) {
        throw ErrorFactory.collectionError(validationResult.error.message)
      }
    }
  }

  private store(): any {
    const result: any = {
      collections: {},
      fields: {}
    };
    this.collections.forEach((collection: Collection, name: string) => {
     result.collections[name] = {
       schema: collection.schema,
       identifiers: collection.identifiers
     };
    });
    this.Types.forEach((type: Field, name: Types) => {
      result.fields[name] = {};
      type.data.forEach((item:  Map<string, IDataHolder>, key: string) => {
        result.fields[name][key] = result.fields[name][key] || {};
        item.forEach((holder: IDataHolder, k: string) => {
          result.fields[name][key][k] = holder.store();
        })
      })
    });
    return result;
  }

  public restore(data: any) {
    const { collections, fields } = data;
    for (const key in collections) {
      this.createCollection(key, collections[key].schema );
      this.collections.get(key).identifiers = collections[key].identifiers;
    }
    for (const key in fields) {
      this.Types.get(key as Types).restore(fields[key]);
    }
  }

  public startTransaction(autoRollbackAfterMS: number): string {
    const validationResult: any = autoRollbackValidator(autoRollbackAfterMS);
    if ( validationResult && validationResult.error ) {
      throw ErrorFactory.databaseError(validationResult.error.message);
    }
    const transactionId: string = randomStringGenerator(32, true);
    this.collections.forEach((collection: Collection, name: string) => {
      collection.startTransaction(transactionId, autoRollbackAfterMS);
    });
    return transactionId;
  }

  public rollbackTransaction(transactionId: string) {
    this.collections.forEach((collection: Collection) => {
      collection.rollBackTransaction(transactionId);
    });
  }

  public commitTransaction(transactionId: string) {
    this.collections.forEach((collection: Collection) => {
      collection.commitTransaction(transactionId);
    });
  }

}
