# Solutions: Getting Zoho Emails Without OAuth Complexity

## Your Actual Requirement
**Pull opportunity emails that are coming INTO Zoho → Process them in PRISM → Keep human in the loop for client assignment**

This is NOT about syncing CRM data. It's about **capturing the email stream that Zoho is already receiving**.

---

## Solution 1: Zoho Email (Forwarding) - SIMPLEST ⭐ RECOMMENDED

### How It Works
Zoho receives opportunity emails. Instead of pulling from Zoho API, we **forward those emails directly to PRISM**.

**Setup:**
1. In Zoho, create email forwarding rule or use email capture
2. Forward incoming opportunity emails to: `prism-ingest@yourserver.com`
3. PRISM reads that inbox

**Pros:**
- ✓ No OAuth needed
- ✓ No token persistence
- ✓ No database migration issues
- ✓ Zoho is just an email relay (works today)
- ✓ 100% human review in loop
- ✓ Can implement in 2-3 days

**Cons:**
- ✗ Requires Zoho email forwarding setup (one-time config)
- ✗ Still need to poll/read emails

**Implementation:**
```typescript
// Simple email polling module
modules/email-ingest/
├── email.service.ts      // IMAP connection, polling
├── email.parser.ts       // Extract title, date, content
├── email.controller.ts   // API to view pending opportunities
└── pending-opportunity.ts // New table for review queue
```

**No database schema changes needed** - opportunities table already exists.

---

## Solution 2: Zoho Webhook + Direct HTTP (Zero Polling)

### How It Works
Instead of PRISM pulling from Zoho, **Zoho pushes emails to PRISM** via webhook.

**Setup:**
1. In Zoho Settings, configure webhook for "Email Received" event
2. Zoho sends POST to: `https://yourdomain.com/api/opportunities/from-zoho-webhook`
3. PRISM receives and stores

**Pros:**
- ✓ Real-time (no polling lag)
- ✓ No OAuth needed
- ✓ Zoho webhooks don't require token persistence
- ✓ PRISM just receives POST requests
- ✓ Can add signature verification for security

**Cons:**
- ✗ Zoho webhook setup complexity (varies by plan)
- ✗ Need to handle webhook retries
- ✗ Need to verify webhook signatures

**Implementation:**
```typescript
// In app.ts
router.post('/api/opportunities/from-zoho-webhook',
  verifyZohoSignature,  // Verify it's really Zoho
  ingestOpportunityEmail
);

// Very simple:
async ingestOpportunityEmail(req, res) {
  const { email_from, email_subject, email_body } = req.body;

  const opportunity = {
    agency_id: 'agency_aopr',  // Hardcoded for now
    title: email_subject,
    description: email_body,
    source: 'zoho_email',
    status: 'pending_review',
    created_at: new Date()
  };

  // Use existing opportunities table - no new schema!
  await db.opportunities.insert(opportunity);

  return { success: true };
}
```

**KEY INSIGHT**: No OAuth, no token persistence, no complex sync logic.

---

## Solution 3: Zoho CRM API (Read-Only, No Token Persistence)

### How It Works
Use Zoho API but **don't store tokens**. Instead, use Zoho's **self-client OAuth with manual re-auth** when needed.

