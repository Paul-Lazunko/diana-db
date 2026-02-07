import crypto, { Cipher, Decipher } from 'crypto';
const ALGORITHM = 'aes-256-gcm';
const KEY_LEN = 32; // AES-256
const SALT_LEN = 16; // 128-bit salt
const IV_LEN = 12; // Recommended for GCM
const TAG_LEN = 16; // GCM auth tag

export class CryptoHelper {
  public static encrypt(password: string, plaintext: string) {
    const iv = crypto.randomBytes(IV_LEN);
    const key = crypto.createHash('sha256').update(password).digest().subarray(0, 32);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();
    return Buffer.concat([
      iv,
      tag,
      ciphertext,
    ]).toString('base64');
  }

  public static decrypt(password: string, text: string) {
    const encrypted = Buffer.from(text, 'base64');
    const iv = encrypted.subarray(0, IV_LEN);
    const tag = encrypted.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = encrypted.subarray(IV_LEN + TAG_LEN);

    const key = crypto.createHash('sha256').update(password).digest().subarray(0, 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString();
  }
}
