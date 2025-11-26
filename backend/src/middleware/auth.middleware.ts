import { Request, Response, NextFunction } from 'express';
import { authService } from '../modules/auth/auth.service';
import { AuthContext } from '../types';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Middleware to verify JWT token and attach auth context to request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractToken(authHeader);

    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing or invalid token' });
    }

    const payload = authService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    req.auth = {
      userId: payload.userId,
      agencyId: payload.agencyId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (err) {
    logger.error('Auth middleware error', err);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    next();
  };
};

/**
 * Optional auth middleware (doesn't fail if no token)
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractToken(authHeader);

    if (token) {
      const payload = authService.verifyToken(token);
      if (payload) {
        req.auth = {
          userId: payload.userId,
          agencyId: payload.agencyId,
          email: payload.email,
          role: payload.role,
        };
      }
    }

    next();
  } catch (err) {
    logger.error('Optional auth middleware error', err);
    next();
  }
};
