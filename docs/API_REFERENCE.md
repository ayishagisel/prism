# PRISM API Reference

Complete API documentation for the PRISM backend.

---

## Authentication Endpoints

### Register Agency User
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@aopr.com",
  "agency_name": "Apples & Oranges PR",
  "password": "securepassword123"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user_id": "user-123",
    "email": "john@aopr.com",
    "message": "Registration successful. Please verify your email."
  }
}
```

### Register Client User
```
POST /api/auth/register-client
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@luxurywatch.com",
  "client_id": "client-456",
  "password": "securepassword123"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user_id": "user-789",
    "client_id": "client-456",
    "message": "Registration successful. Please verify your email."
  }
}
```

### Verify Email
```
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "hash_of_verification_token"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "message": "Email verified successfully",
    "user_id": "user-123"
  }
}
```

### Request Password Reset
```
POST /api/auth/request-password-reset
Content-Type: application/json

{
  "email": "john@aopr.com",
  "user_type": "agency_user"  // or "client_user"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "message": "Password reset email sent"
  }
}
```

### Reset Password
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "hash_of_reset_token",
  "new_password": "newpassword123"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@aopr.com",
  "password": "securepassword123"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-123",
      "email": "john@aopr.com",
      "name": "John Doe",
      "agency_id": "agency-123"
    }
  }
}
```

### Refresh Token
```
POST /api/auth/refresh
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

Response: 200 OK
{
  "success": true,
  "data": {
    "access_token": "new_access_token",
    "refresh_token": "new_refresh_token"
  }
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "john@aopr.com",
    "name": "John Doe",
    "role": "AGENCY_ADMIN",
    "agency_id": "agency-123"
  }
}
```

### Logout
```
POST /api/auth/logout
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "message": "Logout successful"
  }
}
```

---

## Agency Endpoints

### Get Agency Info
```
GET /api/agency/me
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "agency-123",
    "name": "Apples & Oranges PR",
    "slug": "apples-oranges-pr",
    "primary_contact_name": "John Doe",
    "primary_contact_email": "john@aopr.com",
    "timezone": "America/New_York"
  }
}
```

### Get Agency Metrics
```
GET /api/agency/metrics
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "total_opportunities": 15,
    "total_clients": 5,
    "accepted_responses": 8,
    "pending_responses": 4,
    "total_tasks": 12,
    "completed_tasks": 3,
    "recent_activity": [...]
  }
}
```

---

## Opportunity Endpoints

### Create Opportunity
```
POST /api/opportunities
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "Feature in Forbes",
  "outlet_name": "Forbes",
  "media_type": "feature_article",
  "opportunity_type": "PR",
  "deadline_at": "2025-12-15T23:59:59Z",
  "summary": "Opportunity to feature our client in Forbes tech section"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "opp-123",
    "title": "Feature in Forbes",
    "agency_id": "agency-123",
    "created_at": "2025-12-04T10:00:00Z"
  }
}
```

### List Opportunities
```
GET /api/opportunities
Authorization: Bearer {access_token}
Query Parameters:
  - status: "active" | "closed" | "paused" | "expired"
  - media_type: "feature_article" | "podcast" | ...
  - sort: "deadline" | "created_at"
  - limit: number (default 50)
  - offset: number (default 0)

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "opp-123",
      "title": "Feature in Forbes",
      "media_type": "feature_article",
      "deadline_at": "2025-12-15T23:59:59Z",
      "status": "active",
      "created_at": "2025-12-04T10:00:00Z"
    },
    ...
  ]
}
```

### Get Opportunity Details
```
GET /api/opportunities/{id}
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "opp-123",
    "title": "Feature in Forbes",
    "outlet_name": "Forbes",
    "media_type": "feature_article",
    "deadline_at": "2025-12-15T23:59:59Z",
    "summary": "...",
    "status": "active",
    "created_at": "2025-12-04T10:00:00Z"
  }
}
```

