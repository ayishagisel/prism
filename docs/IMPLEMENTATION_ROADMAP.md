# PRISM - Dec 18 Demo Day Implementation Roadmap

**Target Demo Date:** December 18, 2024
**Current Date:** December 4, 2024
**Days Remaining:** 14 days

---

## Executive Summary

This roadmap outlines the remaining work to transform PRISM from a demo app into a production-ready platform that can go live immediately after the Dec 18 stakeholder presentation.

**Key Requirements:**
- ✅ Real authentication (registration, email verification, login, password reset)
- ✅ Zoho CRM integration (real opportunities from Zoho CRM)
- ✅ Client portal (clients can log in and respond to opportunities)
- ✅ End-to-end workflow (Zoho → PRISM → Client → Response → Email)

---

## Phase 1: Real Authentication (2 days: Dec 4-5)

### Components

#### 1.1 Registration Endpoint
**File:** `backend/src/modules/auth/auth.controller.ts`

```typescript
async register(req: Request, res: Response) {
  // Input validation
  // Check if user already exists
  // Hash password with bcryptjs (rounds: 10)
  // Create agency_users or client_users record
  // Generate email verification token (24hr expiry)
  // Send verification email via emailService
  // Return success with user info
}
```

**Database Schema:** Already have `agencyUsers` and `clientUsers` tables with `password_hash`

#### 1.2 Email Verification Flow
**File:** `backend/src/modules/auth/auth.service.ts`

```typescript
async generateEmailVerificationToken(userId, userType, email)
async verifyEmail(token)
```

**Tables:** `emailVerificationTokens` (already created)

#### 1.3 Password Reset Flow
**File:** `backend/src/modules/auth/auth.service.ts`

```typescript
async generatePasswordResetToken(email, userType)
async resetPassword(token, newPassword)
```

**Tables:** `passwordResetTokens` (already created)

#### 1.4 Login Endpoint (Replace Demo Mode)
**File:** `backend/src/modules/auth/auth.controller.ts`

```typescript
async login(req: Request, res: Response) {
  // Get email + password from request
  // Look up user in agencyUsers OR clientUsers
  // Compare password with hash
  // Generate JWT token pair
  // Return tokens + user info
}
```

### Frontend Changes
- Update `/login` page to show registration toggle
- Create `/register` page
- Add "Forgot password?" flow
- Add email verification page

### API Endpoints to Add
```
POST /api/auth/register - Agency user registration
POST /api/auth/register-client - Client user registration
POST /api/auth/verify-email - Verify email with token
POST /api/auth/request-password-reset - Request reset email
POST /api/auth/reset-password - Reset password with token
```

---

## Phase 2: Zoho Integration (3 days: Dec 6-8)

### Prerequisites
- Zoho CRM account with API access
- OAuth application credentials (Client ID, Client Secret)
- API scopes: CRM.modules.read, Webhooks.events.create

### Components

#### 2.1 Zoho OAuth Setup
**File:** `backend/src/config/zoho.ts`

```typescript
export const zohoConfig = {
  client_id: process.env.ZOHO_CLIENT_ID,
  client_secret: process.env.ZOHO_CLIENT_SECRET,
  redirect_uri: process.env.ZOHO_REDIRECT_URI,
  auth_url: 'https://accounts.zoho.com/oauth/v2/auth',
  token_url: 'https://accounts.zoho.com/oauth/v2/token',
  api_url: 'https://www.zohoapis.com/crm/v2',
}
```

#### 2.2 Zoho Service
**File:** `backend/src/modules/zoho/zoho.service.ts`

```typescript
class ZohoService {
  // OAuth token management
  async getAuthorizationUrl()
  async exchangeCodeForToken(code)
  async refreshAccessToken(refreshToken)

  // Data fetching
  async getOpportunities(agencyId) // Get "Deals" module
  async getClients(agencyId) // Get "Accounts" module
  async syncopportunities()

  // Webhook handling
  async handleWebhookEvent(event)
}
```

#### 2.3 Webhook Ingestion
**File:** `backend/src/modules/zoho/zoho.controller.ts`

```
POST /api/webhooks/zoho - Receive Zoho webhook events
```

