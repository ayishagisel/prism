import { Request, Response } from 'express';
import { emailService } from './email.service';
import { logger } from '../../utils/logger';

export class EmailController {
  /**
   * Process pending email notifications
   * This endpoint can be called by a cron job or manually
   */
  async processPendingEmails(req: Request, res: Response) {
    try {
      const result = await emailService.processPendingNotifications();

      logger.info('Pending emails processed via API', result);

      res.json({
        success: true,
        data: {
          message: 'Pending emails processed',
          ...result,
        },
      });
    } catch (err) {
      logger.error('Process pending emails error', err);
      res.status(500).json({
        success: false,
        error: 'Failed to process pending emails',
      });
    }
  }

  /**
   * Health check for email service
   */
  async healthCheck(req: Request, res: Response) {
    try {
      res.json({
        success: true,
        data: {
          service: 'email',
          status: 'operational',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Email service unhealthy',
      });
    }
  }
}

export const emailController = new EmailController();
