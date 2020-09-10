import { BaseProjectionHelper } from './BaseProjectionHelper';

export class StringProjectionHelper extends BaseProjectionHelper {

  public $first (item: any, key: string, value: string, root: any) {
    if ( !root[key] ) {
      root[key] = this.getItemProperty(item, value);
    }
  }

  public $concat (item: any, key: string, options: any, root: any) {
    const { delimiter, localField } = options;
    if ( !root[key] ) {
      root[key] = item[localField];
    } else {
      root[key] = root[key] || '';
      root[key] = root[key] + delimiter;
      root[key] = root[key] + item[localField];
    }
  }

}
