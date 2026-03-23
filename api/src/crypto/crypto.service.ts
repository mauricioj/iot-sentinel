import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyPath: string;

  constructor() {
    this.keyPath = process.env.ENCRYPTION_KEY_PATH || '/data/secrets/encryption.key';
  }

  async onModuleInit() {
    await this.loadOrGenerateKey();
  }

  private async loadOrGenerateKey() {
    const keyDir = path.dirname(this.keyPath);

    if (fs.existsSync(this.keyPath)) {
      this.encryptionKey = fs.readFileSync(this.keyPath);
      this.logger.log('Encryption key loaded from disk');
    } else {
      if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true });
      }
      this.encryptionKey = crypto.randomBytes(32);
      fs.writeFileSync(this.keyPath, this.encryptionKey, { mode: 0o600 });
      this.logger.warn('New encryption key generated and saved');
    }
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  encryptWithPassword(plaintext: string, password: string): string {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decryptWithPassword(ciphertext: string, password: string): string {
    const [saltHex, ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const key = crypto.scryptSync(password, salt, 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
