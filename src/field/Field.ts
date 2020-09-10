import { EDataHolderConstructor, EQueryProcessorConstructor, Types } from '../constants';
import { Database } from '../database';
import { ITypeOptions } from '../options';
import { IBaseDataHolderStorePart, IDataHolder, IReferenceHolderStorePart, ITimeHolderStorePart } from '../structures';

export class Field {
  protected database: Database;
  public readonly type: Exclude<Types,Types.ARRAY>;
  private readonly dataHolderConstructor: any;
  public data: Map<string, Map<string, IDataHolder>>;
  public transactions: Map<string, Map<string, Map<string, IDataHolder>>>

  constructor(options: ITypeOptions) {
    const { type, database } = options;
    this.database = database;
    this.type = type as Exclude<Types,Types.ARRAY>;
    this.data = new Map<string, Map<string, IDataHolder>>();
    this.transactions = new Map<string, Map<string, Map<string, IDataHolder>>>();
    // @ts-ignore
    this.dataHolderConstructor = EDataHolderConstructor[type];
  }

  public addCollectionKey(collection: string, key: string, reference?: string) {
    if (!this.data.has(collection)) {
      this.data.set(collection, new Map<string, IDataHolder>());
    }
    this.data.get(collection).set(key, this.getDataHolder());
    if ( this.type === Types.REFERENCE ) {
      const referenceHolderExists: boolean = this.data.get(collection).has(key);
      if ( referenceHolderExists ) {
        // @ts-ignore
        this.data.get(collection).get(key).initReference(reference, collection, key)
      }

    }
  }

  public getDataHolder(): IDataHolder {
    if ( this.type === Types.REFERENCE ) {
      // @ts-ignore
      return new this.dataHolderConstructor(this.database) as IDataHolder;
    }
    // @ts-ignore
    return new this.dataHolderConstructor(EQueryProcessorConstructor[this.type]) as IDataHolder;
  }

  public addCollectionTransactionKey(collection: string, key: string) {
    if (!this.transactions.has(collection)) {
      this.transactions.set(collection, new Map<string, Map<string, IDataHolder>>());
    }
    this.transactions.get(collection).set(key, new Map<string, IDataHolder>());
  }

  public removeCollectionKey(collection: string) {
    this.data.delete(collection);
    this.transactions.delete((collection))
  }

  public restore(data: {[key: string]: {[key: string]: IReferenceHolderStorePart|ITimeHolderStorePart|IBaseDataHolderStorePart}}) {
    for ( const key in data ) {
      for ( const k in data[key] ) {
        this.data.get(key).get(k).restore(data[key][k]);
      }
    }
  }

}