### Update Opportunity
```
PUT /api/opportunities/{id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "closed"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "opp-123",
    "title": "Updated Title",
    "status": "closed"
  }
}
```

### Delete Opportunity
```
DELETE /api/opportunities/{id}
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "message": "Opportunity deleted"
  }
}
```

### Get Opportunity Summary
```
GET /api/opportunities/{id}/summary
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "opp-123",
    "title": "Feature in Forbes",
    "total_clients": 5,
    "response_stats": {
      "pending": 2,
      "interested": 1,
      "accepted": 1,
      "declined": 1,
      "no_response": 0
    }
  }
}
```

---

## Client Endpoints

### Create Client
```
POST /api/clients
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Luxury Watch Brand",
  "industry": "Luxury Goods",
  "primary_contact_name": "Jane Smith",
  "primary_contact_email": "jane@luxurywatch.com"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "client-123",
    "name": "Luxury Watch Brand",
    "agency_id": "agency-123"
  }
}
```

### List Clients
```
GET /api/clients
Authorization: Bearer {access_token}
Query Parameters:
  - status: "active" | "inactive" | "paused"
  - industry: string
  - limit: number
  - offset: number

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "client-123",
      "name": "Luxury Watch Brand",
      "industry": "Luxury Goods",
      "status": "active"
    },
    ...
  ]
}
```

### Get Client Details
```
GET /api/clients/{id}
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "client-123",
    "name": "Luxury Watch Brand",
    "industry": "Luxury Goods",
    "primary_contact_email": "jane@luxurywatch.com",
    "status": "active"
  }
}
```

### Update Client
```
PUT /api/clients/{id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "primary_contact_name": "Jane Smith Updated",
  "industry": "Luxury Watches"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "client-123",
    "name": "Luxury Watch Brand"
  }
}
```

### Delete Client
```
DELETE /api/clients/{id}
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "message": "Client deleted"
  }
}
```

### Get Client Opportunities
```
GET /api/clients/{id}/opportunities
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "opp-123",
      "title": "Feature in Forbes",
      "response_state": "pending",
      "created_at": "2025-12-04T10:00:00Z"
    },
    ...
  ]
}
```

---

## Client Response Status Endpoints

### Get Client Response Status
```
GET /api/statuses/{clientId}/{opportunityId}
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "status-123",
    "client_id": "client-123",
    "opportunity_id": "opp-123",
    "response_state": "pending",
    "responded_at": null,
    "notes_for_agency": null
  }
}
```

### Update Client Response Status
```
PUT /api/statuses/{clientId}/{opportunityId}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "response_state": "interested",
  "notes_for_agency": "Client is very interested"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "status-123",
    "response_state": "interested",
    "responded_at": "2025-12-04T11:30:00Z"
  }
}
```

### List Client Responses for Opportunity
```
GET /api/opportunities/{opportunityId}/statuses
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "status-123",
      "client_id": "client-123",
      "client_name": "Luxury Watch Brand",
      "response_state": "interested",
      "responded_at": "2025-12-04T11:30:00Z"
    },
    ...
  ]
}
```

---

## Task Endpoints

### Create Task
```
POST /api/tasks
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "opportunity_id": "opp-123",
  "client_id": "client-123",
  "title": "Send media kit",
  "task_type": "asset_collection",
  "due_at": "2025-12-10T23:59:59Z",
  "assigned_to_user_id": "user-123"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "task-123",
    "title": "Send media kit",
    "status": "pending"
  }
}
```

### List Tasks
```
GET /api/tasks
Authorization: Bearer {access_token}
Query Parameters:
  - status: "pending" | "in_progress" | "completed" | "cancelled"
  - task_type: "briefing" | "asset_collection" | ...
  - limit: number
  - offset: number

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "task-123",
      "title": "Send media kit",
      "status": "pending",
      "due_at": "2025-12-10T23:59:59Z"
    },
    ...
  ]
}
```

