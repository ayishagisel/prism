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
   */
  async getAgencyMetrics(agencyId: string) {
    try {
      const { opportunities, clientOpportunityStatus } = db._.schema;

      // TODO Phase 2: Add real metric aggregation
      // For now, return sample structure
      return {
        totalOpportunities: 0,
        activeOpportunities: 0,
        clientsEngaged: 0,
        acceptedResponses: 0,
        interestedResponses: 0,
      };
    } catch (err) {
      logger.error('Get agency metrics error', err);
      throw err;
    }
  }
}

export const agencyService = new AgencyService();
