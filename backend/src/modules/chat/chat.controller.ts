import { Request, Response } from 'express';
import { ChatService } from './chat.service';

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
      const agencyId = req.user?.agencyId;
      const clientId = req.user?.clientId;
      const clientUserId = req.user?.id;

      if (!agencyId || !clientId || !clientUserId) {
        res.status(401).json({ error: 'Unauthorized - Client authentication required' });
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
      const agencyId = req.user?.agencyId;
      const clientId = req.user?.clientId;

      if (!agencyId || !clientId) {
        res.status(401).json({ error: 'Unauthorized - Client authentication required' });
        return;
      }

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
      const agencyId = req.user?.agencyId;
      const clientId = req.user?.clientId;
      const clientUserId = req.user?.id;

      if (!agencyId || !clientId || !clientUserId) {
        res.status(401).json({ error: 'Unauthorized - Client authentication required' });
        return;
      }

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
      const agencyId = req.user?.agencyId;
      const userType = req.user?.userType;

      if (!agencyId || userType !== 'agency') {
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
      const agencyId = req.user?.agencyId;
      const aoprUserId = req.user?.id;
      const userType = req.user?.userType;

      if (!agencyId || userType !== 'agency' || !aoprUserId) {
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

      res.status(200).json({ aoprMessage });
    } catch (error) {
      console.error('Error sending AOPR response:', error);
      res.status(500).json({ error: 'Failed to send AOPR response' });
    }
  }
}
