import { StoreStrategy } from '@const';
import { AbstractRestoreStrategy } from './abstract-restore-strategy';
import { LocalRestoreStrategy } from './local-restore-strategy';
import { S3RestoreStrategy } from './s3-restore-strategy';

export const restoreStrategies: Record<string, AbstractRestoreStrategy> = {
  [StoreStrategy.LOCAL]: new LocalRestoreStrategy(),
  [StoreStrategy.S3]: new S3RestoreStrategy(),
};
