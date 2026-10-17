import { Datanautics } from 'datanautics';
import { AbstractStoreStrategy } from './abstract-store-strategy';
import { createWriteStream } from 'fs';
import { open, rename } from 'fs/promises';

export class LocalStoreStrategy extends AbstractStoreStrategy {
  constructor() {
    super();
  }

  /**
   * Writes to "<fileName>.tmp", flushes it to disk and renames it over the target,
   * so a crash or a full disk mid-write never leaves a truncated dump behind.
   */
  async store(store: Datanautics, fileName: string) {
    const tmpFileName = `${fileName}.tmp`;
    const writeStream = createWriteStream(tmpFileName, { encoding: 'utf-8' });
    const closed = new Promise<void>((resolve, reject) => {
      writeStream.once('close', () => resolve());
      writeStream.once('error', reject);
    });
    await store.store(writeStream); // ends the stream
    await closed;
    const handle = await open(tmpFileName, 'r+');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tmpFileName, fileName);
  }
}
