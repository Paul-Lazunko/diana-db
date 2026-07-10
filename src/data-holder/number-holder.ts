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

  public update(
    params: DataHolderMethodsParams<number>,
    data: DataHolderMethodsParams<number>,
    fieldDefinition: NumberFieldDefinition,
  ) {
    if (data.value && typeof data.value === 'object') {
      const oldValue = this.rawDataValues.get(data.identifier);
      for (const action in data.value) {
        switch (action) {
          case '$addItem':
            if (Array.isArray(oldValue)) {
              data.value = Array.isArray(data.value[action])
                ? [
                    ...oldValue,
                    ...data.value[action],
                  ]
                : [
                    ...oldValue,
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
            if (Array.isArray(oldValue)) {
              data.value = Array.isArray(data.value[action])
                ? oldValue.filter((el: number) => !data.value[action].includes(el))
                : oldValue.filter((el: number) => data.value[action] !== el);
            } else if (oldValue) {
              data.value = Array.isArray(data.value[action])
                ? [oldValue].filter((el: number) => !data.value[action].includes(el))
                : [oldValue].filter((el: number) => data.value[action] !== el);
            } else {
              data.value = data.value[action];
            }
            break;
          case '$sum':
            if (Array.isArray(oldValue)) {
              data.value = oldValue.map((v: number) => v + data.value[action]);
            } else {
              if (oldValue) {
                data.value = oldValue + data.value[action];
              } else {
                data.value = data.value[action];
              }
            }
            break;
          case '$subtract':
            if (Array.isArray(oldValue)) {
              data.value = oldValue.map((v: number) => (v || 0) - data.value[action]);
            } else {
              if (oldValue) {
                data.value = oldValue - data.value[action];
              } else {
                data.value = -1 * data.value[action];
              }
            }
            break;
          case '$multiply':
            if (Array.isArray(oldValue)) {
              data.value = oldValue.map((v: number) => (v || 0) * data.value[action]);
            } else {
              if (oldValue) {
                data.value = oldValue * data.value[action];
              }
            }
            break;
          case '$divide':
            if (Array.isArray(oldValue)) {
              data.value = oldValue.map((v: number) => (v || 0) / data.value[action]);
            } else {
              if (oldValue) {
                data.value = oldValue / data.value[action];
              }
            }
            break;
          case '$round':
            if (Array.isArray(oldValue)) {
              data.value = oldValue.map(
                (v: number) => Math.round(v / 10 ** data.value[action]) * 10 ** data.value[action],
              );
            } else {
              if (oldValue) {
                data.value = Math.round(oldValue * 10 ** data.value[action]) / 10 ** data.value[action];
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
