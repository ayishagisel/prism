import { db } from '../../config/db';
import { clients, clientOpportunityStatus, opportunities } from '../../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger';

export class ClientService {
  async createClient(
    agencyId: string,
    data: {
      name: string;
      industry?: string;
      primary_contact_name?: string;
      primary_contact_email?: string;
      tags?: string[];
      media_readiness_flags?: any;
      metadata?: any;
    }
  ) {
    try {
      const id = `client_${uuid()}`;

      const client = await db
        .insert(clients)
        .values({
          id,
          agency_id: agencyId,
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      logger.info('Client created', { clientId: id });
      return client[0];
    } catch (err) {
      logger.error('Create client error', err);
      throw err;
    }
  }

  async getClientById(agencyId: string, clientId: string) {
    try {
      return await db.query.clients.findFirst({
        where: and(eq(clients.agency_id, agencyId), eq(clients.id, clientId)),
      });
    } catch (err) {
      logger.error('Get client error', err);
      throw err;
    }
  }

  async listClients(agencyId: string, filters?: { limit?: number; offset?: number }) {
    try {
      return await db.query.clients.findMany({
        where: eq(clients.agency_id, agencyId),
        orderBy: desc(clients.created_at),
        limit: filters?.limit || 100,
        offset: filters?.offset || 0,
      });
    } catch (err) {
      logger.error('List clients error', err);
      throw err;
    }
  }

  async updateClient(
    agencyId: string,
    clientId: string,
    data: Partial<{
      name: string;
      industry: string;
      primary_contact_name: string;
      primary_contact_email: string;
      tags: string[];
      media_readiness_flags: any;
      metadata: any;
    }>
  ) {
    try {
      const updated = await db
        .update(clients)
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where(and(eq(clients.agency_id, agencyId), eq(clients.id, clientId)))
        .returning();

      logger.info('Client updated', { clientId });
      return updated[0] || null;
    } catch (err) {
      logger.error('Update client error', err);
      throw err;
    }
  }

  async deleteClient(agencyId: string, clientId: string) {
    try {
      // Delete client opportunity status records first
      await db
        .delete(clientOpportunityStatus)
        .where(
          and(
            eq(clientOpportunityStatus.agency_id, agencyId),
            eq(clientOpportunityStatus.client_id, clientId)
          )
        );

      // Delete the client
      await db
        .delete(clients)
        .where(and(eq(clients.agency_id, agencyId), eq(clients.id, clientId)));

      logger.info('Client deleted', { clientId });
      return { success: true };
    } catch (err) {
      logger.error('Delete client error', err);
      throw err;
    }
  }

  async getClientWithOpportunities(agencyId: string, clientId: string) {
    try {
      const client = await this.getClientById(agencyId, clientId);
      if (!client) return null;

      const statuses = await db.query.clientOpportunityStatus.findMany({
        where: and(
          eq(clientOpportunityStatus.agency_id, agencyId),
          eq(clientOpportunityStatus.client_id, clientId)
        ),
      });

      return { ...client, statuses };
    } catch (err) {
      logger.error('Get client with opportunities error', err);
      throw err;
    }
  }

  async getClientOpportunitiesForClient(agencyId: string, clientId: string) {
    try {
      const statusRecords = await db.query.clientOpportunityStatus.findMany({
        where: and(
          eq(clientOpportunityStatus.agency_id, agencyId),
          eq(clientOpportunityStatus.client_id, clientId)
        ),
        orderBy: desc(clientOpportunityStatus.created_at),
      });

      // Fetch full opportunity data for each status record
      const oppIds = statusRecords.map((s) => s.opportunity_id);
      if (oppIds.length === 0) return [];

      const opps = await db.query.opportunities.findMany({
        where: inArray(opportunities.id, oppIds),
      });

      // Create a map of opportunity data by ID for quick lookup
      const oppMap = new Map(opps.map((o) => [o.id, o]));

      // Combine status records with opportunity data - flatten for frontend
      return statusRecords.map((status) => {
        const opp = oppMap.get(status.opportunity_id);
        return {
          // Spread opportunity data first (title, summary, deadline_at, etc.)
          ...opp,
          // Then override with status-specific fields
          id: opp?.id || status.opportunity_id, // Use opportunity ID as the main ID
          response_state: status.response_state,
          notes_for_agency: status.notes_for_agency,
          responded_at: status.responded_at,
          client_id: status.client_id,
          status_id: status.id, // Keep the status record ID as status_id
        };
      });
    } catch (err) {
      logger.error('Get client opportunities error', err);
      throw err;
    }
  }
}

export const clientService = new ClientService();
