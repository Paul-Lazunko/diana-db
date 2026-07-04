import crypto, { Cipheriv, Decipheriv } from 'crypto';
const algorithm = 'aes-256-cbc';

export class CryptoHelper {
  public static encrypt(password: string, text: string): string {
    const encryptedKey: string = crypto.createHash('md5').update(password).digest('hex');
    const cipher: Cipheriv = crypto.createCipheriv(algorithm, Buffer.from(encryptedKey), encryptedKey.substr(0, 16));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  public static decrypt(password: string, text: string): string {
    const encryptedKey: string = crypto.createHash('md5').update(password).digest('hex');
    const decipher: Decipheriv = crypto.createDecipheriv(
      algorithm,
      Buffer.from(encryptedKey),
      encryptedKey.substr(0, 16),
    );
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
