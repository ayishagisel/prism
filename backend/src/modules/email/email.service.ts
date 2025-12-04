import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { notificationService } from '../notification/notification.service';

interface EmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export class EmailService {
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
      logger.info('Email service initialized with AWS SES');
    } else {
      logger.warn('AWS credentials not configured - emails will not be sent');
    }
  }

  /**
   * Send an email via AWS SES
   */
  async sendEmail(payload: EmailPayload): Promise<{ messageId?: string; success: boolean }> {
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

      logger.info('Email sent successfully', {
        to: payload.to,
        messageId: response.MessageId,
      });

      return {
        messageId: response.MessageId,
        success: true,
      };
    } catch (err) {
      logger.error('Email send error', err);
      return { success: false };
    }
  }

  /**
   * Send client response notification email to PR team member
   */
  async sendClientResponseNotification(data: {
    recipientEmail: string;
    clientName: string;
    opportunityTitle: string;
    responseState: string;
    opportunityId: string;
  }): Promise<boolean> {
    try {
      const stateEmoji = {
        accepted: '✅',
        interested: '👀',
        declined: '❌',
        pending: '⏳',
        no_response: '🔔',
      };

      const emoji = stateEmoji[data.responseState as keyof typeof stateEmoji] || '📧';

      const htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <h2>${emoji} Client Response</h2>
            <p><strong>${data.clientName}</strong> responded to an opportunity:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Opportunity:</strong> ${data.opportunityTitle}</p>
              <p><strong>Response:</strong> <span style="color: #dc2626; font-weight: bold;">${data.responseState.toUpperCase()}</span></p>
            </div>
            <p>
              <a href="https://prism.amore.dev/agency/opportunities/${data.opportunityId}"
                 style="background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Opportunity
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              This is an automated notification from PRISM
            </p>
          </body>
        </html>
      `;

      const textBody = `
Client Response Notification

${data.clientName} responded to: ${data.opportunityTitle}
Response: ${data.responseState.toUpperCase()}

View the opportunity at:
https://prism.amore.dev/agency/opportunities/${data.opportunityId}
      `;

      const result = await this.sendEmail({
        to: data.recipientEmail,
        subject: `${emoji} Client Response: ${data.clientName} - ${data.responseState.toUpperCase()}`,
        htmlBody,
        textBody,
      });

      return result.success;
    } catch (err) {
      logger.error('Send client response notification error', err);
      return false;
    }
  }

  /**
   * Send opportunity assignment email to client
   */
  async sendOpportunityAssignmentEmail(data: {
    recipientEmail: string;
    clientName: string;
    opportunityTitle: string;
    opportunityOutlet: string;
    mediaType: string;
    deadline: string;
    opportunityId: string;
  }): Promise<boolean> {
    try {
      const htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <h2>📰 New Opportunity</h2>
            <p>Hi ${data.clientName},</p>
            <p>A new media opportunity has been shared with you:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>${data.opportunityTitle}</strong></p>
              <p><strong>Outlet:</strong> ${data.opportunityOutlet}</p>
              <p><strong>Media Type:</strong> ${data.mediaType}</p>
              <p><strong>Deadline:</strong> ${data.deadline}</p>
            </div>
            <p>
              <a href="https://prism.amore.dev/client/opportunities/${data.opportunityId}"
                 style="background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Review Opportunity
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              Sent via PRISM - PR Intelligence & Signal Management
            </p>
          </body>
        </html>
      `;

      const textBody = `
New Opportunity

${data.opportunityTitle}

Outlet: ${data.opportunityOutlet}
Media Type: ${data.mediaType}
Deadline: ${data.deadline}

Review this opportunity at:
https://prism.amore.dev/client/opportunities/${data.opportunityId}
      `;

      const result = await this.sendEmail({
        to: data.recipientEmail,
        subject: `📰 New Opportunity: ${data.opportunityTitle}`,
        htmlBody,
        textBody,
      });

      return result.success;
    } catch (err) {
      logger.error('Send opportunity assignment email error', err);
      return false;
    }
  }

  /**
   * Process pending email notifications
   * This should be called periodically (e.g., every minute) to send queued emails
   */
  async processPendingNotifications(): Promise<{ sent: number; failed: number }> {
    try {
      const pendingNotifs = await notificationService.getPendingEmailNotifications();

      let sent = 0;
      let failed = 0;

      for (const notif of pendingNotifs) {
        try {
          // Get recipient email based on notification type
          const recipientEmail = await notificationService.getRecipientEmail(
            notif.recipient_type,
            notif.recipient_id
          );

          if (!recipientEmail) {
            logger.warn('Could not find recipient email', {
              notificationId: notif.id,
              recipientType: notif.recipient_type,
              recipientId: notif.recipient_id,
            });
            failed++;
            continue;
          }

          // Send the email
          const result = await this.sendEmail({
            to: recipientEmail,
            subject: notif.subject || 'PRISM Notification',
            htmlBody: this.generateEmailHtml(notif),
            textBody: notif.body_preview || '',
          });

          if (result.success) {
            // Mark notification as sent
            await notificationService.markAsSent(notif.agency_id, notif.id);
            sent++;
            logger.info('Pending notification sent', {
              notificationId: notif.id,
              recipientEmail,
            });
          } else {
            failed++;
          }
        } catch (err) {
          logger.error('Error processing pending notification', {
            notificationId: notif.id,
            error: err,
          });
          failed++;
        }
      }

      logger.info('Pending notifications processed', { sent, failed });
      return { sent, failed };
    } catch (err) {
      logger.error('Process pending notifications error', err);
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Generate HTML email from notification data
   */
  private generateEmailHtml(notif: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <h2>${notif.subject}</h2>
          <p>${notif.body_preview || 'You have a new notification'}</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Sent via PRISM - PR Intelligence & Signal Management
          </p>
        </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
