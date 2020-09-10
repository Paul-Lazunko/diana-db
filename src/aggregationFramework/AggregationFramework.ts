import { Collection } from '../collection';
import { ErrorFactory } from "../error";
import { IAggregatorOptions, ILookupOptions } from '../options';
import { MathHelper } from './MathHelper';
import { ProjectionHelper } from './ProjectionHelper';
import { objectFirstKeyHelper } from './objectFirstKeyHelper'

export class AggregationFramework {

  protected collection: Collection;
  protected projectionHelper: ProjectionHelper;
  protected mathHelper: MathHelper;
  protected items: any[];

  constructor(options: IAggregatorOptions) {
    this.collection = options.collection;
    this.projectionHelper = new ProjectionHelper({ aggregationFramework: this });
    this.mathHelper = new MathHelper();
  }

  aggregate(items: any[], transformQueries: any[]) {
    let result: any = Object.assign([],items);
    const transformQueriesLength: number = transformQueries.length;
    for ( let i=0; i < transformQueriesLength; i = i + 1 ) {
      const key = objectFirstKeyHelper(transformQueries[i]);
      switch(key) {
        case '$group':
          result = this.$group(result, transformQueries[i][key]);
          break;
        case '$project':
          result = this.$project(result, transformQueries[i][key] );
          break;
        case '$match':
          result = this.$match(result, transformQueries[i][key] );
          break;
        default:
          result = this.applyForItems(result, transformQueries[i][key], key);
          break;
      }
    }
    return result;
  }

  protected applyForItems(items: any[], options: any, method: string) {
    let result: any[] = [];
    // @ts-ignore
    if (typeof this[method] === 'function') {
      const itemsLength: number = items.length;
      for ( let i = 0; i < itemsLength; i = i + 1 ) {
        // @ts-ignore
        const convertedItem: any = this[method](items[i], options);
        if ( Array.isArray(convertedItem) ) {
          result.push(...convertedItem);
        } else {
          result.push(convertedItem);
        }
      }
    }
    return result;
  }

  protected $lookUp(item: any, options: ILookupOptions): any {
    const {
      collection,
      database,
      as,
      foreignField,
      localField,
      filter
    } = options;
    if ( database && !this.collection.db.diDb.databases.has(database) ) {
      throw ErrorFactory.databaseError(`database ${database} doesn't exist`);
    } else if ( !database && !this.collection.db.collections.has(collection) ) {
      throw ErrorFactory.databaseError(`collection ${collection} doesn't exist`);
    }
    const filterQuery: any = {};
    filterQuery[foreignField] = {
      $eq: item[localField]
    };
    const _collection: Collection = database ? this.collection.db.diDb.databases.get(database).collections.get(collection) : this.collection.db.collections.get(collection);
    item[as] = _collection.find([Object.assign(filter||{}, filterQuery)]);
    return item;
  }

  protected $unwind(item: any, field: string) {
    const items: any[] = [];
    if ( !Array.isArray(item[field]) ) {
      throw ErrorFactory.transformError(`property '${field}' should be an array`)
    }
    if ( item[field].length > 0 ) {
      for ( let i = 0; i < item[field].length; i = i + 1 ) {
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

  protected $group(items: any[], options: any) {
    const { _id, ...projection } = options;
    const result: any = {};
    let id = _id || '_id';
    const itemsLength: number = items.length;
    const itemItems: {[key: string]: any[]} = {}
    for ( let i = 0; i < itemsLength; i = i + 1 ) {
      let iid = items[i][id];
      result[iid] = result[iid] || { _id: iid };
    }
    for ( let i = 0; i < itemsLength; i = i + 1 ) {
      let iid = items[i][id];
      result[iid] = result[iid] || { _id: iid };
      itemItems[iid] = itemItems[iid] || [];
      itemItems[iid].push(items[i]);
    }
    for ( const iid in result ) {
      this.projectionHelper.project(itemItems[iid], projection, result[iid]);
    }
    return Object.values(result)
  }

  protected $project(items: any[], options: any) {
    return this.projectionHelper.project(items, options);
  }

  protected $match(items: any[], matchQuery: any) {
    for ( const key in matchQuery ) {
      const method: string = Object.keys(matchQuery[key])[0];
      // @ts-ignore
      items = this.mathHelper[method](items, key, matchQuery[key][method])
    }
    return items;
  }



}
