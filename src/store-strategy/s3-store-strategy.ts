import { Datanautics } from 'datanautics';
import { S3Client } from '@aws-sdk/client-s3';
import { AbstractStoreStrategy } from './abstract-store-strategy';
import { Readable } from 'stream';
import { config } from '@config';
import { reactiveStreamFactory, uploadStreamTos3 } from '@helper';
import { logger } from '@logger';

export class S3StoreStrategy extends AbstractStoreStrategy {
  s3Client: S3Client;
  constructor() {
    super();
    this.s3Client = new S3Client(config.s3);
  }

  async store(store: Datanautics) {
    const writable = reactiveStreamFactory(this.process.bind(this), logger.error);
    await store.store(writable);
  }

  async process(readable: Readable) {
    return uploadStreamTos3(this.s3Client, readable, config.s3.bucket, config.currentDumpName, 'private');
  }
}
