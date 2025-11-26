# PRISM Database Schema Setup Guide

This guide provides multiple methods to initialize your PostgreSQL schema on Neon when `drizzle-kit push` isn't working.

## Problem
The `drizzle-kit push` command isn't creating tables in the Neon PostgreSQL database.

## Solutions

### Method 1: Use the Custom Node.js Script (Recommended)

I've created a Node.js script that reads the SQL file and executes it directly against your Neon database using the `postgres` library.

**Steps:**

1. Ensure you're in the backend directory:
   ```bash
   cd /Users/ayishaoglivie/prism/backend
   ```

2. Make sure your `.env` file has the correct DATABASE_URL:
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_KfW8GsQY2keD@ep-ancient-shadow-adchkidh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

3. Run the initialization script:
   ```bash
   npm run init-schema
   ```

   Or directly with tsx:
   ```bash
   npx tsx src/db/init-schema.ts
   ```

This script will:
- Connect to your Neon database
- Execute all CREATE statements from `init_schema.sql`
- Show progress for each table/enum/index created
- Verify all tables and enums exist
- Handle "already exists" errors gracefully

### Method 2: Use Neon SQL Editor (Web-based)

If you prefer a web interface:

1. Go to [Neon Console](https://console.neon.tech/)
2. Log in and navigate to your project
3. Click on "SQL Editor" in the left sidebar
4. Open the file `/Users/ayishaoglivie/prism/backend/init_schema.sql`
5. Copy the entire SQL content
6. Paste it into the Neon SQL Editor
7. Click "Run" to execute

### Method 3: Install psql and Run Directly

If you want to use the PostgreSQL command-line tool:

1. Install PostgreSQL (which includes psql):
   ```bash
   # On macOS with Homebrew
   brew install postgresql

   # On Ubuntu/Debian
   sudo apt-get install postgresql-client

   # On Windows
   # Download from: https://www.postgresql.org/download/windows/
   ```

2. Run the SQL file:
   ```bash
   psql "postgresql://neondb_owner:npg_KfW8GsQY2keD@ep-ancient-shadow-adchkidh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -f init_schema.sql
   ```

### Method 4: Use drizzle-kit generate + migrate (Instead of push)

The issue might be with `push` command. Try using `generate` + `migrate` instead:

1. Generate migrations from your schema:
   ```bash
   npx drizzle-kit generate
   ```

2. This will create SQL files in `src/db/migrations/`

3. Apply the migrations:
   ```bash
   npx drizzle-kit migrate
   ```

## Troubleshooting drizzle-kit push

If you want to debug why `drizzle-kit push` isn't working:

1. **Check the connection:**
   ```bash
   npx drizzle-kit introspect
   ```

2. **Try with verbose output:**
   ```bash
   npx drizzle-kit push --verbose
   ```

3. **Verify your drizzle.config.ts:**
   - Make sure `dialect: 'postgresql'` is set
   - Ensure DATABASE_URL is properly loaded
   - Check that schema path is correct: `./src/db/schema.ts`

4. **Common issues:**
   - Missing DATABASE_URL environment variable
   - SSL connection issues (Neon requires SSL)
   - Permission issues with Neon user
   - Channel binding issues

## Verifying the Schema

After running any of the methods above, verify tables were created:

### Using the init-schema script
The script automatically verifies tables at the end.

### Using psql
```bash
psql "postgresql://neondb_owner:npg_KfW8GsQY2keD@ep-ancient-shadow-adchkidh-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -c "\dt"
```

### Using Node.js
```javascript
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
`;

console.log(tables);
await sql.end();
```

## Expected Tables

After successful schema initialization, you should have these 9 tables:

1. `agencies` - PR agencies using the platform
2. `agency_users` - Users who work at agencies
3. `clients` - Agency clients
4. `client_users` - Users who work at client companies
5. `opportunities` - Media opportunities
6. `client_opportunity_statuses` - Client responses to opportunities
7. `follow_up_tasks` - Tasks related to opportunities
8. `activity_logs` - Audit trail of all actions
9. `notifications` - Notification queue

Plus 14 ENUM types for various status fields.

## Next Steps

Once the schema is created:

1. Run the seed script to populate initial data:
   ```bash
   npm run seed
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Files Created

- `/Users/ayishaoglivie/prism/backend/init_schema.sql` - Complete SQL schema
- `/Users/ayishaoglivie/prism/backend/src/db/init-schema.ts` - Node.js initialization script

## Need Help?

If you continue to have issues:

1. Check Neon's status page: https://neon.tech/status
2. Verify your connection string is correct in Neon console
3. Check if your Neon project has sufficient resources
4. Review Neon logs in the console for any error messages
