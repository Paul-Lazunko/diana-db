import { S3Client, CompleteMultipartUploadCommandOutput } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

export function uploadStreamTos3(
  s3Client: S3Client,
  stream: Readable,
  bucket: string,
  name: string,
  ACL: any,
): Promise<CompleteMultipartUploadCommandOutput> {
  const upload: Upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: name,
      Body: stream,
      ACL,
    },
  });

  return upload.done();
}
