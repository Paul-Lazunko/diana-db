import { createHash } from 'crypto';
import { Datanautics } from 'datanautics';

export const userStore: Datanautics = new Datanautics({});

/** Same derivation the clients use: SHA-256 of the password, as the AES-256 key. */
export function deriveUserKey(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Returns the user's AES key. New users store only the derived key ("key");
 * users created by older versions still have a plaintext "password", which is derived on the fly.
 */
export function getUserKey(user: string): Buffer | undefined {
  if (!user) {
    return;
  }
  const record = userStore.get(`user.${user}`);
  if (!record) {
    return;
  }
  if (record.key) {
    return Buffer.from(record.key, 'hex');
  }
  if (record.password) {
    return Buffer.from(deriveUserKey(String(record.password)), 'hex');
  }
}
