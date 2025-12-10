# PRISM Parallel Build Round 2 Instructions
**Date:** December 10, 2025 - 3:00 AM
**Strategy:** 4 simultaneous Claude Code instances (Round 2)

---

## 🎯 Round 2 Goals

Build the remaining 4 critical features for Dec 18 demo:
1. Q&A Chat Interface (AI bot + AOPR escalation)
2. Restore Request Workflow (client requests + AOPR approval)
3. Contact AOPR Chat (for accepted opportunities)
4. AOPR Dashboard Updates (show client responses & requests)

---

## Instance 5: Q&A Chat Interface (NEW TERMINAL)
**Priority:** CRITICAL
**Estimated Time:** 90 minutes

### Prompt for Instance 5:
```
I'm building the Q&A chat interface for PRISM client portal as part of Round 2 parallel build.

Build a chat interface where clients can ask questions about opportunities, get AI bot responses, and escalate to AOPR when needed.

Files to create:
- frontend/src/components/client/QAChat.tsx
- backend/src/modules/chat/chat.service.ts
- backend/src/modules/chat/chat.controller.ts

Frontend Requirements:

1. Chat Panel Component:
   - Slides in from right side when "Ask Questions" clicked
   - Red header with opportunity title
   - Close X button
   - Message list (scrollable)
   - Input field at bottom: "Type your question here..."
   - Send button (paper plane icon)

2. Message Types:
   - Client messages: Right-aligned, red bubble, blue user icon
   - AI responses: Left-aligned, white bubble, red bot icon with "AI-Assisted" badge
   - AOPR responses: Left-aligned, white bubble, user icon
   - System messages: Centered, gray text

3. Message Display:
   - Timestamp below each message
   - Sender name/type
   - Auto-scroll to latest message
   - Loading indicator while AI responds

4. Escalation Logic:
   - AI bot answers basic questions (deadline, requirements, format)
   - If AI can't answer → shows "Let me connect you with AOPR team" → escalates
   - Escalated messages go to AOPR dashboard
   - AOPR can respond directly in chat

Backend Requirements:

1. Chat Service:
   - Store messages in opportunity_chats table
   - AI bot integration (use Claude API or simple keyword matching)
   - Escalation detection
   - Mark messages as escalated when AI can't answer

2. Chat Controller:
   - POST /api/chat/:opportunityId/message - Send message
   - GET /api/chat/:opportunityId/messages - Get chat history
   - POST /api/chat/:opportunityId/escalate - Manual escalation
   - GET /api/chat/escalated - Get all escalated chats (for AOPR)

3. AI Bot Logic (Simple Version):
   Keywords to handle:
   - "deadline", "when", "due date" → respond with opportunity deadline
   - "requirements", "need", "what do I" → respond with requirements
   - "format", "how to submit" → respond with submission format
   - Otherwise → escalate to AOPR

Database:
- Use opportunity_chats table (already exists)
- Fields: message_type, sender_type, message, is_escalated, escalated_to_user_id

Success Criteria:
✓ Chat opens when "Ask Questions" clicked
✓ Client can send messages
✓ AI bot responds to basic questions
✓ Escalation works when AI can't answer
✓ AOPR can see and respond to escalated chats
✓ Messages persist in database
✓ Real-time feel (instant AI response)

Start building now!
```

---

## Instance 6: Restore Request Workflow (NEW TERMINAL)
**Priority:** HIGH
**Estimated Time:** 60 minutes

