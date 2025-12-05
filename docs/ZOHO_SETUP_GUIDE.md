# Zoho CRM Integration Setup Guide

This guide walks you through setting up Zoho CRM OAuth and connecting it to PRISM.

## Prerequisites

- Zoho CRM account (free or paid)
- Access to Zoho Developer Console
- PRISM running locally or deployed

---

## Step 1: Create Zoho OAuth Application

### 1.1 Go to Zoho Developer Console

1. Visit https://accounts.zoho.com/developerconsole
2. Sign in with your Zoho account
3. Click "Workspace" (top right) if multiple workspaces exist - select your main one

### 1.2 Create a New OAuth Client

1. Click **"OAuth Applications"** in the left sidebar
2. Click **"Create"** button
3. Enter details:
   - **Name:** PRISM (or similar)
   - **Homepage URL:** http://localhost:3000 (or your production domain)
   - **Authorized Redirect URIs:**
     - Local: `http://localhost:3000/zoho/callback`
     - Production: `https://yourdomain.com/zoho/callback`

### 1.3 Get Your Credentials

After creating the application:
1. Click on the application name to view details
2. Copy and save these values:
   - **Client ID** (e.g., `1000.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)
   - **Client Secret** (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0`)

⚠️ Keep your Client Secret safe - never commit it to version control.

---

## Step 2: Get Your Organization ID (Org ID)

### Option A: From Zoho Settings

1. Go to **Zoho CRM** (the main app, not developer console)
2. Click your profile icon (top right)
3. Select **Settings** → **Setup** (or **Administration** → **Organization Details**)
4. Look for **Organization ID** - it's a 12-digit number
5. Copy this value

### Option B: From API Response

When you first authenticate, PRISM will receive and display your Org ID.

---

## Step 3: Find Your Zoho Realm

Zoho has regional data centers. Determine which one you use:

| Realm | URL | Region |
|-------|-----|--------|
| `us` | https://www.zoho.com | United States |
| `eu` | https://www.zoho.eu | Europe |
| `in` | https://www.zoho.in | India |
| `au` | https://www.zoho.com.au | Australia |
| `jp` | https://www.zoho.jp | Japan |
| `ca` | https://www.zoho.ca | Canada |

If unsure, use `us` - this is the most common.

---

## Step 4: Configure PRISM Environment Variables

Edit `backend/.env` and add:

```bash
# Zoho CRM Integration
ZOHO_CLIENT_ID=YOUR_CLIENT_ID_HERE
ZOHO_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
ZOHO_ORG_ID=YOUR_ORG_ID_HERE
ZOHO_REALM=us

# OAuth Callback (must match Zoho console)
ZOHO_REDIRECT_URI=http://localhost:3000/zoho/callback
```

### Example (local development):

```bash
ZOHO_CLIENT_ID=1000.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
ZOHO_CLIENT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
ZOHO_ORG_ID=123456789012
ZOHO_REALM=us
ZOHO_REDIRECT_URI=http://localhost:3000/zoho/callback
```

---

## Step 5: Start PRISM and Connect

### 5.1 Start the Development Server

```bash
npm run dev
```

Both backend (port 3001) and frontend (port 3000) should start.

### 5.2 Log In to PRISM

1. Navigate to http://localhost:3000
2. Click "Sign Up" and register as an agency
3. Log in with your credentials

### 5.3 Connect Zoho

1. Go to the **Agency Dashboard** (or settings page)
2. Look for **"Connect to Zoho"** button
3. Click it - you'll be redirected to Zoho
4. Review permissions and click **"Allow"**
5. You'll be redirected back to PRISM
6. Zoho is now connected! ✅

---

## Step 6: Sync Opportunities

### Manual Sync

Once connected, you can manually sync:

1. In PRISM dashboard, click **"Sync from Zoho"** button
2. Wait for sync to complete
3. Check the **Opportunities** page to see synced deals

### API Call (if no UI button)

```bash
curl -X POST http://localhost:3001/api/zoho/sync \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "data": {
    "opportunities_synced": 5,
    "clients_synced": 3,
    "timestamp": "2025-12-04T10:30:00Z"
  }
}
```

---

## Step 7: Set Up Zoho Webhooks (Optional but Recommended)

Webhooks allow PRISM to receive real-time updates from Zoho when deals/accounts change.

### 7.1 Configure Webhook in Zoho

