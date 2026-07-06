import { Readable, Writable } from 'stream';

export function reactiveStreamFactory(
  nextFunction: (readable: Readable, fileName: string) => Promise<void>,
  fileName: string,
  errorHandler: (error?: Error) => void,
) {
  const chunks: any[] = [];
  const writable: Writable = new Writable();
  writable._write = (chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => any) => {
    chunks.push(chunk);
    callback();
  };
  writable.on('error', errorHandler);
  writable.on('finish', () => nextFunction(Readable.from(chunks), fileName)?.catch(errorHandler));
  return writable;
}
