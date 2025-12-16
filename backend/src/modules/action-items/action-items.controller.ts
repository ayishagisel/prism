import { Request, Response } from 'express';
import { actionItemsService } from './action-items.service';
import { logger } from '../../utils/logger';

/**
 * Controller for unified action items queue
 * Combines escalated Q&A chats and restore requests into a single queue
 */
export class ActionItemsController {
  /**
   * GET /api/action-items
   * Get all action items for the authenticated agency
   * Returns unified queue of escalated chats and restore requests
   * Auth: agency_user (AGENCY_ADMIN or AGENCY_MEMBER)
   */
  async getActionItems(req: Request, res: Response) {
    try {
      const user = (req as any).auth;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Ensure the authenticated user is an agency user
      if (user.role !== 'AGENCY_ADMIN' && user.role !== 'AGENCY_MEMBER') {
        return res.status(403).json({
          error: 'Only agency users can view action items',
        });
      }

      const actionItems = await actionItemsService.getActionItems(user.agencyId);

      return res.status(200).json({
        success: true,
        data: actionItems,
      });
    } catch (error) {
      logger.error('Error getting action items', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/action-items/count
   * Get count of action items by type for badge display
   * Auth: agency_user (AGENCY_ADMIN or AGENCY_MEMBER)
   */
  async getActionItemsCount(req: Request, res: Response) {
    try {
      const user = (req as any).auth;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Ensure the authenticated user is an agency user
      if (user.role !== 'AGENCY_ADMIN' && user.role !== 'AGENCY_MEMBER') {
        return res.status(403).json({
          error: 'Only agency users can view action items count',
        });
      }

      const counts = await actionItemsService.getActionItemsCount(user.agencyId);

      return res.status(200).json({
        success: true,
        data: counts,
      });
    } catch (error) {
      logger.error('Error getting action items count', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const actionItemsController = new ActionItemsController();
