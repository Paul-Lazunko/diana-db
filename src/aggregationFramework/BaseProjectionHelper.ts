export class BaseProjectionHelper {
  protected getItemProperty(item: any|any[], property: string) {
    return Array.isArray(item) ? item[0] && item[0][property] : item[property];
  }
}
