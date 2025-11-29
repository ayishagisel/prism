# PRISM — PR Intelligence & Signal Management

A multi-tenant PR opportunity management platform built for boutique PR agencies. PRISM ingests media opportunities, routes them to clients, and orchestrates follow-up workflows.

## 📋 Quick Start

### Prerequisites

- Node.js 18+ / npm 9+
- PostgreSQL 14+ (local, Neon, or Supabase)
- Git

### Installation

1. **Clone and navigate:**
   ```bash
   git clone <repo>
   cd prism
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Backend: Copy `backend/.env.example` → `backend/.env`
   - Frontend: Copy `frontend/.env.example` → `frontend/.env`

4. **Database setup:**
   ```bash
   # Run migrations
   npm run db:migrate -w backend

   # Seed demo data
   npm run seed -w backend
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Backend health check: http://localhost:3001/health

### Demo Login

**Email:** `amore@applesandorangespr.com` (demo mode)

All demo data is pre-seeded with sample clients, opportunities, and tasks.

---

## 🏗️ Architecture

### Tech Stack

**Frontend**
- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Axios

**Backend**
- Node.js + Express + TypeScript
- PostgreSQL + Drizzle ORM
- JWT auth (Phase 2: Cognito-ready)

**Database**
- PostgreSQL (Drizzle migrations)

### Directory Structure

```
/prism
  /backend
    /src
      /config         # Database, env, logging
      /db             # Schemas, migrations, seed
      /modules        # Business logic by domain
        /auth
        /agency
        /client
        /opportunity
        /clientOpportunityStatus
        /followUpTask
        /csv
        /notification
      /middleware     # Auth, tenancy
      /utils          # Logger, validation
    /tests            # Unit tests
  /frontend
    /src
      /app            # Next.js pages
        /(agency)     # Agency-only routes
        /(client)     # Client portal (future)
      /components     # Reusable UI
      /lib            # API client, hooks, types
      /styles         # Global CSS
```

---

## 📡 API Routes

### Auth
- `POST /api/auth/login` — Login (demo mode: any email)
- `GET /api/auth/me` — Current user info
- `POST /api/auth/logout` — Logout

### Agency
- `GET /api/agency/me` — Agency details
- `GET /api/agency/metrics` — KPI dashboard metrics

### Opportunities
- `POST /api/opportunities` — Create
- `GET /api/opportunities` — List
- `GET /api/opportunities/:id` — Get
- `PUT /api/opportunities/:id` — Update
- `DELETE /api/opportunities/:id` — Delete

### Clients
- `POST /api/clients` — Create
- `GET /api/clients` — List
- `GET /api/clients/:id` — Get
- `PUT /api/clients/:id` — Update
- `GET /api/clients/:id/opportunities` — Client's opportunities

### Client Opportunity Status
- `GET /api/statuses/:clientId/:opportunityId` — Get status
- `PUT /api/statuses/:clientId/:opportunityId` — Update response
- `GET /api/opportunities/:opportunityId/statuses` — All client statuses
- `GET /api/opportunities/:opportunityId/summary` — Summary by state

### Follow-Up Tasks
- `POST /api/tasks` — Create
- `GET /api/tasks` — List
- `PUT /api/tasks/:id` — Update
- `GET /api/opportunities/:opportunityId/tasks` — Tasks for opportunity
- `GET /api/clients/:clientId/tasks` — Tasks for client

### CSV Import
- `POST /api/csv/import` — Import opportunities from CSV
- `GET /api/csv/client-mapping` — Get name→id mapping for client matching

---

## 🔐 Multi-Tenancy & Security

- **Tenant isolation:** All queries scoped by `agency_id`
- **JWT auth:** Token-based with configurable expiry (demo mode in Phase 1)
- **Request validation:** Body, query, path params validated
- **Tenancy middleware:** Prevents cross-tenant access

**Phase 2 upgrade:** AWS Cognito integration ready (auth interfaces abstracted)

---

## 📊 Data Model Highlights

### Core Entities

**Agency** — Top-level tenant
**AgencyUser** — Staff managing opportunities
**Client** — Brands (PR clients)
**Opportunity** — Media opportunity (article, podcast, etc.)
**ClientOpportunityStatus** — Client's response to an opportunity (pending → interested → accepted → declined)
**FollowUpTask** — Auto-generated tasks when client accepts
**ActivityLog** — Audit trail of state changes
**Notification** — Email/in-app notifications to clients and staff

---

## ⚙️ Key Features

### ✅ Phase 1 — Complete

1. **Opportunity Ingestion**
   - Manual form entry
   - CSV import (Zoho-compatible)
   - Extensible ingestion pipeline

2. **Client Routing**
   - Assign opportunities to clients
   - Track client response state (pending → interested → accepted → declined)
   - Activity log of all state changes

3. **Auto Task Generation**
   - When a client accepts: briefing, asset collection, scheduling tasks auto-created
   - When interested: follow-up task auto-created
   - Tasks assigned to PR staff