**Webhook Events to Handle:**
- Opportunity.created - New deal/opportunity
- Opportunity.updated - Deal status change
- Opportunity.deleted - Deal removed

#### 2.4 Field Mapping
```
Zoho Deals → PRISM Opportunities
- Deal Name → title
- Expected Close Date → deadline
- Deal Owner → assigned_to
- Description → description
- Amount → estimated_budget

Zoho Accounts → PRISM Clients
- Account Name → name
- Industry → industry
- Email → primary_contact_email
```

### Database Changes
- Add `zoho_id` field to `opportunities` table (to track Zoho sync)
- Add `zoho_id` field to `clients` table
- Add `zoho_sync_timestamp` to track last sync

### API Endpoints to Add
```
GET /api/zoho/authorize - Get Zoho OAuth URL
POST /api/zoho/callback - OAuth callback handler
POST /api/webhooks/zoho - Receive Zoho webhook events
GET /api/zoho/sync - Trigger manual sync
```

### Environment Variables
```
ZOHO_CLIENT_ID=...
ZOHO_CLIENT_SECRET=...
ZOHO_REDIRECT_URI=http://localhost:3000/zoho/callback
ZOHO_ORG_ID=...
```

---

## Phase 3: Client Portal (2 days: Dec 9-10)

### Components

#### 3.1 Client Routes
**File:** `frontend/src/app/(client)/`

```
/(client)/layout.tsx - Client protected layout
/(client)/dashboard/page.tsx - Client dashboard
/(client)/opportunities/page.tsx - List assigned opportunities
/(client)/opportunities/[id]/page.tsx - Opportunity details
/(client)/responses/page.tsx - View past responses
/(client)/profile/page.tsx - Client profile settings
```

#### 3.2 Client Views
- **Dashboard:** Summary of assigned opportunities, responses, tasks
- **Opportunities:** List of opportunities assigned to this client
- **Opportunity Detail:** Full details + response submission form
- **Response Form:** Select status (interested, accepted, declined, no_response) + optional notes
- **Past Responses:** History of responses with timestamps

#### 3.3 API Endpoints for Client
```
GET /api/client/opportunities - List client's opportunities
GET /api/client/opportunities/:id - Get opportunity details
POST /api/client/responses - Submit response
GET /api/client/responses - List client's responses
GET /api/client/profile - Get client profile
PUT /api/client/profile - Update profile
```

#### 3.4 Frontend Hooks
```typescript
useClientAuth() // Get current client user
useClientOpportunities() // Fetch client's opportunities
useClientResponses() // Fetch client's responses
```

---

## Phase 4: Demo Data & Polish (2-3 days: Dec 11-17)

### Components

#### 4.1 Seed Script
**File:** `backend/src/db/seed-demo.ts`

```typescript
// Create demo AO PR agency
const agency = createAgency('Apples & Oranges PR')

// Create demo PR team members
createAgencyUser(agency.id, 'amore@aopr.com', 'Agency Admin')
createAgencyUser(agency.id, 'team@aopr.com', 'Agency Member')

// Create demo clients
const clients = [
  'Luxury Watch Brand',
  'Sustainable Fashion',
  'Tech Startup',
  'Beauty Brand',
  'Food Company'
]

// Create demo opportunities (sync from Zoho)
// Create some with responses, some without
```

#### 4.2 Testing Checklist
- [ ] Registration flow works (agency)
- [ ] Email verification works
- [ ] Login works with password
- [ ] Logout works
- [ ] Zoho OAuth connects
- [ ] Zoho opportunities sync into PRISM
- [ ] Clients can register
- [ ] Clients can log in
- [ ] Clients can see assigned opportunities
- [ ] Clients can submit responses
- [ ] PR team gets email notification
- [ ] PR team sees response in dashboard
- [ ] All emails send correctly

#### 4.3 Polish Tasks
- [ ] Error messaging improved
- [ ] Loading states added
- [ ] Success notifications added
- [ ] Form validation enhanced
- [ ] Mobile responsive design
- [ ] Accessibility review (WCAG)

---

## Implementation Priority

### Must Have by Dec 18
1. ✅ Real authentication (Phases 1)
2. ✅ Zoho integration (Phase 2)
3. ✅ Client portal basics (Phase 3)
4. ✅ Demo data seeded (Phase 4)
5. ✅ Full workflow tested (Phase 4)

