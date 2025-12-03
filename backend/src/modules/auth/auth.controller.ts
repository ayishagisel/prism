import { Request, Response } from 'express';
import { authService } from './auth.service';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { db } from '../../config/db';
import { agencyUsers } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import ms from 'ms';

export class AuthController {
  /**
   * Login endpoint - Real password validation (Phase 2+)
   * Validates email + password against agency_users table
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      // In demo mode, allow passwordless login for ease of testing
      if (config.demoMode && !password) {
        logger.info('Demo login (passwordless)', { email });
        const demoUserId = 'user_amore';
        const demoAgencyId = 'agency_aopr';

        const { accessToken, refreshToken } = authService.createTokenPair({
          userId: demoUserId,
          agencyId: demoAgencyId,
          email,
          role: 'AGENCY_ADMIN',
        });

        // Save refresh token to database (optional - continue if table doesn't exist)
        try {
          const refreshExpiryMs = (ms as any)(config.jwt.refreshTokenExpiry) || 2592000000; // 30 days fallback
          const expiresAt = new Date(Date.now() + refreshExpiryMs);
          await authService.saveRefreshToken(demoAgencyId, demoUserId, refreshToken, expiresAt);
        } catch (tokenErr) {
          logger.warn('Could not save refresh token (table may not exist)', tokenErr);
          // Continue with login - token refresh may not work but demo login succeeds
        }

        return res.json({
          success: true,
          data: {
            accessToken,
            refreshToken,
            expiresIn: config.jwt.accessTokenExpiry,
            refreshExpiresIn: config.jwt.refreshTokenExpiry,
            user: {
              id: demoUserId,
              email,
              agencyId: demoAgencyId,
              role: 'AGENCY_ADMIN',
            },
          },
        });
      }

      // Real authentication: require password in production
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required',
        });
      }

      // Look up user by email
      const users = await db.query.agencyUsers.findMany({
        where: eq(agencyUsers.email, email.toLowerCase()),
        limit: 1,
      });

      const user = users[0];
      if (!user || !user.password_hash) {
        logger.warn('Login attempt for non-existent user', { email });
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Compare password with hash
      const passwordMatch = await authService.comparePassword(password, user.password_hash);
      if (!passwordMatch) {
        logger.warn('Login failed - password mismatch', { email });
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Password is correct - create token pair
      logger.info('User login', { email, userId: user.id });

      const { accessToken, refreshToken } = authService.createTokenPair({
        userId: user.id,
        agencyId: user.agency_id,
        email: user.email,
        role: user.role as 'AGENCY_ADMIN' | 'AGENCY_MEMBER' | 'CLIENT_USER',
      });

      // Save refresh token to database (optional - continue if table doesn't exist)
      try {
        const refreshExpiryMs = (ms as any)(config.jwt.refreshTokenExpiry) || 2592000000; // 30 days fallback
        const expiresAt = new Date(Date.now() + refreshExpiryMs);
        await authService.saveRefreshToken(user.agency_id, user.id, refreshToken, expiresAt);
      } catch (tokenErr) {
        logger.warn('Could not save refresh token (table may not exist)', tokenErr);
        // Continue with login - token refresh may not work but login succeeds
      }

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.accessTokenExpiry,
          refreshExpiresIn: config.jwt.refreshTokenExpiry,
          user: {
            id: user.id,
            email: user.email,
            agencyId: user.agency_id,
            role: user.role,
          },
        },
      });
    } catch (err) {
      logger.error('Login error', err);
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  }

  /**
   * Get current user info from token
   */
  async me(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      res.json({
        success: true,
        data: req.auth,
      });
    } catch (err) {
      logger.error('Me endpoint error', err);
      res.status(500).json({ success: false, error: 'Error fetching user' });
    }
  }

  /**
   * Logout - Revoke all refresh tokens for user
   */
  async logout(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { userId, agencyId } = req.auth;

      // Revoke all refresh tokens for this user (optional - continue if table doesn't exist)
      try {
        await authService.revokeAllRefreshTokens(agencyId, userId);
      } catch (tokenErr) {
        logger.warn('Could not revoke refresh tokens (table may not exist)', tokenErr);
        // Continue with logout - token revocation may not work but logout succeeds
      }

      logger.info('User logout', { userId, agencyId });

      res.json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (err) {
      logger.error('Logout error', err);
      res.status(500).json({ success: false, error: 'Logout failed' });
    }
  }
}

export const authController = new AuthController();
