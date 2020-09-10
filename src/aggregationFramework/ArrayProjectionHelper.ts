import { ErrorFactory } from "../error";
import { BaseProjectionHelper } from './BaseProjectionHelper';

export class ArrayProjectionHelper extends BaseProjectionHelper {

  public $push(item: any, key: string, value: any, root: any): void {
    const itemValue: any = this.getItemProperty(item, value);
    if ( root[key] ) {
      if ( !Array.isArray(root[key]) ) {
        root[key] = [itemValue]
      } else {
        root[key].push(itemValue);
      }
    } else {
      root[key] = [];
      root[key].push(itemValue);
    }
  }

  public $addToSet(item: any, key: string, value: string, root: any): void {
    const itemValue: any = this.getItemProperty(item, value);
    if ( root[key] ) {
      if ( !Array.isArray(root[key]) ) {
        root[key] = [itemValue]
      } else {
        if ( !root[key].includes(itemValue) ) {
          root[key].push(itemValue);
        }
      }
    } else {
      root[key] = [];
      root[key].push(itemValue);
    }
  }

  public $concatArray(item: any, key: string, value: any, root: any): void {
    const itemValue: any = this.getItemProperty(item, value);
    if ( !Array.isArray(itemValue)) {
      throw ErrorFactory.transformError(`property '${value}' should be an array`)
    }
    if ( root[key] ) {
      if ( !Array.isArray(root[key]) ) {
        root[key] = [...itemValue]
      } else {
        root[key].push(...itemValue);
      }
    } else {
      root[key] = [];
      root[key].push(...itemValue);
    }
  }



}
