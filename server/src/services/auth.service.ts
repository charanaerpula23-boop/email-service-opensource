import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { logger } from '../utils/logger.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

function getRefreshSecret(): string {
  return process.env.JWT_REFRESH_SECRET ?? getJwtSecret() + '_refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export const AuthService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  generateTokens(userId: string, email: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, email } satisfies AccessTokenPayload,
      getJwtSecret(),
      { expiresIn: ACCESS_TOKEN_EXPIRY, issuer: 'secure-email-server' }
    );

    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' },
      getRefreshSecret(),
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`, issuer: 'secure-email-server' }
    );

    // Store hashed refresh token in DB
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(uuidv4(), userId, tokenHash, expiresAt);

    logger.audit('tokens_generated', { userId });

    return { accessToken, refreshToken };
  },

  verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'secure-email-server',
    });
    return decoded as AccessTokenPayload;
  },

  verifyRefreshToken(token: string): AccessTokenPayload & { type: string } {
    const decoded = jwt.verify(token, getRefreshSecret(), {
      issuer: 'secure-email-server',
    });
    return decoded as AccessTokenPayload & { type: string };
  },

  rotateRefreshToken(
    oldRefreshToken: string,
    userId: string,
    email: string
  ): TokenPair | null {
    const db = getDb();
    const oldHash = crypto
      .createHash('sha256')
      .update(oldRefreshToken)
      .digest('hex');

    // Find the old token
    const existingToken = db
      .prepare(
        'SELECT * FROM refresh_tokens WHERE token_hash = ? AND user_id = ? AND is_revoked = 0'
      )
      .get(oldHash) as
      | { id: string; expires_at: string }
      | undefined;

    if (!existingToken) {
      logger.warn('Refresh token not found or already revoked', { userId });
      return null;
    }

    // Check if expired
    if (new Date(existingToken.expires_at) < new Date()) {
      logger.warn('Refresh token expired', { userId });
      return null;
    }

    // Generate new tokens
    const newTokens = AuthService.generateTokens(userId, email);

    // Revoke old token and link to new
    const newHash = crypto
      .createHash('sha256')
      .update(newTokens.refreshToken)
      .digest('hex');

    const revokeStmt = db.prepare(`
      UPDATE refresh_tokens
      SET is_revoked = 1, revoked_at = datetime('now'), replaced_by = ?
      WHERE id = ?
    `);
    revokeStmt.run(newHash, existingToken.id);

    logger.audit('refresh_token_rotated', { userId });

    return newTokens;
  },

  revokeRefreshToken(refreshToken: string): boolean {
    const db = getDb();
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const stmt = db.prepare(`
      UPDATE refresh_tokens
      SET is_revoked = 1, revoked_at = datetime('now')
      WHERE token_hash = ? AND is_revoked = 0
    `);
    const result = stmt.run(tokenHash);

    if (result.changes > 0) {
      logger.audit('refresh_token_revoked');
      return true;
    }
    return false;
  },

  revokeAllUserTokens(userId: string): void {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE refresh_tokens
      SET is_revoked = 1, revoked_at = datetime('now')
      WHERE user_id = ? AND is_revoked = 0
    `);
    stmt.run(userId);
    logger.audit('all_user_tokens_revoked', { userId });
  },
};
