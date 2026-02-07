import { BaseProjectionHelper } from './base-projection-helper';
import { evaluatePointer, isPointer } from '@helper';

export class StringProjectionHelper extends BaseProjectionHelper {
  public $first(item: any, key: string, value: string, root: any) {
    if (!root[key]) {
      root[key] = isPointer(value) ? this.getItemProperty(item, value) : key;
    }
  }

  public $last(item: any, key: string, value: string, root: any) {
    if (!root[key]) {
      root[key] = isPointer(value) ? this.getItemProperty(item, value, true) : key;
    }
  }

  public $concat(item: any, key: string, options: any, root: any) {
    const { delimiter, parts } = options;
    root[key] = parts
      .map((part: string) => (isPointer(part) ? evaluatePointer(part, Array.isArray(item) ? item[0] : item) : part))
      .join(delimiter);
  }
}
