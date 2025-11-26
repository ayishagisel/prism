import { Request, Response } from 'express';
import { agencyService } from './agency.service';
import { logger } from '../../utils/logger';

export class AgencyController {
  async getMe(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const agency = await agencyService.getAgencyById(req.auth.agencyId);

      if (!agency) {
        return res.status(404).json({ success: false, error: 'Agency not found' });
      }

      res.json({ success: true, data: agency });
    } catch (err) {
      logger.error('Get agency error', err);
      res.status(500).json({ success: false, error: 'Failed to get agency' });
    }
  }

  async getMetrics(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const metrics = await agencyService.getAgencyMetrics(req.auth.agencyId);

      res.json({ success: true, data: metrics });
    } catch (err) {
      logger.error('Get metrics error', err);
      res.status(500).json({ success: false, error: 'Failed to get metrics' });
    }
  }
}

export const agencyController = new AgencyController();
