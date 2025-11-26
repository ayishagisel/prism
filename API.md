# PRISM API Reference

Base URL: `http://localhost:3001`

All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Authentication

### POST /api/auth/login
Login with email (demo mode supports any email).

**Request:**
```json
{
  "email": "amore@applesandorangespr.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "user_amore",
      "email": "amore@applesandorangespr.com",
      "agencyId": "agency_aopr",
      "role": "AGENCY_ADMIN"
    }
  }
}
```

### GET /api/auth/me
Get current user info. **Requires auth.**

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_amore",
    "agencyId": "agency_aopr",
    "email": "amore@applesandorangespr.com",
    "role": "AGENCY_ADMIN"
  }
}
```

### POST /api/auth/logout
Logout (client-side token deletion). **Requires auth.**

---

## Agency

### GET /api/agency/me
Get your agency details. **Requires auth.**

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "agency_aopr",
    "name": "Apples & Oranges Public Relations",
    "slug": "apples-and-oranges-pr",
    "primary_contact_email": "info@applesandorangespr.com",
    "timezone": "America/New_York",
    "settings": { "demo_mode_enabled": true }
  }
}
```

### GET /api/agency/metrics
Get KPI metrics for dashboard. **Requires auth.**

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOpportunities": 10,
    "activeOpportunities": 8,
    "clientsEngaged": 5,
    "acceptedResponses": 2,
    "interestedResponses": 3
  }
}
```

---

## Opportunities

### POST /api/opportunities
Create a new opportunity. **Requires auth.**

**Request:**
```json
{
  "title": "Forbes Women Founders Feature",
  "summary": "Feature spotlight for women founders",
  "media_type": "feature_article",
  "outlet_name": "Forbes",
  "opportunity_type": "PR",
  "category_tags": ["women_founders", "business"],
  "topic_tags": ["entrepreneurship"],
  "deadline_at": "2025-12-15T23:59:00Z",
  "target_client_ids": ["client_throne_society"]
}
```

**Response:** Created opportunity object (201)

### GET /api/opportunities
List all opportunities. **Requires auth.**

**Query Params:**
- `limit` — Default 50
- `offset` — Default 0

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "opp_forbes_founder",
      "title": "Forbes Women Founders Feature",
      "media_type": "feature_article",
      "outlet_name": "Forbes",
      "deadline_at": "2025-12-15T23:59:00Z",
      "status": "active",
      "created_at": "2025-11-25T15:05:00Z"
    }
  ]
}
```

### GET /api/opportunities/:id
Get a specific opportunity. **Requires auth.**

### PUT /api/opportunities/:id
Update opportunity. **Requires auth.**

**Request:** (partial update)
```json
{
  "title": "Updated Title",
  "deadline_at": "2025-12-20T23:59:00Z"
}
```

### DELETE /api/opportunities/:id
Soft-delete (mark as closed). **Requires auth.**

---

## Clients

### POST /api/clients
Create a new client. **Requires auth.**

**Request:**
```json
{
  "name": "The Throne Society",
  "industry": "Beauty & Wellness",
  "primary_contact_name": "Founder Name",
  "primary_contact_email": "founder@company.com",
  "tags": ["beauty", "founder-led"],
  "media_readiness_flags": {
    "has_headshots": true,
    "has_bio": true,
    "prefers_live_interviews": false
  }
}
```

### GET /api/clients
List all clients. **Requires auth.**

### GET /api/clients/:id
Get client details. **Requires auth.**

### PUT /api/clients/:id
Update client. **Requires auth.**

### GET /api/clients/:clientId/opportunities
Get opportunities assigned to a client. **Requires auth.**

---

## Client Opportunity Status

