import { Request, Response } from 'express';
import { db } from '../../db';
import {
  clientOpportunityStatus,
  opportunityChats,
  opportunities,
  clients,
  clientUsers,
  restoreRequests
} from '../../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { logger } from '../../utils/logger';

/**
 * Dashboard Controller
 * Provides aggregated data for the AOPR dashboard:
 * - Client response summary (breakdown by status)
 * - Escalated Q&A chats needing AOPR response
 * - Contact messages from accepted opportunities
 * - Restore requests (queue from Instance 6)
 */

class DashboardController {
  /**
   * GET /api/dashboard/summary
   * Returns aggregated counts for client responses and activities
   */
  async getSummary(req: Request, res: Response) {
    try {
      const agencyId = req.user?.agencyId;

      if (!agencyId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - agency_id required',
        });
      }

      // Get response breakdown counts
      const responseBreakdown = await db
        .select({
          response_state: clientOpportunityStatus.response_state,
          count: sql<number>`count(*)::int`,
        })
        .from(clientOpportunityStatus)
        .where(eq(clientOpportunityStatus.agency_id, agencyId))
        .groupBy(clientOpportunityStatus.response_state);

      // Format response breakdown into object
      const responseSummary = {
        pending: 0,
        interested: 0,
        accepted: 0,
        declined: 0,
        no_response: 0,
        total: 0,
      };

      responseBreakdown.forEach((row) => {
        const state = row.response_state || 'pending';
        responseSummary[state as keyof typeof responseSummary] = row.count;
        responseSummary.total += row.count;
      });

      // Calculate response rate (non-pending responses / total)
      const responded = responseSummary.total - responseSummary.pending - responseSummary.no_response;
      const responseRate = responseSummary.total > 0
        ? Math.round((responded / responseSummary.total) * 100)
        : 0;

      // Get escalated chats count (Q&A needing AOPR response)
      const escalatedChatsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(opportunityChats)
        .where(
          and(
            eq(opportunityChats.agency_id, agencyId),
            eq(opportunityChats.is_escalated, true)
          )
        );

      const escalatedChatsCount = escalatedChatsResult[0]?.count || 0;

      // Get restore requests count (pending only)
      const restoreRequestsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(restoreRequests)
        .where(
          and(
            eq(restoreRequests.agency_id, agencyId),
            eq(restoreRequests.status, 'pending')
          )
        );

      const restoreRequestsCount = restoreRequestsResult[0]?.count || 0;

      // Get contact messages count (from accepted opportunities)
      // Note: This counts opportunities with accepted status that have chat messages
      const contactMessagesResult = await db
        .select({
          opportunity_id: opportunityChats.opportunity_id,
        })
        .from(opportunityChats)
        .innerJoin(
          clientOpportunityStatus,
          and(
            eq(opportunityChats.opportunity_id, clientOpportunityStatus.opportunity_id),
            eq(opportunityChats.client_id, clientOpportunityStatus.client_id)
          )
        )
        .where(
          and(
            eq(opportunityChats.agency_id, agencyId),
            eq(clientOpportunityStatus.response_state, 'accepted')
          )
        )
        .groupBy(opportunityChats.opportunity_id);

      const contactMessagesCount = contactMessagesResult.length;

      return res.json({
        success: true,
        data: {
          response_summary: responseSummary,
          response_rate: responseRate,
          escalated_chats_count: escalatedChatsCount,
          restore_requests_count: restoreRequestsCount,
          contact_messages_count: contactMessagesCount,
        },
      });
    } catch (error) {
      logger.error('Error getting dashboard summary:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get dashboard summary',
      });
    }
  }

  /**
   * GET /api/dashboard/escalated-chats
   * Returns chats that have been escalated and need AOPR response
   * Sorted by urgency (oldest first)
   */
  async getEscalatedChats(req: Request, res: Response) {
    try {
      const agencyId = req.user?.agencyId;

      if (!agencyId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - agency_id required',
        });
      }

      // Get escalated chats with client and opportunity info
      const escalatedChats = await db
        .select({
          chat_id: opportunityChats.id,
          opportunity_id: opportunityChats.opportunity_id,
          opportunity_title: opportunities.title,
          client_id: opportunityChats.client_id,
          client_name: clients.name,
          message: opportunityChats.message,
          sender_type: opportunityChats.sender_type,
          created_at: opportunityChats.created_at,
          escalated_to_user_id: opportunityChats.escalated_to_user_id,
        })
        .from(opportunityChats)
        .innerJoin(opportunities, eq(opportunityChats.opportunity_id, opportunities.id))
        .innerJoin(clients, eq(opportunityChats.client_id, clients.id))
        .where(
          and(
            eq(opportunityChats.agency_id, agencyId),
            eq(opportunityChats.is_escalated, true)
          )
        )
        .orderBy(opportunityChats.created_at); // Oldest first = most urgent

      // Group by opportunity to get the latest escalated message per conversation
      const chatsByOpportunity = new Map();

      escalatedChats.forEach((chat) => {
        const key = `${chat.opportunity_id}-${chat.client_id}`;
        if (!chatsByOpportunity.has(key)) {
          chatsByOpportunity.set(key, chat);
        }
      });

      const uniqueChats = Array.from(chatsByOpportunity.values());

      return res.json({
        success: true,
        data: uniqueChats,
      });
    } catch (error) {
      logger.error('Error getting escalated chats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get escalated chats',
      });
    }
  }

  /**
   * GET /api/dashboard/contact-messages
   * Returns contact messages from accepted opportunities
   * These are ongoing conversations after opportunity acceptance
   */
  async getContactMessages(req: Request, res: Response) {
    try {
      const agencyId = req.user?.agencyId;

      if (!agencyId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - agency_id required',
        });
      }

      // Get opportunities with accepted status and their latest messages
      const acceptedOpportunities = await db
        .select({
          opportunity_id: clientOpportunityStatus.opportunity_id,
          client_id: clientOpportunityStatus.client_id,
        })
        .from(clientOpportunityStatus)
        .where(
          and(
            eq(clientOpportunityStatus.agency_id, agencyId),
            eq(clientOpportunityStatus.response_state, 'accepted')
          )
        );

      // For each accepted opportunity, get the latest message
      const contactMessages = [];

      for (const opp of acceptedOpportunities) {
        const latestMessage = await db
          .select({
            chat_id: opportunityChats.id,
            opportunity_id: opportunityChats.opportunity_id,
            opportunity_title: opportunities.title,
            client_id: opportunityChats.client_id,
            client_name: clients.name,
            message: opportunityChats.message,
            sender_type: opportunityChats.sender_type,
            message_type: opportunityChats.message_type,
            created_at: opportunityChats.created_at,
          })
          .from(opportunityChats)
          .innerJoin(opportunities, eq(opportunityChats.opportunity_id, opportunities.id))
          .innerJoin(clients, eq(opportunityChats.client_id, clients.id))
          .where(
            and(
              eq(opportunityChats.agency_id, agencyId),
              eq(opportunityChats.opportunity_id, opp.opportunity_id),
              eq(opportunityChats.client_id, opp.client_id)
            )
          )
          .orderBy(desc(opportunityChats.created_at))
          .limit(1);

        if (latestMessage.length > 0) {
          contactMessages.push(latestMessage[0]);
        }
      }

      // Sort by most recent first
      contactMessages.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return res.json({
        success: true,
        data: contactMessages,
      });
    } catch (error) {
      logger.error('Error getting contact messages:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get contact messages',
      });
    }
  }
}

export const dashboardController = new DashboardController();
