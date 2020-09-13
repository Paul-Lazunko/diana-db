export class MatchHelper {

  $eq(items: any[], key: string, value: any) {
    return items.filter((item: any) => item[key] === value);
  }

  $ne(items: any[], key: string, value: any) {
    return items.filter((item: any) => item[key] !== value);
  }

  $gt(items: any[], key: string, value: number) {
    return items.filter((item: any) => item[key] > value);
  }

  $lt(items: any[], key: string, value: number) {
    return items.filter((item: any) => item[key] < value);
  }

  $gte(items: any[], key: string, value: number) {
    return items.filter((item: any) => item[key] >= value);
  }

  $lte(items: any[], key: string, value: number) {
    return items.filter((item: any) => item[key] <= value);
  }

  $in(items: any[], key: string, value: any[]) {
    return items.filter((item: any) => value.includes(item[key]));
  }

  $nin(items: any[], key: string, value: any[]) {
    return items.filter((item: any) => !value.includes(item[key]));
  }

  $contains(items: any, key: string, value: any) {
    return items.filter((item: any) => {
      if( Array.isArray(item[key])) {
        return item[key].includes(value)
      } else {
        return item[key].toString().match(value.toString());
      }
    });

  }


}
