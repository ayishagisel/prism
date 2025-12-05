import { Request, Response } from 'express';
import { zohoService } from './zoho.service';
import { logger } from '../../utils/logger';

export class ZohoController {
  /**
   * GET /api/zoho/authorize
   * Redirect user to Zoho OAuth consent screen
   * Returns the authorization URL that frontend should redirect to
   */
  async getAuthorizationUrl(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;

      if (!agencyId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - Agency ID not found',
        });
      }

      // Generate a state token for CSRF protection
      const state = `${agencyId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // In production, store this state token in session/cache with TTL
      // For now, we'll include agency_id in the state string

      const authUrl = zohoService.getAuthorizationUrl(state);

      res.json({
        success: true,
        data: {
          authorization_url: authUrl,
          state,
        },
      });
    } catch (error) {
      logger.error('Failed to get Zoho authorization URL', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate authorization URL',
      });
    }
  }

  /**
   * POST /api/zoho/callback
   * Handle OAuth callback from Zoho
   * Exchange authorization code for access token and save it
   */
  async handleOAuthCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;
      const agencyId = (req as any).auth?.agencyId;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Missing authorization code',
        });
      }

      if (!agencyId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - Agency ID not found',
        });
      }

      // Validate state token (basic check - in production, verify against stored state)
      if (!state || !String(state).startsWith(`${agencyId}_`)) {
        logger.warn('Invalid state token in Zoho callback');
        return res.status(400).json({
          success: false,
          error: 'Invalid state token - possible CSRF attack',
        });
      }

      // Exchange code for token
      const token = await zohoService.exchangeCodeForToken(String(code));

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Failed to exchange authorization code for token',
        });
      }

      // Save token for this agency
      const saved = await zohoService.saveToken(agencyId, token);

      if (!saved) {
        return res.status(500).json({
          success: false,
          error: 'Failed to save Zoho token',
        });
      }

      logger.info(`Zoho OAuth successful for agency ${agencyId}`);

      res.json({
        success: true,
        data: {
          message: 'Zoho OAuth connection successful',
          agencyId,
        },
      });
    } catch (error) {
      logger.error('Failed to handle Zoho OAuth callback', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process OAuth callback',
      });
    }
  }

  /**
   * POST /api/zoho/sync
   * Manually trigger sync of opportunities and clients from Zoho
   * Requires authentication
   */
  async triggerSync(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;

      if (!agencyId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Get stored token for agency
      const token = await zohoService.getStoredToken(agencyId);

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Zoho not connected - please authorize first',
        });
      }

      // Fetch data from Zoho
      const [zohoOpportunities, zohoAccounts] = await Promise.all([
        zohoService.fetchZohoOpportunities(token.access_token),
        zohoService.fetchZohoAccounts(token.access_token),
      ]);

      // Sync to PRISM database
      const [syncedOpps, syncedClients] = await Promise.all([
        zohoService.syncOpportunities(agencyId, zohoOpportunities),
        zohoService.syncClients(agencyId, zohoAccounts),
      ]);

      logger.info(
        `Sync completed: ${syncedOpps} opportunities, ${syncedClients} clients for agency ${agencyId}`
      );

      res.json({
        success: true,
        data: {
          opportunities_synced: syncedOpps,
          clients_synced: syncedClients,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to trigger Zoho sync', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync Zoho data',
      });
    }
  }

  /**
   * POST /api/webhooks/zoho
   * Receive webhook events from Zoho
   * No authentication required (Zoho has its own auth mechanism)
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const event = req.body;

      if (!event) {
        return res.status(400).json({
          success: false,
          error: 'Missing webhook event data',
        });
      }

      // TODO: Verify webhook signature from Zoho
      // Get signature from headers and verify it

      // Handle the webhook event
      const handled = await zohoService.handleWebhookEvent(event);

      if (!handled) {
        logger.warn('Failed to handle Zoho webhook event');
        return res.status(500).json({
          success: false,
          error: 'Failed to process webhook event',
        });
      }

      // Zoho expects 200 OK response
      res.json({
        success: true,
      });
    } catch (error) {
      logger.error('Error handling Zoho webhook', error);
      res.status(500).json({
        success: false,
        error: 'Failed to handle webhook',
      });
    }
  }

  /**
   * GET /api/zoho/status
   * Check if Zoho is connected for the current agency
   */
  async getConnectionStatus(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;

      if (!agencyId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const token = await zohoService.getStoredToken(agencyId);

      res.json({
        success: true,
        data: {
          connected: !!token,
          agencyId,
        },
      });
    } catch (error) {
      logger.error('Failed to check Zoho connection status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check connection status',
      });
    }
  }
}

export const zohoController = new ZohoController();
