import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../../config/env';
import { JWTPayload, AuthContext } from '../../types';
import { logger } from '../../utils/logger';
import { db } from '../../config/db';
import { refreshTokens } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

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
    const secret = config.jwt.secret;
    return jwt.sign(payload, secret, {
      expiresIn: config.jwt.expiry,
    } as any);
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

  /**
   * Hash a refresh token using SHA-256
   */
  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a random refresh token
   */
  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create both access and refresh tokens (token pair)
   */
  createTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiry,
    } as any);

    const refreshToken = this.generateRefreshToken();

    return { accessToken, refreshToken };
  }

  /**
   * Save refresh token to database
   */
  async saveRefreshToken(
    agencyId: string,
    userId: string,
    refreshToken: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      const tokenHash = this.hashRefreshToken(refreshToken);
      await db.insert(refreshTokens).values({
        id: `rt_${crypto.randomUUID()}`,
        agency_id: agencyId,
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } catch (err) {
      logger.error('Save refresh token error', err);
      throw err;
    }
  }

  /**
   * Validate and exchange refresh token for new access token
   */
  async validateRefreshToken(
    agencyId: string,
    userId: string,
    refreshToken: string
  ): Promise<JWTPayload | null> {
    try {
      const tokenHash = this.hashRefreshToken(refreshToken);

      // Find the token in database
      const storedToken = await db.query.refreshTokens.findFirst({
        where: and(
          eq(refreshTokens.agency_id, agencyId),
          eq(refreshTokens.user_id, userId),
          eq(refreshTokens.token_hash, tokenHash)
        ),
      });

      if (!storedToken) {
        logger.warn('Refresh token not found in database');
        return null;
      }

      // Check if token is revoked
      if (storedToken.revoked_at) {
        logger.warn('Refresh token has been revoked');
        return null;
      }

      // Check if token is expired
      if (storedToken.expires_at < new Date()) {
        logger.warn('Refresh token has expired');
        return null;
      }

      // Token is valid - can be used to generate new access token
      return { userId, agencyId } as JWTPayload;
    } catch (err) {
      logger.error('Validate refresh token error', err);
      return null;
    }
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(agencyId: string, userId: string, refreshToken: string): Promise<void> {
    try {
      const tokenHash = this.hashRefreshToken(refreshToken);
      await db
        .update(refreshTokens)
        .set({ revoked_at: new Date(), updated_at: new Date() })
        .where(
          and(
            eq(refreshTokens.agency_id, agencyId),
            eq(refreshTokens.user_id, userId),
            eq(refreshTokens.token_hash, tokenHash)
          )
        );
    } catch (err) {
      logger.error('Revoke refresh token error', err);
      throw err;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllRefreshTokens(agencyId: string, userId: string): Promise<void> {
    try {
      await db
        .update(refreshTokens)
        .set({ revoked_at: new Date(), updated_at: new Date() })
        .where(and(eq(refreshTokens.agency_id, agencyId), eq(refreshTokens.user_id, userId)));
    } catch (err) {
      logger.error('Revoke all refresh tokens error', err);
      throw err;
    }
  }
}

export const authService = new AuthService();
