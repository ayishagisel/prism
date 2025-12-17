import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { db } from '../../config/db';
import { clientUsers } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { AuthContext } from '../../types';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const chatService = new ChatService();

export class ChatController {
  /**
   * POST /api/chat/:opportunityId/message
   * Send a message and get AI bot response
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { opportunityId } = req.params;
      const { message } = req.body;
      const agencyId = req.auth?.agencyId;
      const userId = req.auth?.userId;

      if (!agencyId || !userId) {
        res.status(401).json({ error: 'Unauthorized - Client authentication required' });
        return;
      }

      // Get client user info to retrieve clientId
      const clientUser = await db.query.clientUsers.findFirst({
        where: eq(clientUsers.id, userId),
      });

      if (!clientUser) {
        res.status(401).json({ error: 'Client user not found' });
        return;
      }

      const clientId = clientUser.client_id;
      const clientUserId = userId;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ error: 'Message is required and cannot be empty' });
        return;
      }

      if (message.length > 2000) {
        res.status(400).json({ error: 'Message is too long (max 2000 characters)' });
        return;
      }

      const result = await chatService.sendMessage({
        agencyId,
        opportunityId,
        clientId,
        clientUserId,
        message,
      });

      res.status(200).json({
        clientMessage: result.clientMessage,
        aiResponse: result.aiResponse,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  /**
   * GET /api/chat/:opportunityId/messages
   * Get all messages for an opportunity chat
   */
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { opportunityId } = req.params;
      const agencyId = req.auth?.agencyId;
      const userId = req.auth?.userId;

      if (!agencyId || !userId) {
        res.status(401).json({ error: 'Unauthorized - Client authentication required' });
        return;
      }

      // Get client user info to retrieve clientId
      const clientUser = await db.query.clientUsers.findFirst({
        where: eq(clientUsers.id, userId),
      });

      if (!clientUser) {
        res.status(401).json({ error: 'Client user not found' });
        return;
      }

      const clientId = clientUser.client_id;

      const messages = await chatService.getMessages(agencyId, opportunityId, clientId);

      res.status(200).json({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  /**
   * POST /api/chat/:opportunityId/escalate
   * Manually escalate a conversation to AOPR
   */
  async escalateToAOPR(req: Request, res: Response): Promise<void> {
    try {
      const { opportunityId } = req.params;
      const agencyId = req.auth?.agencyId;
      const userId = req.auth?.userId;

      if (!agencyId || !userId) {
        res.status(401).json({ error: 'Unauthorized - Client authentication required' });
        return;
      }

      // Get client user info to retrieve clientId
      const clientUser = await db.query.clientUsers.findFirst({
        where: eq(clientUsers.id, userId),
      });

      if (!clientUser) {
        res.status(401).json({ error: 'Client user not found' });
        return;
      }

      const clientId = clientUser.client_id;
      const clientUserId = userId;

      const systemMessage = await chatService.escalateToAOPR(agencyId, opportunityId, clientId, clientUserId);

      res.status(200).json({ systemMessage });
    } catch (error) {
      console.error('Error escalating chat:', error);
      res.status(500).json({ error: 'Failed to escalate chat' });
    }
  }

  /**
   * GET /api/chat/escalated
   * Get all escalated chats (for AOPR dashboard)
   */
  async getEscalatedChats(req: Request, res: Response): Promise<void> {
    try {
      const agencyId = req.auth?.agencyId;
      const role = req.auth?.role;

      if (!agencyId || (role !== 'AGENCY_ADMIN' && role !== 'AGENCY_MEMBER')) {
        res.status(401).json({ error: 'Unauthorized - AOPR authentication required' });
        return;
      }

      const escalatedChats = await chatService.getEscalatedChats(agencyId);

      res.status(200).json({ escalatedChats });
    } catch (error) {
      console.error('Error fetching escalated chats:', error);
      res.status(500).json({ error: 'Failed to fetch escalated chats' });
    }
  }

  /**
   * POST /api/chat/:opportunityId/aopr-response
   * AOPR sends a response to an escalated chat
   */
  async sendAOPRResponse(req: Request, res: Response): Promise<void> {
    try {
      const { opportunityId } = req.params;
      const { clientId, message } = req.body;
      const agencyId = req.auth?.agencyId;
      const aoprUserId = req.auth?.userId;
      const role = req.auth?.role;

      if (!agencyId || (role !== 'AGENCY_ADMIN' && role !== 'AGENCY_MEMBER') || !aoprUserId) {
        res.status(401).json({ error: 'Unauthorized - AOPR authentication required' });
        return;
      }

      if (!clientId) {
        res.status(400).json({ error: 'Client ID is required' });
        return;
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ error: 'Message is required and cannot be empty' });
        return;
      }

      if (message.length > 2000) {
        res.status(400).json({ error: 'Message is too long (max 2000 characters)' });
        return;
      }

      const aoprMessage = await chatService.sendAOPRResponse(agencyId, opportunityId, clientId, aoprUserId, message);

      // Return in format expected by frontend
      res.status(200).json({ success: true, message: aoprMessage });
    } catch (error) {
      console.error('Error sending AOPR response:', error);
      res.status(500).json({ error: 'Failed to send AOPR response' });
    }
  }

  /**
   * GET /api/chat/unread-counts
   * Get unread message counts for all opportunities (for client users)
   */
  async getUnreadCounts(req: Request, res: Response): Promise<void> {
    try {
      const agencyId = req.auth?.agencyId;
      const userId = req.auth?.userId;

      if (!agencyId || !userId) {
        res.status(401).json({ error: 'Unauthorized - Client authentication required' });
        return;
      }

      // Get client user info to retrieve clientId
      const clientUser = await db.query.clientUsers.findFirst({
        where: eq(clientUsers.id, userId),
      });

      if (!clientUser) {
        res.status(401).json({ error: 'Client user not found' });
        return;
      }

      const clientId = clientUser.client_id;
      const unreadCounts = await chatService.getUnreadCounts(agencyId, clientId);

      res.status(200).json({ success: true, data: unreadCounts });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      res.status(500).json({ error: 'Failed to fetch unread counts' });
    }
  }

  /**
   * GET /api/chat/:opportunityId/messages/:clientId
   * Get all messages for an opportunity chat (for AOPR/Agency users)
   */
  async getMessagesForAgency(req: Request, res: Response): Promise<void> {
    try {
      const { opportunityId, clientId } = req.params;
      const agencyId = req.auth?.agencyId;
      const role = req.auth?.role;

      if (!agencyId || (role !== 'AGENCY_ADMIN' && role !== 'AGENCY_MEMBER')) {
        res.status(401).json({ error: 'Unauthorized - AOPR authentication required' });
        return;
      }

      if (!clientId) {
        res.status(400).json({ error: 'Client ID is required' });
        return;
      }

      const messages = await chatService.getMessages(agencyId, opportunityId, clientId);

      res.status(200).json({ messages });
    } catch (error) {
      console.error('Error fetching messages for agency:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }
}