### Get Task Details
```
GET /api/tasks/{id}
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "task-123",
    "title": "Send media kit",
    "status": "pending",
    "opportunity_id": "opp-123",
    "client_id": "client-123",
    "due_at": "2025-12-10T23:59:59Z"
  }
}
```

### Update Task
```
PUT /api/tasks/{id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "status": "completed"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "task-123",
    "status": "completed"
  }
}
```

---

## CSV Import Endpoints

### Import CSV
```
POST /api/csv/import
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "csv_content": "Title,Outlet,Deadline,...\nFeature in Forbes,...",
  "client_mapping": {
    "Luxury Watch": "client-123",
    "Tech Startup": "client-456"
  }
}

Response: 200 OK
{
  "success": true,
  "data": {
    "imported_count": 10,
    "errors": [],
    "import_id": "import-123"
  }
}
```

### Get Client Mapping
```
GET /api/csv/client-mapping
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client-123",
        "name": "Luxury Watch Brand"
      },
      ...
    ]
  }
}
```

---

## Zoho Integration Endpoints

### Get Zoho Authorization URL
```
GET /api/zoho/authorize
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "authorization_url": "https://accounts.zoho.com/oauth/v2/auth?...",
    "state": "agency-123_1733300000_abc123"
  }
}
```

### Handle Zoho OAuth Callback
```
POST /api/zoho/callback
Authorization: Bearer {access_token}
Query Parameters:
  - code: authorization_code_from_zoho
  - state: state_token_from_zoho

Response: 200 OK
{
  "success": true,
  "data": {
    "message": "Zoho OAuth connection successful",
    "agencyId": "agency-123"
  }
}
```

### Trigger Zoho Sync
```
POST /api/zoho/sync
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "opportunities_synced": 10,
    "clients_synced": 5,
    "timestamp": "2025-12-04T12:00:00Z"
  }
}
```

### Get Zoho Connection Status
```
GET /api/zoho/status
Authorization: Bearer {access_token}

Response: 200 OK
{
  "success": true,
  "data": {
    "connected": true,
    "agencyId": "agency-123"
  }
}
```

### Receive Zoho Webhook
```
POST /api/webhooks/zoho
Content-Type: application/json

{
  "operation": "insert.deals",
  "resource_id": "zoho_deal_id",
  "data": {...}
}

Response: 200 OK
{
  "success": true
}
```

---

## Error Responses

All endpoints return consistent error responses:

```
HTTP 400 Bad Request
{
  "success": false,
  "error": "Invalid request body",
  "errors": [
    {"field": "email", "message": "Invalid email format"}
  ]
}

HTTP 401 Unauthorized
{
  "success": false,
  "error": "Unauthorized - Token required"
}

HTTP 404 Not Found
{
  "success": false,
  "error": "Opportunity not found"
}

HTTP 500 Internal Server Error
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer {access_token}
```

Access tokens are JWT format with 7-day expiry. Use refresh token endpoint to get new tokens.

---

## Rate Limiting

Currently no rate limiting. Will be added in production.

---

## Pagination

Endpoints supporting lists use:
- `limit`: number of results per page (default 50, max 100)
- `offset`: number of results to skip (default 0)

Example:
```
GET /api/opportunities?limit=20&offset=40
```

---

## Data Types

### Media Type Enum
- `feature_article`
- `news_brief`
- `panel`
- `podcast`
- `tv_appearance`
- `speaking_engagement`
- `event`
- `other`

### Opportunity Type Enum
- `PR`
- `Event`
- `Speaking`
- `Partnership`

### Response State Enum
- `pending`
- `interested`
- `accepted`
- `declined`
- `no_response`

### Task Status Enum
- `pending`
- `in_progress`
- `completed`
- `cancelled`

### Task Type Enum
- `briefing`
- `media_training`
- `asset_collection`
- `scheduling`
- `follow_up`
- `other`

---

## Timestamps

All timestamps in ISO 8601 format with timezone (UTC):
```
2025-12-04T12:00:00Z
```

---

Last Updated: December 4, 2025
