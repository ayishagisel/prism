import { db } from '../../db';
import { opportunityChats, opportunities, clients } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface SendMessageParams {
  agencyId: string;
  opportunityId: string;
  clientId: string;
  clientUserId: string;
  message: string;
}

interface ChatMessage {
  id: string;
  opportunityId: string;
  clientId: string;
  clientUserId: string | null;
  messageType: 'client_question' | 'ai_response' | 'aopr_response' | 'system_message';
  senderType: string;
  senderId: string | null;
  message: string;
  isEscalated: boolean;
  escalatedToUserId: string | null;
  metadata: any;
  createdAt: Date;
}

export class ChatService {
  /**
   * Send a message and get AI bot response
   */
  async sendMessage(params: SendMessageParams): Promise<{ clientMessage: ChatMessage; aiResponse?: ChatMessage }> {
    const { agencyId, opportunityId, clientId, clientUserId, message } = params;

    // Store client message
    const clientMessageId = nanoid();
    const [clientMessage] = await db
      .insert(opportunityChats)
      .values({
        id: clientMessageId,
        agency_id: agencyId,
        opportunity_id: opportunityId,
        client_id: clientId,
        client_user_id: clientUserId,
        message_type: 'client_question',
        sender_type: 'client',
        sender_id: clientUserId,
        message: message.trim(),
        is_escalated: false,
        metadata: {},
      })
      .returning();

    // Get AI bot response
    const botResponse = await this.generateAIResponse(agencyId, opportunityId, message);

    let aiMessage: ChatMessage | undefined;

    if (botResponse.shouldEscalate) {
      // Escalate to AOPR
      const systemMessageId = nanoid();
      const [systemMsg] = await db
        .insert(opportunityChats)
        .values({
          id: systemMessageId,
          agency_id: agencyId,
          opportunity_id: opportunityId,
          client_id: clientId,
          client_user_id: clientUserId,
          message_type: 'system_message',
          sender_type: 'system',
          sender_id: null,
          message: "Let me connect you with our AOPR team. They'll be able to help you with this question.",
          is_escalated: true,
          metadata: { escalation_reason: botResponse.escalationReason },
        })
        .returning();

      // Mark conversation as escalated
      await this.markAsEscalated(opportunityId, clientId);

      aiMessage = systemMsg as any;
    } else {
      // Send AI response
      const aiMessageId = nanoid();
      const [aiMsg] = await db
        .insert(opportunityChats)
        .values({
          id: aiMessageId,
          agency_id: agencyId,
          opportunity_id: opportunityId,
          client_id: clientId,
          client_user_id: null,
          message_type: 'ai_response',
          sender_type: 'ai_bot',
          sender_id: null,
          message: botResponse.response,
          is_escalated: false,
          metadata: { keywords_matched: botResponse.keywordsMatched },
        })
        .returning();

      aiMessage = aiMsg as any;
    }

    return {
      clientMessage: clientMessage as any,
      aiResponse: aiMessage,
    };
  }

