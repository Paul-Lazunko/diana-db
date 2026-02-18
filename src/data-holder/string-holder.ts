import { BaseDataHolder } from './base-data-holder';
import { DataHolderMethodsParams } from '@parameters';

export class StringHolder extends BaseDataHolder<string> {
  public update(params: DataHolderMethodsParams<string>, data: DataHolderMethodsParams<string>) {
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
            } else if (oldValue) {
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
                ? oldValue.filter((el: string) => !data.value[action].includes(el))
                : oldValue.filter((el: string) => data.value[action] !== el);
            } else if (oldValue) {
              data.value = Array.isArray(data.value[action])
                ? [oldValue].filter((el: string) => !data.value[action].includes(el))
                : [oldValue].filter((el: string) => data.value[action] !== el);
            } else {
              data.value = data.value[action];
            }
            break;
          case '$concat':
            if (Array.isArray(oldValue)) {
              data.value = oldValue.map((v: string) => v + data.value[action]);
            } else {
              if (oldValue) {
                data.value = oldValue + data.value[action];
              } else {
                data.value = data.value[action];
              }
            }
            break;
          case '$replace':
            if (Array.isArray(oldValue)) {
              data.value = oldValue.map((v: string) => {
                try {
                  const [
                    a,
                    b,
                    flags,
                  ] = data.value[action];
                  const regex = new RegExp(a.replace(/^\/|\/$/g, '').replace(/\//g, '//'), flags);
                  return v.toString().replace(regex, b);
                } catch (e) {
                  return v;
                }
              });
            } else {
              if (oldValue) {
                try {
                  const [
                    a,
                    b,
                    flags,
                  ] = data.value[action];
                  const regex = new RegExp(a.replace(/^\/|\/$/g, '').replace(/\//g, '//'), flags);
                  return oldValue.toString().replace(regex, b);
                } catch (e) {
                  return oldValue;
                }
              }
            }
            break;
        }
      }
    }
    this.remove(params);
    this.create(data);
  }
}
