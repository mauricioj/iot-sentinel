import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';
import * as fs from 'fs';
import * as path from 'path';

describe('CryptoService', () => {
  let service: CryptoService;
  const testKeyDir = path.join(__dirname, '../../test-secrets');
  const testKeyPath = path.join(testKeyDir, 'encryption.key');

  beforeAll(() => {
    if (!fs.existsSync(testKeyDir)) {
      fs.mkdirSync(testKeyDir, { recursive: true });
    }
    process.env.ENCRYPTION_KEY_PATH = testKeyPath;
  });

  afterAll(() => {
    if (fs.existsSync(testKeyPath)) {
      fs.unlinkSync(testKeyPath);
    }
    if (fs.existsSync(testKeyDir)) {
      fs.rmdirSync(testKeyDir);
    }
  });

  beforeEach(async () => {
    if (fs.existsSync(testKeyPath)) {
      fs.unlinkSync(testKeyPath);
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    await service.onModuleInit();
  });

  it('should auto-generate encryption key on first boot', () => {
    expect(fs.existsSync(testKeyPath)).toBe(true);
    const keyBuffer = fs.readFileSync(testKeyPath);
    expect(keyBuffer.length).toBe(32);
  });

  it('should encrypt and decrypt a string', () => {
    const plaintext = 'my-secret-password';
    const encrypted = service.encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(':');
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for the same plaintext (random IV)', () => {
    const plaintext = 'same-value';
    const encrypted1 = service.encrypt(plaintext);
    const encrypted2 = service.encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should throw on tampered ciphertext', () => {
    const encrypted = service.encrypt('test');
    const tampered = encrypted.slice(0, -2) + 'xx';
    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('should encrypt and decrypt with a custom password', () => {
    const plaintext = 'backup-credential';
    const password = 'my-backup-password';
    const encrypted = service.encryptWithPassword(plaintext, password);
    const decrypted = service.decryptWithPassword(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle empty strings', () => {
    const encrypted = service.encrypt('');
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe('');
  });
});
