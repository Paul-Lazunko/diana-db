import { stringifyConfiguration } from 'tslint/lib/configuration';
import { Database } from '../database';
import { IDataHolder, IQuery, IReferenceHolderStorePart } from '../structures';
import { IDataHolderMethodsParams } from '../params';

export class ReferenceHolder implements IDataHolder {

  protected database: Database;
  protected reference: string;
  protected references: Map<string, string|string[]>;
  protected referencesInverted: Map<string, string|string[]>;

  constructor(database: Database) {
    this.database = database;
    this.references = new Map<string,string|string[]>();
    this.referencesInverted = new Map<string,string|string[]>();
  }

  initReference(reference: string, collection: string, key: string ) {
    this.reference = reference;
    const options: any = {};
    options[key] = collection;
    this.database.collections.get(this.reference).initRefs(this.referencesInverted, this.references, options);
  }

  createCursor (params: IQuery[]): string[] {
    const _ids: string[] = this.database.collections.get(this.reference).find(params).map(((item: any) => item._id));
    const result: string[] = [];
    for ( let i = 0; i < _ids.length; i = i + 1 ) {
      const id: any = this.referencesInverted.get(_ids[i]);
      if ( id ) {
        Array.isArray(id) ? result.push(...id) : result.push(id);
      }
    }
    return result;
  }

  create (params: IDataHolderMethodsParams<any>) {
    const { identifier, value } = params;
    if ( this.references.has(identifier) ) {
      const c: any =  this.references.get(identifier);
      if ( Array.isArray(c) ) {
        c.push(value);
      } else {
        this.references.set(identifier, [c, value])
      }
    } else {
      this.references.set(identifier, value);
    }
    if ( this.referencesInverted.has(value) ) {
      const d: any =  this.referencesInverted.get(value);
      if ( Array.isArray(d) ) {
        d.push(identifier);
      } else {
        this.referencesInverted.set(value, [d, identifier])
      }
    } else {
      if ( !Array.isArray(value) ) {
        this.referencesInverted.set(value, identifier);
      }
    }
  }

  remove (params: IDataHolderMethodsParams<any>) {
    const { identifier, value } = params;
    this.references.delete(identifier);
    if ( Array.isArray(value) ) {
      for (let i = 0; i < value.length; i = i + 1 ) {
        const ref: any = this.referencesInverted.get(value[i]);
        if ( Array.isArray(ref) ) {
          ref.splice(ref.indexOf(identifier), 1)
        } else {
          this.referencesInverted.delete(value[i]);
        }
      }
    } else {
      const v = this.referencesInverted.get(value);
      if ( Array.isArray(v) ) {
        v.splice(v.indexOf(identifier), 1)
      } else {
        this.referencesInverted.delete(value);
      }
    }
  }

  update (params: IDataHolderMethodsParams<string>, data: IDataHolderMethodsParams<string>){
    this.remove(params);
    this.create(data)
  }

  get (params: string[]) {
    const result: any = {};
    for ( let i=0; i < params.length; i = i + 1 ) {
      result[params[i]] =  this.references.get(params[i]);
    }
    return result;
  }

  public store(): IReferenceHolderStorePart {
    const result: any = {
      reference: this.reference,
      references: {},
      referencesInverted: {}
    }
    this.references.forEach((v: string|string[], k: string) => {
      result.references[k] = v;
    });
    this.referencesInverted.forEach((v: string|string[], k: string) => {
      result.referencesInverted[k] = v;
    });
    return result;
  }

  public restore(data: IReferenceHolderStorePart): void {
    const {
      reference,
      referencesInverted,
      references
    } = data;
    this.reference = reference;
    for ( const key in referencesInverted ) {
      this.referencesInverted.set(key, referencesInverted[key]);
    }
    for ( const key in references ) {
      this.references.set(key, references[key]);
    }
  }

}
