import { Request, Response, NextFunction } from 'express';
import { restoreService } from './restore.service';

export class RestoreController {
  /**
   * POST /api/restore/request
   * Create a restore request (client-side)
   * Body: { opportunity_id, client_id }
   * Auth: client_user (from JWT)
   */
  async createRestoreRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { opportunity_id, client_id } = req.body;
      const user = (req as any).user;

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
      if (user.user_type !== 'client_user') {
        return res.status(403).json({
          error: 'Only client users can create restore requests',
        });
      }

      // Ensure the client_id matches the authenticated user's client
      if (user.client_id !== client_id) {
        return res.status(403).json({
          error: 'You can only create restore requests for your own client',
        });
      }

      const restoreRequest = await restoreService.createRestoreRequest({
        opportunity_id,
        client_id,
        client_user_id: user.id,
        agency_id: user.agency_id,
      });

      return res.status(201).json(restoreRequest);
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('deadline has passed') || error.message.includes('declined')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  /**
   * GET /api/restore/requests
   * Get all pending restore requests (AOPR dashboard)
   * Auth: agency_user (from JWT)
   */
  async getPendingRestoreRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Ensure the authenticated user is an agency user
      if (user.user_type !== 'agency_user') {
        return res.status(403).json({
          error: 'Only agency users can view restore requests',
        });
      }

      const requests = await restoreService.getPendingRestoreRequests(user.agency_id);

      return res.status(200).json(requests);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/restore/requests/opportunity/:opportunityId/client/:clientId
   * Get all restore requests for a specific opportunity and client
   * Auth: client_user or agency_user (from JWT)
   */
  async getRestoreRequestsByOpportunityAndClient(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { opportunityId, clientId } = req.params;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // If client user, ensure they own the client
      if (user.user_type === 'client_user' && user.client_id !== clientId) {
        return res.status(403).json({
          error: 'You can only view restore requests for your own client',
        });
      }

      const requests = await restoreService.getRestoreRequestsByOpportunityAndClient(
        opportunityId,
        clientId,
        user.agency_id
      );

      return res.status(200).json(requests);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/restore/requests/:id/approve
   * Approve a restore request (AOPR)
   * Body: { review_notes? }
   * Auth: agency_user (from JWT)
   */
  async approveRestoreRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { review_notes } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Ensure the authenticated user is an agency user
      if (user.user_type !== 'agency_user') {
        return res.status(403).json({
          error: 'Only agency users can approve restore requests',
        });
      }

      const updatedRequest = await restoreService.approveRestoreRequest({
        request_id: id,
        reviewed_by_user_id: user.id,
        agency_id: user.agency_id,
        status: 'approved',
        review_notes,
      });

      return res.status(200).json(updatedRequest);
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('already been reviewed')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  /**
   * PUT /api/restore/requests/:id/deny
   * Deny a restore request (AOPR)
   * Body: { review_notes? }
   * Auth: agency_user (from JWT)
   */
  async denyRestoreRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { review_notes } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Ensure the authenticated user is an agency user
      if (user.user_type !== 'agency_user') {
        return res.status(403).json({
          error: 'Only agency users can deny restore requests',
        });
      }

      const updatedRequest = await restoreService.denyRestoreRequest({
        request_id: id,
        reviewed_by_user_id: user.id,
        agency_id: user.agency_id,
        status: 'denied',
        review_notes,
      });

      return res.status(200).json(updatedRequest);
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('already been reviewed')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
}

export const restoreController = new RestoreController();
