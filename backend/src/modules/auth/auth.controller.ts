import { Request, Response } from 'express';
import { authService } from './auth.service';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

export class AuthController {
  /**
   * Login endpoint (MVP: simple email + demo token)
   * In Phase 2: integrate with real password auth or external IdP
   */
  async login(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      // TODO Phase 2: Real password validation and user lookup
      if (!config.demoMode) {
        return res.status(501).json({
          success: false,
          error: 'Auth not implemented outside demo mode',
        });
      }

      // Demo mode: create mock token
      logger.info('Demo login', { email });

      // For demo, we'll return a sample token
      // In production, validate against actual user records
      const demoUserId = 'user_amore';
      const demoAgencyId = 'agency_aopr';

      const token = authService.createToken({
        userId: demoUserId,
        agencyId: demoAgencyId,
        email,
        role: 'AGENCY_ADMIN',
      });

      res.json({
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
