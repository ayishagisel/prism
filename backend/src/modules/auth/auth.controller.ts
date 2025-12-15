import { Request, Response } from 'express';
import { authService } from './auth.service';
import { emailService } from '../email/email.service';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { db } from '../../config/db';
import { agencyUsers, clientUsers, agencies } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import ms from 'ms';
import crypto from 'crypto';

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

        // Check if this is a client user demo login
        const clientUser = await db.query.clientUsers.findFirst({
          where: eq(clientUsers.email, email.toLowerCase()),
        });

        if (clientUser) {
          // Client user demo login
          logger.info('Demo client login', { email, clientId: clientUser.client_id });

          const { accessToken, refreshToken } = authService.createTokenPair({
            userId: clientUser.id,
            agencyId: clientUser.agency_id,
            email,
            role: clientUser.role as any, // CLIENT_OWNER or CLIENT_TEAM
            clientId: clientUser.client_id, // Include client_id in token
          });

          // Save refresh token
          try {
            const refreshExpiryMs = (ms as any)(config.jwt.refreshTokenExpiry) || 2592000000;
            const expiresAt = new Date(Date.now() + refreshExpiryMs);
            await authService.saveRefreshToken(clientUser.agency_id, clientUser.id, refreshToken, expiresAt);
          } catch (tokenErr) {
            logger.warn('Could not save refresh token', tokenErr);
          }

          return res.json({
            success: true,
            data: {
              accessToken,
              refreshToken,
              expiresIn: config.jwt.accessTokenExpiry,
              refreshExpiresIn: config.jwt.refreshTokenExpiry,
              user: {
                id: clientUser.id,
                email,
                agencyId: clientUser.agency_id,
                client_id: clientUser.client_id,
                role: clientUser.role,
                name: clientUser.name,
              },
            },
          });
        }

        // Default: Agency admin demo login
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

  /**
   * Agency user registration
   */
  async registerAgency(req: Request, res: Response) {
    try {
      const { name, email, password, agencyName } = req.body;

      // Validation
      if (!name || !email || !password || !agencyName) {
        return res.status(400).json({
          success: false,
          error: 'Name, email, password, and agency name are required',
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters',
        });
      }

      // Check if email already exists
      const existingUser = await db.query.agencyUsers.findFirst({
        where: eq(agencyUsers.email, email.toLowerCase()),
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }

      // Create agency
      const agencyId = `agency_${crypto.randomUUID()}`;
      const agency = await db
        .insert(agencies)
        .values({
          id: agencyId,
          name: agencyName,
          slug: agencyName.toLowerCase().replace(/\s+/g, '-'),
          primary_contact_name: name,
          primary_contact_email: email,
          timezone: 'America/New_York',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      // Hash password
      const passwordHash = await authService.hashPassword(password);

      // Create agency user
      const userId = `user_${crypto.randomUUID()}`;
      const user = await db
        .insert(agencyUsers)
        .values({
          id: userId,
          agency_id: agencyId,
          name,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          role: 'AGENCY_ADMIN',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      // Generate email verification token
      const verificationToken = await authService.generateEmailVerificationToken(
        userId,
        'agency_user',
        email.toLowerCase()
      );

      // Send verification email (async - don't wait)
      emailService
        .sendEmail({
          to: email,
          subject: 'Verify Your Email - PRISM',
          htmlBody: `
            <h2>Welcome to PRISM, ${name}!</h2>
            <p>Please verify your email by clicking the link below:</p>
            <p><a href="${config.appUrl}/verify-email?token=${verificationToken}">Verify Email</a></p>
            <p>This link expires in 24 hours.</p>
          `,
          textBody: `Verify your email: ${config.appUrl}/verify-email?token=${verificationToken}`,
        })
        .catch((err) => logger.error('Failed to send verification email', err));

      logger.info('Agency user registered', { email, agencyId, userId });

      res.status(201).json({
        success: true,
        data: {
          message: 'Registration successful. Please check your email to verify your account.',
          userId,
          agencyId,
          email,
        },
      });
    } catch (err) {
      logger.error('Register agency error', err);
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }

  /**
   * Client user registration
   */
  async registerClient(req: Request, res: Response) {
    try {
      const { name, email, password, clientId } = req.body;

      // Validation
      if (!name || !email || !password || !clientId) {
        return res.status(400).json({
          success: false,
          error: 'Name, email, password, and client ID are required',
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters',
        });
      }

      // Check if email already exists for this client
      const existingUser = await db.query.clientUsers.findFirst({
        where: and(eq(clientUsers.email, email.toLowerCase()), eq(clientUsers.client_id, clientId)),
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered for this client',
        });
      }

      // Get client and agency
      const client = await db.query.clientUsers.findFirst({
        where: eq(clientUsers.client_id, clientId),
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found',
        });
      }

      const agencyId = client.agency_id;

      // Hash password
      const passwordHash = await authService.hashPassword(password);

      // Create client user
      const userId = `user_${crypto.randomUUID()}`;
      const user = await db
        .insert(clientUsers)
        .values({
          id: userId,
          client_id: clientId,
          agency_id: agencyId,
          name,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          role: 'CLIENT_OWNER',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      // Generate email verification token
      const verificationToken = await authService.generateEmailVerificationToken(
        userId,
        'client_user',
        email.toLowerCase()
      );

      // Send verification email (async - don't wait)
      emailService
        .sendEmail({
          to: email,
          subject: 'Verify Your Email - PRISM',
          htmlBody: `
            <h2>Welcome to PRISM, ${name}!</h2>
            <p>Please verify your email by clicking the link below:</p>
            <p><a href="${config.appUrl}/verify-email?token=${verificationToken}">Verify Email</a></p>
            <p>This link expires in 24 hours.</p>
          `,
          textBody: `Verify your email: ${config.appUrl}/verify-email?token=${verificationToken}`,
        })
        .catch((err) => logger.error('Failed to send verification email', err));

      logger.info('Client user registered', { email, agencyId, clientId, userId });

      res.status(201).json({
        success: true,
        data: {
          message: 'Registration successful. Please check your email to verify your account.',
          userId,
          clientId,
          agencyId,
          email,
        },
      });
    } catch (err) {
      logger.error('Register client error', err);
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required',
        });
      }

      const result = await authService.verifyEmail(token);

      if (!result) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired verification token',
        });
      }

      // Update user status to active (already are, but mark verified)
      if (result.userType === 'agency_user') {
        await db
          .update(agencyUsers)
          .set({ status: 'active', updated_at: new Date() })
          .where(eq(agencyUsers.id, result.userId));
      } else {
        await db
          .update(clientUsers)
          .set({ status: 'active', updated_at: new Date() })
          .where(eq(clientUsers.id, result.userId));
      }

      logger.info('Email verified', { userId: result.userId, userType: result.userType });

      res.json({
        success: true,
        data: {
          message: 'Email verified successfully',
          email: result.email,
        },
      });
    } catch (err) {
      logger.error('Verify email error', err);
      res.status(500).json({ success: false, error: 'Email verification failed' });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email, userType } = req.body;

      if (!email || !userType) {
        return res.status(400).json({
          success: false,
          error: 'Email and user type are required',
        });
      }

      const token = await authService.generatePasswordResetToken(email.toLowerCase(), userType);

      if (!token) {
        // Don't reveal if email exists (security best practice)
        return res.json({
          success: true,
          data: {
            message: 'If an account exists with that email, a password reset link has been sent',
          },
        });
      }

      // Send reset email (async - don't wait)
      emailService
        .sendEmail({
          to: email,
          subject: 'Reset Your Password - PRISM',
          htmlBody: `
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <p><a href="${config.appUrl}/reset-password?token=${token}">Reset Password</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          `,
          textBody: `Reset your password: ${config.appUrl}/reset-password?token=${token}`,
        })
        .catch((err) => logger.error('Failed to send password reset email', err));

      logger.info('Password reset requested', { email });

      res.json({
        success: true,
        data: {
          message: 'If an account exists with that email, a password reset link has been sent',
        },
      });
    } catch (err) {
      logger.error('Request password reset error', err);
      res.status(500).json({ success: false, error: 'Password reset request failed' });
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token and new password are required',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters',
        });
      }

      const result = await authService.resetPassword(token, newPassword);

      if (!result) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token',
        });
      }

      logger.info('Password reset successful', { userId: result.userId });

      res.json({
        success: true,
        data: {
          message: 'Password reset successful. You can now log in with your new password.',
        },
      });
    } catch (err) {
      logger.error('Reset password error', err);
      res.status(500).json({ success: false, error: 'Password reset failed' });
    }
  }
}

export const authController = new AuthController();
