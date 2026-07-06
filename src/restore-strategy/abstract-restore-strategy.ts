import { Datanautics } from 'datanautics';

export abstract class AbstractRestoreStrategy {
  protected constructor() {}

  abstract restore(store: Datanautics, fileName: string): Promise<void>;
}
