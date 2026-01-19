import { ensurePointer, isPointer } from '@helper';

export class BaseProjectionHelper {
  protected getItemProperty(item: any | any[], property: string, last?: boolean) {
    const isPointerProp: boolean = isPointer(property);
    if (Array.isArray(item)) {
      if (isPointerProp) {
        return ensurePointer(property, item);
      } else {
        return item[last ? item.length - 1 : 0][property];
      }
    } else {
      if (isPointerProp) {
        return ensurePointer(property, item);
      } else {
        return item[property];
      }
    }
  }
}
