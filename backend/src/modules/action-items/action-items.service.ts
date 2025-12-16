import { db } from '../../config/db';
import { opportunityChats, restoreRequests, opportunities, clients, clientUsers } from '../../db/schema';
import { eq, and, desc, isNull, or } from 'drizzle-orm';

/**
 * Unified action item types that can appear in the agency queue
 */
export type ActionItemType = 'escalated_chat' | 'restore_request';

/**
 * Unified action item interface combining escalated chats and restore requests
 */
export interface ActionItem {
  id: string;
  type: ActionItemType;
  created_at: Date;
  client_name: string;
  client_id: string;
  client_user_id: string | null;
  client_user_name: string | null;
  opportunity_id: string;
  opportunity_title: string;
  summary: string;
  metadata: Record<string, any>;
}

/**
 * Counts for action items by type
 */
export interface ActionItemCounts {
  total: number;
  escalated_chats: number;
  restore_requests: number;
}

/**
 * Service for managing unified action items queue
 * Combines escalated Q&A chats and restore requests into a single queue
 */
export class ActionItemsService {
  /**
   * Get all action items for an agency, sorted by creation date (newest first)
   * Each escalated conversation appears as one item (not per message)
   */
  async getActionItems(agencyId: string): Promise<ActionItem[]> {
    // Get escalated chats (unique per opportunity + client conversation)
    const escalatedChats = await this.getEscalatedChatItems(agencyId);

    // Get pending restore requests
    const restoreRequestItems = await this.getRestoreRequestItems(agencyId);

    // Combine and sort by created_at descending (newest first)
    const allItems = [...escalatedChats, ...restoreRequestItems];
    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allItems;
  }

  /**
   * Get counts of action items by type
   */
  async getActionItemsCount(agencyId: string): Promise<ActionItemCounts> {
    const escalatedChats = await this.getEscalatedChatItems(agencyId);
    const restoreRequestItems = await this.getRestoreRequestItems(agencyId);

    return {
      total: escalatedChats.length + restoreRequestItems.length,
      escalated_chats: escalatedChats.length,
      restore_requests: restoreRequestItems.length,
    };
  }

  /**
   * Get escalated chat conversations as action items
   * Groups by opportunity + client to get unique conversations
   */
  private async getEscalatedChatItems(agencyId: string): Promise<ActionItem[]> {
    // Query escalated chats with related data
    const escalatedMessages = await db
      .select({
        id: opportunityChats.id,
        opportunityId: opportunityChats.opportunity_id,
        clientId: opportunityChats.client_id,
        clientUserId: opportunityChats.client_user_id,
        message: opportunityChats.message,
        createdAt: opportunityChats.created_at,
        opportunityTitle: opportunities.title,
        clientName: clients.name,
        clientUserName: clientUsers.name,
      })
      .from(opportunityChats)
      .innerJoin(opportunities, eq(opportunityChats.opportunity_id, opportunities.id))
      .innerJoin(clients, eq(opportunityChats.client_id, clients.id))
      .leftJoin(clientUsers, eq(opportunityChats.client_user_id, clientUsers.id))
      .where(
        and(
          eq(opportunityChats.agency_id, agencyId),
          eq(opportunityChats.is_escalated, true)
        )
      )
      .orderBy(desc(opportunityChats.created_at));

    // Group by opportunity + client to get unique conversations
    const conversationMap = new Map<string, ActionItem>();

    for (const msg of escalatedMessages) {
      const key = `${msg.opportunityId}-${msg.clientId}`;

      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          id: `chat_${msg.opportunityId}_${msg.clientId}`,
          type: 'escalated_chat',
          created_at: msg.createdAt,
          client_name: msg.clientName,
          client_id: msg.clientId,
          client_user_id: msg.clientUserId,
          client_user_name: msg.clientUserName,
          opportunity_id: msg.opportunityId,
          opportunity_title: msg.opportunityTitle,
          summary: msg.message.length > 100 ? msg.message.substring(0, 100) + '...' : msg.message,
          metadata: {
            message_count: 1,
            last_message: msg.message,
          },
        });
      } else {
        // Update message count for existing conversation
        const existing = conversationMap.get(key)!;
        existing.metadata.message_count++;
      }
    }

    return Array.from(conversationMap.values());
  }

  /**
   * Get pending restore requests as action items
   */
  private async getRestoreRequestItems(agencyId: string): Promise<ActionItem[]> {
    const pendingRequests = await db
      .select({
        id: restoreRequests.id,
        opportunityId: restoreRequests.opportunity_id,
        clientId: restoreRequests.client_id,
        clientUserId: restoreRequests.client_user_id,
        requestedAt: restoreRequests.requested_at,
        opportunityTitle: opportunities.title,
        opportunitySummary: opportunities.summary,
        clientName: clients.name,
        clientUserName: clientUsers.name,
      })
      .from(restoreRequests)
      .innerJoin(opportunities, eq(restoreRequests.opportunity_id, opportunities.id))
      .innerJoin(clients, eq(restoreRequests.client_id, clients.id))
      .innerJoin(clientUsers, eq(restoreRequests.client_user_id, clientUsers.id))
      .where(
        and(
          eq(restoreRequests.agency_id, agencyId),
          eq(restoreRequests.status, 'pending')
        )
      )
      .orderBy(desc(restoreRequests.requested_at));

    return pendingRequests.map((req) => ({
      id: req.id,
      type: 'restore_request' as ActionItemType,
      created_at: req.requestedAt,
      client_name: req.clientName,
      client_id: req.clientId,
      client_user_id: req.clientUserId,
      client_user_name: req.clientUserName,
      opportunity_id: req.opportunityId,
      opportunity_title: req.opportunityTitle,
      summary: req.opportunitySummary || 'Client requested to restore this declined opportunity',
      metadata: {
        request_type: 'restore',
      },
    }));
  }
}

// Export singleton instance
export const actionItemsService = new ActionItemsService();
