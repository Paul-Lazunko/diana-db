import { Collection, ArrayFieldDefinition, TransactionsData, Schema, NumberFieldDefinition } from '@collection';
import { Types } from '@const';
import { ErrorFactory } from '@error';
import { ValidatorOptions } from '@options';
import {
  clientOptionsValidator,
  filterQueryValidator,
  setDataValidator,
  sortQueryValidator,
  transformQueriesValidator,
} from './validation-helpers';
import { objectIdQuery } from './schemas';
import { evaluatePointer, isPointer } from '@helper';

export class Validator {
  protected collection: Collection<any>;

  constructor(options: ValidatorOptions) {
    this.collection = options.collection;
  }

  public filterQueries(filterQueries: any[]) {
    let validationResult: any;
    for (let i = 0; i < filterQueries.length; i = i + 1) {
      const filterQuery: any = filterQueries[i];
      for (const key in filterQuery) {
        if (!this.collection.schema[key]) {
          throw ErrorFactory.schemaError(
            `property '${key}' doesn't exist in the '${this.collection.name}' collection's Schema`,
          );
        }
        switch (this.collection.schema[key]?.type) {
          case Types.ARRAY:
            switch ((this.collection.schema[key] as ArrayFieldDefinition).items) {
              case Types.BOOLEAN:
                validationResult = filterQueryValidator.boolean(filterQuery[key]);
                break;
              case Types.STRING:
                validationResult = filterQueryValidator.string(filterQuery[key]);
                break;
              case Types.REFERENCE:
              case Types.OBJECT_ID:
                validationResult = objectIdQuery.string(filterQuery[key]);
                break;
              case Types.NUMBER:
                validationResult = filterQueryValidator.number(filterQuery[key]);
                break;
              case Types.TIME:
                validationResult = filterQueryValidator.time(filterQuery[key]);
                break;
              case Types.POSITION:
                validationResult = filterQueryValidator.geo(filterQuery[key]);
                break;
            }
            break;
          case Types.BOOLEAN:
            validationResult = filterQueryValidator.boolean(filterQuery[key]);
            break;
          case Types.STRING:
            validationResult = filterQueryValidator.string(filterQuery[key]);
            break;
          case Types.REFERENCE:
          case Types.OBJECT_ID:
            validationResult = filterQueryValidator.objectId(filterQuery[key]);
            break;
          case Types.NUMBER:
            validationResult = filterQueryValidator.number(filterQuery[key]);
            break;
          case Types.TIME:
            validationResult = filterQueryValidator.time(filterQuery[key]);
            break;
          case Types.POSITION:
            validationResult = filterQueryValidator.geo(filterQuery[key]);
            break;
        }
        if (validationResult && validationResult.error) {
          throw ErrorFactory.filtrationError(validationResult.error.message);
        }
      }
    }
  }

  public data(data: any, update: boolean = false) {
    let validationResult: any;
    for (const key in data) {
      if (!this.collection.schema[key]) {
        throw ErrorFactory.schemaError(
          `property '${key}' doesn't exist in Schema of the collection '${this.collection.name}'`,
        );
      }
      const checkingValue = isPointer(key) ? evaluatePointer(key, data) : data[key];
      if (
        !update &&
        this.collection.schema[key].type !== Types.POSITION &&
        typeof data[key] === 'object' &&
        !(Array.isArray(data[key]) && this.collection.schema[key]?.type === Types.ARRAY)
      ) {
        throw ErrorFactory.schemaError(`property '${key}' should not be an object'`);
      }
      switch (this.collection.schema[key].type) {
        case Types.ARRAY:
          switch ((this.collection.schema[key] as ArrayFieldDefinition).items) {
            case Types.BOOLEAN:
              validationResult = setDataValidator.arrayOfBoolean(checkingValue);
              break;
            case Types.STRING:
              validationResult = setDataValidator.arrayOfString(checkingValue);
              break;
            case Types.REFERENCE:
            case Types.OBJECT_ID:
              validationResult = setDataValidator.arrayOfObjectId(checkingValue);
              break;
            case Types.NUMBER:
              validationResult = setDataValidator.arrayOfNumber(checkingValue);
              break;
            case Types.TIME:
              validationResult = setDataValidator.arrayOfTime(checkingValue);
              break;
            case Types.POSITION:
              validationResult = setDataValidator.arrayOfGeo(checkingValue);
              break;
          }
          break;
        case Types.BOOLEAN:
          validationResult = setDataValidator.boolean(checkingValue);
          break;
        case Types.STRING:
          validationResult = setDataValidator.string(checkingValue);
          break;
        case Types.REFERENCE:
        case Types.OBJECT_ID:
          validationResult = setDataValidator.objectId(checkingValue);
          break;
        case Types.NUMBER:
          validationResult = setDataValidator.number(checkingValue);
          break;
        case Types.TIME:
          validationResult = setDataValidator.time(checkingValue);
          break;
        case Types.POSITION:
          validationResult = setDataValidator.geo(checkingValue);
          break;
      }
      if (validationResult && validationResult.error) {
        throw ErrorFactory.schemaError(validationResult.error.message);
      }
    }
  }

  public transformQueries(transformQueries: any[]) {
    const validationResult: any = transformQueriesValidator(transformQueries);
    if (validationResult && validationResult.error) {
      throw ErrorFactory.transformError(validationResult.error.message);
    }
  }

  public skip(skip: any) {
    if (!Number.isInteger(skip) || skip < 0) {
      throw ErrorFactory.filtrationError(`property 'skip' should be positive integer`);
    }
  }

  public limit(limit: any) {
    if (!Number.isInteger(limit) || limit < 0) {
      throw ErrorFactory.filtrationError(`property 'limit' should be positive integer`);
    }
  }

  public sortQuery(sortQuery: any) {
    const validationResult = sortQueryValidator(sortQuery);
    if (validationResult && validationResult.error) {
      throw ErrorFactory.filtrationError(validationResult.error.message);
    }
  }

  public clientOptions(clientOptions: any) {
    const validationResult = clientOptionsValidator(clientOptions);
    if (validationResult && validationResult.error) {
      throw ErrorFactory.clientConfigurationError(validationResult.error.message);
    }
  }
}
