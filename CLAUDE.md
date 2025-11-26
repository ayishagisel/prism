# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PRISM** is a multi-tenant PR opportunity management platform built with:
- **Backend:** Node.js + Express + TypeScript + PostgreSQL (Drizzle ORM)
- **Frontend:** Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Architecture:** Service-oriented, domain-driven modules with multi-tenant enforcement

The platform allows PR agencies to ingest media opportunities, route them to clients, track responses, and auto-generate follow-up tasks.

## Development Commands

### Root-Level Commands
```bash
npm install              # Install all dependencies (backend + frontend)
npm run dev              # Run both backend (port 3001) and frontend (port 3000) concurrently
npm run build            # Build both backend and frontend
npm run test -w backend  # Run backend test suite
```

### Backend Commands
```bash
npm run dev -w backend              # Start dev server with hot reload (tsx watch)
npm run build -w backend            # Compile TypeScript to dist/
npm run start -w backend            # Run compiled JavaScript (production)
npm run db:push -w backend          # Apply Drizzle migrations to database
npm run db:migrate -w backend       # Run migrations
npm run db:studio -w backend        # Open Drizzle Studio GUI for schema inspection
npm run seed -w backend             # Populate demo data (1 agency, 3 clients, 4 opportunities, 3 tasks)
npm run test -w backend             # Run Jest test suite
npm run test -w backend -- auth     # Run single test file (auth.test.ts)
```

### Frontend Commands
```bash
npm run dev -w frontend    # Start Next.js dev server
npm run build -w frontend  # Build for production
npm run start -w frontend  # Run production build
npm run lint -w frontend   # Run ESLint
```

## Core Architecture

### Backend Structure (`backend/src/`)

**Entry Points:**
- `server.ts` — Starts Express server (port 3001)
- `app.ts` — Express app with all routes and middleware

**Configuration:**
- `config/env.ts` — Environment variable validation & defaults
- `config/db.ts` — Drizzle ORM setup with connection pooling

**Database Layer:**
- `db/schema.ts` — 10 table schemas (agencies, agency_users, clients, opportunities, client_opportunity_statuses, follow_up_tasks, activity_logs, notifications, activity_logs, etc.)
- `db/seed.ts` — Demo data seeding (run via `npm run seed -w backend`)

**Domain Modules** (`modules/`):
Each module has a service (business logic) and controller (HTTP handlers).

