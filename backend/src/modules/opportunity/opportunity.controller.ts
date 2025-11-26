import { Request, Response } from 'express';
import { opportunityService } from './opportunity.service';
import { logger } from '../../utils/logger';
import { validate, required, minLength } from '../../utils/validation';

export class OpportunityController {
  async create(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Validate input
      validate(req.body, {
        title: [required],
        media_type: [required],
        opportunity_type: [required],
      });

      const opportunity = await opportunityService.createOpportunity(
        req.auth.agencyId,
        req.auth.userId,
        req.body
      );

      res.status(201).json({ success: true, data: opportunity });
    } catch (err: any) {
      logger.error('Create opportunity error', err);

      if (err.errors) {
        return res.status(400).json({ success: false, errors: err.errors });
      }

      res.status(500).json({ success: false, error: 'Failed to create opportunity' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const opportunities = await opportunityService.listOpportunities(req.auth.agencyId, {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      });

      res.json({ success: true, data: opportunities });
    } catch (err) {
      logger.error('List opportunities error', err);
      res.status(500).json({ success: false, error: 'Failed to list opportunities' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const opportunity = await opportunityService.getOpportunityById(
        req.auth.agencyId,
        req.params.id
      );

      if (!opportunity) {
        return res.status(404).json({ success: false, error: 'Opportunity not found' });
      }

      res.json({ success: true, data: opportunity });
    } catch (err) {
      logger.error('Get opportunity error', err);
      res.status(500).json({ success: false, error: 'Failed to get opportunity' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const opportunity = await opportunityService.updateOpportunity(
        req.auth.agencyId,
        req.params.id,
        req.body
      );

      if (!opportunity) {
        return res.status(404).json({ success: false, error: 'Opportunity not found' });
      }

      res.json({ success: true, data: opportunity });
    } catch (err) {
      logger.error('Update opportunity error', err);
      res.status(500).json({ success: false, error: 'Failed to update opportunity' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      await opportunityService.deleteOpportunity(req.auth.agencyId, req.params.id);

      res.json({ success: true, data: { message: 'Opportunity deleted' } });
    } catch (err) {
      logger.error('Delete opportunity error', err);
      res.status(500).json({ success: false, error: 'Failed to delete opportunity' });
    }
  }
}

export const opportunityController = new OpportunityController();
