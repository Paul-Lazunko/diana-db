import { ErrorFactory } from '@error';
import { BaseProjectionHelper } from './base-projection-helper';
import { objectFirstKeyHelper } from './object-first-key-helper';
import { logger } from '@logger';
import { convertToNumeric, ensurePointer, isPointer } from '@helper';

export class MathProjectionHelper extends BaseProjectionHelper {
  protected processSubQuery(item: any, valueItem: any, itemsLength?: number, currentIndex?: number) {
    const key = objectFirstKeyHelper(valueItem);
    switch (key) {
      case '$ifNull':
        return this.$ifNull.apply(item, [valueItem[key]]);
        break;
      case '$sum':
        return this.$sum.apply(this, [
          item,
          key,
          valueItem[key],
          valueItem,
        ]);
        break;
      case '$multiply':
        return this.$multiply.apply(this, [
          item,
          key,
          valueItem[key],
          valueItem,
        ]);
        break;
      case '$subtract':
        return this.$subtract.apply(this, [
          item,
          key,
          valueItem[key],
          valueItem,
        ]);
        break;
      case '$max':
        return this.$max.apply(this, [
          item,
          key,
          valueItem[key],
          valueItem,
        ]);
        break;
      case '$min':
        return this.$min.apply(this, [
          item,
          key,
          valueItem[key],
          valueItem,
        ]);
        break;
      case '$avg':
        return this.$avg.apply(this, [
          item,
          key,
          valueItem[key],
          valueItem,
          itemsLength,
          currentIndex,
        ]);
        break;
      case '$divide':
        return this.$divide.apply(this, [
          item,
          key,
          valueItem[key],
          valueItem,
        ]);
        break;
      case '$round':
        return this.$round.apply(this, [
          item,
          key,
          valueItem[key],
          valueItem,
        ]);
        break;
    }
  }

  protected $sum(items: any[], key: string, value: any[], root: any) {
    root[key] = root[key] || 0;
    for (const item of items) {
      let result: number = 0;
      const _value = Object.assign([], value);
      while (_value.length) {
        const valueItem: any = _value.shift();
        if (!valueItem) {
          throw ErrorFactory.transformError(`property '${valueItem}' is not valid`);
        }
        if (typeof valueItem === 'string') {
          const intermediateValue = isPointer(valueItem) ? ensurePointer(valueItem, item) : convertToNumeric(valueItem);
          if (typeof intermediateValue !== 'number') {
            throw ErrorFactory.transformError(`property '${valueItem}' is not a number`);
          }
          result = result + intermediateValue;
        } else if (typeof valueItem === 'number') {
          result = result + valueItem;
        } else if (typeof valueItem === 'object') {
          this.processSubQuery(item, valueItem);
          try {
            valueItem[objectFirstKeyHelper(valueItem)] = convertToNumeric(valueItem[objectFirstKeyHelper(valueItem)]);
          } catch (e) {
            logger.error(e);
          }
          result = result + valueItem[objectFirstKeyHelper(valueItem)];
        }
      }
      root[key] += result;
    }
  }

  protected $subtract(items: any[], key: string, value: any[], root: any) {
    root[key] = root[key] || 0;
    for (const item of items) {
      let result: number = 0;
      const _value = Object.assign([], value);
      while (_value.length) {
        const valueItem: any = _value.shift();
        if (!valueItem) {
          throw ErrorFactory.transformError(`property '${valueItem}' is not valid`);
        }
        if (typeof valueItem === 'string') {
          const intermediateValue = isPointer(valueItem) ? ensurePointer(valueItem, item) : convertToNumeric(valueItem);
          if (typeof intermediateValue !== 'number') {
            throw ErrorFactory.transformError(`property '${valueItem}' is not a number`);
          }
          result = result ? result - intermediateValue : intermediateValue;
        } else if (typeof valueItem === 'number') {
          result = result ? result - valueItem : valueItem;
        } else if (typeof valueItem === 'object') {
          this.processSubQuery(item, valueItem);
          try {
            valueItem[objectFirstKeyHelper(valueItem)] = convertToNumeric(valueItem[objectFirstKeyHelper(valueItem)]);
          } catch (e) {
            logger.error(e);
          }
          result = result
            ? result - valueItem[objectFirstKeyHelper(valueItem)]
            : valueItem[objectFirstKeyHelper(valueItem)];
        }
      }
      root[key] -= result;
    }
  }

