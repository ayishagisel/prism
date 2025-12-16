import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../../config/env';
import { JWTPayload, AuthContext } from '../../types';
import { logger } from '../../utils/logger';
import { db } from '../../config/db';
import { refreshTokens, emailVerificationTokens, passwordResetTokens, agencyUsers, clientUsers } from '../../db/schema';
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
    expiresAt: Date,
    userType: 'agency_user' | 'client_user' = 'agency_user'
  ): Promise<void> {
    try {
      const tokenHash = this.hashRefreshToken(refreshToken);
      await db.insert(refreshTokens).values({
        id: `rt_${crypto.randomUUID()}`,
        agency_id: agencyId,
        user_id: userId,
        user_type: userType,
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

  /**
   * Find user info by refresh token (without needing access token)
   * This is used for token refresh when the access token has expired
   */
  async findUserByRefreshToken(refreshToken: string): Promise<{
    userId: string;
    agencyId: string;
    userType: 'agency_user' | 'client_user';
    email: string;
    role: string;
    clientId?: string;
  } | null> {
    try {
      const tokenHash = this.hashRefreshToken(refreshToken);

      // Find the token in database
      const storedToken = await db.query.refreshTokens.findFirst({
        where: eq(refreshTokens.token_hash, tokenHash),
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

      // Get user info based on user type
      const userType = storedToken.user_type as 'agency_user' | 'client_user';

      if (userType === 'client_user') {
        const clientUser = await db.query.clientUsers.findFirst({
          where: eq(clientUsers.id, storedToken.user_id),
        });

        if (!clientUser) {
          logger.warn('Client user not found for refresh token');
          return null;
        }

        return {
          userId: clientUser.id,
          agencyId: storedToken.agency_id,
          userType,
          email: clientUser.email,
          role: clientUser.role || 'CLIENT_OWNER',
          clientId: clientUser.client_id,
        };
      } else {
        const agencyUser = await db.query.agencyUsers.findFirst({
          where: eq(agencyUsers.id, storedToken.user_id),
        });

        if (!agencyUser) {
          logger.warn('Agency user not found for refresh token');
          return null;
        }

        return {
          userId: agencyUser.id,
          agencyId: storedToken.agency_id,
          userType,
          email: agencyUser.email,
          role: agencyUser.role || 'AGENCY_MEMBER',
        };
      }
    } catch (err) {
      logger.error('Find user by refresh token error', err);
      return null;
    }
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(
    userId: string,
    userType: 'agency_user' | 'client_user',
    email: string
  ): Promise<string> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.insert(emailVerificationTokens).values({
        id: `evt_${crypto.randomUUID()}`,
        user_id: userId,
        user_type: userType,
        email,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date(),
      });

      return token;
    } catch (err) {
      logger.error('Generate email verification token error', err);
      throw err;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ userId: string; userType: string; email: string } | null> {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const now = new Date();

      const record = await db.query.emailVerificationTokens.findFirst({
        where: and(
          eq(emailVerificationTokens.token_hash, tokenHash)
        ),
      });

      if (!record) {
        logger.warn('Email verification token not found');
        return null;
      }

      // Check if token expired
      if (record.expires_at < now) {
        logger.warn('Email verification token expired');
        return null;
      }

      // Check if already verified
      if (record.verified_at) {
        logger.warn('Email verification token already used');
        return null;
      }

      // Mark as verified
      await db
        .update(emailVerificationTokens)
        .set({ verified_at: new Date() })
        .where(eq(emailVerificationTokens.id, record.id));

      return {
        userId: record.user_id,
        userType: record.user_type,
        email: record.email,
      };
    } catch (err) {
      logger.error('Verify email error', err);
      return null;
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string, userType: 'agency_user' | 'client_user'): Promise<string | null> {
    try {
      // Find user by email
      let user;
      if (userType === 'agency_user') {
        user = await db.query.agencyUsers.findFirst({
          where: eq(agencyUsers.email, email),
        });
      } else {
        user = await db.query.clientUsers.findFirst({
          where: eq(clientUsers.email, email),
        });
      }

      if (!user) {
        logger.warn(`User not found for password reset: ${email}`);
        return null;
      }

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResetTokens).values({
        id: `prt_${crypto.randomUUID()}`,
        user_id: user.id,
        user_type: userType,
        email,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date(),
      });

      return token;
    } catch (err) {
      logger.error('Generate password reset token error', err);
      throw err;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ userId: string; userType: string } | null> {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const now = new Date();

      const record = await db.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.token_hash, tokenHash)
        ),
      });

      if (!record) {
        logger.warn('Password reset token not found');
        return null;
      }

      // Check if token expired
      if (record.expires_at < now) {
        logger.warn('Password reset token expired');
        return null;
      }

      // Check if already used
      if (record.used_at) {
        logger.warn('Password reset token already used');
        return null;
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update user's password
      if (record.user_type === 'agency_user') {
        await db
          .update(agencyUsers)
          .set({ password_hash: passwordHash, updated_at: new Date() })
          .where(eq(agencyUsers.id, record.user_id));
      } else {
        await db
          .update(clientUsers)
          .set({ password_hash: passwordHash, updated_at: new Date() })
          .where(eq(clientUsers.id, record.user_id));
      }

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used_at: new Date() })
        .where(eq(passwordResetTokens.id, record.id));

      return {
        userId: record.user_id,
        userType: record.user_type,
      };
    } catch (err) {
      logger.error('Reset password error', err);
      return null;
    }
  }
}

export const authService = new AuthService();