### Prompt for Instance 6:
```
I'm building the restore request workflow for PRISM as part of Round 2 parallel build.

Build a system where clients can request declined opportunities be restored, and AOPR can approve/deny these requests.

Files to create:
- frontend/src/components/client/RestoreRequestButton.tsx
- frontend/src/components/agency/RestoreRequestQueue.tsx
- backend/src/modules/restore/restore.controller.ts
- backend/src/modules/restore/restore.service.ts

Client-Side Requirements:

1. RestoreRequestButton Component:
   - Shows on declined opportunity cards
   - Only if deadline hasn't passed
   - Button: "Request Restore" (gray outline)
   - On click → confirmation modal: "Request to restore this opportunity?"
   - On confirm → creates restore_request record
   - After request → button changes to "Request Pending..." (disabled)

2. Request Status Display:
   - Shows "Restore requested" badge on card
   - If approved → opportunity moves back to "New" tab
   - If denied → shows "Request denied" message

AOPR Dashboard Requirements:

1. RestoreRequestQueue Component:
   - New section on AOPR dashboard
   - Shows all pending restore requests
   - Card per request with:
     * Client name
     * Opportunity title
     * Reason for original decline (if available)
     * Deadline date
     * Requested date
     * [Approve] [Deny] buttons

2. Approval Flow:
   - Approve → opportunity response_state: declined → pending
   - Approve → send notification to client
   - Deny → update restore_request status to 'denied'
   - Deny → send notification to client

Backend Requirements:

1. Restore Controller:
   - POST /api/restore/request - Client creates restore request
   - GET /api/restore/requests - AOPR gets pending requests
   - PUT /api/restore/requests/:id/approve - Approve request
   - PUT /api/restore/requests/:id/deny - Deny request

2. Restore Service:
   - Create restore_request record
   - Check if deadline has passed (validation)
   - Update client_opportunity_statuses when approved
   - Send notifications via notification service
   - Log activity

Database:
- Use restore_requests table (already exists)
- Fields: status, reviewed_by_user_id, reviewed_at, review_notes

Success Criteria:
✓ Client can request restore on declined opportunities
✓ Request only shows if deadline not passed
✓ AOPR sees pending requests in dashboard
✓ AOPR can approve/deny requests
✓ Approved → opportunity moves to "New" tab
✓ Client gets notification of approval/denial
✓ All actions logged in activity_logs

Start building now!
```

---

## Instance 7: Contact AOPR Chat (NEW TERMINAL)
**Priority:** MEDIUM
**Estimated Time:** 45 minutes

### Prompt for Instance 7:
```
I'm building the Contact AOPR chat for accepted opportunities as part of Round 2 parallel build.

Build a chat interface for clients to communicate with AOPR about accepted opportunities (issues, changes, questions).

Files to create:
- frontend/src/components/client/ContactAOPRChat.tsx
- backend/src/modules/contact/contact.controller.ts

Requirements:

This is SIMPLER than Q&A chat:
- No AI bot involved
- Direct messages to AOPR only
- For post-acceptance communication

Frontend Component:

1. ContactAOPRChat Component:
   - Similar UI to QAChat but no AI
   - Button on accepted opportunity cards: "Contact AOPR"
   - Opens chat panel
   - Shows message history
   - Client sends messages directly to AOPR
   - AOPR responses appear in chat

2. Message Types:
   - Client messages: Right-aligned, red bubble
   - AOPR messages: Left-aligned, white bubble with AOPR rep name
   - System messages: "Your AOPR rep will respond within 2 hours"

3. Issue Categories (optional):
   - Dropdown before sending first message:
     * Schedule conflict
     * Cancellation request
     * Resource needs
     * General question

Backend Requirements:

1. Contact Controller:
   - POST /api/contact/:opportunityId/message - Send message
   - GET /api/contact/:opportunityId/messages - Get chat history
   - Uses same opportunity_chats table but sender_type: 'client' or 'aopr_rep'
   - No AI, no escalation needed

2. Notification:
   - When client sends message → notify assigned AOPR rep
   - When AOPR responds → notify client

Database:
- Reuse opportunity_chats table
- Filter by is_escalated: false for accepted opportunities
- Sender_type: 'client' or 'aopr_rep'

Success Criteria:
✓ "Contact AOPR" button shows on accepted opportunities
✓ Opens chat panel
✓ Client can send messages
✓ AOPR sees messages in their dashboard
✓ AOPR can respond
✓ Notifications sent on new messages
✓ Messages persist

Start building now!
```

---

## Instance 8: AOPR Dashboard Updates (NEW TERMINAL)
**Priority:** HIGH
**Estimated Time:** 60 minutes

