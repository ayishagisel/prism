import { Request, Response } from 'express';
import { restoreService } from './restore.service';
import { logger } from '../../utils/logger';

export class RestoreController {
  /**
   * POST /api/restore/request
   * Create a restore request (client-side)
   * Body: { opportunity_id, client_id }
   * Auth: client_user (from JWT)
   */
  async createRestoreRequest(req: Request, res: Response) {
    try {
      const { opportunity_id, client_id } = req.body;
      const user = (req as any).auth;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate required fields
      if (!opportunity_id || !client_id) {
        return res.status(400).json({
          error: 'Missing required fields: opportunity_id, client_id',
        });
      }

      // Ensure the authenticated user is a client user
      if (user.role !== 'CLIENT_USER') {
        return res.status(403).json({
          error: 'Only client users can create restore requests',
        });
      }

      const restoreRequest = await restoreService.createRestoreRequest({
        opportunity_id,
        client_id,
        client_user_id: user.userId,
        agency_id: user.agencyId,
      });

      return res.status(201).json(restoreRequest);
    } catch (error: any) {
      logger.error('Error creating restore request', error);
      if (error.message.includes('not found') || error.message.includes('deadline has passed') || error.message.includes('declined')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/restore/requests
   * Get all pending restore requests (AOPR dashboard)
   * Auth: agency_user (from JWT)
   */
  async getPendingRestoreRequests(req: Request, res: Response) {
    try {
      const user = (req as any).auth;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Ensure the authenticated user is an agency user
      if (user.role !== 'AGENCY_ADMIN' && user.role !== 'AGENCY_MEMBER') {
        return res.status(403).json({
          error: 'Only agency users can view restore requests',
        });
      }

      const requests = await restoreService.getPendingRestoreRequests(user.agencyId);

      return res.status(200).json(requests);
    } catch (error) {
      logger.error('Error getting pending restore requests', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/restore/requests/opportunity/:opportunityId/client/:clientId
   * Get all restore requests for a specific opportunity and client
   * Auth: client_user or agency_user (from JWT)
   */
  async getRestoreRequestsByOpportunityAndClient(req: Request, res: Response) {
    try {
      const { opportunityId, clientId } = req.params;
      const user = (req as any).auth;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const requests = await restoreService.getRestoreRequestsByOpportunityAndClient(
        opportunityId,
        clientId,
        user.agencyId
      );

      return res.status(200).json(requests);
    } catch (error) {
      logger.error('Error getting restore requests by opportunity and client', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /api/restore/requests/:id/approve
   * Approve a restore request (AOPR)
   * Body: { review_notes? }
   * Auth: agency_user (from JWT)
   */
  async approveRestoreRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { review_notes } = req.body;
      const user = (req as any).auth;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Ensure the authenticated user is an agency user
      if (user.role !== 'AGENCY_ADMIN' && user.role !== 'AGENCY_MEMBER') {
        return res.status(403).json({
          error: 'Only agency users can approve restore requests',
        });
      }

      const updatedRequest = await restoreService.approveRestoreRequest({
        request_id: id,
        reviewed_by_user_id: user.userId,
        agency_id: user.agencyId,
        status: 'approved',
        review_notes,
      });

      return res.status(200).json(updatedRequest);
    } catch (error: any) {
      logger.error('Error approving restore request', error);
      if (error.message.includes('not found') || error.message.includes('already been reviewed')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /api/restore/requests/:id/deny
   * Deny a restore request (AOPR)
   * Body: { review_notes? }
   * Auth: agency_user (from JWT)
   */
  async denyRestoreRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { review_notes } = req.body;
      const user = (req as any).auth;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Ensure the authenticated user is an agency user
      if (user.role !== 'AGENCY_ADMIN' && user.role !== 'AGENCY_MEMBER') {
        return res.status(403).json({
          error: 'Only agency users can deny restore requests',
        });
      }

      const updatedRequest = await restoreService.denyRestoreRequest({
        request_id: id,
        reviewed_by_user_id: user.userId,
        agency_id: user.agencyId,
        status: 'denied',
        review_notes,
      });

      return res.status(200).json(updatedRequest);
    } catch (error: any) {
      logger.error('Error denying restore request', error);
      if (error.message.includes('not found') || error.message.includes('already been reviewed')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const restoreController = new RestoreController();
