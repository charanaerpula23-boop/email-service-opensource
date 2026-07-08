import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEYS_DIR = path.resolve(__dirname, '../../keys');

function ensureKeysDir(): void {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }
}

export interface DKIMKeyPair {
  privateKey: string;
  publicKey: string;
  domain: string;
  selector: string;
}

export interface PGPKeyPair {
  publicKey: string;
  privateKey: string;
}

export const CryptoService = {
  generateDKIMKeyPair(
    domain: string,
    selector = 'default'
  ): DKIMKeyPair {
    ensureKeysDir();

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const privateKeyPath = path.join(
      KEYS_DIR,
      `dkim_${domain}_${selector}_private.pem`
    );
    const publicKeyPath = path.join(
      KEYS_DIR,
      `dkim_${domain}_${selector}_public.pem`
    );

    fs.writeFileSync(privateKeyPath, privateKey, 'utf-8');
    fs.writeFileSync(publicKeyPath, publicKey, 'utf-8');

    // Restrict permissions on private key (best-effort on Windows)
    try {
      fs.chmodSync(privateKeyPath, 0o600);
    } catch {
      // chmod may not work on Windows
    }

    logger.info('DKIM key pair generated', { domain, selector });

    return { privateKey, publicKey, domain, selector };
  },

  getDKIMConfig(): {
    domainName: string;
    keySelector: string;
    privateKey: string;
  } | null {
    const domain = process.env.DKIM_DOMAIN;
    const selector = process.env.DKIM_SELECTOR ?? 'default';

    if (!domain) return null;

    const privateKeyPath = path.join(
      KEYS_DIR,
      `dkim_${domain}_${selector}_private.pem`
    );

    if (!fs.existsSync(privateKeyPath)) {
      logger.warn('DKIM private key not found, skipping DKIM signing', {
        domain,
        selector,
      });
      return null;
    }

    const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');

    return {
      domainName: domain,
      keySelector: selector,
      privateKey,
    };
  },

  generatePGPKeyPair(): PGPKeyPair {
    // RSA-2048 key pair for PGP-like encryption
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    logger.info('PGP key pair generated');

    return { publicKey, privateKey };
  },

  encryptPrivateKey(privateKey: string, passphrase: string): string {
    // Derive a key from the passphrase using scrypt
    const salt = crypto.randomBytes(32);
    const derivedKey = crypto.scryptSync(passphrase, salt, 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    let encrypted = cipher.update(privateKey, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Pack: salt(32B) + iv(16B) + authTag(16B) + ciphertext
    const packed = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]);

    return packed.toString('base64');
  },

  decryptPrivateKey(encryptedData: string, passphrase: string): string {
    const packed = Buffer.from(encryptedData, 'base64');

    const salt = packed.subarray(0, 32);
    const iv = packed.subarray(32, 48);
    const authTag = packed.subarray(48, 64);
    const ciphertext = packed.subarray(64);

    const derivedKey = crypto.scryptSync(passphrase, salt, 32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    const finalBuffer = decipher.final();
    decrypted = Buffer.concat([decrypted, finalBuffer]);

    return decrypted.toString('utf-8');
  },
};
