# Phase 2: Email Forwarding Intake Foundation

**Status:** ✅ COMPLETE
**Date:** December 9, 2025
**Focus:** Feasible Mode Email Ingestion per PRD

---

## What We Built

A complete **email forwarding intake system** that allows AOPR to receive opportunities via email and route them to clients through PRISM's human-in-the-loop workflow.

This implementation satisfies the PRD requirement:
> "PRISM (MVP) supports three guaranteed intake methods... Email Forwarding to PRISM"

---

## Architecture

### Backend Modules Created

**`modules/email-ingest/`**
- `email.service.ts` — Email polling, parsing, and opportunity creation
- `email.controller.ts` — HTTP API endpoints

**New Database Table**
- `pending_opportunities` — Staging table for human review

---

## Key Features

### 1. Email Polling Service (`email.service.ts:189-216`)
```typescript
pollEmails(agencyId, emailConfig) → Promise<number>
```
- Connects to IMAP server (Gmail, Outlook, custom)
- Fetches unseen emails
- Parses email content (subject, body, sender, attachments)
- Creates pending opportunities for review
- Deduplicates by email message ID

### 2. Email Parsing (`email.service.ts:119-148`)
```typescript
parseEmailToOpportunity(email) → ParsedOpportunity
```
Extracts from email:
- **Title** — email subject
- **Description** — email body
- **Deadline** — parsed from common patterns ("deadline: Jan 15")
- **Media Type** — inferred from keywords (podcast, newsletter, event, etc.)
- **Outlet Name** — extracted from sender email domain

### 3. Pending Opportunities Queue
```sql
CREATE TABLE pending_opportunities (
  id text PRIMARY KEY,
  agency_id text REFERENCES agencies(id),
  email_from, email_subject, email_body,
  parsed_title, parsed_description, parsed_deadline,
  parsed_media_type, parsed_outlet_name,
  source_email_id text,                    -- Deduplication key
  status: 'pending_review' | 'assigned' | 'discarded',
  assigned_client_ids jsonb DEFAULT '[]',
  assigned_by_user_id text REFERENCES agency_users(id),
  created_at, updated_at
);
```

### 4. API Endpoints (Registered in `app.ts:138-142`)

**GET `/api/opportunities/pending-review`**
- List all pending opportunities for agency
- Used by review queue UI

**POST `/api/opportunities/pending-review/:id/assign`**
- Move pending opportunity to "assigned" status
- Link to client IDs
- Record user who assigned it
- Bridge to create actual Opportunity record

**POST `/api/opportunities/pending-review/:id/discard`**
- Mark as "discarded"
- Remove from review queue

**POST `/api/email-ingest/poll`**
- Manually trigger email polling
- Returns count of new opportunities created
- For testing or scheduled task invocation

---

## How It Works (End-to-End Flow)

```
1. AOPR receives opportunity email
   └─ forwards to: ingest@prism.local (configured in environment)

2. PRISM polling service (runs every 5 minutes or on-demand)
   └─ Connects to IMAP inbox
   └─ Fetches unseen emails
   └─ Parses each email

3. For each new email:
   └─ Extract: subject, body, sender, deadlines
   └─ Infer: media type, outlet name
   └─ Create: pending_opportunities record with status='pending_review'

4. AOPR rep opens PRISM dashboard
   └─ Sees "Pending Opportunities" review queue
   └─ Reviews email content & parsed fields

5. AOPR rep assigns to clients:
   └─ Select clients (checkbox multi-select)
   └─ Click "Create Opportunity"
   └─ Backend:
      ├─ Updates pending_opportunities.status='assigned'
      ├─ Creates opportunities record (next phase)
      └─ Creates client_opportunity_statuses (next phase)

6. Clients receive in PRISM
   └─ Respond: Interested / Accepted / Declined
   └─ Track in dashboard
```

---

## Configuration

### Environment Variables

```bash
# Email server credentials
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_USER=prism-ingest@domain.com
EMAIL_PASSWORD=app-specific-password

# Email polling interval (milliseconds)
EMAIL_POLL_INTERVAL=300000  # 5 minutes
```

### Supported Email Providers

- **Gmail** — imap.gmail.com:993 (requires app password)
- **Outlook** — outlook.office365.com:993
- **Custom** — Any IMAP server

---

## Database Schema

Added to `/backend/src/db/schema.ts`:

