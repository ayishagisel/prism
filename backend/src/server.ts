import { createApp } from './app';
import { config } from './config/env';
import { logger } from './utils/logger';

const app = createApp();
const port = config.server.port;

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${config.server.env}`);
  if (config.demoMode) {
    logger.info('Demo mode enabled');
  }
});