**Setup:**
1. User clicks "Connect to Zoho" button (same UI)
2. User authorizes PRISM in Zoho (same auth flow)
3. **Instead of saving token**: Use the auth code to get a short-lived access token
4. **Immediately use** that token to fetch emails/opportunities
5. **Discard the token** (don't persist it)
6. Next time: User re-authorizes (or use refresh token from initial auth)

**Pros:**
- ✓ No token persistence (avoids our main blocker!)
- ✓ Still uses Zoho API
- ✓ User controls when to sync

**Cons:**
- ✗ User must re-authorize frequently
- ✗ Still requires OAuth flow (but simpler)
- ✗ Not automated sync

**Implementation:**
```typescript
// Instead of storing tokens:
async syncZohoEmails(agencyId, authorizationCode) {
  // Exchange code for short-lived token
  const token = await getZohoAccessToken(authorizationCode);

  // Immediately use it
  const emails = await zoho.getEmails(token);

  // Process emails into opportunities
  for (const email of emails) {
    await db.opportunities.insert({
      agency_id: agencyId,
      title: email.subject,
      description: email.body,
      source: 'zoho',
      status: 'pending_review'
    });
  }

  // ⚠️ CRITICAL: Don't save the token!
  // It expires in 1 hour anyway

  return { imported: emails.length };
}
```

**Result**: No token persistence, no refresh_tokens table needed.

---

## Solution 4: Manual CSV Export (Human Bridge)

### How It Works
**Zoho has these emails → User manually exports them as CSV → Upload to PRISM**

This seems backward, but actually:

**Setup:**
1. Zoho consolidates opportunity emails
2. User exports as CSV (built-in Zoho feature)
3. User uploads to PRISM
4. PRISM processes (existing CSV import already works!)

**Pros:**
- ✓ Zero OAuth issues
- ✓ Zero database changes
- ✓ CSV import already implemented
- ✓ Full human review

**Cons:**
- ✗ Manual process (not automatic)
- ✗ Requires user action

**Use Case**: If Zoho email forwarding is complex, this is a fallback.

---

## Comparison Matrix

| Solution | OAuth Needed | Token Persistence | Setup Complexity | Time to Implement | Automation |
|----------|-------------|------------------|------------------|------------------|-----------|
| 1. Email Forwarding | No | No | Low | 2-3 days | High |
| 2. Zoho Webhook | No | No | Medium | 3-4 days | Very High |
| 3. API (No Persist) | Yes | No | Medium | 2-3 days | Medium |
| 4. CSV Export | No | No | Zero | 1 day | Low |

---

## Recommended: Solution 1 (Email Forwarding) + Solution 2 (Webhook) Hybrid

### Why This Combo Works

**Phase 2A (Quick win - 3 days):**
1. Setup Zoho email forwarding to PRISM
2. Build email polling module
3. Create "Review Pending Opportunities" UI
4. Agency rep assigns clients
5. **Mark Phase 2 complete** ✓

**Phase 2B (Later - when you have time):**
1. Configure Zoho webhook instead of polling
2. Switch from email polling to webhook receive
3. Automated real-time instead of polling
4. No code changes needed, just config

**Benefit**: You unblock immediately with forwarding, then upgrade to webhooks when convenient.

---

## Avoiding Database Issues With This Approach

**Key difference**: These solutions use **existing tables only**:

```typescript
// opportunities table (already exists!)
{
  id: uuid
  agency_id: text        // NOT uuid! Keep as string 'agency_aopr'
  title: string
  description: text
  source: 'email' | 'zoho' | 'csv'
  status: 'pending_review' | 'published'
  deadline: date
  created_at: timestamp
}

// No new tables needed!
// No UUID migration issues!
// No missing refresh_tokens table!
```

**Skip the blocker tables entirely:**
- ✗ Don't create zoho_tokens table (no token persistence)
- ✗ Don't use refresh_tokens table (no refresh logic)
- ✗ Just use opportunities table (already working)

---

## Implementation Roadmap: Email Forwarding Solution

### Backend Changes (Minimal)

```typescript
// New module: modules/email-ingest/
├── email.service.ts
│   ├── connectToEmailServer(credentials)
│   ├── fetchNewEmails(since?: date)
│   ├── parseEmailToOpportunity(email) → Opportunity
│   └── markEmailAsProcessed(emailId)
│
├── email.controller.ts
│   ├── POST /api/opportunities/from-email  (create from parsed email)
│   ├── GET /api/opportunities/pending-review (list unparsed)
│   └── POST /api/opportunities/assign-clients (link to clients)
│
└── models/
    └── email-metadata.ts (track which emails processed)

// Configuration
PRISM_EMAIL_HOST=imap.gmail.com
PRISM_EMAIL_USER=prism-ingest@domain.com
PRISM_EMAIL_PASSWORD=...
PRISM_EMAIL_POLL_INTERVAL=300000  // 5 minutes
```

### Frontend Changes (Simple UI)

```typescript
// New page: /agency/opportunities/pending-review
<div className="pending-review-queue">
  {pendingEmails.map(email => (
    <div className="email-card">
      <h3>{email.subject}</h3>
      <p>{email.body.substring(0, 200)}...</p>
      <small>From: {email.from}</small>

      <div className="client-selector">
        <label>Assign to Clients:</label>
        <Checkbox.Group value={selectedClients} onChange={setSelectedClients}>
          {clients.map(c => (
            <Checkbox value={c.id}>{c.name}</Checkbox>
          ))}
        </Checkbox.Group>
      </div>

      <Button onClick={() => assignToClients(email, selectedClients)}>
        Create Opportunity
      </Button>
      <Button variant="ghost" onClick={() => dismissEmail(email)}>
        Dismiss
      </Button>
    </div>
  ))}
</div>
```

### Database Schema (Zero Changes)

Just use existing `opportunities` table. Done.

---

## Next Steps

1. **Answer these questions**:
   - Can you set up email forwarding in Zoho? (Feature available?)
   - What email service: Gmail, Outlook, custom server?
   - Should we start with polling or jump to webhooks?

2. **If yes to forwarding**: I'll build the email polling module
3. **If no to forwarding**: We pivot to Solution 3 (API without persistence) or Solution 4 (CSV)

---

## Summary

**Don't try to sync from Zoho CRM.** Instead, **catch the emails Zoho is already receiving** and pipe them directly to PRISM.

- Email Forwarding (Solution 1): Simplest, fastest, works today
- Zoho Webhook (Solution 2): Most automated, real-time
- API without Persistence (Solution 3): Middle ground if webhooks unavailable
- CSV Export (Solution 4): Human-bridged fallback

All **avoid the OAuth token persistence problem entirely** because they don't need to store tokens.

**Let me know which path appeals to you.**
