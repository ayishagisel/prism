import { Request, Response } from 'express';
import { emailIngestionService } from './email.service';
import { logger } from '../../utils/logger';

export class EmailIngestController {
  /**
   * GET /api/opportunities/pending-review
   * Get all pending opportunities for the agency
   */
  async getPendingOpportunities(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;

      if (!agencyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const pending = await emailIngestionService.getPendingOpportunities(agencyId);

      res.json({
        success: true,
        data: {
          pending,
          count: pending.length,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching pending opportunities:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/opportunities/pending-review/:id/assign
   * Assign a pending opportunity to clients and create actual opportunity
   */
  async assignToClients(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;
      const userId = (req as any).auth?.userId;
      const { id } = req.params;
      const { clientIds, title, description, deadline, mediaType, outletName, notes } = req.body;

      if (!agencyId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one client must be selected',
        });
      }

      // Assign to clients in pending opportunities table
      await emailIngestionService.assignToClients(agencyId, id, clientIds, userId);

      // TODO: In next step, create actual Opportunity record
      // and ClientOpportunityStatus records for each client
      // This bridges pending_opportunities → opportunities

      res.json({
        success: true,
        message: 'Opportunity assigned to clients',
        data: {
          pendingOppId: id,
          clientCount: clientIds.length,
        },
      });
    } catch (error: any) {
      logger.error('Error assigning opportunity:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/opportunities/pending-review/:id/discard
   * Discard a pending opportunity
   */
  async discardOpportunity(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;
      const { id } = req.params;

      if (!agencyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      await emailIngestionService.discardOpportunity(id);

      res.json({
        success: true,
        message: 'Opportunity discarded',
      });
    } catch (error: any) {
      logger.error('Error discarding opportunity:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/email-ingest/poll
   * Manually trigger email polling (for testing or scheduled jobs)
   * In production, this would be called by a scheduled task
   */
  async pollEmails(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;

      if (!agencyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Get email config from environment
      // In production, this would come from agency settings
      const emailConfig = {
        host: process.env.EMAIL_HOST || 'imap.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '993'),
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
      };

      if (!emailConfig.user || !emailConfig.password) {
        return res.status(400).json({
          success: false,
          error: 'Email credentials not configured',
        });
      }

      const created = await emailIngestionService.pollEmails(agencyId, emailConfig);

      res.json({
        success: true,
        data: {
          created,
          message: `Polling complete: ${created} new opportunities found`,
        },
      });
    } catch (error: any) {
      logger.error('Error polling emails:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const emailIngestController = new EmailIngestController();
