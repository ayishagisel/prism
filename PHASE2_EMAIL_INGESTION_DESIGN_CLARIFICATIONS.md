# Phase 2 Email Ingestion Design Clarifications

**Date:** December 9, 2025
**Status:** Design Discussion - Implementation TBD

---

## Three Critical Issues Identified

### Issue #1: Email Lifecycle & Zoho State

**Problem:** How does forwarded email interact with Zoho after forwarding?

**Current Understanding (Needs Validation):**

When AOPR sets up a forwarding rule in Zoho Mail:
```
From: newsroom@outlet.com
To: AOPR inbox (in Zoho)
     └─ Auto-forward copy to: ingest@prism.local
```

**What happens to the original email in Zoho:**
- ✓ Original email STAYS in Zoho inbox (unchanged)
- ✓ Original remains marked "unread" in Zoho
- ✓ A COPY is forwarded to PRISM inbox
- ⚠️ Zoho has NO knowledge of PRISM's interaction

**Problem:** If AOPR rep marks it "handled" in PRISM, Zoho still shows it as unread. Creates duplicate tracking across two systems.

**Solution Options:**

**Option A: Manual Zoho Cleanup (Current)**
1. AOPR receives email in Zoho
2. Zoho forwards copy to PRISM
3. AOPR reviews in PRISM and approves
4. AOPR manually marks as "read" in Zoho (or moves to folder)
- Pros: Simple, no integration needed
- Cons: Extra manual step, risk of duplicate processing

**Option B: Zoho-PRISM Synchronization (Future)**
1. When AOPR approves opportunity in PRISM
2. PRISM triggers Zoho API call: `markEmailAsProcessed(messageId)`
3. Zoho marks email as read / moves to "Processed" folder
- Pros: Single source of truth
- Cons: Requires Zoho API integration (Phase 3+)

**Option C: Dedicate Zoho Folder (Recommended MVP)**
1. AOPR receives all opportunities in Zoho folder: "Opportunities"
2. Set forwarding rule ONLY on that folder
3. AOPR can see what's been forwarded (tracked by folder)
4. After processing in PRISM, move to "Opportunities-Processed"
- Pros: Clean separation, no API needed, explicit tracking
- Cons: Requires AOPR discipline to organize inbox

---

### Issue #2: Unrelated Emails in Inbox

**Problem:** How do we prevent spam, internal emails, and non-opportunity messages from being ingested as opportunities?

**Current Design Gap:**
Our implementation currently:
```typescript
async fetchNewEmails() {
  // Gets ALL unseen emails from inbox
  const uids = await this.imap.search({ unseen: true });
  // No filtering - processes everything
}
```

This would ingest:
- ❌ Spam
- ❌ Internal AOPR emails
- ❌ Password reset notifications
- ❌ Meeting confirmations
- ✅ Actual opportunities (mixed in)

**Solution Options:**

**Option A: Sender Whitelist (Best for MVP)**
Only process emails from known opportunity sources:
```typescript
const OPPORTUNITY_SOURCES = [
  'newsroom@',
  '@outlet.com',
  '@journalismassoc.org',
  'editor@',
];

async fetchNewEmails() {
  const allEmails = await this.imap.search({ unseen: true });

  return allEmails.filter(email => {
    const senderDomain = email.from.match(/@(.+)/)[1];
    return OPPORTUNITY_SOURCES.some(source =>
      senderDomain.includes(source)
    );
  });
}
```
- Pros: Simple, fast, no manual review needed
- Cons: Requires AOPR to maintain whitelist, misses new sources

**Option B: Dedicated Zoho Folder (Recommended)**
1. AOPR creates folder: "Opportunities - To PRISM"
2. Forwarding rule only applies to this folder
3. PRISM only polls this folder
4. Non-opportunities never enter the pipeline
```typescript
// Configuration
EMAIL_FOLDER="Opportunities - To PRISM"

// Only polls this folder
await this.imap.mailboxOpen("Opportunities - To PRISM");
```
- Pros: 100% accurate filtering, AOPR in control
- Cons: Requires AOPR to manually organize inbox

**Option C: Flag-Based Filtering**
1. AOPR marks opportunity emails with a custom flag: "OPPORTUNITY"
2. PRISM only processes flagged emails
```typescript
async fetchNewEmails() {
  const emails = await this.imap.search({
    unseen: true,
    flagged: true  // Only emails AOPR marked as opportunities
  });
}
```
- Pros: Explicit human marking, no automation errors
- Cons: Extra step for AOPR on every email

**Option D: Regex Pattern Matching (Advanced)**
Detect opportunity keywords in subject/body:
```typescript
const OPPORTUNITY_PATTERNS = [
  /deadline|due date/i,
  /pitch|opportunity|feature/i,
  /media|coverage|press/i,
];

function isOpportunity(email) {
  return OPPORTUNITY_PATTERNS.some(pattern =>
    pattern.test(`${email.subject} ${email.body}`)
  );
}
```
- Pros: Automatic, catches variations
- Cons: High false positive rate, misses plain emails

---

### Issue #3: Email Duplication Prevention

**Current Implementation:**
We prevent re-processing via email message ID:
```typescript
const exists = await db.select()
  .from(pendingOpportunities)
  .where(
    and(
      eq(pendingOpportunities.source_email_id, email.messageId)
    )
  );
```

**But new problems emerge:**

**Problem A: Forwarded Emails Have Different Message IDs**
- Original in Zoho: `<123@outlet.com>`
- After forwarding to PRISM: `<456@prism.local>` ← Different!
- Result: We see it as a new email every poll cycle

