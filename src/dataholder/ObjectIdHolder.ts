import { IQuery } from "../structures";
import {BaseDataHolder} from './BaseDataHolder';

export class ObjectIdHolder extends BaseDataHolder<string> {

  public createCursor(query: IQuery) {
    return this.queryProcessor.processQuery(query.$subQuery||query);
  }
}
