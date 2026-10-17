import crypto from 'crypto';
const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 12; // Recommended for GCM
const TAG_LEN = 16; // GCM auth tag

export class CryptoHelper {
  public static encrypt(key: Buffer, plaintext: string) {
    const iv = crypto.randomBytes(IV_LEN);
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

  public static decrypt(key: Buffer, text: string) {
    const encrypted = Buffer.from(text, 'base64');
    const iv = encrypted.subarray(0, IV_LEN);
    const tag = encrypted.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = encrypted.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString();
  }
}