1. In **Zoho CRM** → **Setup** → **Integrations** → **Webhooks**
2. Click **"Create Webhook"**
3. Enter details:
   - **Name:** PRISM Updates
   - **URL:** `http://localhost:3000/api/webhooks/zoho` (or your prod domain)
   - **Events to Subscribe:**
     - `Deals.create`
     - `Deals.update`
     - `Deals.delete`
     - `Accounts.create`
     - `Accounts.update`

### 7.2 Verify Webhook

1. Click **"Test Webhook"** to verify connectivity
2. You should see a 200 OK response
3. Save the webhook

Now PRISM will automatically sync changes from Zoho in real-time!

---

## Step 6: Test OAuth Flow (Part 6 - Testing)

Once you have Zoho credentials configured in `.env` and test data imported to Zoho, follow these steps to test the full OAuth flow:

### 6.1 Verify Backend is Running

```bash
# In another terminal, start the backend
npm run dev -w backend
```

Wait for the server to start (you should see: "Server running on port 3001")

### 6.2 Get a Fresh JWT Token

In your terminal, log in to PRISM to get a valid access token:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@agency.com"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "4f39e4fc3d782c91e64b338b3c9342dde545edbcbd06a97e4b414573dd3b071c",
    "expiresIn": "1h",
    "user": {
      "id": "user_amore",
      "email": "test@agency.com",
      "agencyId": "agency_aopr",
      "role": "AGENCY_ADMIN"
    }
  }
}
```

**Copy the `accessToken` value** - you'll use it in the next steps.

### 6.3 Test the OAuth Authorization Endpoint

This endpoint generates the Zoho OAuth URL that users click to authorize PRISM:

```bash
# Replace YOUR_ACCESS_TOKEN with the token from step 6.2
curl -X GET http://localhost:3001/api/zoho/authorize \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://accounts.zoho.com/oauth/v2/auth?client_id=1000.YB5M5GLPS0SVRVOVD6XOHVXYAIK2HO&response_type=code&scope=CRM.modules.read%2CCRM.modules.write%2CWebhooks.events.create&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fzoho%2Fcallback&state=agency_aopr_1764944534312_wuzzde&access_type=offline",
    "state": "agency_aopr_1764944534312_wuzzde"
  }
}
```

### 6.4 Complete OAuth in Browser (Manual Step)

This is the part that requires human interaction:

1. Copy the `authorization_url` from the response above
2. Open it in your browser
3. Sign in to your Zoho account (if not already signed in)
4. Review the permissions - PRISM is requesting:
   - `CRM.modules.read` - Read access to CRM modules
   - `CRM.modules.write` - Write access to CRM modules
   - `Webhooks.events.create` - Permission to create webhooks
5. Click **"Allow"** to grant permissions
6. You'll be redirected back to `http://localhost:3000/zoho/callback` with an authorization code

### 6.5 Verify Token Storage (OAuth Callback Completed)

After completing the OAuth flow in the browser, PRISM's backend automatically:
1. Receives the authorization code at `/zoho/callback`
2. Exchanges the code for an access token from Zoho
3. Stores the token securely in the `zohoTokens` database table

Check that the token was stored:

```bash
npm run db:studio -w backend
```

This opens a visual database explorer. Navigate to the `zoho_tokens` table and verify:
- A new row exists with your `agency_id` (should be `agency_aopr`)
- `access_token` field has a value
- `refresh_token` field has a value
- `expires_at` is set to a future time

### 6.6 Test Sync Endpoint (Part 7 - Data Sync)

Once the OAuth token is stored, you can trigger a sync:

```bash
curl -X POST http://localhost:3001/api/zoho/sync \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "opportunities_synced": 12,
    "clients_synced": 6,
    "timestamp": "2025-12-05T09:20:45Z"
  }
}
```

This means:
- 12 opportunities (deals from Zoho) have been imported to PRISM
- 6 clients (accounts from Zoho) have been imported to PRISM

### 6.7 Verify Synced Data in Database

```bash
npm run db:studio -w backend
```

Check these tables for synced data:
- **opportunities** - Should have 12+ rows with `zoho_id` populated
- **clients** - Should have 6+ rows with `zoho_id` populated
- **activity_logs** - Should show sync events

Each row should have:
- `zoho_id` - The ID from Zoho (proves it came from sync)
- `agency_id` - Should be `agency_aopr`
- `created_at` - Recent timestamp