```typescript
export const pendingOpportunities = pgTable('pending_opportunities', {
  id: text().primaryKey(),
  agency_id: text().notNull().references(() => agencies.id),
  email_from: text().notNull(),
  email_subject: text().notNull(),
  email_body: text().notNull(),
  email_html: text(),
  parsed_title: text(),
  parsed_description: text(),
  parsed_deadline: timestamp(),
  parsed_media_type: text(),
  parsed_outlet_name: text(),
  source_email_id: text(),  // For deduplication
  status: text().default('pending_review'),
  assigned_client_ids: jsonb().default('[]'),
  assigned_by_user_id: text().references(() => agencyUsers.id),
  notes: text(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
});
```

**Indexes:**
- `pending_opps_agency_id_idx` — For filtering by agency
- `pending_opps_status_idx` — For filtering pending vs assigned
- `pending_opps_email_id_idx` — For deduplication by email ID

---

## Dependencies Added

```json
{
  "dependencies": {
    "mailparser": "^3.6.8",
    "imapflow": "^1.1.7"
  },
  "devDependencies": {
    "@types/mailparser": "^3.4.4"
  }
}
```

---

## Testing

### Manual Poll Test

```bash
# Start backend
npm run dev -w backend

# Test email polling (requires valid EMAIL_* env vars)
curl -X POST http://localhost:3001/api/email-ingest/poll \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### Get Pending Opportunities

```bash
curl http://localhost:3001/api/opportunities/pending-review \
  -H "Authorization: Bearer <token>"
```

---

## What's Next: Phase 2 Completion

**Next Steps (Frontend & Integration):**

1. **Pending Review UI** (`/agency/opportunities/pending-review`)
   - Display pending opportunities in a card-based queue
   - Show parsed email content with inline preview
   - Multi-select client checkboxes
   - "Create Opportunity" button

2. **Create Actual Opportunities**
   - Bridge pending_opportunities → opportunities
   - Create ClientOpportunityStatus records for each selected client
   - Auto-generate follow-up tasks if needed

3. **Email Scheduling**
   - Implement cron job or Node schedule to auto-poll emails
   - Log polling activity
   - Handle failures gracefully

4. **Enhance Parsing** (Optional)
   - AI/ML-based deadline extraction
   - Media type classification
   - Client fit scoring

---

## Key Design Decisions

### 1. Deduplication by Email ID
Instead of raw email content, we use IMAP message UID to prevent duplicate pending opportunities if polling runs multiple times.

### 2. Human-in-the-Loop
Opportunities sit in `pending_review` state until AOPR rep explicitly assigns them to clients. No automatic routing.

### 3. Staging Table
`pending_opportunities` is a staging layer. Only becomes actual `opportunities` record after human approval + client assignment.

### 4. Status Machine
```
pending_review → assigned → (creates opportunities + client_statuses)
              → discarded → (deleted from queue)
```

### 5. No Token Persistence
Email credentials are stored only in environment variables, never persisted to database. Avoids the Zoho OAuth complexity that blocked the original plan.

---

## Code Structure

```
backend/src/modules/email-ingest/
├── email.service.ts      (254 lines)
│   ├── EmailIngestionService class
│   ├── IMAP connection mgmt
│   ├── Email parsing
│   ├── Pending opp CRUD
│   └── Polling orchestration
│
└── email.controller.ts   (107 lines)
    ├── EmailIngestController class
    ├── GET pending-review endpoint
    ├── POST assign endpoint
    ├── POST discard endpoint
    └── POST poll endpoint

backend/src/db/schema.ts
└── pendingOpportunities table (exported)

backend/src/app.ts
└── 4 new routes registered
    ├── GET /api/opportunities/pending-review
    ├── POST /api/opportunities/pending-review/:id/assign
    ├── POST /api/opportunities/pending-review/:id/discard
    └── POST /api/email-ingest/poll
```

---

## Summary

✅ **Phase 2 Foundation Ready**

We've implemented the email ingestion layer per the PRD's "Feasible Mode" requirement. This provides:

- Email forwarding intake (matching the PRD spec)
- Human-in-the-loop review (AOPR rep approves before routing)
- Simple, low-friction setup (email credentials only, no OAuth)
- Extensible parsing (can enhance with AI later)
- Clean separation of concerns (staging → approval → routing)

**Status:** Ready for UI and integration in Phase 2 continuation.

Next: Build the "Pending Review" UI and connect to opportunity creation flow.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
