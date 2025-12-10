import { Request, Response } from 'express';
import { db } from '../../config/db';
import { opportunityChats, opportunities, clients, agencyUsers, clientUsers } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger';
import { validate, required } from '../../utils/validation';
import { notificationService } from '../notification/notification.service';

export class ContactController {
  /**
   * POST /api/contact/:opportunityId/message
   * Send a message in the contact chat
   */
  async sendMessage(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      validate(req.body, {
        message: [required],
      });

      const { message, issueCategory } = req.body;
      const { opportunityId } = req.params;
      const agencyId = req.auth.agencyId;
      const role = req.auth.role;
      const userId = req.auth.userId;

      // Verify opportunity exists
      const opportunity = await db.query.opportunities.findFirst({
        where: and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.agency_id, agencyId)
        ),
      });

      if (!opportunity) {
        return res.status(404).json({ success: false, error: 'Opportunity not found' });
      }

      // Determine sender type and get client info
      let senderType: 'client' | 'aopr_rep';
      let clientId: string | null = null;
      let clientUserId: string | null = null;

      if (role === 'CLIENT_USER') {
        senderType = 'client';
        // Get client user info
        const clientUser = await db.query.clientUsers.findFirst({
          where: eq(clientUsers.id, userId),
        });

        if (!clientUser) {
          return res.status(404).json({ success: false, error: 'Client user not found' });
        }

        clientId = clientUser.client_id;
        clientUserId = userId;
      } else if (role === 'AGENCY_ADMIN' || role === 'AGENCY_MEMBER') {
        senderType = 'aopr_rep';
        // For agency user, we need to get the client_id from the request or context
        // In this case, we'll need to find it from the last message in the chat
        const lastMessage = await db.query.opportunityChats.findFirst({
          where: and(
            eq(opportunityChats.opportunity_id, opportunityId),
            eq(opportunityChats.agency_id, agencyId)
          ),
          orderBy: [desc(opportunityChats.created_at)],
        });

        if (!lastMessage) {
          return res.status(400).json({
            success: false,
            error: 'Cannot send message without a client conversation started'
          });
        }

        clientId = lastMessage.client_id;
        clientUserId = lastMessage.client_user_id;
      } else {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Create message
      const messageId = `msg_${uuid()}`;
      const messageType = senderType === 'client' ? 'client_question' : 'aopr_response';

      const metadata: any = {};
      if (issueCategory) {
        metadata.issueCategory = issueCategory;
      }

      const chatMessage = await db
        .insert(opportunityChats)
        .values({
          id: messageId,
          agency_id: agencyId,
          opportunity_id: opportunityId,
          client_id: clientId!,
          client_user_id: clientUserId,
          message_type: messageType as any,
          sender_type: senderType,
          sender_id: userId,
          message: message,
          is_escalated: false,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          created_at: new Date(),
        })
        .returning();

      logger.info('Contact message sent', {
        messageId,
        opportunityId,
        senderType,
      });

      // Send notification to the other party
      if (senderType === 'client') {
        // Notify AOPR team (all agency users)
        const teamMembers = await db.query.agencyUsers.findMany({
          where: eq(agencyUsers.agency_id, agencyId),
        });

        for (const member of teamMembers) {
          await notificationService.createNotification({
            agency_id: agencyId,
            channel: 'in_app',
            recipient_type: 'agency_user',
            recipient_id: member.id,
            subject: 'New message from client',
            body_preview: message.substring(0, 100),
            related_entity_type: 'opportunity',
            related_entity_id: opportunityId,
            metadata: { chatMessageId: messageId },
          });
        }
      } else {
        // Notify client
        if (clientUserId) {
          await notificationService.createNotification({
            agency_id: agencyId,
            channel: 'in_app',
            recipient_type: 'client_user',
            recipient_id: clientUserId,
            subject: 'AOPR responded to your message',
            body_preview: message.substring(0, 100),
            related_entity_type: 'opportunity',
            related_entity_id: opportunityId,
            metadata: { chatMessageId: messageId },
          });
        }
      }

      res.status(201).json({ success: true, data: chatMessage[0] });
    } catch (err: any) {
      logger.error('Send contact message error', err);

      if (err.errors) {
        return res.status(400).json({ success: false, errors: err.errors });
      }

      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  }

  /**
   * GET /api/contact/:opportunityId/messages
   * Get all messages for an opportunity
   */
  async getMessages(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { opportunityId } = req.params;
      const agencyId = req.auth.agencyId;
      const role = req.auth.role;
      const userId = req.auth.userId;

      // Verify opportunity exists
      const opportunity = await db.query.opportunities.findFirst({
        where: and(
          eq(opportunities.id, opportunityId),
          eq(opportunities.agency_id, agencyId)
        ),
      });

      if (!opportunity) {
        return res.status(404).json({ success: false, error: 'Opportunity not found' });
      }

      // Build where clause based on user type
      let whereClause: any;

      if (role === 'CLIENT_USER') {
        // Get client user's client_id
        const clientUser = await db.query.clientUsers.findFirst({
          where: eq(clientUsers.id, userId),
        });

        if (!clientUser) {
          return res.status(404).json({ success: false, error: 'Client user not found' });
        }

        // Client users can only see messages for their own conversations
        whereClause = and(
          eq(opportunityChats.opportunity_id, opportunityId),
          eq(opportunityChats.agency_id, agencyId),
          eq(opportunityChats.client_id, clientUser.client_id),
          eq(opportunityChats.is_escalated, false)
        );
      } else if (role === 'AGENCY_ADMIN' || role === 'AGENCY_MEMBER') {
        // Agency users can see all contact messages (not escalated)
        whereClause = and(
          eq(opportunityChats.opportunity_id, opportunityId),
          eq(opportunityChats.agency_id, agencyId),
          eq(opportunityChats.is_escalated, false)
        );
      } else {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Get messages
      const messages = await db.query.opportunityChats.findMany({
        where: whereClause,
        orderBy: [opportunityChats.created_at],
      });

      // Enhance messages with sender info
      const enhancedMessages = await Promise.all(
        messages.map(async (msg) => {
          let senderName = 'Unknown';

          if (msg.sender_id) {
            if (msg.sender_type === 'client') {
              const clientUser = await db.query.clientUsers.findFirst({
                where: eq(clientUsers.id, msg.sender_id),
              });
              senderName = clientUser?.name || 'Client User';
            } else if (msg.sender_type === 'aopr_rep') {
              const agencyUser = await db.query.agencyUsers.findFirst({
                where: eq(agencyUsers.id, msg.sender_id),
              });
              senderName = agencyUser?.name || 'AOPR Rep';
            }
          }

          return {
            ...msg,
            sender_name: senderName,
          };
        })
      );

      res.json({ success: true, data: enhancedMessages });
    } catch (err) {
      logger.error('Get contact messages error', err);
      res.status(500).json({ success: false, error: 'Failed to get messages' });
    }
  }
}

export const contactController = new ContactController();
