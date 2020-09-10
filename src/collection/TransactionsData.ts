export class TransactionsData {

  public inserted: string[];
  public removed: string[];
  public updated: Map<string,  { key: string, value: any[] } | any >;

  constructor() {
    this.inserted = [];
    this.removed = [];
    this.updated = new Map<string, {key: string, value: any[] } | any >();
  }


}