### Nice to Have (if time permits)
- Advanced client portal features
- Custom Zoho field mapping UI
- Advanced reporting
- Analytics dashboard

---

## Zoho Account Requirements

When you get your Zoho developer account, you'll need:

### 1. OAuth Setup
- Create Zoho OAuth application
- Get Client ID and Client Secret
- Configure redirect URI: `http://localhost:3000/zoho/callback`

### 2. CRM Module Access
- Enable Deals module (for opportunities)
- Enable Accounts module (for clients)
- Configure API scopes

### 3. Custom Fields (Optional)
- Identify which Zoho fields map to PRISM fields
- Note any custom fields that need special handling

### 4. Webhook Setup
- Configure Zoho webhooks to POST to `/api/webhooks/zoho`
- Subscribe to Deal created/updated/deleted events

---

## Testing Strategy

### Local Development
1. Start with mock Zoho data (hardcoded responses)
2. Test auth flow locally
3. Connect to real Zoho account
4. Verify data sync

### Integration Testing
1. Create test opportunity in Zoho
2. Verify it appears in PRISM
3. Assign to test client
4. Submit response as client
5. Verify email sent to PR team

### Demo Dry Run (Dec 17)
- Full end-to-end test with stakeholders
- Practice demo script
- Test all workflows
- Backup plans for failures

---

## File Checklist

### Backend Files to Create/Modify
- [ ] `backend/src/modules/auth/auth.controller.ts` - Add registration endpoints
- [ ] `backend/src/modules/auth/auth.service.ts` - Add email verification and password reset
- [ ] `backend/src/modules/zoho/zoho.service.ts` - NEW - Zoho API integration
- [ ] `backend/src/modules/zoho/zoho.controller.ts` - NEW - Webhook endpoints
- [ ] `backend/src/config/zoho.ts` - NEW - Zoho configuration
- [ ] `backend/src/modules/client/client.controller.ts` - Add client endpoints
- [ ] `backend/src/db/schema.ts` - Add zoho_id fields to tables
- [ ] `.env` - Add Zoho credentials

### Frontend Files to Create/Modify
- [ ] `frontend/src/app/register/page.tsx` - NEW - Registration page
- [ ] `frontend/src/app/verify-email/page.tsx` - NEW - Email verification
- [ ] `frontend/src/app/forgot-password/page.tsx` - NEW - Password reset
- [ ] `frontend/src/app/login/page.tsx` - Update for real auth
- [ ] `frontend/src/app/(client)/` - NEW - Client portal layout and pages
- [ ] `frontend/src/lib/hooks.ts` - Add client hooks
- [ ] `frontend/src/lib/api.ts` - Add client endpoints

---

## Success Criteria for Dec 18

✅ **Complete when:**
1. Agency staff can register with email verification
2. Agency staff can log in with password
3. Agency can authorize Zoho and sync real opportunities
4. Clients can register and log in
5. Clients see assigned opportunities from Zoho
6. Clients can respond to opportunities
7. PR team gets email notification of response
8. Full workflow works end-to-end with real data
9. Stakeholders can see both agency and client views
10. System is stable and tested

---

## Questions for Zoho Setup

Once you have your developer account, answer these:
1. What are your Zoho organization/realm URLs?
2. Do you want to sync ALL deals or just certain ones?
3. What custom fields do you use in Zoho that we should map?
4. Should we sync client data from Zoho Accounts?
5. Do you have existing Zoho webhooks we should know about?

---

## Next Steps

**Immediate (Dec 4):**
1. ✅ Get Zoho developer account created
2. ⏳ Set up OAuth application in Zoho
3. Share Zoho credentials (safely)
4. I'll implement auth + Zoho integration

**Upcoming (Dec 5-8):**
1. Real authentication endpoints live
2. Zoho integration live with test data
3. Client portal scaffolded

**Final Sprint (Dec 9-17):**
1. Polish and testing
2. Demo rehearsal
3. Deployment preparation

---

## Contact & Support

For questions during implementation:
- Reference this roadmap document
- Check CI/CD pipeline for build errors
- Ask about any blockers immediately

**Goal:** Launch production-ready platform on Dec 18 ✅
