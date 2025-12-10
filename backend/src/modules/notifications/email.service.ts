import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { db } from '../../config/db';
import { notificationPreferences, agencyUsers, clientUsers } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface EmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

interface ClientOpportunityAlertData {
  clientName: string;
  opportunityTitle: string;
  outletName: string;
  mediaType: string;
  deadline: string;
  opportunityId: string;
  opportunitySummary?: string;
}

interface RestoreRequestResponseData {
  clientName: string;
  opportunityTitle: string;
  status: 'approved' | 'denied';
  reviewNotes?: string;
  opportunityId: string;
}

interface AOPRNotificationData {
  clientName: string;
  opportunityTitle: string;
  message: string;
  opportunityId: string;
  isEscalated: boolean;
}

export class NotificationEmailService {
  private sesClient: SESClient | null = null;

  constructor() {
    // Initialize SES client only if AWS credentials are provided
    if (config.email.aws.accessKeyId && config.email.aws.secretAccessKey) {
      this.sesClient = new SESClient({
        region: config.email.aws.region,
        credentials: {
          accessKeyId: config.email.aws.accessKeyId,
          secretAccessKey: config.email.aws.secretAccessKey,
        },
      });
      logger.info('Notification Email service initialized with AWS SES');
    } else {
      logger.warn('AWS credentials not configured - notification emails will not be sent');
    }
  }

  /**
   * Send an email via AWS SES
   */
  private async sendEmail(payload: EmailPayload): Promise<{ messageId?: string; success: boolean }> {
    try {
      // If SES is not configured, log and return success
      if (!this.sesClient) {
        logger.info('Email service disabled - would send email', {
          to: payload.to,
          subject: payload.subject,
        });
        return { success: true };
      }

      const command = new SendEmailCommand({
        Source: config.email.senderEmail,
        Destination: {
          ToAddresses: [payload.to],
        },
        Message: {
          Subject: {
            Data: payload.subject,
          },
          Body: {
            Html: {
              Data: payload.htmlBody,
            },
            ...(payload.textBody && {
              Text: {
                Data: payload.textBody,
              },
            }),
          },
        },
      });

      const response = await this.sesClient.send(command);

      logger.info('Notification email sent successfully', {
        to: payload.to,
        messageId: response.MessageId,
      });

      return {
        messageId: response.MessageId,
        success: true,
      };
    } catch (err) {
      logger.error('Notification email send error', err);
      return { success: false };
    }
  }

  /**
   * Check if user has email notifications enabled
   */
  private async isEmailEnabled(userId: string, userType: 'agency_user' | 'client_user'): Promise<boolean> {
    try {
      const prefs = await db.query.notificationPreferences.findFirst({
        where: and(
          eq(notificationPreferences.user_id, userId),
          eq(notificationPreferences.user_type, userType)
        ),
      });

      // Default to enabled if no preferences set
      return prefs?.email_enabled ?? true;
    } catch (err) {
      logger.error('Error checking email preferences', err);
      return true; // Default to enabled on error
    }
  }

  /**
   * Get user email address
   */
  private async getUserEmail(userId: string, userType: 'agency_user' | 'client_user'): Promise<string | null> {
    try {
      if (userType === 'agency_user') {
        const user = await db.query.agencyUsers.findFirst({
          where: eq(agencyUsers.id, userId),
        });
        return user?.email || null;
      } else {
        const user = await db.query.clientUsers.findFirst({
          where: eq(clientUsers.id, userId),
        });
        return user?.email || null;
      }
    } catch (err) {
      logger.error('Error getting user email', err);
      return null;
    }
  }

  /**
   * Load HTML email template
   */
  private loadTemplate(templateName: string): string {
    try {
      const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
      return fs.readFileSync(templatePath, 'utf-8');
    } catch (err) {
      logger.error('Error loading email template', { templateName, error: err });
      return this.getDefaultTemplate();
    }
  }

