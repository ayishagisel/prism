import { Request, Response } from 'express';
import { clientService } from './client.service';
import { logger } from '../../utils/logger';
import { validate, required } from '../../utils/validation';

export class ClientController {
  async create(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      validate(req.body, {
        name: [required],
      });

      const client = await clientService.createClient(req.auth.agencyId, req.body);

      res.status(201).json({ success: true, data: client });
    } catch (err: any) {
      logger.error('Create client error', err);

      if (err.errors) {
        return res.status(400).json({ success: false, errors: err.errors });
      }

      res.status(500).json({ success: false, error: 'Failed to create client' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const clients = await clientService.listClients(req.auth.agencyId, {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      });

      res.json({ success: true, data: clients });
    } catch (err) {
      logger.error('List clients error', err);
      res.status(500).json({ success: false, error: 'Failed to list clients' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const client = await clientService.getClientById(req.auth.agencyId, req.params.id);

      if (!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      res.json({ success: true, data: client });
    } catch (err) {
      logger.error('Get client error', err);
      res.status(500).json({ success: false, error: 'Failed to get client' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const client = await clientService.updateClient(req.auth.agencyId, req.params.id, req.body);

      if (!client) {
        return res.status(404).json({ success: false, error: 'Client not found' });
      }

      res.json({ success: true, data: client });
    } catch (err) {
      logger.error('Update client error', err);
      res.status(500).json({ success: false, error: 'Failed to update client' });
    }
  }

  async getOpportunities(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const statuses = await clientService.getClientOpportunitiesForClient(
        req.auth.agencyId,
        req.params.id
      );

      res.json({ success: true, data: statuses });
    } catch (err) {
      logger.error('Get client opportunities error', err);
      res.status(500).json({ success: false, error: 'Failed to get opportunities' });
    }
  }
}

export const clientController = new ClientController();