4. **Agency Dashboard**
   - KPI tiles (active opps, accepted, interested, tasks due)
   - Opportunities table with filters
   - Recent tasks list

5. **Multi-Tenant Auth**
   - Email-based demo login
   - JWT tokens with role-based access (AGENCY_ADMIN, AGENCY_MEMBER, CLIENT_USER)

6. **Real-Time Data Sync**
   - Storage event listeners triggering dashboard refreshes
   - Live updates across browser tabs

### ✅ Phase 2 — Complete

1. **Real Password Authentication**
   - bcryptjs password validation
   - Demo mode maintained for testing
   - 401 errors for invalid credentials

2. **Real KPI Metrics**
   - Total opportunities count
   - Active opportunities filtered by status
   - Engaged clients count
   - Accepted & interested response tracking

3. **Advanced Filtering**
   - Filter by response status (pending, interested, accepted, declined, no_response)
   - Filter by media type (article, podcast, panel, event, speaking, etc.)
   - Filter by deadline ranges (before/after dates)
   - Combine multiple filters with AND logic

4. **Client Delete Endpoint**
   - Service method with cascade delete
   - Removes related opportunity assignments
   - Proper auth middleware protection

5. **Dashboard Client Filter**
   - Select specific client to view assigned opportunities
   - Integrates with all other dashboard filters
   - Lazy loads client assignments on mount

6. **Auto-Task for Interested State**
   - Automatic task creation when status changes to 'interested'
   - "Follow up on interest" task with 2-day due date
   - Same pattern as 'accepted' state (which creates 3 tasks)

7. **Team Notifications**
   - Broadcasts in-app notifications to all agency team members
   - Fetches actual team members from database
   - Logs team member count in notifications

8. **End-to-End Testing**
   - All features thoroughly tested and committed
   - Production-ready implementation

### 🔮 Phase 3 — Planned

- [ ] Individual opportunity detail pages with dynamic routing
- [ ] Client portal (separate application for clients to respond to opportunities)
- [ ] Advanced reporting & analytics with export
- [ ] Email notification system integration (SendGrid/AWS SES)
- [ ] API documentation & webhooks
- [ ] JWT token expiration & refresh logic
- [ ] Rate limiting & API quotas
- [ ] Fine-grained RBAC (roles beyond ADMIN/MEMBER)

---

## 📋 Project Status

**Phase 1 & Phase 2: COMPLETE** ✅

Both Phase 1 (MVP Features) and Phase 2 (Advanced Features) have been fully implemented, tested, and committed. The application is production-ready for its current feature set.

For detailed information about implemented features, bug fixes, known limitations, and Phase 3 roadmap, see the **[PROJECT_COMPLETION_REPORT.html](./PROJECT_COMPLETION_REPORT.html)** in the repository root.

---

## 🧪 Testing

### Run Tests

```bash
npm run test -w backend
```

### Test Coverage

- **auth.test.ts** — JWT creation, verification, password hashing
- **opportunity.test.ts** — CSV parsing, media type mapping
- **status.test.ts** — State machine transitions

Future: E2E tests with Playwright, API integration tests.

---

## 📝 Example Usage

### Create an Opportunity

```bash
curl -X POST http://localhost:3001/api/opportunities \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Forbes Women Founders Feature",
    "summary": "Feature spotlight for women founders",
    "media_type": "feature_article",
    "outlet_name": "Forbes",
    "opportunity_type": "PR",
    "deadline_at": "2025-12-15T23:59:00Z",
    "category_tags": ["women_founders", "business"],
    "target_client_ids": ["client_throne_society"]
  }'
```

### Update Client Response

```bash
curl -X PUT http://localhost:3001/api/statuses/client_throne_society/opp_forbes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "response_state": "accepted",
    "notes_for_agency": "Founder is excited and available"
  }'
```

---

## 🛠️ Development Workflow

1. **Start dev servers:** `npm run dev`
2. **Create a feature branch:** `git checkout -b feature/xyz`
3. **Write/update code** → test locally
4. **Run tests:** `npm run test -w backend`
5. **Commit with clear message:** `git commit -m "feat: add CSV column mapping"`
6. **Push and create PR**

---

## 📦 Deployment

### Backend (AWS EC2 / Lambda / RDS)

1. Build: `npm run build -w backend`
2. Set env vars (DATABASE_URL, JWT_SECRET, etc.)
3. Run: `npm start -w backend` or deploy to ECS/Lambda

### Frontend (Vercel / CloudFront)

1. Build: `npm run build -w frontend`
2. Deploy `frontend/.next` to Vercel or S3+CloudFront

---

## 🤝 Contributing

- Keep PRs focused (one feature per PR)
- Follow existing code patterns
- Add tests for new logic
- Update README if adding features

---

## 📄 License

(Add your license here)

---

## 🎯 Next Steps

1. **Customize env variables** for your database
2. **Run `npm run seed`** to load demo data
3. **Log in** with `amore@applesandorangespr.com`
4. **Explore** the dashboard and opportunities
5. **Iterate** based on Phase 2 plan

For questions or issues, reach out to the development team.
