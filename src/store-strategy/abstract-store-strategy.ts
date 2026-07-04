import { Datanautics } from 'datanautics';

export abstract class AbstractStoreStrategy {
  protected constructor() {}

  abstract store(store: Datanautics): Promise<void>;
}
