import { db } from '../../config/db';
import { agencies, agencyUsers } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger';

export class AgencyService {
  async getAgencyById(agencyId: string) {
    try {
      const agency = await db.query.agencies.findFirst({
        where: eq(agencies.id, agencyId),
      });
      return agency || null;
    } catch (err) {
      logger.error('Get agency error', err);
      throw err;
    }
  }

  async getAgencyBySlug(slug: string) {
    try {
      const agency = await db.query.agencies.findFirst({
        where: eq(agencies.slug, slug),
      });
      return agency || null;
    } catch (err) {
      logger.error('Get agency by slug error', err);
      throw err;
    }
  }

  async createAgency(data: {
    name: string;
    slug: string;
    primary_contact_name?: string;
    primary_contact_email?: string;
    timezone?: string;
    settings?: any;
    metadata?: any;
  }) {
    try {
      const id = `agency_${uuid()}`;
      const agency = await db
        .insert(agencies)
        .values({
          id,
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      logger.info('Agency created', { agencyId: id });
      return agency[0];
    } catch (err) {
      logger.error('Create agency error', err);
      throw err;
    }
  }

  async getAllAgencies() {
    try {
      return await db.query.agencies.findMany();
    } catch (err) {
      logger.error('Get all agencies error', err);
      throw err;
    }
  }

  async updateAgency(
    agencyId: string,
    data: Partial<{
      name: string;
      primary_contact_name: string;
      primary_contact_email: string;
      timezone: string;
      settings: any;
      metadata: any;
    }>
  ) {
    try {
      const updated = await db
        .update(agencies)
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where(eq(agencies.id, agencyId))
        .returning();

      logger.info('Agency updated', { agencyId });
      return updated[0] || null;
    } catch (err) {
      logger.error('Update agency error', err);
      throw err;
    }
  }

  /**
   * Get agency metrics (KPIs for dashboard)
   * Queries real data from opportunities and status tables
   */
  async getAgencyMetrics(agencyId: string) {
    try {
      // Get all opportunities for the agency
      const allOpportunities = await db.query.opportunities.findMany({
        where: eq(opportunities.agency_id, agencyId),
      });

      // Get all status records for the agency
      const allStatuses = await db.query.clientOpportunityStatus.findMany({
        where: eq(clientOpportunityStatus.agency_id, agencyId),
      });

      // Calculate metrics
      const totalOpportunities = allOpportunities.length;
      const activeOpportunities = allOpportunities.filter(
        (o) => o.status === 'active'
      ).length;

      // Get unique clients that have opportunities assigned
      const clientsEngaged = new Set(
        allStatuses.map((s) => s.client_id)
      ).size;

      // Count responses by status
      const acceptedResponses = allStatuses.filter(
        (s) => s.response_state === 'accepted'
      ).length;

      const interestedResponses = allStatuses.filter(
        (s) => s.response_state === 'interested'
      ).length;

      return {
        totalOpportunities,
        activeOpportunities,
        clientsEngaged,
        acceptedResponses,
        interestedResponses,
      };
    } catch (err) {
      logger.error('Get agency metrics error', err);
      throw err;
    }
  }
}

export const agencyService = new AgencyService();
