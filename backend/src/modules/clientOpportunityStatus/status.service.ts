import { db } from '../../config/db';
import {
  clientOpportunityStatus,
  followUpTasks,
  activityLogs,
  notifications,
} from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger';
import { UpdateClientOpportunityStatusInput } from '../../types';
import { followUpTaskService } from '../followUpTask/task.service';
import { notificationService } from '../notification/notification.service';

// Valid state transitions for client responses
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['interested', 'declined', 'no_response'],
  interested: ['accepted', 'declined'],
  accepted: [],
  declined: [],
  no_response: [],
};

export class ClientOpportunityStatusService {
  /**
   * Check if a state transition is valid
   */
  private isValidTransition(currentState: string, newState: string): boolean {
    if (currentState === newState) return true; // Allow same state
    const validNextStates = VALID_TRANSITIONS[currentState] || [];
    return validNextStates.includes(newState);
  }

  /**
   * Get a client's response status for an opportunity
   */
  async getStatus(agencyId: string, clientId: string, opportunityId: string) {
    try {
      return await db.query.clientOpportunityStatus.findFirst({
        where: and(
          eq(clientOpportunityStatus.agency_id, agencyId),
          eq(clientOpportunityStatus.client_id, clientId),
          eq(clientOpportunityStatus.opportunity_id, opportunityId)
        ),
      });
    } catch (err) {
      logger.error('Get status error', err);
      throw err;
    }
  }

  /**
   * Update client's response to an opportunity
   * Handles state transitions and auto-generates follow-up tasks
   */
  async updateStatus(
    agencyId: string,
    clientId: string,
    opportunityId: string,
    input: UpdateClientOpportunityStatusInput,
    actorUserId?: string
  ) {
    try {
      const status = await this.getStatus(agencyId, clientId, opportunityId);

      if (!status) {
        return null;
      }

      const previousState = status.response_state || 'pending';

      // Validate state transition
      if (!this.isValidTransition(previousState, input.response_state)) {
        throw new Error(
          `Invalid state transition: ${previousState} → ${input.response_state}`
        );
      }

      const updated = await db
        .update(clientOpportunityStatus)
        .set({
          response_state: input.response_state as any,
          response_source: 'client_app',
          responded_at: new Date(),
          decline_reason: input.decline_reason || null,
          notes_for_agency: input.notes_for_agency || null,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(clientOpportunityStatus.agency_id, agencyId),
            eq(clientOpportunityStatus.client_id, clientId),
            eq(clientOpportunityStatus.opportunity_id, opportunityId)
          )
        )
        .returning();

      const newStatus = updated[0];

      if (newStatus) {
        // Log the state change
        await this.logStateChange(
          agencyId,
          (actorUserId || clientId || 'unknown') as string,
          newStatus.id,
          previousState,
          newStatus.response_state as string,
          opportunityId,
          clientId
        );

        // Auto-generate tasks based on new state
        if (input.response_state === 'accepted') {
          await followUpTaskService.createAutoTasks(
            agencyId,
            opportunityId,
            clientId,
            'accepted'
          );
        } else if (input.response_state === 'interested') {
          await followUpTaskService.createAutoTasks(
            agencyId,
            opportunityId,
            clientId,
            'interested'
          );
        }

        // Notify PR team of client response
        await notificationService.notifyPRTeamOfClientResponse(
          agencyId,
          clientId,
          opportunityId,
          input.response_state
        );
      }

      logger.info('Status updated', {
        clientId,
        opportunityId,
        previousState,
        newState: input.response_state,
      });

      return newStatus || null;
    } catch (err) {
      logger.error('Update status error', err);
      throw err;
    }
  }

  /**
   * Log the state change to activity log
   */
  private async logStateChange(
    agencyId: string,
    actorUserId: string,
    entityId: string,
    previousState: string | null,
    newState: string,
    opportunityId: string,
    clientId: string
  ) {
    try {
      await db.insert(activityLogs).values({
        id: `log_${uuid()}`,
        agency_id: agencyId,
        actor_user_id: actorUserId,
        entity_type: 'client_opportunity_status',
        entity_id: entityId,
        action: 'client_response_updated',
        metadata: {
          previous_state: previousState,
          new_state: newState,
          opportunity_id: opportunityId,
          client_id: clientId,
        },
        created_at: new Date(),
      });
    } catch (err) {
      logger.error('Log state change error', err);
    }
  }

  /**
   * List all statuses for an opportunity
   */
  async listStatusesByOpportunity(agencyId: string, opportunityId: string) {
    try {
      return await db.query.clientOpportunityStatus.findMany({
        where: and(
          eq(clientOpportunityStatus.agency_id, agencyId),
          eq(clientOpportunityStatus.opportunity_id, opportunityId)
        ),
      });
    } catch (err) {
      logger.error('List statuses error', err);
      throw err;
    }
  }

  /**
   * Get status summary for an opportunity
   */
  async getOpportunitySummary(agencyId: string, opportunityId: string) {
    try {
      const statuses = await this.listStatusesByOpportunity(agencyId, opportunityId);

      return {
        total: statuses.length,
        pending: statuses.filter((s) => s.response_state === 'pending').length,
        interested: statuses.filter((s) => s.response_state === 'interested').length,
        accepted: statuses.filter((s) => s.response_state === 'accepted').length,
        declined: statuses.filter((s) => s.response_state === 'declined').length,
        no_response: statuses.filter((s) => s.response_state === 'no_response').length,
      };
    } catch (err) {
      logger.error('Get opportunity summary error', err);
      throw err;
    }
  }
}

export const statusService = new ClientOpportunityStatusService();
