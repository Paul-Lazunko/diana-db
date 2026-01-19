import { POINTER_PREFIX } from '@const';

export function evaluatePointer<T extends object>(pointer: string, source: T): T[keyof T] {
  return source[pointer.replace(/^\$/, '')];
}
export function convertPointerToKey(pointer: string): string {
  return pointer.replace(/^\$/, '');
}

export function ensurePointer<T extends object>(pointer: any, source: T): T[keyof T] | any {
  if (isPointer(pointer)) {
    const key = pointer.replace(/^\$/, '');
    return key in source ? source[key] : pointer;
  }
  return pointer;
}

export function isPointer(pointer: string) {
  return typeof pointer === 'string' && pointer.startsWith(POINTER_PREFIX);
}
