import { randomUUID } from 'crypto';
import { DianaDB } from '@application';
import { Collection, ArrayFieldDefinition, ReferenceFieldDefinition, Schema } from '@collection';
import { Types } from '@const';
import { ErrorFactory } from '@error';
import { Field } from '@field';
import { DatabaseOptions } from '@options';
import { DataHolder } from '@data-holder';
import { autoRollbackValidator, schemaItemValidator } from '@validator';
import { addTTLHandler, removeTTLHandler, addStoreHandler } from '@event-emitter';
import { TransformQuery } from '@dto';
import { config } from '@config';

export class Database {
  protected static databases: Map<string, Database> = new Map<string, Database>();
  public name: string;
  public dianaDB: DianaDB;
  public collections: Map<string, Collection<any>>;
  public Types: Map<Types, Field>;
  public restored: boolean;
  private names: Set<string>;

  constructor(options: DatabaseOptions) {
    if (Database.databases.has(options.name)) {
      return Database.databases.get(options.name);
    }
    const { name, dianaDB } = options;
    this.collections = new Map<string, Collection<any>>();
    this.name = name;
    this.names = new Set<string>();
    this.dianaDB = dianaDB;
    this.init();
    addStoreHandler(this.name, this.store.bind(this));
    Database.databases.set(name, this);
  }

  public addName(name: string) {
    this.names.add(name);
  }

  public removeName(name: string) {
    this.names.delete(name);
  }

  public hasName(name: string) {
    return this.names.has(name);
  }

  private init() {
    this.restored = false;
    this.collections = new Map<string, Collection<any>>();
    this.Types = new Map<Types, Field>();
    for (const key in Types) {
      if (key !== Types.ARRAY) {
        this.Types.set(
          key as Types,
          new Field({
            type: key as Types,
            database: this,
          }),
        );
      }
    }
  }

  public createCollection<T>(
    collection: string,
    schema: Schema<T>,
    schemaUpdated?: Record<string, number>,
    views?: Record<string, { transformQueries: TransformQuery[]; schema: Schema<any>; items?: any[] }>,
  ) {
    if (this.names.has(collection)) {
      throw ErrorFactory.databaseError(`collection or view "${collection}" exists already`);
    }
    if (this.collections.has(collection)) {
      this.collections.get(collection).schema = Object.assign({ _id: { type: Types.OBJECT_ID, unique: true } }, schema);
      return this.collections.get(collection);
    } else {
      this.validateSchema(schema);
      this.collections.set(
        collection,
        new Collection(
          collection,
          Object.assign({ _id: { type: Types.OBJECT_ID, unique: true } }, schema),
          this,
          schemaUpdated,
          views,
        ),
      );
    }
    schema._id = {
      type: Types.OBJECT_ID,
      unique: true,
    };
    for (const key in schema) {
      switch (schema[key].type) {
        case Types.ARRAY:
          if ((schema[key] as ArrayFieldDefinition).items === Types.REFERENCE) {
            this.Types.get((schema[key] as ArrayFieldDefinition).items).addCollectionKey(
              collection,
              key,
              (schema[key] as unknown as ReferenceFieldDefinition).reference,
            );
            this.Types.get((schema[key] as ArrayFieldDefinition).items).addCollectionTransactionKey(
              collection,
              key,
              (schema[key] as unknown as ReferenceFieldDefinition).reference,
            );
          } else {
            this.Types.get((schema[key] as ArrayFieldDefinition).items).addCollectionKey(collection, key);
            this.Types.get((schema[key] as ArrayFieldDefinition).items).addCollectionTransactionKey(collection, key);
          }
          break;
        case Types.REFERENCE:
          this.Types.get(schema[key].type).addCollectionKey(
            collection,
            key,
            (schema[key] as ReferenceFieldDefinition).reference,
          );
          this.Types.get(schema[key].type).addCollectionTransactionKey(
            collection,
            key,
            (schema[key] as ReferenceFieldDefinition).reference,
          );
          break;
        default:
          this.Types.get(schema[key].type).addCollectionKey(collection, key);
          this.Types.get(schema[key].type).addCollectionTransactionKey(collection, key);
          break;
      }
    }
    addTTLHandler(collection, this.collections.get(collection).ttlHandler.bind(this.collections.get(collection)));
    if (!this.names.has(collection)) {
      this.names.add(collection);
    }
  }

  public removeCollection(collection: string) {
    if (this.collections.has(collection)) {
      removeTTLHandler(collection);
      const c: Collection<any> = this.collections.get(collection);
      for (const key in c.schema) {
        this.Types.get(c.schema[key].type).removeCollectionKey(collection);
      }
      if (this.names.has(collection)) {
        this.names.delete(collection);
      }
    }
  }

  public getCollectionSchemaLock(collection: string) {
    return this.collections.get(collection)?.isSchemaLocked;
  }

  public getCollectionViews(collection: string) {
    if (this.collections.has(collection)) {
      return this.collections.get(collection).getViews();
    }
    return {};
  }

