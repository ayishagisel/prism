import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost/prism',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
    // Kept for backward compatibility
    expiry: process.env.JWT_EXPIRY || '7d',
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
  },
  demoMode: process.env.DEMO_MODE === 'true',
  email: {
    provider: process.env.EMAIL_PROVIDER || 'ses',
    senderEmail: process.env.EMAIL_FROM || 'noreply@prism.amore.dev',
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },
};