### GET /api/statuses/:clientId/:opportunityId
Get client's response status for an opportunity. **Requires auth.**

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cos_throne_forbes",
    "client_id": "client_throne_society",
    "opportunity_id": "opp_forbes_founder",
    "response_state": "pending",
    "responded_at": null,
    "decline_reason": null,
    "notes_for_agency": null,
    "created_at": "2025-11-25T15:06:00Z"
  }
}
```

### PUT /api/statuses/:clientId/:opportunityId
Update client's response (accept, interested, decline). **Requires auth.**

**Request:**
```json
{
  "response_state": "accepted",
  "notes_for_agency": "Founder is excited about this opportunity"
}
```

**Effects:**
- If `accepted`: 3 follow-up tasks auto-created
- If `interested`: 1 follow-up task auto-created
- All state changes logged in activity log
- PR team notified via in-app notification

### GET /api/opportunities/:opportunityId/statuses
Get all client responses for an opportunity. **Requires auth.**

### GET /api/opportunities/:opportunityId/summary
Get summary of all client responses (pending, interested, accepted, declined). **Requires auth.**

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "pending": 1,
    "interested": 1,
    "accepted": 1,
    "declined": 0,
    "no_response": 0
  }
}
```

---

## Follow-Up Tasks

### POST /api/tasks
Create a task manually. **Requires auth.**

**Request:**
```json
{
  "opportunity_id": "opp_forbes_founder",
  "client_id": "client_throne_society",
  "title": "Schedule briefing call",
  "description": "Align talking points with founder",
  "due_at": "2025-12-01T18:00:00Z",
  "task_type": "briefing",
  "priority": "high",
  "assigned_to_user_id": "user_amore"
}
```

### GET /api/tasks
List all tasks. **Requires auth.**

### GET /api/tasks/:id
Get task details. **Requires auth.**

### PUT /api/tasks/:id
Update task (status, priority, assigned user). **Requires auth.**

### GET /api/opportunities/:opportunityId/tasks
Get tasks for an opportunity. **Requires auth.**

### GET /api/clients/:clientId/tasks
Get tasks for a client. **Requires auth.**

---

## CSV Import

### POST /api/csv/import
Import opportunities from CSV. **Requires auth.**

**Request:**
```json
{
  "csv_content": "Title,Outlet,Type,Deadline,Client\nForbes Feature,Forbes,feature_article,2025-12-15,Throne Society",
  "client_mapping": {
    "throne society": "client_throne_society",
    "glow up": "client_glow_up"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": 2,
    "skipped": 0,
    "errors": []
  }
}
```

### GET /api/csv/client-mapping
Get name-to-id mapping for all clients. **Requires auth.**

**Response:**
```json
{
  "success": true,
  "data": {
    "throne society": "client_throne_society",
    "nylon": "client_nylon",
    "glow up": "client_glow_up"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

**Validation errors:**
```json
{
  "success": false,
  "errors": [
    {
      "field": "title",
      "message": "title is required"
    }
  ]
}
```

**HTTP Status Codes:**
- `200` — Success
- `201` — Created
- `400` — Bad request / validation error
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `500` — Server error

---

## Pagination

List endpoints support pagination:

```
GET /api/opportunities?limit=25&offset=0
```

Returns:
- Items up to `limit`
- Skip `offset` items
- Use for cursor-based pagination in frontend

---

## Rate Limiting

(Coming in Phase 2)

---

## Webhooks

(Coming in Phase 3)

---

## SDK / Client Library

Use `apiClient` from `frontend/src/lib/api.ts`:

```typescript
import { apiClient } from '@/lib/api';

// Login
await apiClient.login('email@example.com');

// Create opportunity
await apiClient.createOpportunity({
  title: '...',
  media_type: 'feature_article',
  // ...
});

// Get opportunities
const res = await apiClient.getOpportunities();
const opportunities = res.data;

// Update client response
await apiClient.updateOpportunityStatus(
  'client_id',
  'opportunity_id',
  { response_state: 'accepted' }
);
```

---

## Testing API with cURL

```bash
# Login and extract token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"amore@applesandorangespr.com"}' | jq -r '.data.token')

# Get opportunities
curl -X GET http://localhost:3001/api/opportunities \
  -H "Authorization: Bearer $TOKEN"

# Create opportunity
curl -X POST http://localhost:3001/api/opportunities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Opp",
    "media_type": "feature_article",
    "outlet_name": "Forbes",
    "opportunity_type": "PR"
  }'
```

---

**All endpoints are versioned under `/api` prefix for future v2 compatibility.**
