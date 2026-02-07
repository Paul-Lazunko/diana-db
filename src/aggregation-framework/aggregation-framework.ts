import { Collection } from '@collection';
import { ErrorFactory } from '@error';
import { AggregatorOptions } from '@options';
import { LookupQuery, Sorting } from '@dto';
import { MatchHelper } from './match-helper';
import { ProjectionHelper } from './projection-helper';
import { objectFirstKeyHelper } from './object-first-key-helper';
import { convertPointerToKey, evaluatePointer, isPointer } from '@helper';

export class AggregationFramework {
  protected collection: Collection<any>;
  protected projectionHelper: ProjectionHelper;
  protected matchHelper: MatchHelper;
  protected items: any[];

  constructor(options: AggregatorOptions) {
    this.collection = options.collection;
    this.projectionHelper = new ProjectionHelper({ aggregationFramework: this });
    this.matchHelper = new MatchHelper();
  }

  public aggregate(items: any[], transformQueries: any[]) {
    let result: any = Object.assign([], items);
    const transformQueriesLength: number = transformQueries.length;
    for (let i = 0; i < transformQueriesLength; i = i + 1) {
      const key = objectFirstKeyHelper(transformQueries[i]);
      switch (key) {
        case '$group':
          result = this.$group(result, transformQueries[i][key]);
          break;
        case '$sort':
          this.$sort(result, transformQueries[i][key]);
          break;
        case '$skip':
          this.$skip(result, transformQueries[i][key]);
          break;
        case '$limit':
          this.$limit(result, transformQueries[i][key]);
          break;
        case '$project':
          result = this.$project(result, transformQueries[i][key]);
          break;
        case '$match':
          result = this.$match(result, transformQueries[i][key]);
          break;
        default:
          result = this.applyForItems(result, transformQueries[i][key], key);
          break;
      }
    }
    return result;
  }

  protected applyForItems(items: any[], options: any, method: string) {
    const result: any[] = [];

    if (typeof this[method] === 'function') {
      const itemsLength: number = items.length;
      for (let i = 0; i < itemsLength; i = i + 1) {
        const convertedItem: any = this[method](items[i], options);
        if (Array.isArray(convertedItem)) {
          result.push(...convertedItem);
        } else {
          result.push(convertedItem);
        }
      }
    }
    return result;
  }

  protected $lookup(item: any, options: LookupQuery): any {
    const { collection, database, as, foreignField, localField, filter } = options;
    if (database && !this.collection.db.dianaDB.databases.has(database)) {
      throw ErrorFactory.databaseError(`database ${database} doesn't exist`);
    } else if (!database && !this.collection.db.collections.has(collection)) {
      throw ErrorFactory.databaseError(`collection ${collection} doesn't exist`);
    }
    const filterQuery: any = {};
    filterQuery[foreignField] = {
      $eq: item[localField],
    };
    const _collection: Collection<any> = database
      ? this.collection.db.dianaDB.databases.get(database).collections.get(collection)
      : this.collection.db.collections.get(collection);
    item[as] = _collection.find([Object.assign(filter || {}, filterQuery)]);
    if (options.sort) {
      this.$sort(item[as], options.sort);
    }
    if (options.skip) {
      this.$skip(item[as], options.skip);
    }
    if (options.limit) {
      this.$limit(item[as], options.limit);
    }
    return item;
  }

  protected $unwind(item: any, field: string) {
    const items: any[] = [];
    if (!Array.isArray(item[field])) {
      throw ErrorFactory.transformError(`property '${field}' should be an array`);
    }
    if (item[field].length > 0) {
      for (let i = 0; i < item[field].length; i = i + 1) {
        const _item: any = Object.assign({}, item);
        _item[field] = item[field][i];
        items.push(_item);
      }
    }
    return items;
  }

  protected $replaceRoot(item: any, newRoot: string) {
    return item[newRoot];
  }

  protected $sort(items: any, sorting: Sorting) {
    const keys = Object.keys(sorting);
    for (let i = 0; i < keys.length; i = i + 1) {
      const key: string = keys[i];
      const previousKey: string = keys[i - 1];
      items.sort((a: any, b: any) => {
        if (i === 0 || a[previousKey] === b[previousKey]) {
          const compareResult: boolean = a[key] > b[key];
          if (sorting[key] === -1) {
            return compareResult ? -1 : 1;
          }
          return compareResult ? 1 : -1;
        }
      });
    }
  }

  protected $skip(items, skip) {
    items.slice(skip, items.length);
  }

  protected $limit(items, limit) {
    items.slice(0, limit > items.length ? items.length : limit);
  }

  protected $group(items: any[], options: any) {
    const { _id, ...projection } = options;
    const result: Record<string, any> = {};
    const id = _id || '$_id';
    const itemsLength: number = items.length;
    const itemItems: Record<string, any[]> = {};
    for (let i = 0; i < itemsLength; i = i + 1) {
      const iid =
        typeof id === 'object'
          ? Object.values(id)
              .map((v: any) => (isPointer(v) ? evaluatePointer(v, items[i]) : v))
              .map((v: any) => v.toString())
              .join('.')
          : isPointer(id)
            ? evaluatePointer(id, items[i])
            : id;
      result[iid] = result[iid] || { _id: iid };
      itemItems[iid] = itemItems[iid] || [];
      const itemId = typeof id === 'object' ? Object.assign({}, id) : iid;
      if (typeof id === 'object') {
        for (const key in id) {
          if (isPointer(id[key])) {
            itemId[key] = evaluatePointer(id[key], items[i]);
          }
        }
      }
      itemItems[iid].push({ ...items[i], _id: itemId });
    }
    for (const iid in itemItems) {
      result[iid] = { _id: itemItems[iid][0]._id, ...this.projectionHelper.project(itemItems[iid], projection, true) };
    }
    return Object.values(result);
  }

  protected $project(items: any[], options: any) {
    return this.projectionHelper.project(items, options, true);
  }

  protected $match(items: any[], matchQuery: any) {
    for (const key in matchQuery) {
      const method: string = Object.keys(matchQuery[key])[0];
      items = this.matchHelper[method](items, key, matchQuery[key][method]);
    }
    return items;
  }
}
