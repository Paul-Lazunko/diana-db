import { IDataHolderMethodsParams } from "../params";
import {BaseDataHolder} from './BaseDataHolder';

export class NumberHolder extends BaseDataHolder<number> {

  public create(params: IDataHolderMethodsParams<number>) {
    this.checkData(params);
    super.create(params);
  }

  public update(params: IDataHolderMethodsParams<number>, data: IDataHolderMethodsParams<number>) {
    this.checkData(data);
    this.remove(params);
    this.create(data);
  }

  protected checkData(data: IDataHolderMethodsParams<number>) {
    if ( data.value && typeof data.value === 'object' ) {
      const oldValue = this.rawDataValues.get(data.identifier);
      const options: { $inc: number, $decr: number } = data.value;
      const deltaValue = (options.$inc||0) - (options.$decr||0);
      if ( Array.isArray(oldValue) ) {
        data.value = oldValue.map((v: number) => v + deltaValue);
      } else  {
        if (oldValue) {
          data.value = oldValue + deltaValue;
        } else {
          data.value = deltaValue;
        }
      }
    }
  }

}
