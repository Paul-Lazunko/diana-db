import {
  S3Client,
  CopyObjectCommand,
  CopyObjectCommandInput,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  HeadObjectCommand,
  HeadObjectCommandInput,
  GetObjectCommand,
  GetObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  DeleteObjectCommand,
  DeleteObjectCommandInput,
} from '@aws-sdk/client-s3';

export class S3Driver {
  private readonly options;
  private s3Client: S3Client;

  constructor(options: any) {
    this.options = options;
    this.s3Client = new S3Client(options);
  }

  public async copyObject(key: string, source: string): Promise<any> {
    const command = new CopyObjectCommand(this.getCopyParams(key, source));
    return this.s3Client.send(command);
  }

  public async listObjects(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command(this.getListParams(prefix, continuationToken));
      const response = await this.s3Client.send(command);
      (response.Contents ?? []).forEach((obj) => {
        if (obj.Key) {
          keys.push(obj.Key);
        }
      });
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return keys;
  }

  public async objectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand(this.getHeadParams(key));
      await this.s3Client.send(command);
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  public async getObject(key: string): Promise<Buffer> {
    const command = new GetObjectCommand(this.getGetParams(key));
    const response = await this.s3Client.send(command);
    const stream = response.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  public async putObject(key: string, body: Buffer | string): Promise<any> {
    const command = new PutObjectCommand(this.getPutParams(key, body));
    return this.s3Client.send(command);
  }

  public async deleteObject(key: string): Promise<any> {
    const command = new DeleteObjectCommand(this.getDeleteParams(key));
    return this.s3Client.send(command);
  }

  private getCopyParams(Key: string, CopySource: string): CopyObjectCommandInput {
    return {
      Bucket: this.options.bucket,
      Key,
      CopySource: `${this.options.bucket}/${CopySource}`,
      ACL: 'private',
    };
  }

  private getListParams(Prefix?: string, ContinuationToken?: string): ListObjectsV2CommandInput {
    return {
      Bucket: this.options.bucket,
      ...(Prefix && { Prefix }),
      ...(ContinuationToken && { ContinuationToken }),
    };
  }

  private getHeadParams(Key: string): HeadObjectCommandInput {
    return {
      Bucket: this.options.bucket,
      Key,
    };
  }

  private getGetParams(Key: string): GetObjectCommandInput {
    return {
      Bucket: this.options.bucket,
      Key,
    };
  }

  private getPutParams(Key: string, Body: Buffer | string): PutObjectCommandInput {
    return {
      Bucket: this.options.bucket,
      Key,
      Body,
      ACL: 'private',
    };
  }

  private getDeleteParams(Key: string): DeleteObjectCommandInput {
    return {
      Bucket: this.options.bucket,
      Key,
    };
  }
}
