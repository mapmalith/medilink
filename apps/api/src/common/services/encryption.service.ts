import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;

/**
 * Field-level AES-256-GCM encryption. Output format: `iv:authTag:ciphertext`
 * with each segment base64-encoded. Returns null when FIELD_ENCRYPTION_KEY
 * is unset so the rest of the app can run in dev without keys.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    const raw = config.get<string>('FIELD_ENCRYPTION_KEY');
    if (!raw) {
      this.logger.warn(
        'FIELD_ENCRYPTION_KEY not set — encryption disabled (plaintext storage).',
      );
      this.key = null;
      return;
    }
    const buf = this.parseKey(raw);
    if (!buf) {
      this.logger.error(
        'FIELD_ENCRYPTION_KEY is not a valid 32-byte hex/base64 string — encryption disabled.',
      );
      this.key = null;
      return;
    }
    this.key = buf;
  }

  isEnabled(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    if (!this.key) return plaintext;
    if (this.isCiphertext(plaintext)) return plaintext;
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(ciphertext: string): string {
    if (!this.key) return ciphertext;
    if (!this.isCiphertext(ciphertext)) return ciphertext;
    try {
      const [ivB64, tagB64, dataB64] = ciphertext.split(':');
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const data = Buffer.from(dataB64, 'base64');
      const decipher = createDecipheriv(ALGO, this.key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (err) {
      this.logger.error(`decrypt failed: ${(err as Error).message}`);
      return ciphertext;
    }
  }

  /** Heuristic: our format is exactly 3 colon-separated base64 segments. */
  isCiphertext(value: string): boolean {
    if (typeof value !== 'string') return false;
    const parts = value.split(':');
    if (parts.length !== 3) return false;
    return parts.every((p) => /^[A-Za-z0-9+/=]+$/.test(p));
  }

  private parseKey(raw: string): Buffer | null {
    const trimmed = raw.trim();
    if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length === KEY_BYTES * 2) {
      return Buffer.from(trimmed, 'hex');
    }
    try {
      const buf = Buffer.from(trimmed, 'base64');
      if (buf.length === KEY_BYTES) return buf;
    } catch {
      // fall through
    }
    return null;
  }
}
