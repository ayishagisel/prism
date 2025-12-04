# PRISM Quick Start Guide

Get the PRISM platform running locally in 5 minutes.

## Prerequisites

- **Node.js 18+** (check: `node --version`)
- **PostgreSQL 14+** (local, Neon, or Supabase)
- **npm 9+** (check: `npm --version`)

## Step 1: Clone & Install

```bash
cd prism
npm install
```

## Step 2: Database Setup

### Option A: Local PostgreSQL
```bash
# Create database
createdb prism

# Set connection string
# Edit backend/.env
DATABASE_URL="postgresql://username:password@localhost:5432/prism"
```

### Option B: Neon (Free Hosting)
1. Go to https://neon.tech and sign up
2. Create a project → copy connection string
3. Edit `backend/.env`:
   ```
   DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/prism?sslmode=require"
   ```

### Option C: Supabase
1. Create project at https://supabase.com
2. Go to Project Settings → Database
3. Copy "URI" and set in `backend/.env`

## Step 3: Create Tables

```bash
npm run db:push -w backend
```

This creates all tables using Drizzle migrations.

## Step 4: Seed Demo Data

```bash
npm run seed -w backend
```

This creates:
- Agency: Apples & Oranges PR
- Admin user: amore@applesandorangespr.com
- 3 demo clients
- 4 demo opportunities
- 3 demo tasks

## Step 5: Start Dev Servers

```bash
npm run dev
```

You should see:
```
> backend: Server running on port 3001
> frontend: ▲ Next.js dev server ready
```

## Step 6: Open Browser

- **Frontend:** http://localhost:3000
- **API Health:** http://localhost:3001/health

## Step 7: Login

**Email:** `amore@applesandorangespr.com`

(Demo mode — any email works, but this account has pre-loaded data)

---

## What You'll See

1. **Dashboard** — KPI tiles, recent opportunities, tasks
2. **Opportunities** — List of 4 demo opportunities
3. **Tasks** — Auto-generated follow-up tasks
4. **New Opportunity Form** — Create your own (right-hand side)

---

## Troubleshooting

### "Cannot connect to database"
- Verify `DATABASE_URL` in `backend/.env`
- Ensure PostgreSQL is running: `psql -U postgres`
- Try Neon/Supabase if local DB issues persist

### "Port 3001 already in use"
- Kill process: `lsof -i :3001` → `kill -9 <PID>`
- Or change `PORT` in `backend/.env`

### "NEXT_PUBLIC_API_URL"
- Frontend looks for backend at `http://localhost:3001`
- If running elsewhere, edit `frontend/.env`:
  ```
  NEXT_PUBLIC_API_URL=http://your-backend-url
  ```

### "Tables don't exist"
- Run: `npm run db:push -w backend`
- Or: `npm run db:migrate -w backend`

### "No demo data"
- Run: `npm run seed -w backend`

---

## Next Steps

1. **Explore the UI** — Create opportunities, update client responses
2. **Check the API** — Open http://localhost:3001 in Postman
3. **Run tests** — `npm run test -w backend`
4. **Read README.md** — Full API & feature documentation
5. **Customize** — Update agency name, colors, add your clients

---

## Commands Cheat Sheet

```bash
# Backend
npm run dev -w backend              # Start backend only
npm run build -w backend            # Build for production
npm run db:push -w backend          # Apply migrations
npm run db:migrate -w backend       # Run migrations
npm run seed -w backend             # Populate demo data
npm run db:studio -w backend        # Open Drizzle Studio (GUI)
npm run test -w backend             # Run tests

# Frontend
npm run dev -w frontend             # Start frontend only
npm run build -w frontend           # Build for production

# Both
npm run dev                         # Start both (concurrently)
npm run build                       # Build both
npm run test                        # Test backend
```

---

## API Testing (with Postman or curl)

### Get Auth Token

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "amore@applesandorangespr.com"}' | jq .data.token
```

### Create Opportunity

```bash
TOKEN="your-token-from-above"

curl -X POST http://localhost:3001/api/opportunities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Opportunity",
    "media_type": "feature_article",
    "outlet_name": "Test Outlet",
    "opportunity_type": "PR",
    "deadline_at": "2025-12-31T23:59:00Z"
  }'
```

---

## Deployment Preview

- **Frontend:** Ready for Vercel (`npm run build`, deploy `frontend/.next`)
- **Backend:** Ready for AWS EC2/Lambda/Render (`npm run build`, deploy `dist/`)
- **Database:** Use Neon or AWS RDS + Drizzle migrations

---

## Support

- Check **README.md** for full API docs
- Check **PHASE_1_SUMMARY.md** for architecture overview
- Review `/src` code comments for Phase 2/3 TODOs
- Read inline comments in services for logic details

---

**You're ready to go! 🚀**
