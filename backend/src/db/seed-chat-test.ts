import { db } from '../config/db';
import { opportunityChats, clientOpportunityStatus } from './schema';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';

/**
 * Seed script to create test chat messages showing all response types
 *
 * Message types:
 * - client_question: Messages from the client (right side, red bubble)
 * - ai_response: AI bot responses (left side, white bubble with AI badge)
 * - aopr_response: Human agency responses (left side, white bubble)
 * - system_message: System notifications (left side, amber bubble)
 *
 * Run with: npx tsx src/db/seed-chat-test.ts
 */

async function seedChatTest() {
  const agencyId = 'agency_aopr';
  const clientId = 'client_glow_up';
  const clientUserId = 'client_user_glow';

  // Find an opportunity for Glow Up client
  const statusRecord = await db.query.clientOpportunityStatus.findFirst({
    where: and(
      eq(clientOpportunityStatus.agency_id, agencyId),
      eq(clientOpportunityStatus.client_id, clientId)
    ),
  });

  if (!statusRecord) {
    console.error('No opportunity found for Glow Up client. Make sure seed data exists.');
    process.exit(1);
  }

  const opportunityId = statusRecord.opportunity_id;
  console.log(`Using opportunity: ${opportunityId}`);

  // Clear existing chat messages for this opportunity/client combo
  await db
    .delete(opportunityChats)
    .where(
      and(
        eq(opportunityChats.opportunity_id, opportunityId),
        eq(opportunityChats.client_id, clientId)
      )
    );
  console.log('Cleared existing chat messages');

  // Create test messages with different types
  const now = new Date();
  const messages = [
    {
      id: nanoid(),
      agency_id: agencyId,
      opportunity_id: opportunityId,
      client_id: clientId,
      client_user_id: clientUserId,
      message_type: 'client_question' as const,
      sender_type: 'client',
      sender_id: clientUserId,
      message: 'Hi! I have a question about this opportunity. What is the deadline for submitting our materials?',
      is_escalated: false,
      metadata: {},
      created_at: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
    },
    {
      id: nanoid(),
      agency_id: agencyId,
      opportunity_id: opportunityId,
      client_id: clientId,
      client_user_id: null,
      message_type: 'ai_response' as const,
      sender_type: 'ai_bot',
      sender_id: null,
      message: 'The deadline for this opportunity is December 27, 2025. Please make sure to submit your response before this date. Is there anything else I can help you with?',
      is_escalated: false,
      metadata: { keywords_matched: ['deadline'] },
      created_at: new Date(now.getTime() - 4 * 60 * 1000), // 4 minutes ago
    },
    {
      id: nanoid(),
      agency_id: agencyId,
      opportunity_id: opportunityId,
      client_id: clientId,
      client_user_id: clientUserId,
      message_type: 'client_question' as const,
      sender_type: 'client',
      sender_id: clientUserId,
      message: 'Thanks! Can someone from AOPR call me to discuss the specific talking points for this panel?',
      is_escalated: false,
      metadata: {},
      created_at: new Date(now.getTime() - 3 * 60 * 1000), // 3 minutes ago
    },
    {
      id: nanoid(),
      agency_id: agencyId,
      opportunity_id: opportunityId,
      client_id: clientId,
      client_user_id: clientUserId,
      message_type: 'system_message' as const,
      sender_type: 'system',
      sender_id: null,
      message: "Let me connect you with our AOPR team. They'll be able to help you with this question.",
      is_escalated: true,
      metadata: { escalation_reason: 'complex_question' },
      created_at: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
    },
    {
      id: nanoid(),
      agency_id: agencyId,
      opportunity_id: opportunityId,
      client_id: clientId,
      client_user_id: null,
      message_type: 'aopr_response' as const,
      sender_type: 'aopr_rep',
      sender_id: 'user_amore',
      message: "Hi! This is Amore from AOPR. I'd be happy to schedule a call to discuss the talking points. Are you available tomorrow at 2pm EST? We can go over the panel format and help you prepare your key messages.",
      is_escalated: true,
      escalated_to_user_id: 'user_amore',
      metadata: {},
      created_at: new Date(now.getTime() - 1 * 60 * 1000), // 1 minute ago
    },
  ];

  // Insert all messages
  await db.insert(opportunityChats).values(messages);
  console.log(`Created ${messages.length} test chat messages`);

  console.log('\n=== Test Chat Messages Created ===');
  console.log('Message types included:');
  console.log('  1. client_question - Client asking about deadline (right side, red)');
  console.log('  2. ai_response - AI bot response about deadline (left side, white with AI badge)');
  console.log('  3. client_question - Client asking for a call (right side, red)');
  console.log('  4. system_message - Escalation notification (left side, amber)');
  console.log('  5. aopr_response - Human agency response (left side, white)');
  console.log('\nTo test: Log in as ceo@glowup.com / shine123 and open the Q&A chat on any opportunity');

  process.exit(0);
}

seedChatTest().catch((err) => {
  console.error('Error seeding chat test data:', err);
  process.exit(1);
});
