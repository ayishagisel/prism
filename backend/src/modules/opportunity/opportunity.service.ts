import { db } from '../../config/db';
import {
  opportunities,
  clientOpportunityStatus,
  clients,
  followUpTasks,
  activityLogs,
} from '../../db/schema';
import { eq, and, desc, gt, lt, inArray } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger';
import { CreateOpportunityInput } from '../../types';

export class OpportunityService {
  async createOpportunity(
    agencyId: string,
    userId: string,
    input: CreateOpportunityInput
  ) {
    try {
      const oppId = `opp_${uuid()}`;

      const opp = await db
        .insert(opportunities)
        .values({
          id: oppId,
          agency_id: agencyId,
          created_by_user_id: userId,
          title: input.title,
          summary: input.summary,
          source: 'manual_form',
          media_type: input.media_type as any,
          outlet_name: input.outlet_name,
          opportunity_type: input.opportunity_type as any,
          category_tags: input.category_tags || [],
          topic_tags: input.topic_tags || [],
          industry_tags: input.industry_tags || [],
          deadline_at: input.deadline_at ? new Date(input.deadline_at) : null,
          visibility: (input.visibility || 'internal_only') as any,
          ingestion_metadata: {
            ingested_via: 'manual_form',
            ingested_at: new Date().toISOString(),
          },
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      // Auto-assign to target clients
      if (input.target_client_ids && input.target_client_ids.length > 0) {
        await this.assignOpportunityToClients(agencyId, oppId, input.target_client_ids);
      }

      logger.info('Opportunity created', { opportunityId: oppId });
      return opp[0];
    } catch (err) {
      logger.error('Create opportunity error', err);
      throw err;
    }
  }

  /**
   * Assign an opportunity to clients (creates ClientOpportunityStatus records)
   */
  async assignOpportunityToClients(
    agencyId: string,
    opportunityId: string,
    clientIds: string[]
  ) {
    try {
      const statuses = clientIds.map((clientId) => ({
        id: `cos_${uuid()}`,
        agency_id: agencyId,
        client_id: clientId,
        opportunity_id: opportunityId,
        response_state: 'pending' as any,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await db.insert(clientOpportunityStatus).values(statuses);

      logger.info('Opportunity assigned to clients', {
        opportunityId,
        clientCount: clientIds.length,
      });
    } catch (err) {
      logger.error('Assign opportunity error', err);
      throw err;
    }
  }

  async getOpportunityById(agencyId: string, opportunityId: string) {
    try {
      return await db.query.opportunities.findFirst({
        where: and(eq(opportunities.agency_id, agencyId), eq(opportunities.id, opportunityId)),
      });
    } catch (err) {
      logger.error('Get opportunity error', err);
      throw err;
    }
  }

  async listOpportunities(
    agencyId: string,
    filters?: {
      status?: string;
      media_type?: string;
      category_tags?: string[];
      deadline_before?: Date;
      deadline_after?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      let query = db.query.opportunities.findMany({
        where: eq(opportunities.agency_id, agencyId),
        orderBy: desc(opportunities.created_at),
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      });

      // TODO: Add filter logic with drizzle-orm's and/or operators
      const result = await query;

      return result;
    } catch (err) {
      logger.error('List opportunities error', err);
      throw err;
    }
  }

  async updateOpportunity(
    agencyId: string,
    opportunityId: string,
    data: Partial<CreateOpportunityInput>
  ) {
    try {
      const updated = await db
        .update(opportunities)
        .set({
          ...(data.title && { title: data.title }),
          ...(data.summary && { summary: data.summary }),
          ...(data.deadline_at && { deadline_at: new Date(data.deadline_at) }),
          ...(data.visibility && { visibility: data.visibility as any }),
          updated_at: new Date(),
        })
        .where(and(eq(opportunities.agency_id, agencyId), eq(opportunities.id, opportunityId)))
        .returning();

      logger.info('Opportunity updated', { opportunityId });
      return updated[0] || null;
    } catch (err) {
      logger.error('Update opportunity error', err);
      throw err;
    }
  }

  async deleteOpportunity(agencyId: string, opportunityId: string) {
    try {
      // TODO: Soft delete pattern
      await db
        .update(opportunities)
        .set({
          status: 'closed' as any,
          updated_at: new Date(),
        })
        .where(and(eq(opportunities.agency_id, agencyId), eq(opportunities.id, opportunityId)));

      logger.info('Opportunity deleted', { opportunityId });
    } catch (err) {
      logger.error('Delete opportunity error', err);
      throw err;
    }
  }

  /**
   * Get opportunities with client response status
   */
  async getOpportunitiesWithStatus(agencyId: string, clientId?: string) {
    try {
      // TODO Phase 2: Improve join logic
      const opps = await db.query.opportunities.findMany({
        where: eq(opportunities.agency_id, agencyId),
      });

      return opps;
    } catch (err) {
      logger.error('Get opportunities with status error', err);
      throw err;
    }
  }
}

export const opportunityService = new OpportunityService();
