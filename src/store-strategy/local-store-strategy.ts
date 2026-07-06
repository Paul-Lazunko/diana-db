import { Datanautics } from 'datanautics';
import { AbstractStoreStrategy } from './abstract-store-strategy';
import { createWriteStream } from 'fs';
import { config } from '@config';

export class LocalStoreStrategy extends AbstractStoreStrategy {
  constructor() {
    super();
  }

  async store(store: Datanautics, fileName) {
    const writeStream = createWriteStream(fileName, { encoding: 'utf-8' });
    await store.store(writeStream);
    return new Promise((resolve) => {
      writeStream.close(() => resolve());
    }) as Promise<void>;
  }
}