1. **auth/** — JWT token creation, password hashing, demo login
   - `auth.service.ts:AuthService` — Token/password operations
   - Key: Demo mode allows any email; Phase 2 adds real auth

2. **agency/** — Multi-tenant context
   - `agency.service.ts:AgencyService` — Retrieve agency details & KPI metrics
   - Always scoped to requesting user's agency

3. **opportunity/** — Media opportunity CRUD
   - `opportunity.service.ts:OpportunityService` — Create, list, update, delete opportunities
   - `csv.service.ts:CSVImportService` — Parse & import from CSV (Zoho-compatible)
   - Includes media type mapping, deadline handling, category tagging

4. **client/** — Client (brand) management
   - `client.service.ts:ClientService` — CRUD for PR clients
   - Tracks client responses to opportunities

5. **clientOpportunityStatus/** — Core state machine
   - `status.service.ts:ClientOpportunityStatusService` — Transition client responses (pending → interested → accepted → declined → no_response)
   - **Key behavior:** When status changes to "accepted", auto-triggers task generation
   - Activity logging on every transition

6. **followUpTask/** — Auto-generated tasks
   - `task.service.ts:FollowUpTaskService` — Create, list, update tasks
   - **Auto-generation logic:**
     - Accept → 3 tasks (briefing, asset_collection, scheduling)
     - Interested → 1 task (follow_up)
     - Tasks have status (pending, in_progress, completed, blocked)

7. **notification/** — Notification stubs
   - `notification.service.ts:NotificationService` — Queues emails/in-app notifications
   - Phase 2: Wire up AWS SES for actual email delivery

**Middleware:**
- `middleware/auth.middleware.ts` — Validates JWT token, extracts user context
- `middleware/tenancy.middleware.ts` — Enforces `agency_id` isolation on all requests

**Utilities:**
- `utils/logger.ts` — Structured logging (info, warn, error, debug)
- `utils/validation.ts` — Request body/param validation helpers

**Types:**
- `types/index.ts` — TypeScript interfaces for all domain models

### Frontend Structure (`frontend/src/`)

**App Router (Next.js 14):**
- `app/layout.tsx` — Root layout with global styles
- `app/login/page.tsx` — Demo login (any email works)
- `app/(agency)/layout.tsx` — Protected layout with navigation (requires auth)
  - `app/(agency)/dashboard/page.tsx` — KPI tiles, recent opportunities & tasks
  - `app/(agency)/opportunities/page.tsx` — Full opportunity list with create form
  - `app/(agency)/tasks/page.tsx` — Task tracking & status updates

**Components:**
- `components/common/` — Reusable UI (Navigation, StatusChip, MediaTypeBadge, LoadingSpinner)
- `components/agency/` — Agency-specific components (DashboardKPIs, OpportunitiesTable, NewOpportunityForm)

**Library:**
- `lib/api.ts` — Axios client with JWT token injection & refresh logic
- `lib/hooks.ts` — Custom React hooks (useAuth, useOpportunities, useClients, useTasks)
- `lib/types.ts` — TypeScript interfaces (Opportunity, Client, Task, etc.)
- `lib/constants.ts` — Enums for media types, response states, task statuses

**Styles:**
- `styles/globals.css` — Tailwind CSS imports + custom global styles

## Key Architectural Patterns

### Multi-Tenancy Enforcement
Every database operation and API endpoint enforces tenant isolation:
- Database layer: All tables have `agency_id` column with NOT NULL constraint
- API layer: `tenancyMiddleware` ensures `agency_id` on request matches user's agency
- Pattern: All service methods receive `agencyId` as first parameter

```typescript
// Example: ClientOpportunityStatusService.getStatus()
async getStatus(agencyId: string, clientId: string, opportunityId: string) {
  // Queries include: where and(eq(agency_id, agencyId), ...)
}
```

### State Machine (Client Response Tracking)
Client responses follow a strict state machine with allowed transitions:
```
pending → interested → accepted ✓
       → declined ✓
       → no_response ✓

interested → accepted ✓
          → declined ✓

accepted, declined, no_response → TERMINAL (no transitions)
```

Validation happens in `status.service.ts:isValidTransition()`. Invalid transitions are rejected.

### Auto-Task Generation
When `ClientOpportunityStatusService.updateStatus()` transitions to "accepted":
1. Calls `followUpTaskService.createAutoTasks()`
2. Creates 3 tasks: briefing, asset_collection, scheduling
3. Sets due dates 7, 14, 14 days out
4. Sends notification (stub)

### Extensible Ingestion Pipeline
CSV import (`csv.service.ts`) normalizes Zoho exports:
- Parses CSV, maps client names to IDs
- Normalizes media type strings (e.g., "Article" → "feature_article")
- Batch creates opportunities with client assignments
- Phase 2: Add Zoho API direct sync, email ingestion, etc.

## Database Schema Highlights

**Key Fields:**
- `agency_id` — Multi-tenant scoping (on every table)
- `response_state` — Enum: pending, interested, accepted, declined, no_response
- `media_type` — Enum: feature_article, podcast, newsletter, etc.
- `task_status` — Enum: pending, in_progress, completed, blocked
- `metadata` — JSONB for flexible, unstructured data

**Relationships:**
- Agency → AgencyUser (1:many)
- Agency → Client (1:many)
- Agency → Opportunity (1:many)
- Client × Opportunity → ClientOpportunityStatus (many:many junction)
- ClientOpportunityStatus → FollowUpTask (1:many, auto-created on accept)

## Running Tests

The test suite covers core logic:
```bash
npm run test -w backend  # Runs all tests in backend/tests/
```

**Test Files:**
- `auth.test.ts` — JWT creation/verification, password hashing
- `opportunity.test.ts` — CSV parsing, media type normalization
- `status.test.ts` — State machine validation (valid/invalid transitions)

Add new tests in `backend/tests/` following the Jest + ts-jest pattern.

## Environment Setup

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://user:password@localhost:5432/prism
JWT_SECRET=your-secret-key-min-32-chars
PORT=3001
NODE_ENV=development
```

### Frontend (`frontend/.env`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

See `backend/.env.example` and `frontend/.env.example` for all available options.

## Phase 2 Extension Points

Code comments mark areas for Phase 2 enhancements:

1. **Real Authentication** — Replace demo login with AWS Cognito
   - File: `backend/src/modules/auth/auth.service.ts`
   - Add: Email verification, password reset, OAuth

2. **Email Notifications** — Wire AWS SES
   - File: `backend/src/modules/notification/notification.service.ts`
   - Replace: Mock `sendEmail()` with SES integration

3. **Zoho API Sync** — Poll Zoho for opportunities
   - File: `backend/src/modules/csv/` (create new module)
   - Add: Zoho API client, incremental sync logic

4. **AI Enrichment** — Google Gemini tagging
   - File: `backend/src/modules/opportunity/opportunity.service.ts`
   - Add: Auto-tag opportunities by content analysis

5. **Advanced RBAC** — Fine-grained roles (currently: ADMIN, MEMBER, CLIENT)
   - File: `backend/src/middleware/auth.middleware.ts`
   - Add: Role-based access control, team scoping

6. **Client Portal** — Multi-tenant client-facing UI
   - File: `frontend/src/app/(client)/`
   - Add: Client login, opportunity details, response tracking

## Common Development Workflows

### Adding a New API Endpoint

1. **Create controller method** in appropriate module controller (e.g., `modules/opportunity/opportunity.controller.ts`)
2. **Add service method** in corresponding service (e.g., `modules/opportunity/opportunity.service.ts`)
3. **Register route** in `app.ts`
4. **Add type definitions** in `backend/src/types/index.ts` if needed
5. **Write tests** in `backend/tests/`
6. **Add frontend hook** in `frontend/src/lib/hooks.ts` to call endpoint

### Modifying Database Schema

1. Edit table schema in `backend/src/db/schema.ts`
2. Run `npm run db:push -w backend` to apply changes (Drizzle auto-migrates)
3. Update seed data in `backend/src/db/seed.ts` if needed
4. Re-seed: `npm run seed -w backend`
5. Update TypeScript types in `backend/src/types/index.ts`

### Debugging

- **Backend:** Check logs in console or `backend/dist/` (compiled output)
- **Frontend:** Browser DevTools, Network tab shows API calls
- **Database:** Use `npm run db:studio -w backend` to inspect tables visually
- **API:** Test with Postman or curl before wiring frontend

## Deployment Notes

**Backend:** Builds to `backend/dist/`. Deploy to AWS Lambda, EC2, Render, or Heroku.
**Frontend:** Builds to `frontend/.next/`. Deploy to Vercel, Netlify, or CloudFront.
**Database:** PostgreSQL (RDS, Neon, or Supabase recommended).

All migrations run automatically on schema push via Drizzle. Seed data is optional (dev/staging only).