  public lockCollectionSchema(collection: string) {
    if (this.collections.has(collection)) {
      this.collections.get(collection).lockSchema();
    }
  }

  public unlockCollectionSchema(collection: string) {
    if (this.collections.has(collection)) {
      this.collections.get(collection).unlockSchema();
    }
  }

  public isCollectionSchemaLocked(collection: string) {
    if (this.collections.has(collection)) {
      return this.collections.get(collection).isSchemaLocked;
    }
  }

  public updateCollection(collection: string, schema: Schema<any>) {
    if (this.collections.has(collection)) {
      this.validateSchema(schema);
      const c: Collection<any> = this.collections.get(collection);
      for (const key in c.schema) {
        if (!schema[key] && key !== '_id') {
          c.schemaUpdated[key] = Date.now();
          this.Types.get(c.schema[key].type)?.removeCollectionKey(collection);
        }
      }
      for (const key in schema) {
        if (!c.schema[key] && key !== '_id') {
          switch (schema[key].type) {
            case Types.ARRAY:
              if ((schema[key] as ArrayFieldDefinition).items === Types.REFERENCE) {
                this.Types.get((schema[key] as ArrayFieldDefinition).items).addCollectionKey(
                  collection,
                  key,
                  (schema[key] as unknown as ReferenceFieldDefinition).reference,
                );
              } else {
                this.Types.get((schema[key] as ArrayFieldDefinition).items).addCollectionKey(collection, key);
              }
              break;
            case Types.REFERENCE:
              this.Types.get(schema[key].type).addCollectionKey(
                collection,
                key,
                (schema[key] as ReferenceFieldDefinition).reference,
              );
              break;
            default:
              this.Types.get(schema[key].type).addCollectionKey(collection, key);
              c.schema[key] = schema[key];
              break;
          }
        } else if (c.schema[key] && key !== '_id') {
          for (const prop in schema[key]) {
            c.schema[key][prop] = schema[key][prop];
          }
          for (const prop in c.schema[key]) {
            if (schema[key][prop]) {
              c.schema[key][prop] = schema[key][prop];
            } else {
              delete c.schema[key][prop];
            }
          }
        }
        c.schemaUpdated[key] = Date.now();
      }
    } else {
      this.createCollection(collection, schema);
    }
  }

  public getCollectionNames() {
    return Array.from(this.collections.keys());
  }

  public getCollectionSchema(collection: string) {
    if (this.collections.has(collection)) {
      return this.collections.get(collection).schema;
    }
  }

  private validateSchema(schema: Schema<any>): void {
    for (const key in schema) {
      const validationResult: any = schemaItemValidator(schema[key]);
      if (validationResult.error) {
        throw ErrorFactory.schemaError(validationResult.error.message);
      }
    }
  }

  public store(): any {
    const result: any = {
      collections: {},
      fields: {},
      names: [],
    };
    this.collections.forEach((collection: Collection<any>, name: string) => {
      result.collections[name] = {
        schema: collection.schema,
        schemaUpdated: collection.schemaUpdated,
        identifiers: Array.from(collection.identifiers),
        names: [
          name,
          ...Array.from(Object.keys(collection.views)),
        ],
        views: {},
      };
      for (const key in collection.views) {
        const view = collection.views[key];
        result.collections[name].views[key] = { transformQueries: view.transformQueries };
      }
    });
    this.Types.forEach((type: Field, name: Types) => {
      result.fields[name] = {};
      type.data.forEach((item: Map<string, DataHolder>, key: string) => {
        result.fields[name][key] = result.fields[name][key] || {};
        item.forEach((holder: DataHolder, k: string) => {
          result.fields[name][key][k] = holder.store();
        });
      });
    });
    return result;
  }

  public restore(data: any) {
    const { collections, fields } = data;
    if (collections) {
      for (const key in collections) {
        this.createCollection(key, collections[key].schema, collections[key].schemaUpdated, collections[key].views);
        if (collections[key].identifiers) {
          this.collections.get(key).identifiers =
            new Set(Array.from(collections[key].identifiers)) || this.collections.get(key).identifiers;
        }
      }
    }
    if (fields) {
      for (const key in fields) {
        this.Types.get(key as Types).restore(fields[key]);
      }
    }
  }

  public startTransaction(autoRollbackAfterMS: number): string {
    const validationResult: any = autoRollbackValidator(autoRollbackAfterMS);
    if (validationResult && validationResult.error) {
      throw ErrorFactory.transactionError(validationResult.error.message);
    }
    const transactionId: string = randomUUID();
    this.collections.forEach((collection: Collection<any>, name: string) => {
      collection.startTransaction(transactionId, autoRollbackAfterMS || config.autoRollbackAfterMS);
    });
    return transactionId;
  }

  public rollbackTransaction(transactionId: string) {
    this.collections.forEach((collection: Collection<any>) => {
      collection.rollBackTransaction(transactionId);
    });
  }

  public commitTransaction(transactionId: string) {
    this.collections.forEach((collection: Collection<any>) => {
      collection.commitTransaction(transactionId);
    });
  }
}
