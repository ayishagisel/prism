import { websocketService } from '../websocket/websocket.service';
import { presenceService, UserType } from '../websocket/presence.service';
import { notificationPushService } from './push.service';
import { notificationEmailService } from './email.service';
import { logger } from '../../utils/logger';

// Email delay constants
const EMAIL_DELAY_AFTER_PUSH_MS = 2.5 * 60 * 1000; // 2.5 minutes
const EMAIL_DELAY_NO_PUSH_MS = 0; // Immediate

/**
 * Notification types supported by the router
 */
export type NotificationType =
  | 'chat_message'
  | 'chat_escalation'
  | 'restore_request'
  | 'restore_response'
  | 'new_opportunity';

/**
 * Notification payload interface
 */
export interface NotificationPayload {
  recipientId: string;
  recipientType: UserType;
  agencyId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: {
    deepLink: string;
    opportunityId?: string;
    clientId?: string;
    clientName?: string;
    opportunityTitle?: string;
    isEscalated?: boolean;
    status?: 'approved' | 'denied';
    reviewNotes?: string;
    message?: string;
    outletName?: string;
    mediaType?: string;
    deadline?: string;
    [key: string]: any;
  };
}

/**
 * Result of notification routing
 */
export interface NotificationRouteResult {
  websocket: boolean;
  push: boolean;
  email: 'sent' | 'queued' | 'skipped' | 'failed';
  emailDelayMs: number | null;
}

// Store for scheduled email timers (in production, use a proper job queue)
const scheduledEmails = new Map<string, NodeJS.Timeout>();

/**
 * Service for intelligent notification routing
 * Routes notifications through the appropriate channels based on user presence
 */
export class NotificationRouterService {
  /**
   * Route a notification to the appropriate channels
   * Priority: WebSocket (if online) → Push (if offline with subscription) → Email (with delay if push sent)
   */
  async routeNotification(payload: NotificationPayload): Promise<NotificationRouteResult> {
    const { recipientId, recipientType, agencyId, type, title, body, data } = payload;

    const result: NotificationRouteResult = {
      websocket: false,
      push: false,
      email: 'skipped',
      emailDelayMs: null,
    };

    logger.info('Routing notification', {
      recipientId,
      recipientType,
      type,
      title,
    });

    // Step 1: Check if user is online and try WebSocket
    const isOnline = await presenceService.isUserOnline(recipientId, recipientType);

    if (isOnline) {
      // User is online - send via WebSocket
      const websocketSent = await websocketService.emitToUser(
        recipientId,
        recipientType,
        'notification:new',
        {
          type,
          title,
          body,
          data,
          timestamp: new Date().toISOString(),
        }
      );

      result.websocket = websocketSent;

      if (websocketSent) {
        logger.info('Notification sent via WebSocket', { recipientId, type });
        // User is online - no push or email needed
        return result;
      }
    }

    // Step 2: User is offline or WebSocket failed - try Push notification
    const userTypeForPush = recipientType === 'agency_user' ? 'agency_user' : 'client_user';
    const pushSent = await notificationPushService.sendPushNotification(
      recipientId,
      userTypeForPush,
      {
        title,
        body,
        tag: `${type}-${data.opportunityId || recipientId}`,
        data: {
          type,
          url: data.deepLink,
          ...data,
        },
      }
    );

    result.push = pushSent;

    if (pushSent) {
      logger.info('Notification sent via Push', { recipientId, type });
    }

    // Step 3: Queue email with appropriate delay
    const emailDelayMs = pushSent ? EMAIL_DELAY_AFTER_PUSH_MS : EMAIL_DELAY_NO_PUSH_MS;

    try {
      const emailScheduled = await this.scheduleEmail(payload, emailDelayMs);
      result.email = emailScheduled ? (emailDelayMs > 0 ? 'queued' : 'sent') : 'failed';
      result.emailDelayMs = emailDelayMs > 0 ? emailDelayMs : null;

      logger.info('Email notification scheduled', {
        recipientId,
        type,
        delayMs: emailDelayMs,
        immediate: emailDelayMs === 0,
      });
    } catch (err) {
      logger.error('Failed to schedule email notification', err);
      result.email = 'failed';
    }

    return result;
  }

