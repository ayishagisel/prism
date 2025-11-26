import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { config } from '../../config/env';
import { JWTPayload, AuthContext } from '../../types';
import { logger } from '../../utils/logger';

export class AuthService {
  /**
   * Hash a password using bcryptjs
   */
  async hashPassword(password: string): Promise<string> {
    return bcryptjs.hash(password, 10);
  }

  /**
   * Compare a password with a hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Create a JWT token for a user
   */
  createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiry,
    });
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (err) {
      logger.error('Token verification failed', err);
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractToken(authHeader?: string): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
    return null;
  }

  /**
   * Demo mode: create a demo user token (Phase 1 only)
   */
  createDemoToken(userId: string, agencyId: string, email: string, role: string): string {
    return this.createToken({
      userId,
      agencyId,
      email,
      role: role as 'AGENCY_ADMIN' | 'AGENCY_MEMBER' | 'CLIENT_USER',
    });
  }
}

export const authService = new AuthService();
