import { ensurePointer, findValueWithMode } from '@helper';

export class MatchHelper {
  $eq(items: any[], key: string, value: any) {
    return items.filter((item: any) => item[key] === ensurePointer(value, item));
  }

  $ne(items: any[], key: string, value: any) {
    return items.filter((item: any) => item[key] !== ensurePointer(value, item));
  }

  $gt(items: any[], key: string, value: number) {
    return items.filter((item: any) => item[key] > ensurePointer(value, item));
  }

  $lt(items: any[], key: string, value: number) {
    return items.filter((item: any) => item[key] < ensurePointer(value, item));
  }

  $gte(items: any[], key: string, value: number) {
    return items.filter((item: any) => item[key] >= ensurePointer(value, item));
  }

  $lte(items: any[], key: string, value: number) {
    return items.filter((item: any) => item[key] <= ensurePointer(value, item));
  }

  $in(items: any[], key: string, value: any[]) {
    return items.filter((item: any) => value.includes(item[key]));
  }

  $nin(items: any[], key: string, value: any[]) {
    return items.filter((item: any) => !value.includes(item[key]));
  }

  $cn(items: any, key: string, value: any) {
    return items.filter((item: any) => {
      if (Array.isArray(item[key])) {
        return item[key].includes(ensurePointer(value, item));
      } else {
        return item[key]?.toString().includes(ensurePointer(value, item).toString());
      }
    });
  }

  $nc(items: any, key: string, value: any) {
    return items.filter((item: any) => {
      if (Array.isArray(item[key])) {
        return !item[key].includes(ensurePointer(value, item));
      } else {
        return !item[key]?.toString().includes(ensurePointer(value, item).toString());
      }
    });
  }

  $startsWith(items: any, key: string, value: any) {
    return items.filter((item: any) => {
      return item[key].toString().startsWith(ensurePointer(value, item).toString());
    });
  }

  $endsWith(items: any, key: string, value: any) {
    return items.filter((item: any) => {
      return item[key].toString().endsWith(ensurePointer(value, item).toString());
    });
  }

  $notStartsWith(items: any, key: string, value: any) {
    return items.filter((item: any) => {
      return !item[key].toString().startsWith(ensurePointer(value, item).toString());
    });
  }

  $notEndsWith(items: any, key: string, value: any) {
    return items.filter((item: any) => {
      return !item[key].toString().endsWith(ensurePointer(value, item).toString());
    });
  }
}