  /**
   * Replace template variables
   */
  private replaceTemplateVars(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Get default fallback template
   */
  private getDefaultTemplate(): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          {{content}}
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Sent via PRISM - PR Intelligence & Signal Management
          </p>
        </body>
      </html>
    `;
  }

  /**
   * Send client opportunity alert
   */
  async sendClientOpportunityAlert(
    userId: string,
    data: ClientOpportunityAlertData
  ): Promise<boolean> {
    try {
      // Check if email notifications are enabled
      if (!await this.isEmailEnabled(userId, 'client_user')) {
        logger.info('Email notifications disabled for user', { userId });
        return false;
      }

      // Get user email
      const email = await this.getUserEmail(userId, 'client_user');
      if (!email) {
        logger.warn('No email found for user', { userId });
        return false;
      }

      // Load and populate template
      let htmlBody = this.loadTemplate('client-opportunity-alert');
      htmlBody = this.replaceTemplateVars(htmlBody, {
        clientName: data.clientName,
        opportunityTitle: data.opportunityTitle,
        outletName: data.outletName,
        mediaType: data.mediaType,
        deadline: data.deadline,
        opportunitySummary: data.opportunitySummary || 'No summary available',
        opportunityUrl: `${config.appUrl}/client/opportunities/${data.opportunityId}`,
      });

      const textBody = `
New Opportunity Alert

Hi ${data.clientName},

A new media opportunity has been shared with you:

Title: ${data.opportunityTitle}
Outlet: ${data.outletName}
Media Type: ${data.mediaType}
Deadline: ${data.deadline}

${data.opportunitySummary || ''}

View and respond to this opportunity at:
${config.appUrl}/client/opportunities/${data.opportunityId}

---
Sent via PRISM - PR Intelligence & Signal Management
      `;

      const result = await this.sendEmail({
        to: email,
        subject: `📰 New Opportunity: ${data.opportunityTitle}`,
        htmlBody,
        textBody,
      });

      return result.success;
    } catch (err) {
      logger.error('Error sending client opportunity alert', err);
      return false;
    }
  }

  /**
   * Send restore request response notification
   */
  async sendRestoreRequestResponse(
    userId: string,
    data: RestoreRequestResponseData
  ): Promise<boolean> {
    try {
      // Check if email notifications are enabled
      if (!await this.isEmailEnabled(userId, 'client_user')) {
        logger.info('Email notifications disabled for user', { userId });
        return false;
      }

      // Get user email
      const email = await this.getUserEmail(userId, 'client_user');
      if (!email) {
        logger.warn('No email found for user', { userId });
        return false;
      }

      const statusEmoji = data.status === 'approved' ? '✅' : '❌';
      const statusText = data.status === 'approved' ? 'Approved' : 'Denied';

      const htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2>${statusEmoji} Restore Request ${statusText}</h2>
            <p>Hi ${data.clientName},</p>
            <p>Your request to restore the opportunity has been <strong>${statusText.toLowerCase()}</strong>:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${data.opportunityTitle}</h3>
              ${data.reviewNotes ? `<p><strong>Notes:</strong> ${data.reviewNotes}</p>` : ''}
            </div>
            ${data.status === 'approved' ? `
              <p>
                <a href="${config.appUrl}/client/opportunities/${data.opportunityId}"
                   style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Opportunity
                </a>
              </p>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Sent via PRISM - PR Intelligence & Signal Management
            </p>
          </body>
        </html>
      `;

      const textBody = `
Restore Request ${statusText}

Hi ${data.clientName},

Your request to restore the opportunity has been ${statusText.toLowerCase()}:

${data.opportunityTitle}

${data.reviewNotes ? `Notes: ${data.reviewNotes}` : ''}

${data.status === 'approved' ? `View the opportunity at:\n${config.appUrl}/client/opportunities/${data.opportunityId}` : ''}

---
Sent via PRISM - PR Intelligence & Signal Management
      `;

      const result = await this.sendEmail({
        to: email,
        subject: `${statusEmoji} Restore Request ${statusText}: ${data.opportunityTitle}`,
        htmlBody,
        textBody,
      });

      return result.success;
    } catch (err) {
      logger.error('Error sending restore request response', err);
      return false;
    }
  }

  /**
   * Send AOPR (AI-powered Opportunity Response) notification
   */
  async sendAOPRNotification(
    userId: string,
    userType: 'agency_user' | 'client_user',
    data: AOPRNotificationData
  ): Promise<boolean> {
    try {
      // Check if email notifications are enabled
      if (!await this.isEmailEnabled(userId, userType)) {
        logger.info('Email notifications disabled for user', { userId });
        return false;
      }

      // Get user email
      const email = await this.getUserEmail(userId, userType);
      if (!email) {
        logger.warn('No email found for user', { userId });
        return false;
      }

      const escalatedBadge = data.isEscalated ? '<span style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">ESCALATED</span>' : '';

      const htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2>💬 New AOPR Message ${escalatedBadge}</h2>
            <p>Hi ${data.clientName},</p>
            <p>You have a new message regarding an opportunity:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${data.opportunityTitle}</h3>
              <p style="white-space: pre-wrap;">${data.message}</p>
            </div>
            <p>
              <a href="${config.appUrl}/${userType === 'agency_user' ? 'agency' : 'client'}/opportunities/${data.opportunityId}"
                 style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View & Respond
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Sent via PRISM - PR Intelligence & Signal Management
            </p>
          </body>
        </html>
      `;

      const textBody = `
New AOPR Message${data.isEscalated ? ' [ESCALATED]' : ''}

Hi ${data.clientName},

You have a new message regarding an opportunity:

${data.opportunityTitle}

Message:
${data.message}

View and respond at:
${config.appUrl}/${userType === 'agency_user' ? 'agency' : 'client'}/opportunities/${data.opportunityId}

---
Sent via PRISM - PR Intelligence & Signal Management
      `;

      const result = await this.sendEmail({
        to: email,
        subject: `💬 AOPR Message${data.isEscalated ? ' [ESCALATED]' : ''}: ${data.opportunityTitle}`,
        htmlBody,
        textBody,
      });

      return result.success;
    } catch (err) {
      logger.error('Error sending AOPR notification', err);
      return false;
    }
  }
}

export const notificationEmailService = new NotificationEmailService();
