import { Request, Response } from 'express';
import { statusService } from './status.service';
import { logger } from '../../utils/logger';
import { validate, required } from '../../utils/validation';

export class StatusController {
  async getStatus(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const status = await statusService.getStatus(
        req.auth.agencyId,
        req.params.clientId,
        req.params.opportunityId
      );

      if (!status) {
        return res.status(404).json({ success: false, error: 'Status not found' });
      }

      res.json({ success: true, data: status });
    } catch (err) {
      logger.error('Get status error', err);
      res.status(500).json({ success: false, error: 'Failed to get status' });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      validate(req.body, {
        response_state: [required],
      });

      const status = await statusService.updateStatus(
        req.auth.agencyId,
        req.params.clientId,
        req.params.opportunityId,
        req.body,
        req.auth.userId
      );

      if (!status) {
        return res.status(404).json({ success: false, error: 'Status not found' });
      }

      res.json({ success: true, data: status });
    } catch (err: any) {
      logger.error('Update status error', err);

      if (err.errors) {
        return res.status(400).json({ success: false, errors: err.errors });
      }

      res.status(500).json({ success: false, error: 'Failed to update status' });
    }
  }

  async listStatusesByOpportunity(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const statuses = await statusService.listStatusesByOpportunity(
        req.auth.agencyId,
        req.params.opportunityId
      );

      res.json({ success: true, data: statuses });
    } catch (err) {
      logger.error('List statuses error', err);
      res.status(500).json({ success: false, error: 'Failed to list statuses' });
    }
  }

  async getOpportunitySummary(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const summary = await statusService.getOpportunitySummary(
        req.auth.agencyId,
        req.params.opportunityId
      );

      res.json({ success: true, data: summary });
    } catch (err) {
      logger.error('Get opportunity summary error', err);
      res.status(500).json({ success: false, error: 'Failed to get summary' });
    }
  }
}

export const statusController = new StatusController();
