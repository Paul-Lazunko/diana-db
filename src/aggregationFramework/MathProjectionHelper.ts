import { ErrorFactory } from "../error";
import { BaseProjectionHelper } from './BaseProjectionHelper';
import { objectFirstKeyHelper } from './objectFirstKeyHelper';

export class MathProjectionHelper extends BaseProjectionHelper {

  protected processSubQuery(item: any, valueItem: any) {
    const key = objectFirstKeyHelper(valueItem);
    switch ( key ) {
      case '$ifNull':
        return this.$ifNull.apply(item, [valueItem[key]]);
        break;
      case '$sum':
        return this.$sum.apply(this, [item, key, valueItem[key], valueItem]);
        break;
      case '$multiply':
        return this.$multiply.apply(this, [item, key, valueItem[key], valueItem]);
        break;
      case '$subtract':
        return this.$subtract.apply(this, [item, key, valueItem[key], valueItem]);
        break;
      case '$divide':
        return this.$divide.apply(this, [item, key, valueItem[key], valueItem]);
        break;
    }
  }

  protected $sum(items: any[], key: string, value: any[], root: any) {
    let result: number = 0;
    const item: any = items[0];
    const _value = Object.assign([], value);
    while ( _value.length ) {
      const valueItem: any = _value.shift();
      if ( !valueItem ) {
        throw ErrorFactory.transformError(`property '${valueItem}' is not valid`)
      }
      if ( typeof valueItem === 'string') {
        if ( typeof item[valueItem] !== 'number' ) {
          throw ErrorFactory.transformError(`property '${valueItem}' is not a number`)
        }
        result = result + item[valueItem];
      } else if ( typeof valueItem === 'number' ) {
        result = result + valueItem;
      } else if ( typeof valueItem === 'object' ) {
        this.processSubQuery(item, valueItem);
        try {
          valueItem[objectFirstKeyHelper(valueItem)] = parseFloat(valueItem[objectFirstKeyHelper(valueItem)]);
        } catch (e) {}
        result = result + valueItem[objectFirstKeyHelper(valueItem)];
      }
    }
    root[key] = root[key] ? root[key] + result : result;
  }

  protected $subtract(items: any[], key: string, value: any[], root: any) {
    let result: number = 0;
    const item: any = items[0];
    const _value = Object.assign([], value);
    while ( _value.length ) {
      const valueItem: any = _value.shift();
      if ( !valueItem ) {
        throw ErrorFactory.transformError(`property '${valueItem}' is not valid`)
      }
      if ( typeof valueItem === 'string') {
        if ( typeof item[valueItem] !== 'number' ) {
          throw ErrorFactory.transformError(`property '${valueItem}' is not a number`)
        }
        result = result ? result - item[valueItem] : item[valueItem];
      } else if ( typeof valueItem === 'number' ) {
        result =  result ? result - valueItem : valueItem;
      } else if ( typeof valueItem === 'object' ) {
        this.processSubQuery(item, valueItem);
        try {
          valueItem[objectFirstKeyHelper(valueItem)] = parseFloat( valueItem[objectFirstKeyHelper(valueItem)]);
        } catch (e) {}
        result = result ? result - valueItem[objectFirstKeyHelper(valueItem)] : valueItem[objectFirstKeyHelper(valueItem)];
      }
    }
    root[key] = root[key] ? root[key] - result : result;
  }

  protected $divide(items: any[], key: string, value: any[], root?: any) {
    let result: number = 1;
    const item: any = items[0];
    const _value = Object.assign([], value);
    while ( _value.length ) {
      const valueItem: any = _value.shift();
      if ( !valueItem ) {
        throw ErrorFactory.transformError(`property '${valueItem}' is not valid`)
      }
      if ( typeof valueItem === 'string') {
        if ( typeof item[valueItem] !== 'number' ) {
          throw ErrorFactory.transformError(`property '${valueItem}' is not a number`)
        }
        result = result ? result / item[valueItem] : item[valueItem];
      } else if ( typeof valueItem === 'number' ) {
        result =  result ? result / valueItem : valueItem;
      } else if ( typeof valueItem === 'object' ) {
        this.processSubQuery(item, valueItem);
        try {
          valueItem[objectFirstKeyHelper(valueItem)] = parseFloat( valueItem[objectFirstKeyHelper(valueItem)]);
        } catch (e) {}
        result = result ? result / valueItem[objectFirstKeyHelper(valueItem)] : valueItem[objectFirstKeyHelper(valueItem)];
      }
    }
    root[key] = root[key] ? root[key] * result : result;
  }

  protected $multiply(items: any[], key: string, value: any[], root?: any) {
    let result: number =  1;
    const item: any = items[0];
    const _value = Object.assign([], value);
    while ( _value.length ) {
      const valueItem: any = _value.shift();
      if ( !valueItem ) {
        throw ErrorFactory.transformError(`property '${valueItem}' is not valid`)
      }
      if ( typeof valueItem === 'string') {
        if ( typeof item[valueItem] !== 'number' ) {
          throw ErrorFactory.transformError(`property '${valueItem}' is not a number`)
        }
        result = result * item[valueItem];
      } else if ( typeof valueItem === 'number' ) {
        result =  result * valueItem;
      } else if ( typeof valueItem === 'object' ) {
        this.processSubQuery(item, valueItem);
        try {
          valueItem[objectFirstKeyHelper(valueItem)] = parseFloat( valueItem[objectFirstKeyHelper(valueItem)]);
        } catch (e) {}
        result = result * valueItem[objectFirstKeyHelper(valueItem)];
      }
    }
    root[key] = root[key] ? root[key] * result : result;
  }

  // Use isNull method in changed context (bind to item)

  protected $ifNull(...args: any[]) {
    let result: any;
    const _args = Object.assign([], args);
    while(_args.length) {
      const arg = _args.shift();
      if ( typeof arg === 'string' ) {
        // @ts-ignore
        if ( this[arg] ) {
          // @ts-ignore
          result = this[arg];
          break;
        }
      } else if ( arg ) {
        result = arg;
        break;
      }
    }
    return result;
  }
}
