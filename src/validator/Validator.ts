import { Collection } from '../collection';
import { TransactionsData } from '../collection/TransactionsData';
import { Types } from '../constants';
import { ErrorFactory } from "../error";
import { IValidatorOptions } from '../options';
import {
  filterQueryValidator,
  sortQueryValidator,
  transformQueriesValidator,
  updateQueryValidator
} from './validationHelpers';
import { objectIdQuery } from './schemas';

export class Validator {

  protected collection: Collection;

  constructor(options: IValidatorOptions) {
    this.collection = options.collection;
  }

  public filterQueries(filterQueries: any[]) {
    let validationResult: any;
    for ( let i =0; i < filterQueries.length; i = i + 1) {
      const filterQuery: any = filterQueries[i];
      for ( const key in filterQuery ) {
        if ( ! this.collection.schema[key] ) {
          throw ErrorFactory.collectionError(`property '${key}' doesn't exist in the '${this.collection.name}' collection's Schema`)
        }
        switch ( this.collection.schema[key].type ) {
          case Types.ARRAY:
            switch(this.collection.schema[key].items) {
              case Types.BOOLEAN:
                validationResult = filterQueryValidator.boolean(filterQuery[key])
                break;
              case Types.STRING:
                validationResult = filterQueryValidator.string(filterQuery[key]);
                break;
              case Types.REFERENCE:
              case Types.OBJECT_ID:
                validationResult = objectIdQuery.string(filterQuery[key]);
                break;
              case Types.NUMBER:
                validationResult = filterQueryValidator.number(filterQuery[key])
                break;
              case Types.TIME:
                validationResult = filterQueryValidator.time(filterQuery[key])
                break;
              case Types.GEO:
                validationResult = filterQueryValidator.geo(filterQuery[key])
                break;
            }
            break;
          case Types.BOOLEAN:
            validationResult = filterQueryValidator.boolean(filterQuery[key])
            break;
          case Types.STRING:
            validationResult = filterQueryValidator.string(filterQuery[key]);
            break;
          case Types.REFERENCE:
          case Types.OBJECT_ID:
            validationResult = filterQueryValidator.objectId(filterQuery[key]);
            break;
          case Types.NUMBER:
            validationResult = filterQueryValidator.number(filterQuery[key])
            break;
          case Types.TIME:
            validationResult = filterQueryValidator.time(filterQuery[key])
            break;
          case Types.GEO:
            validationResult = filterQueryValidator.geo(filterQuery[key])
            break;
        }
        if ( validationResult && validationResult.error ) {
          throw ErrorFactory.filtrationError(validationResult.error.message);
        }
      }
    }
  }

  public requiredFields(data: any) {
    for ( const key in this.collection.schema ) {
      if ( this.collection.schema[key].isRequired && !data.hasOwnProperty(key) ) {
        throw ErrorFactory.collectionError(`property '${key}' is required in the '${this.collection.name}' collection's Schema`);
      }
    }
  }

  public mutableFields(data: any) {
    for ( const key in this.collection.schema ) {
      if ( this.collection.schema[key].isMutable === false && data.hasOwnProperty(key) ) {
        throw ErrorFactory.collectionError(`property '${key}' of the '${this.collection.name}' collection's Schema is not mutable`);
      }
    }
  }

  public uniqueFields(data: any, transactionId?: string) {
    for ( const key in this.collection.schema ) {
      if ( this.collection.schema[key].isUnique && data.hasOwnProperty(key) ) {
        const filterQuery: any = {};
        filterQuery[key] = { $eq: data[key] }
        const ids: string[] = this.collection.getItemsIdArray([filterQuery]);
        if ( ids.length ) {
          throw ErrorFactory.collectionError(`property '${key}' with value ${data[key]} is used already`);
        }
        this.collection.transactionsData.forEach((transactionData: TransactionsData, id: string) => {
          if ( !transactionId || id !== transactionId ) {
            const { updated } = transactionData;
            // @ts-ignore
            if ( (!Array.isArray(updated[key]) && updated[key] === data[key]) || ( !Array.isArray(updated[key] && updated[key].includes(data[key]))) ) {
              throw ErrorFactory.collectionError(`property '${key}' with value ${data[key]} is used already`);
            }
          }

        })
      }
    }
  }


  public data(data: any) {
    let validationResult: any;
    for ( const key in data ) {
      if ( !this.collection.schema[key] ) {
        throw ErrorFactory.collectionError(`property '${key}' doesn't exist in Schema of the collection '${this.collection}'`)
      }
      switch ( this.collection.schema[key].type ) {
        case Types.ARRAY:
          switch(this.collection.schema[key].items) {
            case Types.BOOLEAN:
              validationResult = updateQueryValidator.arrayOfBoolean(data[key])
              break;
            case Types.STRING:
              validationResult = updateQueryValidator.arrayOfString(data[key])
              break;
            case Types.REFERENCE:
            case Types.OBJECT_ID:
              validationResult = updateQueryValidator.arrayOfObjectId(data[key])
              break;
            case Types.NUMBER:
              validationResult = updateQueryValidator.arrayOfNumber(data[key])
              break;
            case Types.TIME:
              validationResult = updateQueryValidator.arrayOfTime(data[key])
              break;
            case Types.GEO:
              validationResult = updateQueryValidator.geo(data[key])
              break;
          }
          break;
        case Types.BOOLEAN:
          validationResult = updateQueryValidator.boolean(data[key])
          break;
        case Types.STRING:
          validationResult = updateQueryValidator.string(data[key]);
          break;
        case Types.REFERENCE:
        case Types.OBJECT_ID:
          validationResult = updateQueryValidator.objectId(data[key]);
          break;
        case Types.NUMBER:
          validationResult = updateQueryValidator.number(data[key])
          break;
        case Types.TIME:
          validationResult = updateQueryValidator.time(data[key])
          break;
        case Types.GEO:
          validationResult = updateQueryValidator.geo(data[key])
          break;
      }
      if ( validationResult && validationResult.error ) {
        throw ErrorFactory.collectionError(validationResult.error.message)
      }
    }
  }

  public transformQueries(transformQueries: any[]) {
    const validationResult: any  = transformQueriesValidator(transformQueries);
    if ( validationResult && validationResult.error ) {
      throw ErrorFactory.transformError(validationResult.error.message)
    }
  }

  public skip(skip: any) {
    if ( !Number.isInteger(skip) || skip < 0 ) {
      throw ErrorFactory.filtrationError(`property 'skip' should be positive integer`)
    }
  }

  public limit(limit: any) {
    if ( !Number.isInteger(limit) || limit < 0 ) {
      throw ErrorFactory.filtrationError(`property 'limit' should be positive integer`)
    }
  }

  public sortQuery(sortQuery: any) {
    const validationResult = sortQueryValidator(sortQuery);
    if ( validationResult && validationResult.error ) {
      throw ErrorFactory.filtrationError(validationResult.error.message)
    }
  }
}