  /**
   * Schedule an email notification with optional delay
   * If delay is 0, sends immediately
   */
  private async scheduleEmail(payload: NotificationPayload, delayMs: number): Promise<boolean> {
    const { recipientId, recipientType, type, data } = payload;

    if (delayMs === 0) {
      // Send immediately
      return this.sendEmailByType(payload);
    }

    // Schedule email
    const emailKey = `${recipientId}-${type}-${data.opportunityId || Date.now()}`;

    // Clear any existing scheduled email for this notification
    if (scheduledEmails.has(emailKey)) {
      clearTimeout(scheduledEmails.get(emailKey)!);
    }

    // Schedule new email
    const timer = setTimeout(async () => {
      // Check if user is now online before sending
      const isNowOnline = await presenceService.isUserOnline(recipientId, recipientType);

      if (!isNowOnline) {
        await this.sendEmailByType(payload);
      } else {
        logger.info('Skipping scheduled email - user is now online', {
          recipientId,
          type,
        });
      }

      scheduledEmails.delete(emailKey);
    }, delayMs);

    scheduledEmails.set(emailKey, timer);
    return true;
  }

  /**
   * Send email based on notification type
   */
  private async sendEmailByType(payload: NotificationPayload): Promise<boolean> {
    const { recipientId, recipientType, type, data } = payload;
    const userTypeForEmail = recipientType === 'agency_user' ? 'agency_user' : 'client_user';

    switch (type) {
      case 'chat_message':
      case 'chat_escalation':
        return notificationEmailService.sendAOPRNotification(recipientId, userTypeForEmail, {
          clientName: data.clientName || 'User',
          opportunityTitle: data.opportunityTitle || 'Unknown Opportunity',
          message: data.message || '',
          opportunityId: data.opportunityId || '',
          isEscalated: data.isEscalated || type === 'chat_escalation',
        });

      case 'restore_response':
        return notificationEmailService.sendRestoreRequestResponse(recipientId, {
          clientName: data.clientName || 'User',
          opportunityTitle: data.opportunityTitle || 'Unknown Opportunity',
          status: data.status || 'denied',
          reviewNotes: data.reviewNotes,
          opportunityId: data.opportunityId || '',
        });

      case 'new_opportunity':
        return notificationEmailService.sendClientOpportunityAlert(recipientId, {
          clientName: data.clientName || 'User',
          opportunityTitle: data.opportunityTitle || 'Unknown Opportunity',
          outletName: data.outletName || '',
          mediaType: data.mediaType || '',
          deadline: data.deadline || '',
          opportunityId: data.opportunityId || '',
          opportunitySummary: data.opportunitySummary,
        });

      case 'restore_request':
        // Restore requests go to agency - currently no specific email template
        logger.info('Restore request notification - email not implemented for this type');
        return true;

      default:
        logger.warn('Unknown notification type for email', { type });
        return false;
    }
  }

  /**
   * Generate deep link URL based on notification type
   */
  generateDeepLink(
    type: NotificationType,
    userType: UserType,
    data: { opportunityId?: string; conversationId?: string }
  ): string {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const portal = userType === 'agency_user' ? 'agency' : 'client';

    switch (type) {
      case 'chat_message':
        return `${baseUrl}/${portal}/opportunities/${data.opportunityId}?chat=open`;

      case 'chat_escalation':
        return `${baseUrl}/agency/action-items?highlight=${data.conversationId}`;

      case 'restore_request':
        return `${baseUrl}/agency/action-items?type=restore_request`;

      case 'restore_response':
        return `${baseUrl}/client/opportunities/${data.opportunityId}`;

      case 'new_opportunity':
        return `${baseUrl}/client/opportunities/${data.opportunityId}`;

      default:
        return `${baseUrl}/${portal}/dashboard`;
    }
  }

  /**
   * Cancel a scheduled email notification
   */
  cancelScheduledEmail(recipientId: string, type: NotificationType, opportunityId?: string): boolean {
    const emailKey = `${recipientId}-${type}-${opportunityId || ''}`;

    // Try exact match first
    if (scheduledEmails.has(emailKey)) {
      clearTimeout(scheduledEmails.get(emailKey)!);
      scheduledEmails.delete(emailKey);
      logger.info('Cancelled scheduled email', { emailKey });
      return true;
    }

    // Try pattern match (for cases where opportunityId is part of the key)
    for (const [key, timer] of scheduledEmails.entries()) {
      if (key.startsWith(`${recipientId}-${type}`)) {
        clearTimeout(timer);
        scheduledEmails.delete(key);
        logger.info('Cancelled scheduled email by pattern', { key });
        return true;
      }
    }

    return false;
  }

  /**
   * Get count of pending scheduled emails
   */
  getPendingEmailCount(): number {
    return scheduledEmails.size;
  }
}

// Export singleton instance
export const notificationRouterService = new NotificationRouterService();
