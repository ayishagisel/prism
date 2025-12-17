import { createServer } from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { websocketService } from './modules/websocket/websocket.service';

const app = createApp();
const port = config.server.port;

// Create HTTP server for both Express and Socket.io
const httpServer = createServer(app);

// Initialize WebSocket service
websocketService.initialize(httpServer);

// Bind to 0.0.0.0 to accept connections from outside (required for Railway/Docker)
httpServer.listen(port, '0.0.0.0', () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Listening on 0.0.0.0:${port}`);
  logger.info(`Environment: ${config.server.env}`);
  logger.info('WebSocket service initialized');
  if (config.demoMode) {
    logger.info('Demo mode enabled');
  }
});
