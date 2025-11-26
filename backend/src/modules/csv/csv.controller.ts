import { Request, Response } from 'express';
import { csvImportService } from './csv.service';
import { clientService } from '../client/client.service';
import { logger } from '../../utils/logger';

export class CSVController {
  /**
   * Upload and import CSV file
   */
  async importCSV(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { csv_content, client_mapping } = req.body;

      if (!csv_content || typeof csv_content !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'csv_content is required and must be a string',
        });
      }

      const result = await csvImportService.importFromCSV(
        req.auth.agencyId,
        req.auth.userId,
        csv_content,
        client_mapping
      );

      res.json({ success: true, data: result });
    } catch (err: any) {
      logger.error('CSV import error', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to import CSV',
      });
    }
  }

  /**
   * Get client mapping for CSV import (name -> id mapping)
   */
  async getClientMapping(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const clients = await clientService.listClients(req.auth.agencyId, {
        limit: 1000,
      });

      const mapping: Record<string, string> = {};
      for (const client of clients) {
        mapping[client.name.toLowerCase()] = client.id;
      }

      res.json({ success: true, data: mapping });
    } catch (err) {
      logger.error('Get client mapping error', err);
      res.status(500).json({
        success: false,
        error: 'Failed to get client mapping',
      });
    }
  }
}

export const csvController = new CSVController();
