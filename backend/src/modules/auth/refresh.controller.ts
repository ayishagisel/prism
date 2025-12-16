import { Request, Response } from 'express';
import { authService } from './auth.service';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import ms from 'ms';

export class RefreshController {
  /**
   * Refresh endpoint - Exchange refresh token for new access token
   * No access token required - only validates the refresh token
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

      // Look up user info from the refresh token (no access token needed)
      const userInfo = await authService.findUserByRefreshToken(refreshToken);

      if (!userInfo) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
        });
      }

      const { userId, agencyId, email, role, userType, clientId } = userInfo;

      // Generate new token pair
      const { accessToken, refreshToken: newRefreshToken } = authService.createTokenPair({
        userId,
        agencyId,
        email,
        role: role as 'AGENCY_ADMIN' | 'AGENCY_MEMBER' | 'CLIENT_USER',
        clientId,
      });

      // Save new refresh token to database
      const refreshExpiryMs = (ms as any)(config.jwt.refreshTokenExpiry) || 2592000000; // 30 days fallback
      const expiresAt = new Date(Date.now() + refreshExpiryMs);

      await authService.saveRefreshToken(agencyId, userId, newRefreshToken, expiresAt, userType);

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
