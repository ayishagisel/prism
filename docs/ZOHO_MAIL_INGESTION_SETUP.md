# PRISM Email Ingestion: Zoho Flow Setup Guide

This guide explains how to configure Zoho Flow to automatically send emails from Amore's media query folder to PRISM for parsing and processing.

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ZOHO MAIL                                       │
│         (Media Queries Folder - SOS, TMX, etc.)                     │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ Trigger: New Email Arrives
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ZOHO FLOW                                       │
│                 (Automation Workflow)                                │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ Action: HTTP POST
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 PRISM WEBHOOK                                        │
│           POST /api/ingest/webhook                                  │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PRISM PARSES & STORES                                   │
│         → ingestion_jobs table (raw email)                          │
│         → parsed_queries table (extracted opportunities)            │
│         → parse_evidence table (citations)                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Zoho Account** with access to:
   - Zoho Mail
   - Zoho Flow
2. **PRISM Backend** deployed and accessible via public URL (or ngrok for testing)
3. **Email folder** in Zoho Mail where media queries are filtered

---

## Step 1: Create a Zoho Flow

1. Go to [Zoho Flow](https://flow.zoho.com)
2. Click **Create Flow** → **Start from scratch**
3. Name it: `PRISM Media Query Ingestion`

---

## Step 2: Configure the Trigger

1. **App**: Select **Zoho Mail**
2. **Trigger**: Select **New Email**
3. **Configure**:
   - **Account**: Select your Zoho Mail account
   - **Folder**: Select the folder where media queries are filtered
     - e.g., `Media Queries` or `Opportunities`
   - **Include**: Email content (body text and HTML)

---

## Step 3: Add Webhook Action

1. Click **+** to add an action
2. **App**: Select **Webhooks**
3. **Action**: Select **POST**
4. **Configure**:

### URL
```
https://your-prism-domain.com/api/ingest/webhook
```

For local testing with ngrok:
```
https://abc123.ngrok.io/api/ingest/webhook
```

### Headers
```json
{
  "Content-Type": "application/json"
}
```

### Body (JSON)
```json
{
  "from": "${trigger.from_email}",
  "to": "${trigger.to_email}",
  "subject": "${trigger.subject}",
  "body_text": "${trigger.content}",
  "body_html": "${trigger.html_content}",
  "received_at": "${trigger.received_time}",
  "message_id": "${trigger.message_id}",
  "folder_id": "${trigger.folder_id}",
  "has_attachments": "${trigger.has_attachment}",
  "api_key": "YOUR_SECRET_API_KEY"
}
```

---

## Step 4: Set Up Security

### Option A: API Key (Recommended for simplicity)

1. Generate a secure random string:
   ```bash
   openssl rand -hex 32
   ```
   Output: `a1b2c3d4e5f6...` (64 characters)

2. Add to your PRISM `.env` file:
   ```env
   INGEST_WEBHOOK_API_KEY=a1b2c3d4e5f6...
   DEFAULT_AGENCY_ID=agency_aopr
   ```

3. Use the same key in the Zoho Flow webhook body

### Option B: IP Whitelist (Additional security)

Zoho Flow requests come from these IP ranges:
- `136.143.184.0/22`
- `52.204.134.0/24`

You can configure your firewall to only accept webhook requests from these IPs.

---

## Step 5: Test the Flow

### Using Zoho Flow Test

1. Click **Test** in Zoho Flow
2. Select a sample email from your folder
3. Check the webhook response

### Using PRISM Test Endpoint

You can test parsing without saving to the database:

```bash
curl -X POST https://your-prism-domain.com/api/ingest/test \
  -H "Content-Type: application/json" \
  -d '{
    "from": "peter@shankman.com",
    "subject": "[SOS] Monday Afternoon Media Queries",
    "body_text": "1) SUMMARY: Test Query\nCATEGORY: Business\nNAME: Test\nEMAIL: test@example.com\nMUCK RACK URL: \nMEDIA OUTLET: Test Outlet\nMEDIA WEBSITE: https://example.com\nDEADLINE DATE: 2025-12-20\nDEADLINE TIME: 5:00 pm\nTIME ZONE: Eastern Standard Time\nQUERY: This is a test query."
  }'
```

---

## Step 6: Activate the Flow

1. Review all settings
2. Click **Turn ON** in Zoho Flow
3. The flow will now automatically process new emails

---

## Webhook Payload Reference

### Request Format

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Sender email address |
| `to` | string | No | Recipient email address |
| `subject` | string | Yes | Email subject line |
| `body_text` | string | Yes | Plain text body |
| `body_html` | string | No | HTML body (if available) |
| `received_at` | string | No | ISO 8601 timestamp |
| `message_id` | string | No | Unique email ID (for dedupe) |
| `folder_id` | string | No | Zoho folder ID |
| `thread_id` | string | No | Zoho thread ID |
| `has_attachments` | boolean | No | Whether email has attachments |
| `api_key` | string | No | Security key (if configured) |

### Response Format

**Success (200)**
```json
{
  "success": true,
  "data": {
    "ingestionJobId": "abc123...",
    "sourceType": "SOS",
    "queriesCreated": 7
  }
}
```

**Duplicate (200)**
```json
{
  "success": false,
  "error": "Duplicate email - already processed",
  "data": {
    "ingestionJobId": "existing-job-id"
  }
}
```

**Error (500)**
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Supported Email Sources

PRISM automatically detects and parses these email formats:

### 1. SOS (Source of Sources)
- **Detection**: Subject contains `[SOS]` or from `shankman.com`
- **Format**: Highly structured with labeled fields
- **Parser**: Regex-based (100% reliable)
- **Fields extracted**:
  - Summary, Category, Journalist Name/Email
  - MuckRack URL, Media Outlet/Website
  - Deadline Date/Time/Timezone
  - Full query text

### 2. TMX Messenger Digest
- **Detection**: Subject contains `TMX` and `Newsroom Messages`
- **Format**: Numbered items with Synopsis and Sent From
- **Parser**: Regex-based with category tracking
- **Fields extracted**:
  - Category, Title, Synopsis
  - Outlet name, Reply email alias

### 3. TMX Messenger Single
- **Detection**: From TMX or contains TMX reply email
- **Format**: Free-form paragraph
- **Parser**: Regex + optional LLM enhancement
- **Fields extracted**:
  - Outlet, Journalist title
  - Story topic, Expert types
  - Questions, Deadline

### 4. Other/Unknown
- Falls back to TMX Single parser
- Uses LLM if API keys configured

---

## Environment Variables

Add these to your PRISM backend `.env`:

```env
# Email Ingestion
INGEST_WEBHOOK_API_KEY=your-secure-random-key
DEFAULT_AGENCY_ID=agency_aopr

# Optional: LLM for enhanced parsing
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

---

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ingest/webhook` | POST | API Key | Receive emails from Zoho Flow |
| `/api/ingest/test` | POST | None | Test parsing without saving |
| `/api/ingest/pending` | GET | JWT | Get pending queries |
| `/api/ingest/jobs` | GET | JWT | Get ingestion job history |
| `/api/ingest/queries/:id` | GET | JWT | Get query with evidence |
| `/api/ingest/queries/:id/approve` | POST | JWT | Approve a query |
| `/api/ingest/queries/:id/discard` | POST | JWT | Discard a query |
| `/api/ingest/queries/:id/assign` | POST | JWT | Assign to clients |

---

## Troubleshooting

### Emails not being processed

1. Check Zoho Flow execution history
2. Verify webhook URL is accessible
3. Check PRISM logs: `docker logs prism-backend`
4. Test webhook manually with curl

### Duplicate detection not working

- Ensure `message_id` is included in webhook payload
- Check `email_message_id` column in `ingestion_jobs` table

### Parser not detecting source type

- Test with `/api/ingest/test` endpoint
- Check source detection indicators in response
- Verify email format matches expected patterns

### Low parse confidence

- For TMX Single queries, configure LLM API keys
- Review parse evidence in query detail view

---

## Next Steps

After setup:

1. **Monitor** the ingestion jobs dashboard
2. **Review** pending queries in PRISM UI
3. **Train** the team on approve/assign workflow
4. **Iterate** on parsing rules if needed

For questions or issues, contact the development team.