### Prompt for Instance 8:
```
I'm building AOPR dashboard updates to show client responses and requests as part of Round 2 parallel build.

Update the AOPR dashboard to display client activity: responses, questions, restore requests, and contact messages.

Files to update/create:
- frontend/src/app/agency/dashboard/page.tsx (add new sections)
- frontend/src/components/agency/ClientResponsesSummary.tsx
- frontend/src/components/agency/EscalatedChatsQueue.tsx
- backend/src/modules/dashboard/dashboard.controller.ts

Dashboard Sections to Add:

1. Client Responses Summary (Top Section):
   - Card showing response breakdown:
     * Pending: X opportunities (yellow)
     * Interested: X opportunities (blue)
     * Accepted: X opportunities (green)
     * Declined: X opportunities (red)
   - Click each → filters opportunities table below
   - Shows response rate percentage

2. Escalated Q&A Queue:
   - Section: "Client Questions Needing Response"
   - Cards for each escalated chat:
     * Client name + opportunity title
     * Latest question from client
     * Time since escalation
     * [Respond] button → opens chat
   - Badge showing unread count
   - Sort by: most urgent (oldest first)

3. Restore Requests (already covered in Instance 6)

4. Contact Messages from Accepted Opportunities:
   - Section: "Client Messages"
   - Cards for each contact conversation:
     * Client name + opportunity title
     * Latest message preview
     * Unread indicator
     * [View Conversation] button

Backend Requirements:

1. Dashboard Controller:
   - GET /api/dashboard/summary - Get all counts
   - GET /api/dashboard/escalated-chats - Get chats needing AOPR response
   - GET /api/dashboard/contact-messages - Get contact messages
   - Returns aggregated data for dashboard

2. Response Summary Data:
   - Count opportunities by response_state
   - Group by client for drill-down
   - Calculate response rate

Success Criteria:
✓ Dashboard shows client response breakdown
✓ Shows escalated Q&A chats
✓ Shows contact messages
✓ Shows restore requests
✓ All counts accurate
✓ Click actions work (filter, open chat, etc.)
✓ Real-time updates (refetch on activity)

Start building now!
```

---

## 📊 Coordination Strategy

### Progress Tracking:
Update `PARALLEL_BUILD_ROUND2_PROGRESS.md`:

```markdown
# Round 2 Progress

## Instance 5: Q&A Chat
- [ ] Chat component created
- [ ] AI bot logic implemented
- [ ] Escalation working
- [ ] Messages persist
- [ ] AOPR can respond

## Instance 6: Restore Workflow
- [ ] Client request button
- [ ] AOPR approval queue
- [ ] Approve/deny logic
- [ ] Notifications sent
- [ ] Status updates

## Instance 7: Contact AOPR
- [ ] Chat component created
- [ ] Direct messaging works
- [ ] Notifications sent
- [ ] Messages persist

## Instance 8: AOPR Dashboard
- [ ] Response summary added
- [ ] Escalated queue added
- [ ] Contact messages added
- [ ] Restore queue integrated
- [ ] All counts accurate
```

### Git Coordination:
- Each instance commits frequently
- Prefix commits with instance number: "[Instance 5] Add Q&A chat"
- Pull before pushing if needed
- Instance 1 (coordinator) merges at end

---

## ⚠️ File Conflict Warnings

**These tasks MAY have conflicts - coordinate:**
- ⚠️ Instance 8 updates `/agency/dashboard/page.tsx` (Instance 1 already updated this)
  - Solution: Instance 8 works on a copy, Instance 1 merges carefully

**These are safe (separate files):**
- ✅ Instance 5: New chat files
- ✅ Instance 6: New restore files
- ✅ Instance 7: New contact files

---

## 🎯 Expected Timeline

**Hour 1 (3am-4am):**
- All instances set up and coding
- Basic structure for each feature

**Hour 2 (4am-5am):**
- Core functionality implemented
- Components communicating with backend

**Hour 3 (5am-6am):**
- Polish, testing, integration
- Bug fixes

**Total:** ~3 hours to complete all 4 features

---

## ✅ Integration Phase (After Round 2)

1. Integrate Q&A chat into client dashboard
2. Wire up restore requests
3. Wire up contact AOPR chat
4. Merge AOPR dashboard updates
5. End-to-end testing
6. Commit everything
7. 🎉 Phase 2A COMPLETE!

---

Ready to launch Round 2! 🚀
**Time:** 3:00 AM - Let's do this! 💪
