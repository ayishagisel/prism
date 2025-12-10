import { db } from '../../config/db';
import {
  restoreRequests,
  clientOpportunityStatus,
  opportunities,
  clients,
  clientUsers,
  activityLogs,
} from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface CreateRestoreRequestInput {
  opportunity_id: string;
  client_id: string;
  client_user_id: string;
  agency_id: string;
}

export interface ReviewRestoreRequestInput {
  request_id: string;
  reviewed_by_user_id: string;
  agency_id: string;
  status: 'approved' | 'denied';
  review_notes?: string;
}

export class RestoreService {
  /**
   * Create a new restore request
   * Validates that:
   * 1. The opportunity deadline hasn't passed
   * 2. The client_opportunity_status is 'declined'
   * 3. No pending restore request already exists
   */
  async createRestoreRequest(input: CreateRestoreRequestInput) {
    const { opportunity_id, client_id, client_user_id, agency_id } = input;

    // 1. Check if opportunity deadline has passed
    const [opportunity] = await db
      .select()
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, opportunity_id),
          eq(opportunities.agency_id, agency_id)
        )
      )
      .limit(1);

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    if (opportunity.deadline_at && new Date() > opportunity.deadline_at) {
      throw new Error('Cannot request restore: deadline has passed');
    }

    // 2. Check client_opportunity_status is declined
    const [statusRecord] = await db
      .select()
      .from(clientOpportunityStatus)
      .where(
        and(
          eq(clientOpportunityStatus.opportunity_id, opportunity_id),
          eq(clientOpportunityStatus.client_id, client_id),
          eq(clientOpportunityStatus.agency_id, agency_id)
        )
      )
      .limit(1);

    if (!statusRecord) {
      throw new Error('Client opportunity status not found');
    }

    if (statusRecord.response_state !== 'declined') {
      throw new Error('Can only request restore for declined opportunities');
    }

    // 3. Check if there's already a pending restore request
    const [existingRequest] = await db
      .select()
      .from(restoreRequests)
      .where(
        and(
          eq(restoreRequests.opportunity_id, opportunity_id),
          eq(restoreRequests.client_id, client_id),
          eq(restoreRequests.agency_id, agency_id),
          eq(restoreRequests.status, 'pending')
        )
      )
      .limit(1);

    if (existingRequest) {
      throw new Error('A pending restore request already exists for this opportunity');
    }

    // 4. Create the restore request
    const requestId = uuidv4();
    const [newRequest] = await db
      .insert(restoreRequests)
      .values({
        id: requestId,
        agency_id,
        opportunity_id,
        client_id,
        client_user_id,
        status: 'pending',
        requested_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // 5. Log activity
    await db.insert(activityLogs).values({
      id: uuidv4(),
      agency_id,
      actor_user_id: client_user_id,
      entity_type: 'restore_request',
      entity_id: requestId,
      action: 'created',
      metadata: {
        opportunity_id,
        client_id,
        client_user_id,
      },
      created_at: new Date(),
    });

    return newRequest;
  }

  /**
   * Get all pending restore requests for an agency
   * Returns enriched data with opportunity and client info
   */
  async getPendingRestoreRequests(agency_id: string) {
    const requests = await db
      .select({
        request: restoreRequests,
        opportunity: opportunities,
        client: clients,
        clientUser: clientUsers,
      })
      .from(restoreRequests)
      .innerJoin(opportunities, eq(restoreRequests.opportunity_id, opportunities.id))
      .innerJoin(clients, eq(restoreRequests.client_id, clients.id))
      .innerJoin(clientUsers, eq(restoreRequests.client_user_id, clientUsers.id))
      .where(
        and(
          eq(restoreRequests.agency_id, agency_id),
          eq(restoreRequests.status, 'pending')
        )
      )
      .orderBy(desc(restoreRequests.requested_at));

    return requests;
  }

  /**
   * Get all restore requests (any status) for a specific opportunity and client
   */
  async getRestoreRequestsByOpportunityAndClient(
    opportunity_id: string,
    client_id: string,
    agency_id: string
  ) {
    const requests = await db
      .select()
      .from(restoreRequests)
      .where(
        and(
          eq(restoreRequests.opportunity_id, opportunity_id),
          eq(restoreRequests.client_id, client_id),
          eq(restoreRequests.agency_id, agency_id)
        )
      )
      .orderBy(desc(restoreRequests.requested_at));

    return requests;
  }

  /**
   * Approve a restore request
   * Updates client_opportunity_status from declined → pending
   */
  async approveRestoreRequest(input: ReviewRestoreRequestInput) {
    const { request_id, reviewed_by_user_id, agency_id, review_notes } = input;

    // 1. Get the restore request
    const [request] = await db
      .select()
      .from(restoreRequests)
      .where(
        and(
          eq(restoreRequests.id, request_id),
          eq(restoreRequests.agency_id, agency_id)
        )
      )
      .limit(1);

    if (!request) {
      throw new Error('Restore request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Restore request has already been reviewed');
    }

    // 2. Update the restore request
    const [updatedRequest] = await db
      .update(restoreRequests)
      .set({
        status: 'approved',
        reviewed_by_user_id,
        reviewed_at: new Date(),
        review_notes,
        updated_at: new Date(),
      })
      .where(eq(restoreRequests.id, request_id))
      .returning();

    // 3. Update client_opportunity_status: declined → pending
    await db
      .update(clientOpportunityStatus)
      .set({
        response_state: 'pending',
        updated_at: new Date(),
      })
      .where(
        and(
          eq(clientOpportunityStatus.opportunity_id, request.opportunity_id),
          eq(clientOpportunityStatus.client_id, request.client_id),
          eq(clientOpportunityStatus.agency_id, agency_id)
        )
      );

    // 4. Log activity
    await db.insert(activityLogs).values({
      id: uuidv4(),
      agency_id,
      actor_user_id: reviewed_by_user_id,
      entity_type: 'restore_request',
      entity_id: request_id,
      action: 'approved',
      metadata: {
        opportunity_id: request.opportunity_id,
        client_id: request.client_id,
        review_notes,
      },
      created_at: new Date(),
    });

    // TODO: Send notification to client (implement in notification service)
    // await notificationService.sendRestoreApprovalNotification(...)

    return updatedRequest;
  }

  /**
   * Deny a restore request
   */
  async denyRestoreRequest(input: ReviewRestoreRequestInput) {
    const { request_id, reviewed_by_user_id, agency_id, review_notes } = input;

    // 1. Get the restore request
    const [request] = await db
      .select()
      .from(restoreRequests)
      .where(
        and(
          eq(restoreRequests.id, request_id),
          eq(restoreRequests.agency_id, agency_id)
        )
      )
      .limit(1);

    if (!request) {
      throw new Error('Restore request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Restore request has already been reviewed');
    }

    // 2. Update the restore request
    const [updatedRequest] = await db
      .update(restoreRequests)
      .set({
        status: 'denied',
        reviewed_by_user_id,
        reviewed_at: new Date(),
        review_notes,
        updated_at: new Date(),
      })
      .where(eq(restoreRequests.id, request_id))
      .returning();

    // 3. Log activity
    await db.insert(activityLogs).values({
      id: uuidv4(),
      agency_id,
      actor_user_id: reviewed_by_user_id,
      entity_type: 'restore_request',
      entity_id: request_id,
      action: 'denied',
      metadata: {
        opportunity_id: request.opportunity_id,
        client_id: request.client_id,
        review_notes,
      },
      created_at: new Date(),
    });

    // TODO: Send notification to client (implement in notification service)
    // await notificationService.sendRestoreDenialNotification(...)

    return updatedRequest;
  }
}

export const restoreService = new RestoreService();
