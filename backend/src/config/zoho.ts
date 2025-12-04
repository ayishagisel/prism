import { config } from 'dotenv';
import { logger } from '../utils/logger';

config();

export const zohoConfig = {
  // OAuth credentials (set in .env)
  client_id: process.env.ZOHO_CLIENT_ID || '',
  client_secret: process.env.ZOHO_CLIENT_SECRET || '',
  redirect_uri: process.env.ZOHO_REDIRECT_URI || 'http://localhost:3000/zoho/callback',

  // Zoho API endpoints
  auth_url: 'https://accounts.zoho.com/oauth/v2/auth',
  token_url: 'https://accounts.zoho.com/oauth/v2/token',
  api_url: 'https://www.zohoapis.com/crm/v2',

  // Organization ID (required for API calls)
  org_id: process.env.ZOHO_ORG_ID || '',

  // Zoho realm (us, eu, etc.) - defaults to us
  realm: process.env.ZOHO_REALM || 'us',
};

// Validate Zoho configuration
export function validateZohoConfig(): boolean {
  if (!zohoConfig.client_id) {
    logger.warn('ZOHO_CLIENT_ID not configured');
    return false;
  }
  if (!zohoConfig.client_secret) {
    logger.warn('ZOHO_CLIENT_SECRET not configured');
    return false;
  }
  if (!zohoConfig.org_id) {
    logger.warn('ZOHO_ORG_ID not configured');
    return false;
  }
  return true;
}

// Get the Zoho realm URL based on region
export function getZohoRealmUrl(): string {
  const realms: { [key: string]: string } = {
    us: 'https://accounts.zoho.com',
    eu: 'https://accounts.zoho.eu',
    in: 'https://accounts.zoho.in',
    au: 'https://accounts.zoho.com.au',
    jp: 'https://accounts.zoho.jp',
    ca: 'https://accounts.zoho.ca',
  };
  return realms[zohoConfig.realm] || realms.us;
}
