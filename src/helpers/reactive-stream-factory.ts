import { Readable, Writable } from 'stream';

export function reactiveStreamFactory(
  nextFunction: (Readable) => Promise<void>,
  errorHandler: (error?: Error) => void,
) {
  const chunks: any[] = [];
  const writable: Writable = new Writable();
  writable._write = (chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => any) => {
    chunks.push(chunk);
    callback();
  };
  writable.on('error', errorHandler);
  writable.on('finish', () => nextFunction(Readable.from(chunks))?.catch(errorHandler));
  return writable;
}
