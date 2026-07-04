import { Datanautics } from 'datanautics';
import { AbstractRestoreStrategy } from './abstract-restore-strategy';
import { createReadStream } from 'fs';
import { config } from '@config';

export class LocalRestoreStrategy extends AbstractRestoreStrategy {
  constructor() {
    super();
  }

  async restore(store: Datanautics) {
    const readStream = createReadStream(`${config.dumpDirectory}/${config.currentDumpName}`, { encoding: 'utf8' });
    return store.restore(readStream);
  }
}
