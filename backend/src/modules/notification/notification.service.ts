import { db } from '../../config/db';
import { notifications, agencyUsers, clientUsers } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger';

export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(data: {
    agency_id: string;
    channel: 'email' | 'in_app' | 'sms';
    recipient_type: 'client_user' | 'agency_user';
    recipient_id: string;
    subject?: string;
    body_preview?: string;
    related_entity_type?: string;
    related_entity_id?: string;
    metadata?: any;
  }) {
    try {
      const id = `notif_${uuid()}`;

      const notif = await db
        .insert(notifications)
        .values({
          id,
          ...data,
          status: 'pending' as any,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      logger.info('Notification created', { notificationId: id });
      return notif[0];
    } catch (err) {
      logger.error('Create notification error', err);
      throw err;
    }
  }

  /**
   * Notify PR team when a client responds to an opportunity
   */
  async notifyPRTeamOfClientResponse(
    agencyId: string,
    clientId: string,
    opportunityId: string,
    responseState: string
  ) {
    try {
      // TODO Phase 2: Get actual PR team members
      // For MVP, just log
      logger.info('PR team notification queued', {
        clientId,
        opportunityId,
        responseState,
      });

      // Create in-app notification
      await this.createNotification({
        agency_id: agencyId,
        channel: 'in_app',
        recipient_type: 'agency_user',
        recipient_id: 'user_amore', // TODO: get actual team members
        subject: `Client Response: ${responseState}`,
        body_preview: `A client responded to an opportunity.`,
        related_entity_type: 'opportunity',
        related_entity_id: opportunityId,
      });
    } catch (err) {
      logger.error('Notify PR team error', err);
    }
  }

  /**
   * Notify a client of a new opportunity
   */
  async notifyClientOfOpportunity(
    agencyId: string,
    clientUserId: string,
    opportunityId: string,
    opportunityTitle: string
  ) {
    try {
      await this.createNotification({
        agency_id: agencyId,
        channel: 'email',
        recipient_type: 'client_user',
        recipient_id: clientUserId,
        subject: `New Opportunity: ${opportunityTitle}`,
        body_preview: `A new media opportunity has been shared with you.`,
        related_entity_type: 'opportunity',
        related_entity_id: opportunityId,
      });

      logger.info('Client notified of opportunity', {
        clientUserId,
        opportunityId,
      });
    } catch (err) {
      logger.error('Notify client error', err);
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    agencyId: string,
    recipientType: string,
    recipientId: string,
    filters?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ) {
    try {
      return await db.query.notifications.findMany({
        where: and(
          eq(notifications.agency_id, agencyId),
          eq(notifications.recipient_type, recipientType as any),
          eq(notifications.recipient_id, recipientId)
        ),
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      });
    } catch (err) {
      logger.error('Get notifications error', err);
      throw err;
    }
  }

  /**
   * Mark notification as sent
   */
  async markAsSent(agencyId: string, notificationId: string) {
    try {
      return await db
        .update(notifications)
        .set({
          status: 'sent' as any,
          sent_at: new Date(),
          updated_at: new Date(),
        })
        .where(and(eq(notifications.agency_id, agencyId), eq(notifications.id, notificationId)))
        .returning();
    } catch (err) {
      logger.error('Mark as sent error', err);
      throw err;
    }
  }
}

export const notificationService = new NotificationService();
