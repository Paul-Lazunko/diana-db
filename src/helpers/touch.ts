import { open, FileHandle } from 'fs/promises';

export async function touch(path: string) {
  const fh: FileHandle = await open(path, 'a');
  await fh.close();
}
