import { StoreStrategy } from '@const';
import { AbstractStoreStrategy } from './abstract-store-strategy';
import { LocalStoreStrategy } from './local-store-strategy';
import { S3StoreStrategy } from './s3-store-strategy';

export const storeStrategies: Record<string, AbstractStoreStrategy> = {
  [StoreStrategy.LOCAL]: new LocalStoreStrategy(),
  [StoreStrategy.S3]: new S3StoreStrategy(),
};
