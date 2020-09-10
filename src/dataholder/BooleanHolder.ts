import { BaseQueryProcessor } from '../queryProcessor';
import {BaseDataHolder} from './BaseDataHolder';

export class BooleanHolder extends BaseDataHolder<boolean> {
  protected isBooleanHolder: boolean = true;

}
