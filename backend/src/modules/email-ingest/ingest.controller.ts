/**
 * Email Ingestion Controller
 *
 * Handles:
 * - Zoho Flow webhook for incoming emails
 * - Parsed query management (review, approve, assign)
 * - Ingestion job monitoring
 */

import { Request, Response } from 'express';
import { ingestService } from './ingest.service';
import { ZohoEmailWebhookPayload } from './parsers';
import { logger } from '../../utils/logger';

export class IngestController {
  /**
   * POST /api/ingest/webhook
   * Receive email from Zoho Flow webhook
   *
   * Expected payload:
   * {
   *   from: "sender@example.com",
   *   to: "amore@aoprllc.com",
   *   subject: "[SOS] Monday Afternoon Media Queries",
   *   body_text: "...",
   *   body_html: "...",
   *   received_at: "2025-12-15T18:31:00Z",
   *   message_id: "<unique-id@mail.zoho.com>",
   *   folder_id: "...",
   *   api_key: "your-secret-key"
   * }
   */
  async receiveWebhook(req: Request, res: Response) {
    try {
      const payload = req.body as ZohoEmailWebhookPayload;

      // Validate required fields
      if (!payload.from || !payload.subject || !payload.body_text) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: from, subject, body_text',
        });
      }

      // Validate API key (simple security)
      const expectedKey = process.env.INGEST_WEBHOOK_API_KEY;
      if (expectedKey && payload.api_key !== expectedKey) {
        logger.warn('Invalid API key in webhook request');
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
        });
      }

      // Get agency ID from environment or use default for now
      // In production, this would be determined by the recipient email or API key
      const agencyId = process.env.DEFAULT_AGENCY_ID || 'agency_aopr';

      logger.info(`Received email webhook: ${payload.subject}`);

      // Process the email
      const result = await ingestService.processWebhookEmail(agencyId, payload);

      if (result.success) {
        res.json({
          success: true,
          data: {
            ingestionJobId: result.ingestionJobId,
            sourceType: result.sourceType,
            queriesCreated: result.queriesCreated,
          },
        });
      } else {
        res.status(result.errors[0]?.includes('Duplicate') ? 200 : 500).json({
          success: false,
          error: result.errors.join(', '),
          data: {
            ingestionJobId: result.ingestionJobId,
          },
        });
      }
    } catch (error: any) {
      logger.error('Webhook processing error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/ingest/pending
   * Get all parsed queries pending review
   */
  async getPendingQueries(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;
      if (!agencyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const queries = await ingestService.getPendingQueries(agencyId);

      // Parse JSON fields for response
      const parsed = queries.map((q) => ({
        ...q,
        expert_roles: JSON.parse((q.expert_roles as string) || '[]'),
        expert_constraints: JSON.parse((q.expert_constraints as string) || '[]'),
        questions: JSON.parse((q.questions as string) || '[]'),
        assigned_client_ids: JSON.parse((q.assigned_client_ids as string) || '[]'),
        similar_query_ids: JSON.parse((q.similar_query_ids as string) || '[]'),
      }));

      res.json({
        success: true,
        data: {
          queries: parsed,
          count: parsed.length,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching pending queries:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/ingest/jobs
   * Get recent ingestion jobs
   */
  async getIngestionJobs(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;
      if (!agencyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const jobs = await ingestService.getIngestionJobs(agencyId, limit);

      res.json({
        success: true,
        data: {
          jobs,
          count: jobs.length,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching ingestion jobs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/ingest/queries/:id
   * Get a specific query with evidence
   */
  async getQueryDetail(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;
      if (!agencyId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const result = await ingestService.getQueryWithEvidence(id);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Query not found' });
      }

      // Parse JSON fields
      const query = {
        ...result.query,
        expert_roles: JSON.parse((result.query.expert_roles as string) || '[]'),
        expert_constraints: JSON.parse((result.query.expert_constraints as string) || '[]'),
        questions: JSON.parse((result.query.questions as string) || '[]'),
        assigned_client_ids: JSON.parse((result.query.assigned_client_ids as string) || '[]'),
        similar_query_ids: JSON.parse((result.query.similar_query_ids as string) || '[]'),
      };

      res.json({
        success: true,
        data: {
          query,
          evidence: result.evidence,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching query detail:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/ingest/queries/:id/approve
   * Approve a query for client assignment
   */
  async approveQuery(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;
      const userId = (req as any).auth?.userId;
      if (!agencyId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { notes } = req.body;

      await ingestService.updateQueryStatus(id, 'approved', userId, notes);

      res.json({
        success: true,
        message: 'Query approved',
      });
    } catch (error: any) {
      logger.error('Error approving query:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/ingest/queries/:id/discard
   * Discard a query (not relevant)
   */
  async discardQuery(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;
      const userId = (req as any).auth?.userId;
      if (!agencyId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { notes } = req.body;

      await ingestService.updateQueryStatus(id, 'discarded', userId, notes);

      res.json({
        success: true,
        message: 'Query discarded',
      });
    } catch (error: any) {
      logger.error('Error discarding query:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/ingest/queries/:id/assign
   * Assign a query to clients
   */
  async assignToClients(req: Request, res: Response) {
    try {
      const agencyId = (req as any).auth?.agencyId;
      const userId = (req as any).auth?.userId;
      if (!agencyId || !userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { clientIds } = req.body;

      if (!Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one client ID is required',
        });
      }

      await ingestService.assignToClients(id, clientIds, userId);

      res.json({
        success: true,
        message: `Query assigned to ${clientIds.length} client(s)`,
      });
    } catch (error: any) {
      logger.error('Error assigning query:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/ingest/test
   * Test endpoint for parsing an email without saving
   */
  async testParse(req: Request, res: Response) {
    try {
      const { subject, body_text, from } = req.body;

      if (!subject || !body_text || !from) {
        return res.status(400).json({
          success: false,
          error: 'Required: subject, body_text, from',
        });
      }

      // Import parsers
      const { detectEmailSource } = await import('./parsers/source-detector');
      const { parseSOSEmail } = await import('./parsers/sos.parser');
      const { parseTMXDigestEmail } = await import('./parsers/tmx-digest.parser');
      const { parseTMXSingleEmail } = await import('./parsers/tmx-single.parser');

      // Detect source
      const detection = detectEmailSource(subject, body_text, from);

      // Parse based on type
      let parseResult;
      switch (detection.sourceType) {
        case 'SOS':
          parseResult = parseSOSEmail(body_text);
          break;
        case 'TMX_DIGEST':
          parseResult = parseTMXDigestEmail(body_text);
          break;
        case 'TMX_SINGLE':
          parseResult = await parseTMXSingleEmail(body_text, false);
          break;
        default:
          parseResult = await parseTMXSingleEmail(body_text, true);
      }

      res.json({
        success: true,
        data: {
          detection,
          parseResult,
        },
      });
    } catch (error: any) {
      logger.error('Test parse error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const ingestController = new IngestController();