  /**
   * Generate AI bot response using keyword matching
   */
  private async generateAIResponse(
    agencyId: string,
    opportunityId: string,
    message: string
  ): Promise<{ response: string; shouldEscalate: boolean; escalationReason?: string; keywordsMatched?: string[] }> {
    const lowerMessage = message.toLowerCase();

    // Fetch opportunity details
    const [opportunity] = await db
      .select()
      .from(opportunities)
      .where(and(eq(opportunities.id, opportunityId), eq(opportunities.agency_id, agencyId)))
      .limit(1);

    if (!opportunity) {
      return {
        response: '',
        shouldEscalate: true,
        escalationReason: 'opportunity_not_found',
      };
    }

    // Keyword matching for common questions
    const keywordsMatched: string[] = [];

    // Deadline questions
    if (
      lowerMessage.includes('deadline') ||
      lowerMessage.includes('when') ||
      lowerMessage.includes('due date') ||
      lowerMessage.includes('due by')
    ) {
      keywordsMatched.push('deadline');
      if (opportunity.deadline_at) {
        const deadlineDate = new Date(opportunity.deadline_at);
        const formattedDeadline = deadlineDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return {
          response: `The deadline for "${opportunity.title}" is ${formattedDeadline}. Please make sure to submit your response before this date.`,
          shouldEscalate: false,
          keywordsMatched,
        };
      } else {
        return {
          response: `There is no specific deadline set for "${opportunity.title}". However, I recommend responding as soon as possible to secure your spot.`,
          shouldEscalate: false,
          keywordsMatched,
        };
      }
    }

    // Requirements questions
    if (
      lowerMessage.includes('requirement') ||
      lowerMessage.includes('need') ||
      lowerMessage.includes('what do i') ||
      lowerMessage.includes('what should i') ||
      lowerMessage.includes('prepare')
    ) {
      keywordsMatched.push('requirements');
      if (opportunity.summary) {
        return {
          response: `Here are the key details for "${opportunity.title}":\n\n${opportunity.summary}\n\nMedia Type: ${opportunity.media_type}\nOutlet: ${opportunity.outlet_name || 'Not specified'}\n\nIf you need more specific requirements, I can connect you with our AOPR team.`,
          shouldEscalate: false,
          keywordsMatched,
        };
      } else {
        return {
          response: '',
          shouldEscalate: true,
          escalationReason: 'no_summary_available',
        };
      }
    }

    // Format/submission questions
    if (
      lowerMessage.includes('format') ||
      lowerMessage.includes('how to submit') ||
      lowerMessage.includes('submission') ||
      lowerMessage.includes('send')
    ) {
      keywordsMatched.push('format');
      return {
        response: `For "${opportunity.title}", you can respond directly through this portal by clicking "Accept" or "Decline" on the opportunity card. If you have specific materials to submit or questions about format, our AOPR team can provide detailed guidance. Would you like me to connect you with them?`,
        shouldEscalate: false,
        keywordsMatched,
      };
    }

    // Media type questions
    if (
      lowerMessage.includes('media type') ||
      lowerMessage.includes('what type') ||
      lowerMessage.includes('kind of opportunity')
    ) {
      keywordsMatched.push('media_type');
      return {
        response: `This is a ${opportunity.media_type.replace('_', ' ')} opportunity with ${opportunity.outlet_name || 'the outlet'}. ${
          opportunity.summary ? `\n\n${opportunity.summary}` : ''
        }`,
        shouldEscalate: false,
        keywordsMatched,
      };
    }

    // Outlet questions
    if (lowerMessage.includes('outlet') || lowerMessage.includes('publication') || lowerMessage.includes('who is')) {
      keywordsMatched.push('outlet');
      if (opportunity.outlet_name) {
        return {
          response: `This opportunity is with ${opportunity.outlet_name}. ${opportunity.summary ? `\n\n${opportunity.summary}` : 'Our AOPR team can provide more details about the outlet if needed.'}`,
          shouldEscalate: false,
          keywordsMatched,
        };
      }
    }

    // Greeting responses
    if (
      lowerMessage.match(/^(hi|hello|hey|greetings)/) ||
      lowerMessage.includes('good morning') ||
      lowerMessage.includes('good afternoon')
    ) {
      keywordsMatched.push('greeting');
      return {
        response: `Hello! I'm here to help answer questions about "${opportunity.title}". You can ask me about the deadline, requirements, format, or any other details. How can I assist you?`,
        shouldEscalate: false,
        keywordsMatched,
      };
    }

    // Thank you responses
    if (
      lowerMessage.includes('thank') ||
      lowerMessage.includes('thanks') ||
      lowerMessage.includes('appreciate')
    ) {
      keywordsMatched.push('gratitude');
      return {
        response: `You're welcome! If you have any other questions about "${opportunity.title}", feel free to ask. I'm here to help!`,
        shouldEscalate: false,
        keywordsMatched,
      };
    }

    // Default: escalate to AOPR for complex questions
    return {
      response: '',
      shouldEscalate: true,
      escalationReason: 'complex_question',
    };
  }

