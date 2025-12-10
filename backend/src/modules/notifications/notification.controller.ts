import { Request, Response } from 'express';
import { notificationPushService } from './push.service';
import { notificationEmailService } from './email.service';
import { db } from '../../config/db';
import { notificationPreferences } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export class NotificationController {
  /**
   * POST /api/notifications/subscribe
   * Subscribe to push notifications
   */
  async subscribe(req: Request, res: Response) {
    try {
      const { subscription } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({
          success: false,
          error: 'Invalid subscription object',
        });
      }

      const success = await notificationPushService.subscribe(
        user.id,
        user.userType,
        user.agencyId,
        subscription
      );

      if (success) {
        return res.json({
          success: true,
          message: 'Successfully subscribed to push notifications',
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to subscribe to push notifications',
        });
      }
    } catch (err) {
      logger.error('Subscribe error', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/notifications/unsubscribe
   * Unsubscribe from push notifications
   */
  async unsubscribe(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const success = await notificationPushService.unsubscribe(user.id, user.userType);

      if (success) {
        return res.json({
          success: true,
          message: 'Successfully unsubscribed from push notifications',
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to unsubscribe from push notifications',
        });
      }
    } catch (err) {
      logger.error('Unsubscribe error', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/notifications/send
   * Send a test notification (for testing purposes)
   */
  async send(req: Request, res: Response) {
    try {
      const { type, title, body, data } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (!type || !title || !body) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: type, title, body',
        });
      }

      let pushSuccess = false;
      let emailSuccess = false;

      // Send push notification
      if (type === 'push' || type === 'both') {
        pushSuccess = await notificationPushService.sendPushNotification(
          user.id,
          user.userType,
          {
            title,
            body,
            data: data || {},
          }
        );
      }

      // Send email notification
      if (type === 'email' || type === 'both') {
        // For testing, send a simple notification
        // In production, you'd use the specific email methods
        emailSuccess = true; // Placeholder
        logger.info('Email notification would be sent', { title, body });
      }

      return res.json({
        success: true,
        message: 'Notification sent',
        results: {
          push: type === 'push' || type === 'both' ? pushSuccess : null,
          email: type === 'email' || type === 'both' ? emailSuccess : null,
        },
      });
    } catch (err) {
      logger.error('Send notification error', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/notifications/preferences/:userId
   * Get notification preferences for a user
   */
  async getPreferences(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Check if user has permission to view these preferences
      if (user.id !== userId && user.userType !== 'agency_user') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
      }

      // Get preferences from database
      const prefs = await db.query.notificationPreferences.findFirst({
        where: eq(notificationPreferences.user_id, userId),
      });

      if (!prefs) {
        // Return default preferences if none exist
        return res.json({
          success: true,
          data: {
            userId,
            email_enabled: true,
            push_enabled: false,
            sms_enabled: false,
            has_push_subscription: false,
          },
        });
      }

      return res.json({
        success: true,
        data: {
          userId: prefs.user_id,
          userType: prefs.user_type,
          email_enabled: prefs.email_enabled,
          push_enabled: prefs.push_enabled,
          sms_enabled: prefs.sms_enabled,
          phone_number: prefs.phone_number,
          has_push_subscription: !!prefs.push_subscription,
        },
      });
    } catch (err) {
      logger.error('Get preferences error', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/notifications/preferences/:userId
   * Update notification preferences for a user
   */
  async updatePreferences(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { email_enabled, push_enabled, sms_enabled, phone_number } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Check if user has permission to update these preferences
      if (user.id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
      }

      // Check if preferences exist
      const existingPrefs = await db.query.notificationPreferences.findFirst({
        where: and(
          eq(notificationPreferences.user_id, userId),
          eq(notificationPreferences.user_type, user.userType)
        ),
      });

      const updateData: any = {
        updated_at: new Date(),
      };

      if (email_enabled !== undefined) updateData.email_enabled = email_enabled;
      if (push_enabled !== undefined) updateData.push_enabled = push_enabled;
      if (sms_enabled !== undefined) updateData.sms_enabled = sms_enabled;
      if (phone_number !== undefined) updateData.phone_number = phone_number;

      if (existingPrefs) {
        // Update existing preferences
        await db
          .update(notificationPreferences)
          .set(updateData)
          .where(
            and(
              eq(notificationPreferences.user_id, userId),
              eq(notificationPreferences.user_type, user.userType)
            )
          );
      } else {
        // Create new preferences
        await db.insert(notificationPreferences).values({
          id: `notif_pref_${userId}`,
          user_id: userId,
          user_type: user.userType,
          agency_id: user.agencyId,
          email_enabled: email_enabled ?? true,
          push_enabled: push_enabled ?? false,
          sms_enabled: sms_enabled ?? false,
          phone_number: phone_number || null,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      return res.json({
        success: true,
        message: 'Notification preferences updated successfully',
      });
    } catch (err) {
      logger.error('Update preferences error', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/notifications/vapid-public-key
   * Get VAPID public key for client-side push subscription
   */
  async getVapidPublicKey(req: Request, res: Response) {
    try {
      const publicKey = notificationPushService.getVapidPublicKey();

      if (!publicKey) {
        return res.status(503).json({
          success: false,
          error: 'Push notifications not configured',
        });
      }

      return res.json({
        success: true,
        data: {
          publicKey,
        },
      });
    } catch (err) {
      logger.error('Get VAPID public key error', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export const notificationController = new NotificationController();
