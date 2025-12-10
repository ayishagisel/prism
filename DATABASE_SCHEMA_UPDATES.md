# Database Schema Updates for Phase 2A

**Date:** December 10, 2025
**Status:** Schema Updated - Ready for Migration

---

## Summary

Updated PRISM database schema to support:
- Multi-tenant authentication with platform admins
- Invitation system for onboarding users
- Client Q&A chat system with AI bot
- Opportunity restore requests
- Notification preferences (email/push/SMS)

---

## New Enums Added

```sql
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE invitation_role AS ENUM ('platform_admin', 'agency_admin', 'agency_member', 'client_owner', 'client_team');
CREATE TYPE chat_message_type AS ENUM ('client_question', 'ai_response', 'aopr_response', 'system_message');
CREATE TYPE restore_request_status AS ENUM ('pending', 'approved', 'denied');
```

---

## New Tables Added

### 1. **platform_admins**
Super users who manage agencies across the platform.

```sql
CREATE TABLE platform_admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status user_status DEFAULT 'active',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Purpose:** Platform-level administrators who invite and manage agency admins.

---

### 2. **invitations**
Tracks all invitation tokens for onboarding new users.

```sql
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  agency_id TEXT REFERENCES agencies(id),
  role invitation_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by_user_id TEXT,
  invited_by_user_type TEXT,
  status invitation_status DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Purpose:**
- Platform admin invites agency admins
- Agency admins invite agency reps & clients
- Secure token-based registration flow

**Flow:**
```
Platform Admin → creates invitation → sends email with token
User clicks link → validates token → registers with pre-assigned role & agency
```

---

### 3. **opportunity_chats**
Q&A messages between clients and AOPR (with AI bot support).

```sql
CREATE TABLE opportunity_chats (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  client_user_id TEXT REFERENCES client_users(id),
  message_type chat_message_type NOT NULL,
  sender_type TEXT NOT NULL,
  sender_id TEXT,
  message TEXT NOT NULL,
  is_escalated BOOLEAN DEFAULT false,
  escalated_to_user_id TEXT REFERENCES agency_users(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Purpose:**
- Client asks questions about opportunities
- AI bot responds when it can answer
- Escalates to AOPR rep when needed
- Also used for "Contact AOPR" on accepted opportunities

**Message Types:**
- `client_question` - Client asks a question
- `ai_response` - Bot provides an answer
- `aopr_response` - Human AOPR rep responds
- `system_message` - Automated system messages

---

### 4. **restore_requests**
Clients can request declined opportunities be restored.

```sql
CREATE TABLE restore_requests (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  client_user_id TEXT NOT NULL REFERENCES client_users(id),
  status restore_request_status DEFAULT 'pending',
  reviewed_by_user_id TEXT REFERENCES agency_users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Purpose:**
- Client declines opportunity but later reconsiders
- Client clicks "Request Restore" (only if deadline hasn't passed)
- AOPR reviews and approves/denies
- If approved, opportunity moves back to client's "New" tab

**Workflow:**
```
Client Declined → Deadline not passed → Request Restore
         ↓
AOPR sees request in dashboard
         ↓
AOPR clicks Approve or Deny
         ↓
If Approved: status changes declined → new
If Denied: stays declined
```

---

### 5. **notification_preferences**
User preferences for notifications (email/push/SMS).

```sql
CREATE TABLE notification_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  phone_number TEXT,
  push_subscription JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Purpose:**
- Clients configure notification channels
- Agency reps configure notification channels
- Web Push API subscription stored in `push_subscription`
- SMS saved for Phase 2B (requires Twilio)

**Default Preferences:**
- Email: ✅ Enabled
- Push: ✅ Enabled
- SMS: ❌ Disabled (Phase 2B)

---

## Existing Tables (No Changes)

These tables already exist and work perfectly for Phase 2A:

### ✅ **client_opportunity_statuses**
Already has `response_state` enum with:
- `pending` - New opportunity (client hasn't acted)
- `interested` - Client asked questions
- `accepted` - Client accepted
- `declined` - Client declined
- `no_response` - Deadline passed with no action

**No changes needed!** This table already tracks the 4 client tabs:
- New tab → `response_state = 'pending'`
- Interested tab → `response_state = 'interested'`
- Accepted tab → `response_state = 'accepted'`
- Declined tab → `response_state = 'declined'`

---

## How to Apply Schema Changes

### Step 1: Run Migration in Neon

1. Go to https://console.neon.tech/
2. Navigate to your PRISM project
3. Click "SQL Editor" in the left sidebar
4. Open `/Users/ayishaoglivie/prism/backend/COPY_PASTE_TO_NEON.sql`
5. Copy the ENTIRE file
6. Paste into Neon SQL Editor
7. Click "Run"

### Step 2: Verify Tables Created

Check that these new tables appear in Neon's left sidebar:
- ✅ platform_admins
- ✅ invitations
- ✅ opportunity_chats
- ✅ restore_requests
- ✅ notification_preferences

### Step 3: TypeScript Build

The schema.ts file has been updated. TypeScript may show deprecation warnings but these don't affect functionality.

---

## What's Next

After migration completes:

1. **Build multi-tenant auth** - Platform admins, agency scoping
2. **Build invitation system** - Email invites with tokens
3. **Build client portal** - Dashboard with 4 tabs
4. **Build Q&A chat** - AI bot + AOPR escalation
5. **Build notifications** - Email + push alerts
6. **Build restore workflow** - AOPR approval queue

---

## Database Relationships

```
platform_admins
  └── invites → agency_admins (via invitations table)
       └── agency_admins invite → agency_reps & clients (via invitations)
            └── clients belong to → agency
                 └── clients have → opportunities (via client_opportunity_statuses)
                      └── opportunities have → chats (via opportunity_chats)
                           └── chats can → escalate to AOPR reps
```

**Multi-Tenancy Enforcement:**
- All data scoped by `agency_id`
- Middleware enforces agency isolation
- No cross-agency data leakage

---

## Summary

**Added 5 new tables:**
1. platform_admins - Super users
2. invitations - Token-based onboarding
3. opportunity_chats - Q&A with AI + AOPR
4. restore_requests - Client change-of-mind flow
5. notification_preferences - Email/push/SMS config

**Added 4 new enums:**
1. invitation_status
2. invitation_role
3. chat_message_type
4. restore_request_status

**Status:** ✅ Schema files updated, ready for Neon migration

**Next Step:** Run SQL migration in Neon console
