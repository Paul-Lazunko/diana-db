import { Datanautics } from 'datanautics';
import { S3Client } from '@aws-sdk/client-s3';
import { AbstractRestoreStrategy } from './abstract-restore-strategy';
import { config } from '@config';
import { createS3ReadStream } from '@helper';

export class S3RestoreStrategy extends AbstractRestoreStrategy {
  s3Client: S3Client;
  constructor() {
    super();
    this.s3Client = new S3Client(config.s3);
  }

  async restore(store: Datanautics, fileName) {
    const readable = await createS3ReadStream({
      s3Client: this.s3Client,
      bucket: config.s3.bucket,
      key: fileName,
    });
    return store.restore(readable);
  }
}
