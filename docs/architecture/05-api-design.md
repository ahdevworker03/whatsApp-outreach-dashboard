# API Design

## 1. Overview

The backend exposes a REST API consumed by the React frontend. It also exposes a webhook endpoint for Meta to deliver incoming messages and message status updates.

## 2. General Conventions

- Base URL: /api/v1
- All request and response bodies are JSON
- Timestamps are ISO 8601 strings
- Phone numbers are E.164 format
- Errors return: `{ error: string, code?: string }`
- HTTP status codes follow standard conventions (200, 201, 400, 404, 409, 500)

## 3. Leads Endpoints

**POST /api/v1/leads/import**
- Import leads from an uploaded Excel or CSV file
- Request: multipart/form-data with file field
- Response 201: `{ imported: number, duplicates: number, failed: number }`

**GET /api/v1/leads**
- List all leads with their current status
- Query params: status (optional filter), page, limit
- Response 200: `{ leads: Lead[], total: number }`

**GET /api/v1/leads/:id**
- Get a single lead with its message history
- Response 200: Lead object with messages array

**DELETE /api/v1/leads/:id**
- Remove a lead. Not allowed if lead has been contacted.
- Response 200 or 409 if already contacted

## 4. Campaign Endpoints

**GET /api/v1/campaign**
- Get the current active or draft campaign configuration
- Response 200: Campaign object

**POST /api/v1/campaign**
- Create a new campaign (only one ACTIVE campaign allowed)
- Request body: name, initial_template_id, followup1_template_id, followup1_delay_hours, followup2_template_id, followup2_delay_hours, daily_limit
- Response 201: Campaign object

**PATCH /api/v1/campaign/:id**
- Update campaign configuration. Not allowed if campaign is ACTIVE.
- Response 200 or 409 if active

**PATCH /api/v1/campaign/:id/status**
- Change campaign status (DRAFT → ACTIVE, ACTIVE → PAUSED, etc.)
- Request body: `{ status: CampaignStatus }`
- Response 200: Campaign object

## 5. Messaging Endpoints

**POST /api/v1/messages/send**
- Manually trigger sending the initial template to one lead
- Request body: `{ lead_id: string }`
- Response 200: Message object

**POST /api/v1/inbox/:conversation_id/reply**
- Send a manual free-text reply from the Inbox
- Request body: `{ message: string }`
- Response 200: Message object

## 6. Inbox Endpoints

**GET /api/v1/inbox**
- List all conversations ordered by last message time
- Query params: status (optional), page, limit
- Response 200: `{ conversations: Conversation[], total: number }`

**GET /api/v1/inbox/:conversation_id**
- Get a conversation with full message history
- Response 200: Conversation object with messages array

**PATCH /api/v1/inbox/:conversation_id/status**
- Mark conversation as CLOSED
- Request body: `{ status: ConversationStatus }`
- Response 200: Conversation object

## 7. Dashboard Endpoints

**GET /api/v1/dashboard/stats**
- Get summary statistics for the dashboard page
- Response 200:
```
{
  total_leads: number,
  contacted: number,
  replied: number,
  waiting_for_followup: number,
  completed: number,
  failed: number
}
```

## 8. Settings Endpoints

**GET /api/v1/settings**
- Get current settings
- Response 200: Settings object

**PATCH /api/v1/settings**
- Update settings (WhatsApp number, auto-reply patterns)
- Request body: Partial settings fields
- Response 200: Settings object

## 9. WhatsApp Webhook

**GET /webhook**
- Meta webhook verification endpoint. Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge. The backend verifies the token and returns hub.challenge.
- This is required before Meta will send any events.

**POST /webhook**
- Receives all incoming events from Meta. Two event types:
  - Incoming message: a lead has replied. Run auto-reply detection. If human reply, set automation_stopped, update lead status to REPLIED, update conversation. If auto-reply, log and continue sequence.
  - Status update: a message status has changed (sent, delivered, read, failed). Update the corresponding message record in the database.
- Response: always 200 immediately. Do not return non-200 to Meta or it will retry.

Note: The webhook endpoint is at /webhook, not under /api/v1, because Meta requires a clean URL configured in the Meta app dashboard.

## 10. WhatsApp Outbound Templates

Templates must be pre-approved by Meta before use. The backend sends templates using the Meta Cloud API POST /messages endpoint. The template name and language code are stored in the campaign configuration. Variable substitution (e.g. lead name) is passed in the components parameter if the template requires it. Free-text messages (manual inbox replies) can only be sent within a 24-hour customer service window after the lead has replied.

## 11. API Access Control

- All /api/v1/* routes require a static bearer token, checked via Express middleware.
- The token is stored in an environment variable (API_ACCESS_TOKEN) and configured once during deployment.
- This is not a full user authentication system — the project is single-user, so a shared static token is sufficient to prevent public unauthenticated access.
- The /webhook route does not use this token. It is secured separately via Meta's own webhook verify token (hub.verify_token), matched against META_WEBHOOK_VERIFY_TOKEN.
- Requests to /api/v1/* without a valid token return 401.
