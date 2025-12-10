import webpush from 'web-push';
import { db } from '../../config/db';
import { notificationPreferences } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../utils/logger';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

export class NotificationPushService {
  private vapidPublicKey: string;
  private vapidPrivateKey: string;
  private isConfigured: boolean = false;

  constructor() {
    // VAPID keys should be set in environment variables
    // Generate keys with: npx web-push generate-vapid-keys
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

    if (this.vapidPublicKey && this.vapidPrivateKey) {
      webpush.setVapidDetails(
        'mailto:noreply@prism.amore.dev',
        this.vapidPublicKey,
        this.vapidPrivateKey
      );
      this.isConfigured = true;
      logger.info('Push notification service initialized with VAPID keys');
    } else {
      logger.warn('VAPID keys not configured - push notifications will not be sent');
    }
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  getVapidPublicKey(): string {
    return this.vapidPublicKey;
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribe(
    userId: string,
    userType: 'agency_user' | 'client_user',
    agencyId: string,
    subscription: PushSubscription
  ): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        logger.warn('Push notifications not configured');
        return false;
      }

      // Check if preference record exists
      const existingPrefs = await db.query.notificationPreferences.findFirst({
        where: and(
          eq(notificationPreferences.user_id, userId),
          eq(notificationPreferences.user_type, userType)
        ),
      });

      if (existingPrefs) {
        // Update existing preferences
        await db
          .update(notificationPreferences)
          .set({
            push_subscription: subscription as any,
            push_enabled: true,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(notificationPreferences.user_id, userId),
              eq(notificationPreferences.user_type, userType)
            )
          );
      } else {
        // Create new preferences record
        await db.insert(notificationPreferences).values({
          id: `notif_pref_${userId}`,
          user_id: userId,
          user_type: userType,
          agency_id: agencyId,
          push_subscription: subscription as any,
          push_enabled: true,
          email_enabled: true,
          sms_enabled: false,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      logger.info('Push subscription saved', { userId, userType });
      return true;
    } catch (err) {
      logger.error('Error subscribing to push notifications', err);
      return false;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribe(userId: string, userType: 'agency_user' | 'client_user'): Promise<boolean> {
    try {
      await db
        .update(notificationPreferences)
        .set({
          push_subscription: null,
          push_enabled: false,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(notificationPreferences.user_id, userId),
            eq(notificationPreferences.user_type, userType)
          )
        );

      logger.info('Push subscription removed', { userId, userType });
      return true;
    } catch (err) {
      logger.error('Error unsubscribing from push notifications', err);
      return false;
    }
  }

  /**
   * Check if user has push notifications enabled and has a subscription
   */
  private async getPushSubscription(
    userId: string,
    userType: 'agency_user' | 'client_user'
  ): Promise<PushSubscription | null> {
    try {
      const prefs = await db.query.notificationPreferences.findFirst({
        where: and(
          eq(notificationPreferences.user_id, userId),
          eq(notificationPreferences.user_type, userType)
        ),
      });

      if (!prefs || !prefs.push_enabled || !prefs.push_subscription) {
        return null;
      }

      return prefs.push_subscription as PushSubscription;
    } catch (err) {
      logger.error('Error getting push subscription', err);
      return null;
    }
  }

  /**
   * Send push notification to a user
   */
  async sendPushNotification(
    userId: string,
    userType: 'agency_user' | 'client_user',
    payload: PushNotificationPayload
  ): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        logger.info('Push notifications not configured - would send', {
          userId,
          title: payload.title,
        });
        return false;
      }

      // Get user's push subscription
      const subscription = await this.getPushSubscription(userId, userType);
      if (!subscription) {
        logger.info('No push subscription found for user', { userId });
        return false;
      }

      // Send push notification
      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        tag: payload.tag,
        data: payload.data || {},
      });

      await webpush.sendNotification(subscription, notificationPayload);

      logger.info('Push notification sent', {
        userId,
        userType,
        title: payload.title,
      });

      return true;
    } catch (err: any) {
      logger.error('Error sending push notification', {
        userId,
        error: err,
        statusCode: err.statusCode,
      });

      // If subscription is invalid or expired, remove it
      if (err.statusCode === 404 || err.statusCode === 410) {
        logger.info('Push subscription expired, removing', { userId });
        await this.unsubscribe(userId, userType);
      }

      return false;
    }
  }

  /**
   * Send new opportunity push notification
   */
  async sendNewOpportunityNotification(
    userId: string,
    data: {
      opportunityTitle: string;
      outletName: string;
      opportunityId: string;
    }
  ): Promise<boolean> {
    return this.sendPushNotification(userId, 'client_user', {
      title: '📰 New Opportunity',
      body: `${data.opportunityTitle} from ${data.outletName}`,
      tag: `opportunity-${data.opportunityId}`,
      data: {
        type: 'new_opportunity',
        opportunityId: data.opportunityId,
        url: `/client/opportunities/${data.opportunityId}`,
      },
    });
  }

  /**
   * Send AOPR response push notification
   */
  async sendAOPRResponseNotification(
    userId: string,
    userType: 'agency_user' | 'client_user',
    data: {
      opportunityTitle: string;
      message: string;
      opportunityId: string;
      isEscalated: boolean;
    }
  ): Promise<boolean> {
    return this.sendPushNotification(userId, userType, {
      title: `💬 AOPR Message${data.isEscalated ? ' [ESCALATED]' : ''}`,
      body: `${data.opportunityTitle}: ${data.message.substring(0, 100)}${data.message.length > 100 ? '...' : ''}`,
      tag: `aopr-${data.opportunityId}`,
      data: {
        type: 'aopr_message',
        opportunityId: data.opportunityId,
        isEscalated: data.isEscalated,
        url: `/${userType === 'agency_user' ? 'agency' : 'client'}/opportunities/${data.opportunityId}`,
      },
    });
  }

  /**
   * Send restore approval push notification
   */
  async sendRestoreApprovalNotification(
    userId: string,
    data: {
      opportunityTitle: string;
      status: 'approved' | 'denied';
      opportunityId: string;
    }
  ): Promise<boolean> {
    const statusEmoji = data.status === 'approved' ? '✅' : '❌';
    const statusText = data.status === 'approved' ? 'Approved' : 'Denied';

    return this.sendPushNotification(userId, 'client_user', {
      title: `${statusEmoji} Restore Request ${statusText}`,
      body: `Your restore request for "${data.opportunityTitle}" has been ${statusText.toLowerCase()}`,
      tag: `restore-${data.opportunityId}`,
      data: {
        type: 'restore_response',
        opportunityId: data.opportunityId,
        status: data.status,
        url: data.status === 'approved' ? `/client/opportunities/${data.opportunityId}` : '/client/opportunities',
      },
    });
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(
    users: Array<{ userId: string; userType: 'agency_user' | 'client_user' }>,
    payload: PushNotificationPayload
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const success = await this.sendPushNotification(user.userId, user.userType, payload);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    logger.info('Bulk push notifications sent', { sent, failed, total: users.length });
    return { sent, failed };
  }
}

export const notificationPushService = new NotificationPushService();
