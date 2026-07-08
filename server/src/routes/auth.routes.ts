import { Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserModel } from '../models/user.model.js';
import { AuthService } from '../services/auth.service.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('displayName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Display name must be between 1 and 100 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const refreshValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const logoutValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  registerValidation,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, displayName } = req.body as {
        email: string;
        password: string;
        displayName?: string;
      };

      // Check if user already exists
      const existingUser = UserModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(password);

      // Create user
      const user = UserModel.create({
        email,
        password_hash: passwordHash,
        display_name: displayName,
      });

      // Generate tokens
      const tokens = AuthService.generateTokens(user.id, user.email);

      logger.audit('user_registered', { userId: user.id, email: user.email });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
        ...tokens,
      });
    } catch (error) {
      logger.error('Registration error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  loginValidation,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body as {
        email: string;
        password: string;
      };

      // Find user
      const user = UserModel.findByEmail(email);
      if (!user) {
        // Use generic message to prevent user enumeration
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Compare password
      const isValid = await AuthService.comparePassword(
        password,
        user.password_hash
      );
      if (!isValid) {
        logger.audit('login_failed', { email });
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Generate tokens
      const tokens = AuthService.generateTokens(user.id, user.email);

      logger.audit('user_login', { userId: user.id, email: user.email });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
        ...tokens,
      });
    } catch (error) {
      logger.error('Login error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  refreshValidation,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { refreshToken } = req.body as { refreshToken: string };

      // Verify the refresh token JWT
      let payload: { userId: string; email: string };
      try {
        payload = AuthService.verifyRefreshToken(refreshToken);
      } catch {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
      }

      // Rotate tokens
      const tokens = AuthService.rotateRefreshToken(
        refreshToken,
        payload.userId,
        payload.email
      );

      if (!tokens) {
        res.status(401).json({ error: 'Refresh token has been revoked' });
        return;
      }

      logger.audit('token_refreshed', { userId: payload.userId });

      res.json(tokens);
    } catch (error) {
      logger.error('Token refresh error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/logout
router.post(
  '/logout',
  logoutValidation,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { refreshToken } = req.body as { refreshToken: string };

      AuthService.revokeRefreshToken(refreshToken);

      logger.audit('user_logout');

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
