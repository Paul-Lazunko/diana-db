import { BaseDataHolder } from './base-data-holder';
import { Types } from '@const';

export class ObjectIdHolder extends BaseDataHolder<string> {
  protected type: Types = Types.OBJECT_ID;
}
