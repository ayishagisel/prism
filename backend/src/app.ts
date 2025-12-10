import express, { Request, Response } from 'express';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.middleware';
import { tenancyMiddleware } from './middleware/tenancy.middleware';
import { logger } from './utils/logger';

// Controllers
import { authController } from './modules/auth/auth.controller';
import { refreshController } from './modules/auth/refresh.controller';
import { agencyController } from './modules/agency/agency.controller';
import { opportunityController } from './modules/opportunity/opportunity.controller';
import { clientController } from './modules/client/client.controller';
import { statusController } from './modules/clientOpportunityStatus/status.controller';
import { taskController } from './modules/followUpTask/task.controller';
import { csvController } from './modules/csv/csv.controller';
import { emailController } from './modules/email/email.controller';
import { zohoController } from './modules/zoho/zoho.controller';
import { emailIngestController } from './modules/email-ingest/email.controller';
import { notificationController } from './modules/notifications/notification.controller';

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // Auth routes (no auth required)
  app.post('/api/auth/login', (req, res) => authController.login(req, res));
  app.post('/api/auth/register', (req, res) => authController.registerAgency(req, res));
  app.post('/api/auth/register-client', (req, res) => authController.registerClient(req, res));
  app.post('/api/auth/verify-email', (req, res) => authController.verifyEmail(req, res));
  app.post('/api/auth/request-password-reset', (req, res) => authController.requestPasswordReset(req, res));
  app.post('/api/auth/reset-password', (req, res) => authController.resetPassword(req, res));
  app.post('/api/auth/refresh', authMiddleware, (req, res) => refreshController.refresh(req, res));
  app.post('/api/auth/logout', authMiddleware, (req, res) => authController.logout(req, res));
  app.get('/api/auth/me', authMiddleware, (req, res) => authController.me(req, res));

  // Agency routes
  app.get('/api/agency/me', authMiddleware, (req, res) => agencyController.getMe(req, res));
  app.get('/api/agency/metrics', authMiddleware, (req, res) =>
    agencyController.getMetrics(req, res)
  );

  // Opportunity routes
  app.post('/api/opportunities', authMiddleware, (req, res) =>
    opportunityController.create(req, res)
  );
  app.get('/api/opportunities', authMiddleware, (req, res) =>
    opportunityController.list(req, res)
  );
  app.get('/api/opportunities/:id', authMiddleware, (req, res) =>
    opportunityController.getById(req, res)
  );
  app.put('/api/opportunities/:id', authMiddleware, (req, res) =>
    opportunityController.update(req, res)
  );
  app.delete('/api/opportunities/:id', authMiddleware, (req, res) =>
    opportunityController.delete(req, res)
  );

  // Client routes
  app.post('/api/clients', authMiddleware, (req, res) => clientController.create(req, res));
  app.get('/api/clients', authMiddleware, (req, res) => clientController.list(req, res));
  app.get('/api/clients/:id', authMiddleware, (req, res) => clientController.getById(req, res));
  app.put('/api/clients/:id', authMiddleware, (req, res) => clientController.update(req, res));
  app.delete('/api/clients/:id', authMiddleware, (req, res) => clientController.delete(req, res));
  app.get('/api/clients/:id/opportunities', authMiddleware, (req, res) =>
    clientController.getOpportunities(req, res)
  );

  // Client Opportunity Status routes
  app.get('/api/statuses/:clientId/:opportunityId', authMiddleware, (req, res) =>
    statusController.getStatus(req, res)
  );
  app.put('/api/statuses/:clientId/:opportunityId', authMiddleware, (req, res) =>
    statusController.updateStatus(req, res)
  );
  app.get('/api/opportunities/:opportunityId/statuses', authMiddleware, (req, res) =>
    statusController.listStatusesByOpportunity(req, res)
  );
  app.get('/api/opportunities/:opportunityId/summary', authMiddleware, (req, res) =>
    statusController.getOpportunitySummary(req, res)
  );

  // Follow-up Tasks routes
  app.post('/api/tasks', authMiddleware, (req, res) => taskController.create(req, res));
  app.get('/api/tasks', authMiddleware, (req, res) => taskController.list(req, res));
  app.get('/api/tasks/:id', authMiddleware, (req, res) => taskController.getById(req, res));
  app.put('/api/tasks/:id', authMiddleware, (req, res) => taskController.update(req, res));
  app.get('/api/opportunities/:opportunityId/tasks', authMiddleware, (req, res) =>
    taskController.getByOpportunity(req, res)
  );
  app.get('/api/clients/:clientId/tasks', authMiddleware, (req, res) =>
    taskController.getByClient(req, res)
  );

  // CSV Import routes
  app.post('/api/csv/import', authMiddleware, (req, res) => csvController.importCSV(req, res));
  app.get('/api/csv/client-mapping', authMiddleware, (req, res) =>
    csvController.getClientMapping(req, res)
  );

  // Email routes
  app.post('/api/email/process-pending', (req, res) => emailController.processPendingEmails(req, res));
  app.get('/api/email/health', (req, res) => emailController.healthCheck(req, res));

  // Zoho CRM Integration routes
  app.get('/api/zoho/authorize', authMiddleware, (req, res) => zohoController.getAuthorizationUrl(req, res));
  app.post('/api/zoho/callback', authMiddleware, (req, res) => zohoController.handleOAuthCallback(req, res));
  app.post('/api/zoho/sync', authMiddleware, (req, res) => zohoController.triggerSync(req, res));
  app.get('/api/zoho/status', authMiddleware, (req, res) => zohoController.getConnectionStatus(req, res));

  // Zoho Webhook (no auth required - Zoho has own verification)
  app.post('/api/webhooks/zoho', (req, res) => zohoController.handleWebhook(req, res));

  // Email Ingestion Routes
  app.get('/api/opportunities/pending-review', authMiddleware, (req, res) => emailIngestController.getPendingOpportunities(req, res));
  app.post('/api/opportunities/pending-review/:id/assign', authMiddleware, (req, res) => emailIngestController.assignToClients(req, res));
  app.post('/api/opportunities/pending-review/:id/discard', authMiddleware, (req, res) => emailIngestController.discardOpportunity(req, res));
  app.post('/api/email-ingest/poll', authMiddleware, (req, res) => emailIngestController.pollEmails(req, res));

  // Notification routes
  app.post('/api/notifications/subscribe', authMiddleware, (req, res) => notificationController.subscribe(req, res));
  app.post('/api/notifications/unsubscribe', authMiddleware, (req, res) => notificationController.unsubscribe(req, res));
  app.post('/api/notifications/send', authMiddleware, (req, res) => notificationController.send(req, res));
  app.get('/api/notifications/preferences/:userId', authMiddleware, (req, res) => notificationController.getPreferences(req, res));
  app.put('/api/notifications/preferences/:userId', authMiddleware, (req, res) => notificationController.updatePreferences(req, res));
  app.get('/api/notifications/vapid-public-key', authMiddleware, (req, res) => notificationController.getVapidPublicKey(req, res));

  // Error handling
  app.use((err: any, req: Request, res: Response, next: any) => {
    logger.error('Unhandled error', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  });

  return app;
};
