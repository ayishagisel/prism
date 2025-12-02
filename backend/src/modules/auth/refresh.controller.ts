import { Request, Response } from 'express';
import { authService } from './auth.service';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import ms from 'ms';

export class RefreshController {
  /**
   * Refresh endpoint - Exchange refresh token for new access token
   * Accepts refresh token in request body or Authorization header
   */
  async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.body.refreshToken;

      if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
      }

      // Extract user context from auth middleware
      // Note: This endpoint requires a valid (but possibly expired) access token
      if (!req.auth) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - valid access token required',
        });
      }

      const { userId, agencyId, email, role } = req.auth;

      // Validate refresh token
      const validation = await authService.validateRefreshToken(agencyId, userId, refreshToken);

      if (!validation) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
        });
      }

      // Generate new token pair
      const { accessToken, refreshToken: newRefreshToken } = authService.createTokenPair({
        userId,
        agencyId,
        email,
        role: role as 'AGENCY_ADMIN' | 'AGENCY_MEMBER' | 'CLIENT_USER',
      });

      // Save new refresh token to database
      const refreshExpiryMs = (ms as any)(config.jwt.refreshTokenExpiry) || 2592000000; // 30 days fallback
      const expiresAt = new Date(Date.now() + refreshExpiryMs);

      await authService.saveRefreshToken(agencyId, userId, newRefreshToken, expiresAt);

      // Revoke old refresh token
      await authService.revokeRefreshToken(agencyId, userId, refreshToken);

      logger.info('Token refreshed', { userId, agencyId });

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: config.jwt.accessTokenExpiry,
          refreshExpiresIn: config.jwt.refreshTokenExpiry,
        },
      });
    } catch (err) {
      logger.error('Refresh token error', err);
      res.status(500).json({ success: false, error: 'Token refresh failed' });
    }
  }
}

export const refreshController = new RefreshController();