### 6.8 Check Frontend for Synced Data (Optional UI Verification)

If the frontend is running, you can also verify visually:

1. Navigate to http://localhost:3000
2. Log in with email `test@agency.com` (no password needed)
3. Go to **Opportunities** page
4. You should see all 12 synced opportunities listed
5. Go to **Clients** page (if available)
6. You should see all 6 synced clients listed

---

## Troubleshooting

### "Invalid Client ID/Secret" Error

- Verify you copied the credentials exactly from Zoho Developer Console
- Check that `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` in `.env` match Zoho
- Make sure you're not mixing up credentials from different OAuth apps

### "Redirect URI Mismatch" Error

- In Zoho Developer Console, update **Authorized Redirect URIs** to exactly match `ZOHO_REDIRECT_URI` in `.env`
- For local dev: `http://localhost:3000/zoho/callback`
- For production: `https://yourdomain.com/zoho/callback`
- Zoho is case-sensitive with URLs

### "Organization ID Not Found" Error

- Verify your Zoho Org ID is correct (12 digits)
- Check in Zoho **Settings** → **Organization Details**
- Make sure `ZOHO_ORG_ID` in `.env` is exactly correct

### No Opportunities Showing After Sync

1. Check Zoho has deals in the **Deals** module
2. Verify sync completed successfully (check logs)
3. In PRISM, navigate to **Opportunities** page and refresh
4. Check backend logs for any errors: `npm run dev -w backend | grep -i zoho`

### Webhooks Not Triggering

1. Verify PRISM is publicly accessible (webhooks need to reach your server)
2. Check firewall/network settings
3. Test manually: in Zoho, create a test deal and check PRISM logs
4. Verify webhook URL in Zoho matches your domain exactly

---

## API Reference

### Check Zoho Connection Status

```bash
GET /api/zoho/status
Authorization: Bearer YOUR_TOKEN
```

Response:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "agencyId": "your-agency-id"
  }
}
```

### Trigger Manual Sync

```bash
POST /api/zoho/sync
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

Response:
```json
{
  "success": true,
  "data": {
    "opportunities_synced": 5,
    "clients_synced": 3,
    "timestamp": "2025-12-04T10:30:00Z"
  }
}
```

### Get Authorization URL (if you need to re-authorize)

```bash
GET /api/zoho/authorize
Authorization: Bearer YOUR_TOKEN
```

Response:
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://accounts.zoho.com/oauth/v2/auth?client_id=...",
    "state": "agency-id_timestamp_random"
  }
}
```

---

## Data Mapping Reference

### Zoho Deals → PRISM Opportunities

| Zoho Field | PRISM Field | Notes |
|-----------|-----------|-------|
| Deal ID | `zoho_id` | Used to track synced records |
| Deal Name | `title` | |
| Expected Close Date | `deadline_at` | |
| Description | `summary` | |
| Amount | `metadata.estimated_budget` | |
| Stage | `metadata.zoho_stage` | |
| Deal Owner | `metadata.zoho_owner` | |

### Zoho Accounts → PRISM Clients

| Zoho Field | PRISM Field | Notes |
|-----------|-----------|-------|
| Account ID | `zoho_id` | Used to track synced records |
| Account Name | `name` | |
| Industry | `industry` | |
| Email | `primary_contact_email` | |
| Phone | `metadata.zoho_phone` | |

---

## Production Deployment

When deploying to production:

1. **Update Environment Variables**
   - Change `ZOHO_REDIRECT_URI` to your production domain
   - Update `APP_URL` to your production domain
   - Keep `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_ORG_ID` consistent

2. **Update Zoho Console**
   - Add production redirect URI to **Authorized Redirect URIs**
   - Format: `https://yourdomain.com/zoho/callback`

3. **Update Webhooks** (if using them)
   - Change webhook URL to `https://yourdomain.com/api/webhooks/zoho`

4. **Secure Credentials**
   - Use environment variables or secrets manager (not hardcoded)
   - Never commit `.env` to version control
   - Rotate credentials periodically

---

## Support

If you encounter issues:

1. Check PRISM backend logs for Zoho-related errors
2. Verify all environment variables are set correctly
3. Check Zoho Developer Console logs for API errors
4. Ensure your Zoho account has API access enabled

For more info on Zoho APIs, see: https://www.zoho.com/crm/developer/docs/api/v2/
