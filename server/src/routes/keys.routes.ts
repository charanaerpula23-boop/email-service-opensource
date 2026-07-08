import { Router, type Request, type Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import { authMiddleware } from '../middleware/auth.js';
import { getDb } from '../db/connection.js';
import { UserModel } from '../models/user.model.js';
import { logger } from '../utils/logger.js';

const router = Router();

interface PublicKeyRow {
  id: string;
  user_id: string;
  email: string;
  public_key: string;
  fingerprint: string;
  algorithm: string;
  expires_at: string | null;
  is_revoked: number;
  created_at: string;
  updated_at: string;
}

// GET /api/keys/:userId — Get public keys for a user
router.get(
  '/:userId',
  [param('userId').isString().notEmpty().withMessage('User ID is required')],
  (req: Request, res: Response): void => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { userId } = req.params;
      const db = getDb();

      const keys = db
        .prepare(
          'SELECT id, user_id, email, public_key, fingerprint, algorithm, expires_at, created_at FROM public_keys WHERE user_id = ? AND is_revoked = 0'
        )
        .all(userId) as PublicKeyRow[];

      res.json({ keys });
    } catch (error) {
      logger.error('Get keys error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/keys/upload — Upload a public key (requires auth)
router.post(
  '/upload',
  authMiddleware,
  [
    body('publicKey')
      .isString()
      .notEmpty()
      .withMessage('Public key is required'),
    body('algorithm')
      .optional()
      .isString()
      .isIn(['RSA-2048', 'RSA-4096', 'Ed25519', 'ECDSA-P256'])
      .withMessage('Invalid algorithm'),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('expiresAt must be a valid ISO 8601 date'),
  ],
  (req: Request, res: Response): void => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.userId;
      const { publicKey, algorithm, expiresAt } = req.body as {
        publicKey: string;
        algorithm?: string;
        expiresAt?: string;
      };

      const user = UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Generate fingerprint from key content
      const fingerprint = crypto
        .createHash('sha256')
        .update(publicKey)
        .digest('hex');

      const db = getDb();

      // Check for duplicate fingerprint
      const existing = db
        .prepare(
          'SELECT id FROM public_keys WHERE fingerprint = ? AND user_id = ? AND is_revoked = 0'
        )
        .get(fingerprint, userId) as { id: string } | undefined;

      if (existing) {
        res.status(409).json({ error: 'Key with this fingerprint already exists' });
        return;
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO public_keys (id, user_id, email, public_key, fingerprint, algorithm, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId,
        user.email,
        publicKey,
        fingerprint,
        algorithm ?? 'RSA-2048',
        expiresAt ?? null,
        now,
        now
      );

      // Also update user's public key field
      UserModel.updatePublicKey(userId, publicKey);

      logger.audit('public_key_uploaded', {
        userId,
        fingerprint,
      });

      res.status(201).json({
        id,
        fingerprint,
        algorithm: algorithm ?? 'RSA-2048',
        createdAt: now,
      });
    } catch (error) {
      logger.error('Upload key error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/keys/search — Search for public keys by email
router.get(
  '/search',
  [
    query('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required for search'),
  ],
  (req: Request, res: Response): void => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const email = req.query.email as string;
      const db = getDb();

      const keys = db
        .prepare(
          'SELECT id, user_id, email, public_key, fingerprint, algorithm, expires_at, created_at FROM public_keys WHERE email = ? AND is_revoked = 0'
        )
        .all(email) as PublicKeyRow[];

      res.json({ keys });
    } catch (error) {
      logger.error('Search keys error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
