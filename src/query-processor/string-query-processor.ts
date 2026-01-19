import { arrayConcatenation } from '@helper';
import { BaseQueryProcessor } from './base-query-processor';

export class StringQueryProcessor extends BaseQueryProcessor<string> {
  protected $regex(value: RegExp) {
    const ids: string[][] = [];
    const keys: string[] = Array.from(this.rawDataKeys.keys());
    const compared: string[] = keys.filter((key: string) => key.match(value));
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }

  protected $cn(value: string) {
    const ids: string[][] = [];
    const keys: string[] = Array.from(this.rawDataKeys.keys());
    const compared: string[] = keys.filter((key: string) => key.match(value));
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }

  protected $nc(value: string) {
    const ids: string[][] = [];
    const keys: string[] = Array.from(this.rawDataKeys.keys());
    const compared: string[] = keys.filter((key: string) => !key.match(value));
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }

  protected $startsWith(value: string) {
    const ids: string[][] = [];
    const keys: string[] = Array.from(this.rawDataKeys.keys());
    const compared: string[] = keys.filter((key: string) => key.startsWith(value));
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }

  protected $endsWith(value: string) {
    const ids: string[][] = [];
    const keys: string[] = Array.from(this.rawDataKeys.keys());
    const compared: string[] = keys.filter((key: string) => key.endsWith(value));
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }

  protected $notStartsWith(value: string) {
    const ids: string[][] = [];
    const keys: string[] = Array.from(this.rawDataKeys.keys());
    const compared: string[] = keys.filter((key: string) => !key.startsWith(value));
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }

  protected $notEndsWith(value: string) {
    const ids: string[][] = [];
    const keys: string[] = Array.from(this.rawDataKeys.keys());
    const compared: string[] = keys.filter((key: string) => !key.endsWith(value));
    for (let i = 0; i < compared.length; i = i + 1) {
      ids.push(this.rawDataKeys.get(compared[i]));
    }
    return arrayConcatenation(...ids);
  }
}
