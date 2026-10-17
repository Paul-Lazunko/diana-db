import { BaseQueryProcessor } from './base-query-processor';

export class StringQueryProcessor extends BaseQueryProcessor<string> {
  protected $regex(value: RegExp) {
    return this.collect((key: string) => !!key.match(value));
  }

  protected $cn(value: string) {
    return this.collect((key: string) => key.includes(value));
  }

  protected $nc(value: string) {
    return this.collect((key: string) => !key.includes(value));
  }

  protected $startsWith(value: string) {
    return this.collect((key: string) => key.startsWith(value));
  }

  protected $endsWith(value: string) {
    return this.collect((key: string) => key.endsWith(value));
  }

  protected $notStartsWith(value: string) {
    return this.collect((key: string) => !key.startsWith(value));
  }

  protected $notEndsWith(value: string) {
    return this.collect((key: string) => !key.endsWith(value));
  }
}
