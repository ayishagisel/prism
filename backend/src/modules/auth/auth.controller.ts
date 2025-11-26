import { Request, Response } from 'express';
import { authService } from './auth.service';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { db } from '../../config/db';
import { agency_users } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

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

        const token = authService.createToken({
          userId: demoUserId,
          agencyId: demoAgencyId,
          email,
          role: 'AGENCY_ADMIN',
        });

        return res.json({
          success: true,
          data: {
            token,
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
      const users = await db.query.agency_users.findMany({
        where: eq(agency_users.email, email.toLowerCase()),
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

      // Password is correct - create token
      logger.info('User login', { email, userId: user.id });

      const token = authService.createToken({
        userId: user.id,
        agencyId: user.agency_id,
        email: user.email,
        role: user.role as 'AGENCY_ADMIN' | 'AGENCY_MEMBER' | 'CLIENT_USER',
      });

      res.json({
        success: true,
        data: {
          token,
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
   * Logout (client-side token deletion in MVP)
   */
  async logout(req: Request, res: Response) {
    // In MVP, logout is client-side (token deletion)
    // In Phase 2: implement token blacklist or revocation
    res.json({ success: true, data: { message: 'Logged out' } });
  }
}

export const authController = new AuthController();
