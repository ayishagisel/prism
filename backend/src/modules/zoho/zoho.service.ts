import axios, { AxiosError } from 'axios';
import { db } from '../../config/db';
import { zohoTokens, opportunities, clients } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { zohoConfig, getZohoRealmUrl } from '../../config/zoho';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ZohoOAuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
  api_domain: string;
}

export interface ZohoOpportunity {
  id: string;
  name: string;
  closing_date: string;
  amount?: number;
  description?: string;
  deal_owner?: { id: string; name: string };
  stage?: string;
  custom_fields?: any;
}

export interface ZohoAccount {
  id: string;
  name: string;
  industry?: string;
  email?: string;
  phone?: string;
}

export class ZohoService {
  /**
   * Generate Zoho OAuth authorization URL
   * User navigates to this URL to authorize PRISM to access their Zoho account
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: zohoConfig.client_id,
      response_type: 'code',
      // Use broad scope - ZohoCRM.modules.ALL covers all CRM modules
      // For self-client, Zoho requires specific module names instead of module IDs
      scope: 'ZohoCRM.modules.Deals.ALL,ZohoCRM.modules.Accounts.ALL',
      redirect_uri: zohoConfig.redirect_uri,
      state,
      access_type: 'offline',
    });

    return `${getZohoRealmUrl()}/oauth/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * Called after user authorizes PRISM in Zoho
   */
  async exchangeCodeForToken(code: string): Promise<ZohoOAuthToken | null> {
    try {
      const response = await axios.post(
        `${getZohoRealmUrl()}/oauth/v2/token`,
        {
          client_id: zohoConfig.client_id,
          client_secret: zohoConfig.client_secret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: zohoConfig.redirect_uri,
        }
      );

      const { access_token, refresh_token, expires_in, scope, api_domain } = response.data;

      // Calculate when token expires (add 5 min buffer)
      const expiresAt = Date.now() + (expires_in - 300) * 1000;

      return {
        access_token,
        refresh_token,
        expires_at: expiresAt,
        scope,
        api_domain,
      };
    } catch (error) {
      logger.error('Failed to exchange code for Zoho token', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * Called when access token expires
   */
  async refreshAccessToken(refreshToken: string): Promise<ZohoOAuthToken | null> {
    try {
      const response = await axios.post(
        `${getZohoRealmUrl()}/oauth/v2/token`,
        {
          client_id: zohoConfig.client_id,
          client_secret: zohoConfig.client_secret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }
      );

      const { access_token, expires_in, scope, api_domain } = response.data;

      // Calculate when token expires (add 5 min buffer)
      const expiresAt = Date.now() + (expires_in - 300) * 1000;

      return {
        access_token,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope,
        api_domain,
      };
    } catch (error) {
      logger.error('Failed to refresh Zoho token', error);
      return null;
    }
  }

  /**
   * Get stored token for agency
   */
  async getStoredToken(agencyId: string): Promise<ZohoOAuthToken | null> {
    try {
      const storedToken = await db.query.zohoTokens.findFirst({
        where: eq(zohoTokens.agency_id, agencyId),
      });

      if (!storedToken) {
        return null;
      }

      // Check if token is expired
      const expiresAt = new Date(storedToken.expires_at).getTime();
      const now = Date.now();

      if (expiresAt < now) {
        // Try to refresh
        const refreshed = await this.refreshAccessToken(storedToken.refresh_token);
        if (refreshed) {
          // Update stored token
          await db
            .update(zohoTokens)
            .set({
              access_token: refreshed.access_token,
              expires_at: new Date(refreshed.expires_at),
              updated_at: new Date(),
            })
            .where(eq(zohoTokens.agency_id, agencyId));

          return refreshed;
        }
        return null;
      }

      return {
        access_token: storedToken.access_token,
        refresh_token: storedToken.refresh_token,
        expires_at: expiresAt,
        scope: storedToken.scope || '',
        api_domain: storedToken.api_domain || '',
      };
    } catch (error) {
      logger.error('Failed to get stored Zoho token', error);
      return null;
    }
  }

  /**
   * Save token for agency
   */
  async saveToken(agencyId: string, token: ZohoOAuthToken): Promise<boolean> {
    try {
      // Check if token already exists
      const existing = await db.query.zohoTokens.findFirst({
        where: eq(zohoTokens.agency_id, agencyId),
      });

      if (existing) {
        // Update existing token
        await db
          .update(zohoTokens)
          .set({
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expires_at: new Date(token.expires_at),
            scope: token.scope,
            api_domain: token.api_domain,
            updated_at: new Date(),
          })
          .where(eq(zohoTokens.agency_id, agencyId));
      } else {
        // Insert new token
        await db.insert(zohoTokens).values({
          id: uuidv4(),
          agency_id: agencyId,
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          expires_at: new Date(token.expires_at),
          scope: token.scope,
          api_domain: token.api_domain,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      logger.info(`Zoho token saved for agency ${agencyId}`);
      return true;
    } catch (error) {
      logger.error('Failed to save Zoho token', error);
      return false;
    }
  }

  /**
   * Fetch opportunities from Zoho Deals module
   */
  async fetchZohoOpportunities(accessToken: string): Promise<ZohoOpportunity[]> {
    try {
      const response = await axios.get(
        `${zohoConfig.api_url}/Deals`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            fields: 'id,Deal_Name,Closing_Date,Amount,Description,Deal_Owner,Stage',
            per_page: 100,
          },
        }
      );

      if (response.data.data) {
        // Transform Zoho deal format to our interface
        return response.data.data.map((deal: any) => ({
          id: deal.id,
          name: deal.Deal_Name,
          closing_date: deal.Closing_Date,
          amount: deal.Amount,
          description: deal.Description,
          deal_owner: deal.Deal_Owner,
          stage: deal.Stage,
          custom_fields: deal,
        }));
      }

      return [];
    } catch (error) {
      logger.error('Failed to fetch Zoho opportunities', error);
      return [];
    }
  }

  /**
   * Fetch accounts/clients from Zoho
   */
  async fetchZohoAccounts(accessToken: string): Promise<ZohoAccount[]> {
    try {
      const response = await axios.get(
        `${zohoConfig.api_url}/Accounts`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            fields: 'id,Account_Name,Industry,Email,Phone',
            per_page: 100,
          },
        }
      );

      if (response.data.data) {
        return response.data.data.map((account: any) => ({
          id: account.id,
          name: account.Account_Name,
          industry: account.Industry,
          email: account.Email,
          phone: account.Phone,
        }));
      }

      return [];
    } catch (error) {
      logger.error('Failed to fetch Zoho accounts', error);
      return [];
    }
  }

  /**
   * Sync Zoho opportunities to PRISM
   * Maps Zoho deals to PRISM opportunities
   */
  async syncOpportunities(agencyId: string, zohoOpportunities: ZohoOpportunity[]): Promise<number> {
    try {
      let syncedCount = 0;

      for (const zohoOpp of zohoOpportunities) {
        // Check if opportunity already exists in PRISM
        const existing = await db.query.opportunities.findFirst({
          where: and(
            eq(opportunities.agency_id, agencyId),
            eq(opportunities.zoho_id, zohoOpp.id)
          ),
        });

        if (existing) {
          // Update existing opportunity
          await db
            .update(opportunities)
            .set({
              title: zohoOpp.name,
              deadline_at: new Date(zohoOpp.closing_date),
              summary: zohoOpp.description,
              updated_at: new Date(),
            })
            .where(eq(opportunities.id, existing.id));

          syncedCount++;
        } else {
          // Create new opportunity
          // Normalize media type if available from custom fields
          const mediaType = this.normalizeMediaType(zohoOpp.custom_fields?.Media_Type) || ('feature_article' as const);

          await db.insert(opportunities).values({
            id: uuidv4(),
            agency_id: agencyId,
            zoho_id: zohoOpp.id,
            title: zohoOpp.name,
            deadline_at: new Date(zohoOpp.closing_date),
            media_type: mediaType,
            opportunity_type: 'PR' as const,
            source: 'zoho_api',
            summary: zohoOpp.description || '',
            metadata: {
              zoho_stage: zohoOpp.stage,
              zoho_owner: zohoOpp.deal_owner?.name,
              estimated_budget: zohoOpp.amount,
            },
            created_at: new Date(),
            updated_at: new Date(),
          });

          syncedCount++;
        }
      }

      logger.info(`Synced ${syncedCount} opportunities from Zoho for agency ${agencyId}`);
      return syncedCount;
    } catch (error) {
      logger.error('Failed to sync Zoho opportunities', error);
      return 0;
    }
  }

  /**
   * Sync Zoho accounts to PRISM clients
   * Maps Zoho accounts to PRISM clients
   */
  async syncClients(agencyId: string, zohoAccounts: ZohoAccount[]): Promise<number> {
    try {
      let syncedCount = 0;

      for (const zohoAccount of zohoAccounts) {
        // Check if client already exists
        const existing = await db.query.clients.findFirst({
          where: and(
            eq(clients.agency_id, agencyId),
            eq(clients.zoho_id, zohoAccount.id)
          ),
        });

        if (existing) {
          // Update existing client
          await db
            .update(clients)
            .set({
              name: zohoAccount.name,
              industry: zohoAccount.industry,
              primary_contact_email: zohoAccount.email,
              updated_at: new Date(),
            })
            .where(eq(clients.id, existing.id));

          syncedCount++;
        } else {
          // Create new client
          await db.insert(clients).values({
            id: uuidv4(),
            agency_id: agencyId,
            zoho_id: zohoAccount.id,
            name: zohoAccount.name,
            industry: zohoAccount.industry,
            primary_contact_email: zohoAccount.email,
            metadata: {
              zoho_phone: zohoAccount.phone,
            },
            created_at: new Date(),
            updated_at: new Date(),
          });

          syncedCount++;
        }
      }

      logger.info(`Synced ${syncedCount} clients from Zoho for agency ${agencyId}`);
      return syncedCount;
    } catch (error) {
      logger.error('Failed to sync Zoho clients', error);
      return 0;
    }
  }

  /**
   * Normalize Zoho media type to PRISM media type enum
   */
  private normalizeMediaType(zohoMediaType?: string): 'feature_article' | 'news_brief' | 'panel' | 'podcast' | 'tv_appearance' | 'speaking_engagement' | 'event' | 'other' | undefined {
    if (!zohoMediaType) return undefined;

    const normalized = zohoMediaType.toLowerCase().replace(/\s+/g, '_');

    const mediaTypeMap: { [key: string]: 'feature_article' | 'news_brief' | 'panel' | 'podcast' | 'tv_appearance' | 'speaking_engagement' | 'event' | 'other' } = {
      'feature_article': 'feature_article',
      'article': 'feature_article',
      'news_brief': 'news_brief',
      'news_item': 'news_brief',
      'panel': 'panel',
      'podcast': 'podcast',
      'podcast_mention': 'podcast',
      'newsletter': 'feature_article',
      'social_post': 'feature_article',
      'video': 'tv_appearance',
      'broadcast': 'tv_appearance',
      'guest_post': 'feature_article',
      'roundup': 'feature_article',
      'award': 'other',
      'speaking_opportunity': 'speaking_engagement',
      'speaking_engagement': 'speaking_engagement',
      'event': 'event',
      'tv_appearance': 'tv_appearance',
    };

    return mediaTypeMap[normalized] || 'other';
  }

  /**
   * Handle incoming Zoho webhook event
   */
  async handleWebhookEvent(event: any): Promise<boolean> {
    try {
      const eventType = event.operation;
      logger.info(`Handling Zoho webhook event: ${eventType}`, event);

      // TODO: Implement webhook event handling
      // Events to handle:
      // - insert.deals -> New opportunity created
      // - update.deals -> Opportunity updated
      // - delete.deals -> Opportunity deleted
      // - insert.accounts -> New account/client created
      // - update.accounts -> Account/client updated

      return true;
    } catch (error) {
      logger.error('Failed to handle Zoho webhook event', error);
      return false;
    }
  }
}

export const zohoService = new ZohoService();
