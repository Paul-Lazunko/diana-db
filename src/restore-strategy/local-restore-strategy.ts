import { Datanautics } from 'datanautics';
import { AbstractRestoreStrategy } from './abstract-restore-strategy';
import { createReadStream } from 'fs';
import { config } from '@config';

export class LocalRestoreStrategy extends AbstractRestoreStrategy {
  constructor() {
    super();
  }

  async restore(store: Datanautics, fileName: string) {
    const readStream = createReadStream(fileName, { encoding: 'utf8' });
    return store.restore(readStream);
  }
}
