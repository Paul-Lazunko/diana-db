import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

interface S3ReadableOptions {
  s3Client: S3Client;
  bucket: string;
  key: string;
  range?: string; // e.g. 'bytes=0-1023' for partial reads
}

export async function createS3ReadStream(options: S3ReadableOptions): Promise<Readable> {
  const { s3Client, bucket, key, range } = options;

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: range,
    }),
  );

  if (!response.Body) {
    throw new Error(`No body returned for s3://${bucket}/${key}`);
  }

  // In Node.js, response.Body is a Node.js Readable (via the node http handler).
  // The SDK types it as a generic web stream union, so cast explicitly.
  return response.Body as Readable;
}
