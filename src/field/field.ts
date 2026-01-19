import { DataHolderConstructor, QueryProcessorConstructor, Types } from '@const';
import { Database } from '@database';
import { TypeOptions } from '@options';
import { BaseDataHolderStorePart, DataHolder, ReferenceHolderStorePart, TimeHolderStorePart } from '@data-holder';

export class Field {
  protected database: Database;
  public readonly type: Exclude<Types, Types.ARRAY>;
  private readonly dataHolderConstructor: any;
  public data: Map<string, Map<string, DataHolder>>;
  public transactions: Map<string, Map<string, Map<string, DataHolder>>>;

  constructor(options: TypeOptions) {
    const { type, database } = options;
    this.database = database;
    this.type = type as Exclude<Types, Types.ARRAY>;
    this.data = new Map<string, Map<string, DataHolder>>();
    this.transactions = new Map<string, Map<string, Map<string, DataHolder>>>();

    this.dataHolderConstructor = DataHolderConstructor[type];
  }

  public addCollectionKey(collection: string, key: string, reference?: string) {
    if (!this.data.has(collection)) {
      this.data.set(collection, new Map<string, DataHolder>());
    }
    this.data.get(collection).set(key, this.getDataHolder());
    if (this.type === Types.REFERENCE) {
      const referenceHolderExists: boolean = this.data.get(collection).has(key);
      if (referenceHolderExists) {
        this.data.get(collection).get(key).initReference(reference, collection, key);
      }
    }
  }

  public getDataHolder(): DataHolder {
    if (this.type === Types.REFERENCE) {
      return new this.dataHolderConstructor(this.database) as DataHolder;
    }

    return new this.dataHolderConstructor(QueryProcessorConstructor[this.type]) as DataHolder;
  }

  public addCollectionTransactionKey(collection: string, key: string) {
    if (!this.transactions.has(collection)) {
      this.transactions.set(collection, new Map<string, Map<string, DataHolder>>());
    }
    this.transactions.get(collection).set(key, new Map<string, DataHolder>());
  }

  public removeCollectionKey(collection: string) {
    this.data.delete(collection);
    this.transactions.delete(collection);
  }

  public restore(data: {
    [key: string]: { [key: string]: ReferenceHolderStorePart | TimeHolderStorePart | BaseDataHolderStorePart };
  }) {
    for (const key in data) {
      for (const k in data[key]) {
        this.data.get(key).get(k).restore(data[key][k]);
      }
    }
  }
}