**Solution:**
Extract original email's Message-ID from headers before forwarding:
```typescript
// Forwarded email contains original headers
// Extract: X-Original-Message-ID or similar
function extractOriginalMessageId(email) {
  // Check for forwarded header markers
  const originalId = email.headers['x-original-message-id']
    || email.headers['message-id'];
  return originalId;
}
```

**Problem B: AOPR Might Forward Same Email Twice**
1. Email arrives in Zoho
2. AOPR forwards to PRISM
3. AOPR forwards same email again by mistake
4. We process it twice

**Solution:**
Use email signature (sender + subject + date) as secondary dedup key:
```typescript
function getEmailSignature(email) {
  return `${email.from}||${email.subject}||${email.receivedDate}`;
}

const exists = await db.select()
  .from(pendingOpportunities)
  .where(
    or(
      eq(pendingOpportunities.source_email_id, email.messageId),
      eq(pendingOpportunities.raw_email_data,
        { signature: getEmailSignature(email) })
    )
  );
}
```

---

## Recommended MVP Configuration

### For AOPR Specifically:

**Step 1: Organize Zoho Folders**
```
Opportunities (all incoming opportunity emails)
├─ Opportunities-To-Process (emails to forward to PRISM)
├─ Opportunities-Processed (handled by AOPR rep)
└─ Opportunities-Archive (old, completed)
```

**Step 2: Set Forwarding Rule in Zoho Mail**
- **Condition:** Emails in folder "Opportunities-To-Process"
- **Action:** Forward to `ingest@prism.local`
- **Keep original:** Yes (so AOPR can track)

**Step 3: Configure PRISM**
```bash
# .env
EMAIL_HOST=zoho.com
EMAIL_PORT=993
EMAIL_USER=aopr@zoho.com
EMAIL_PASSWORD=app-specific-password
EMAIL_FOLDER="Opportunities-To-Process"  # Only poll this folder
EMAIL_POLL_INTERVAL=300000              # 5 minutes
```

**Step 4: Manual Workflow**
1. Opportunity email arrives in Zoho
2. AOPR reviews in Zoho, moves to "Opportunities-To-Process"
3. Zoho rule auto-forwards copy to PRISM
4. AOPR reviews in PRISM pending queue
5. AOPR approves + assigns to clients
6. AOPR moves original in Zoho to "Opportunities-Processed"

---

## Implementation Changes Needed

### Backend Modifications Required:

**1. Add folder selection to service:**
```typescript
async fetchNewEmails(folder: string = 'INBOX') {
  await this.imap.mailboxOpen(folder, { readOnly: true });
  // ... rest of logic
}
```

**2. Add deduplication by signature:**
```typescript
async createPendingOpportunity(...) {
  // Check both message ID AND signature
  const duplicate = await checkDuplicate(email);
  if (duplicate) {
    logger.warn('Email already processed:', email.messageId);
    return null;
  }
  // ... create record
}
```

**3. Update configuration:**
```typescript
// config/env.ts
export const config = {
  email: {
    folder: process.env.EMAIL_FOLDER || 'INBOX',
    pollInterval: parseInt(process.env.EMAIL_POLL_INTERVAL || '300000'),
  },
};
```

**4. Add whitelist support (optional):**
```typescript
// config/email-whitelist.ts
export const OPPORTUNITY_SOURCES = [
  'newsroom@',
  'editor@',
  '@journalistsource.org',
  // AOPR maintains this list
];
```

---

## Future Enhancement: Zoho Integration (Phase 3+)

Once Phase 2 email ingestion is working, we can add:

**POST /api/opportunities/:id/zoho-sync**
```typescript
async zohoSync(opportunityId, status) {
  // After AOPR approves in PRISM:
  // 1. Get original email message ID
  // 2. Call Zoho Mail API: move to folder
  // 3. Call Zoho CRM API: create Deal/Task (optional)
  // 4. Mark as processed
}
```

This would give us:
- ✅ Single source of truth
- ✅ Automatic Zoho cleanup
- ✅ CRM synchronization
- But requires Zoho OAuth (which we're avoiding in MVP)

---

## Decision Matrix: What Should We Do?

| Aspect | Option | Recommendation | Effort |
|--------|--------|---|---|
| **Email Lifecycle** | Manual cleanup OR Dedicated folder | **Dedicated folder** | 0 code changes |
| **Unrelated Emails** | Whitelist OR Folder OR Flag | **Dedicated folder** | Config only |
| **Duplication** | Message ID OR Signature | **Both** | Code change |
| **Zoho Integration** | Now OR Phase 3+ | **Phase 3+** | MVP avoids OAuth |

---

## Summary

**The key insight:** Rather than trying to make PRISM smart about filtering, give AOPR a tool to organize Zoho first.

**Recommended MVP Flow:**
1. AOPR marks opportunities in Zoho (folder)
2. Zoho forwards to PRISM (existing Zoho feature)
3. PRISM ingests (our implementation)
4. AOPR reviews + approves in PRISM
5. AOPR marks as processed in Zoho (manual)

**Later (Phase 3):**
- Add Zoho API sync to automate step 5
- Add CRM integration for deeper Zoho sync

**This approach:**
✅ Works today with no complex APIs
✅ Keeps AOPR in control of email organization
✅ Avoids Zoho OAuth complexity in MVP
✅ Sets foundation for future automation

---

## Questions for AOPR/User:

1. Is it acceptable for AOPR rep to manually organize Zoho inbox into folders?
2. Should PRISM auto-sync back to Zoho (Phase 3) or manual cleanup is fine?
3. Are there specific email sources/domains AOPR wants whitelisted?
4. Should we implement signature-based deduplication or is message ID enough?

