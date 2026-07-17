import { FindQuery } from '@dto';
import { DataHolderMethodsParams } from '@parameters';
import { NumberFieldDefinition } from '@collection';

export interface DataHolder {
  createCursor: (params: FindQuery) => string[];
  create: (params: DataHolderMethodsParams<any>, fieldDefinition?: NumberFieldDefinition, skip?: boolean) => void;
  remove: (params: DataHolderMethodsParams<any>) => void;
  initReference?: (reference: string, collection: string, key: string) => void;
  update: (
    filters: DataHolderMethodsParams<any>,
    updateData: DataHolderMethodsParams<any>,
    fieldDefinition?: NumberFieldDefinition,
    skip?: boolean
  ) => void;
  get: (params: string[], precision?: number) => { [key: string]: any };
  store: () => any;
  restore: (data: any) => void;
  hasValue: (value: any) => boolean;
  distinct: (...args: any[]) => any[];
}
