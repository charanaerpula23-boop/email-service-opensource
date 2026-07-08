import type { Request, Response, NextFunction } from 'express';
import { AuthService, type AccessTokenPayload } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header missing' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
    return;
  }

  const token = parts[1];

  try {
    const payload = AuthService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TokenExpiredError'
        ? 'Access token expired'
        : 'Invalid access token';

    logger.warn('Auth middleware rejected request', {
      error: message,
      ip: req.ip,
      path: req.path,
    });

    res.status(401).json({ error: message });
  }
}
