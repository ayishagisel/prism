# Quick Start: Initialize PRISM Database on Neon

## The Problem
`drizzle-kit push` isn't creating tables in your Neon PostgreSQL database.

## The Solution (3 Easy Steps)

### Step 1: Verify Environment
Make sure your `.env` file has the database connection:
```
DATABASE_URL=postgresql://neondb_owner:npg_KfW8GsQY2keD@ep-ancient-shadow-adchkidh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Step 2: Initialize Schema
Run this command from the `backend` directory:
```bash
npm run db:init
```

This will:
- Connect to your Neon database
- Create all 14 ENUM types
- Create all 9 tables with proper relationships
- Create all indexes
- Verify everything was created successfully

### Step 3: Seed Initial Data
Once the schema is created, populate it with demo data:
```bash
npm run seed
```

### Step 4: Start Development
```bash
npm run dev
```

Your backend will now be running on `http://localhost:3001` with a fully initialized database!

---

## What Gets Created

### 14 ENUM Types:
- `agency_user_role` - AGENCY_ADMIN, AGENCY_MEMBER
- `client_user_role` - CLIENT_OWNER, CLIENT_TEAM
- `media_type` - feature_article, news_brief, panel, podcast, etc.
- `opportunity_type` - PR, Event, Speaking, Partnership
- `opportunity_status` - active, closed, paused, expired
- `visibility` - internal_only, shared_with_clients
- `client_opportunity_response` - pending, interested, accepted, declined, no_response
- `user_status` - active, inactive, invited
- `client_status` - active, inactive, paused
- `task_status` - pending, in_progress, completed, cancelled
- `task_type` - briefing, media_training, asset_collection, scheduling, follow_up, other
- `notification_channel` - email, in_app, sms
- `notification_status` - pending, sent, failed, bounced

### 9 Tables:
1. **agencies** - PR agencies using the platform
2. **agency_users** - Users who work at agencies (with roles)
3. **clients** - Agency clients
4. **client_users** - Users who work at client companies (with roles)
5. **opportunities** - Media opportunities from various sources
6. **client_opportunity_statuses** - Client responses to opportunities
7. **follow_up_tasks** - Tasks related to opportunities and clients
8. **activity_logs** - Audit trail of all system actions
9. **notifications** - Notification queue (email, in-app, SMS)

---

## Alternative Methods

If `npm run db:init` doesn't work, see `SCHEMA_SETUP_GUIDE.md` for:
- Using Neon's web-based SQL Editor
- Using psql command-line tool
- Troubleshooting drizzle-kit

---

## Troubleshooting

### Error: "Cannot find module"
Make sure you're in the backend directory:
```bash
cd /Users/ayishaoglivie/prism/backend
```

### Error: "DATABASE_URL is not set"
Check your `.env` file exists and has the DATABASE_URL variable.

### Error: "Connection refused" or "timeout"
- Check your internet connection
- Verify the Neon connection string is correct
- Check if Neon project is active in the Neon console

### Tables already exist
The script handles this gracefully. It will show "already exists" messages but won't fail.

---

## Files Reference

- **init_schema.sql** - Complete SQL schema for manual execution
- **src/db/init-schema.ts** - Node.js script that executes the SQL
- **src/db/schema.ts** - Drizzle ORM schema definition (source of truth)
- **SCHEMA_SETUP_GUIDE.md** - Detailed troubleshooting guide

---

## Support

If you encounter issues:
1. Check the detailed guide: `SCHEMA_SETUP_GUIDE.md`
2. Verify your Neon project is active at https://console.neon.tech/
3. Check Neon status: https://neon.tech/status
