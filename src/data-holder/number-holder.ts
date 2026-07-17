import { DataHolderMethodsParams } from '@parameters';
import { BaseDataHolder } from './base-data-holder';
import { NumberFieldDefinition } from '@collection';
import { projectIncomingValue, projectOutgoingValue } from '@helper';

export class NumberHolder extends BaseDataHolder<number> {
  public create(params: DataHolderMethodsParams<number>, fieldDefinition?: NumberFieldDefinition, skip = false) {
    if (!skip && fieldDefinition && !Number.isNaN(params.value)) {
      params.value = projectIncomingValue(params.value, fieldDefinition?.precision);
    }
    this.checkData(params);
    super.create(params);
  }

  public get(identifiers: string[], precision?: number) {
    const result: { [key: string]: number | number[] } = {};
    for (const identifier of identifiers) {
      if (this.rawDataValues.has(identifier)) {
        let value = this.rawDataValues.get(identifier);
        if (precision && !Number.isNaN(value)) {
          if (Array.isArray(value)) {
            value = value.map((item: number) => projectOutgoingValue(item, precision));
          } else {
            value = projectOutgoingValue(value, precision)
          }
          result[identifier] = value;
        } else {
          result[identifier] = this.rawDataValues.get(identifier);
        }
      }
    }
    return result;
  }

  public update(
    params: DataHolderMethodsParams<number>,
    data: DataHolderMethodsParams<number>,
    fieldDefinition: NumberFieldDefinition,
    skip?: boolean
  ) {
    if (data.value && typeof data.value === 'object') {
      let oldValue: number | number[] = this.rawDataValues.get(data.identifier);
      const isArrayOldValue: boolean = Array.isArray(oldValue);
      if (!skip) {
        if (isArrayOldValue) {
          oldValue = (oldValue as number[]).map((item: number) => projectOutgoingValue(item, fieldDefinition?.precision))
        } else {
          oldValue = projectOutgoingValue(oldValue as number, fieldDefinition?.precision)
        }
      }
      for (const action in data.value) {
        switch (action) {
          case '$addItem':
            if (isArrayOldValue) {
              data.value = Array.isArray(data.value[action])
                ? [
                  ...(oldValue as number[]),
                  ...data.value[action],
                ]
                : [
                  ...(oldValue as number[]),
                  data.value[action],
                ];
            } else if (oldValue || oldValue === 0) {
              data.value = Array.isArray(data.value[action])
                ? [
                  oldValue,
                  ...data.value[action],
                ]
                : [
                  oldValue,
                  data.value[action],
                ];
            } else {
              data.value = data.value[action];
            }
            break;
          case '$removeItem':
            if (isArrayOldValue) {
              data.value = Array.isArray(data.value[action])
                ? (oldValue as number[]).filter((el: number) => !data.value[action].includes(el))
                : (oldValue as number[]).filter((el: number) => data.value[action] !== el);
            } else if (oldValue) {
              data.value = Array.isArray(data.value[action])
                ? [oldValue].filter((el: number) => !data.value[action].includes(el))
                : [oldValue].filter((el: number) => data.value[action] !== el);
            } else {
              data.value = data.value[action];
            }
            break;
          case '$sum':
            if (isArrayOldValue) {
              data.value = (oldValue as number[]).map((v: number) => v + data.value[action]);
            } else {
              if (oldValue) {
                data.value = oldValue + data.value[action];
              } else {
                data.value = data.value[action];
              }
            }
            break;
          case '$add':
            if (isArrayOldValue) {
              data.value = (oldValue as number[]).map((v: number) => (v || 0) + data.value[action]);
            } else {
              if (oldValue) {
                data.value = oldValue + data.value[action];
              } else {
                data.value = data.value[action];
              }
            }
            break;
          case '$subtract':
            if (isArrayOldValue) {
              data.value = (oldValue as number[]).map((v: number) => (v || 0) - data.value[action]);
            } else {
              if (oldValue) {
                data.value = (oldValue as number) - data.value[action];
              } else {
                data.value = -1 * data.value[action];
              }
            }
            break;
          case '$multiply':
            if (isArrayOldValue) {
              data.value = (oldValue as number[]).map((v: number) => (v || 0) * data.value[action]);
            } else {
              if (oldValue) {
                data.value = (oldValue as number) * data.value[action];
              }
            }
            break;
          case '$divide':
            if (isArrayOldValue) {
              data.value = (oldValue as number[]).map((v: number) => (v || 0) / data.value[action]);
            } else {
              if (oldValue) {
                data.value = (oldValue as number) / data.value[action];
              }
            }
            break;
          case '$round':
            if (isArrayOldValue) {
              data.value = (oldValue as number[]).map(
                (v: number) => Math.round(v / 10 ** data.value[action]) * 10 ** data.value[action],
              );
            } else {
              if (oldValue) {
                data.value = Math.round((oldValue as number) * 10 ** data.value[action]) / 10 ** data.value[action];
              }
            }
            break;
        }
      }
    }
    this.remove(params);
    this.create(data, fieldDefinition, true);
  }


  public distinct(precision?: number): number[] {
    return Array.from(this.rawDataKeys.keys()).map((value: number) => precision ? projectOutgoingValue(value, precision) : value);
  }

  protected checkData(data: DataHolderMethodsParams<number>) {}
}