  protected $divide(items: any[], key: string, value: any[], root?: any) {
    root[key] = root[key] || 1;
    for (const item of items) {
      let result: number = 1;
      const item: any = items[0];
      const _value = Object.assign([], value);
      while (_value.length) {
        const valueItem: any = _value.shift();
        if (!valueItem) {
          throw ErrorFactory.transformError(`property '${valueItem}' is not valid`);
        }
        if (typeof valueItem === 'string') {
          const intermediateValue = isPointer(valueItem) ? ensurePointer(valueItem, item) : convertToNumeric(valueItem);
          if (typeof intermediateValue !== 'number') {
            throw ErrorFactory.transformError(`property '${valueItem}' is not a number`);
          }
          result = result ? result / intermediateValue : intermediateValue;
        } else if (typeof valueItem === 'number') {
          result = result ? result / valueItem : valueItem;
        } else if (typeof valueItem === 'object') {
          this.processSubQuery(item, valueItem);
          try {
            valueItem[objectFirstKeyHelper(valueItem)] = parseFloat(valueItem[objectFirstKeyHelper(valueItem)]);
          } catch (e) {
            logger.error(e);
          }
          result = result
            ? result / valueItem[objectFirstKeyHelper(valueItem)]
            : valueItem[objectFirstKeyHelper(valueItem)];
        }
      }
      root[key] = root[key] / result;
    }
  }

  protected $multiply(items: any[], key: string, value: any[], root?: any) {
    root[key] = root[key] || 1;
    for (const item of items) {
      let result: number = 1;
      const _value = Object.assign([], value);
      while (_value.length) {
        const valueItem: any = _value.shift();
        if (!valueItem) {
          throw ErrorFactory.transformError(`property '${valueItem}' is not valid`);
        }
        if (typeof valueItem === 'string') {
          const intermediateValue = isPointer(valueItem) ? ensurePointer(valueItem, item) : convertToNumeric(valueItem);
          if (typeof intermediateValue !== 'number') {
            throw ErrorFactory.transformError(`property '${valueItem}' is not a number`);
          }
          result = result * intermediateValue;
        } else if (typeof valueItem === 'number') {
          result = result * valueItem;
        } else if (typeof valueItem === 'object') {
          this.processSubQuery(item, valueItem);
          try {
            valueItem[objectFirstKeyHelper(valueItem)] = convertToNumeric(valueItem[objectFirstKeyHelper(valueItem)]);
          } catch (e) {
            logger.error(e);
          }
          result = result * valueItem[objectFirstKeyHelper(valueItem)];
        }
      }
      root[key] = root[key] * result;
    }
  }

  private ensureNumeric(item: any, value: any): number {
    if (typeof value === 'string') {
      const intermediateValue = isPointer(value) ? ensurePointer(value, item) : convertToNumeric(value);
      if (typeof intermediateValue !== 'number') {
        throw ErrorFactory.transformError(`property '${value}' is not a number`);
      }
      return intermediateValue;
    } else if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'object') {
      this.processSubQuery(item, value);
      try {
        value[objectFirstKeyHelper(value)] = convertToNumeric(value[objectFirstKeyHelper(value)]);
      } catch (e) {
        logger.error(e);
      }
      return value[objectFirstKeyHelper(value)];
    }
  }

  protected $max(items: any[], key: string, value: any[], root?: any) {
    for (const item of items) {
      const result: number = this.ensureNumeric(item, value);
      if (typeof result === 'number') {
        root[key] = typeof root[key] === 'number' ? (result > root[key] ? result : root[key]) : result;
      }
    }
  }

  protected $min(items: any[], key: string, value: any, root?: any) {
    for (const item of items) {
      const result: number = this.ensureNumeric(item, value);
      if (typeof result === 'number') {
        root[key] = typeof root[key] === 'number' ? (result < root[key] ? result : root[key]) : result;
      }
    }
  }

  protected $avg(items: any[], key: string, value: any, root?: any, itemsLength?: number, currentIndex?: number) {
    for (const item of items) {
      const v: number = this.ensureNumeric(item, value);
      root[key] = root[key] || [];
      if (value) {
        root[key].push(v);
      }
      if (currentIndex === itemsLength - 1) {
        root[key] = root[key].reduce((a, b) => a + b, 0) / root[key].length;
      }
    }
  }

  // Use isNull method in changed context (bind to item)

  protected $ifNull(...args: any[]) {
    let result: any;
    const _args = Object.assign([], args);
    while (_args.length) {
      const arg = _args.shift();
      if (typeof arg === 'string') {
        const intermediateValue = isPointer(arg) ? ensurePointer(arg, this) : this[arg];
        if (intermediateValue) {
          result = intermediateValue;
          break;
        }
      } else if (arg) {
        result = arg;
        break;
      }
    }
    return result;
  }

  protected $round(items: any[], key: string, fraction: any, root?: any) {
    root[key] = Math.round(items[0][key] * 10 ** fraction) / 10 ** fraction;
  }
}
