import { BaseDataHolder } from './base-data-holder';
import { Types } from '@const';

export class BooleanHolder extends BaseDataHolder<boolean> {
  protected type: Types = Types.BOOLEAN;
}