  /**
   * Get all messages for an opportunity
   */
  async getMessages(agencyId: string, opportunityId: string, clientId: string): Promise<ChatMessage[]> {
    const messages = await db
      .select()
      .from(opportunityChats)
      .where(
        and(
          eq(opportunityChats.agency_id, agencyId),
          eq(opportunityChats.opportunity_id, opportunityId),
          eq(opportunityChats.client_id, clientId)
        )
      )
      .orderBy(opportunityChats.created_at);

    return messages as any;
  }

  /**
   * Manually escalate a conversation to AOPR
   */
  async escalateToAOPR(agencyId: string, opportunityId: string, clientId: string, clientUserId: string): Promise<ChatMessage> {
    const systemMessageId = nanoid();
    const [systemMsg] = await db
      .insert(opportunityChats)
      .values({
        id: systemMessageId,
        agency_id: agencyId,
        opportunity_id: opportunityId,
        client_id: clientId,
        client_user_id: clientUserId,
        message_type: 'system_message',
        sender_type: 'system',
        sender_id: null,
        message: 'This conversation has been escalated to the AOPR team. They will respond shortly.',
        is_escalated: true,
        metadata: { manual_escalation: true },
      })
      .returning();

    // Mark all messages in this conversation as escalated
    await this.markAsEscalated(opportunityId, clientId);

    return systemMsg as any;
  }

  /**
   * Mark conversation as escalated
   */
  private async markAsEscalated(opportunityId: string, clientId: string): Promise<void> {
    await db
      .update(opportunityChats)
      .set({ is_escalated: true })
      .where(and(eq(opportunityChats.opportunity_id, opportunityId), eq(opportunityChats.client_id, clientId)));
  }

  /**
   * Get all escalated conversations for AOPR dashboard
   */
  async getEscalatedChats(agencyId: string): Promise<any[]> {
    const escalatedChats = await db
      .select({
        opportunityId: opportunityChats.opportunity_id,
        clientId: opportunityChats.client_id,
        opportunityTitle: opportunities.title,
        clientName: clients.name,
        lastMessage: opportunityChats.message,
        lastMessageAt: opportunityChats.created_at,
      })
      .from(opportunityChats)
      .innerJoin(opportunities, eq(opportunityChats.opportunity_id, opportunities.id))
      .innerJoin(clients, eq(opportunityChats.client_id, clients.id))
      .where(and(eq(opportunityChats.agency_id, agencyId), eq(opportunityChats.is_escalated, true)))
      .orderBy(desc(opportunityChats.created_at));

    // Group by opportunity + client to get unique conversations
    const uniqueChats = new Map();
    for (const chat of escalatedChats) {
      const key = `${chat.opportunityId}-${chat.clientId}`;
      if (!uniqueChats.has(key)) {
        uniqueChats.set(key, chat);
      }
    }

    return Array.from(uniqueChats.values());
  }

  /**
   * AOPR sends a response to an escalated chat
   */
  async sendAOPRResponse(
    agencyId: string,
    opportunityId: string,
    clientId: string,
    aoprUserId: string,
    message: string
  ): Promise<ChatMessage> {
    const messageId = nanoid();
    const [aoprMessage] = await db
      .insert(opportunityChats)
      .values({
        id: messageId,
        agency_id: agencyId,
        opportunity_id: opportunityId,
        client_id: clientId,
        client_user_id: null,
        message_type: 'aopr_response',
        sender_type: 'aopr_rep',
        sender_id: aoprUserId,
        message: message.trim(),
        is_escalated: true,
        escalated_to_user_id: aoprUserId,
        metadata: {},
      })
      .returning();

    return aoprMessage as any;
  }
}
