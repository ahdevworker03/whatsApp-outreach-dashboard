# Database Design

## 1. Overview

Single PostgreSQL database, managed via Prisma. Stores leads, campaigns, messages, conversations, and settings.

## 2. Tables

**leads**

```
id: UUID, primary key
phone: string, unique — normalized E.164 format
name: string, nullable
business_name: string, nullable
source_file: string, nullable — original import filename
status: LeadStatus enum
campaign_id: UUID, nullable, foreign key → campaigns
created_at: timestamp
updated_at: timestamp
followup1_due_at: timestamp, nullable — set when initial template is sent
followup2_due_at: timestamp, nullable — set when follow-up #1 is sent
```

**campaigns**

```
id: UUID, primary key
name: string
status: CampaignStatus enum
initial_template_id: string — Meta template name
followup1_template_id: string
followup1_delay_hours: integer
followup2_template_id: string
followup2_delay_hours: integer
daily_limit: integer — default 150
created_at: timestamp
updated_at: timestamp
```

**messages**

```
id: UUID, primary key
lead_id: UUID, foreign key → leads
campaign_id: UUID, foreign key → campaigns
direction: MessageDirection enum — OUTBOUND or INBOUND
type: MessageType enum — TEMPLATE, TEXT
content: string
status: MessageStatus enum
meta_message_id: string, nullable — ID returned by Meta API
is_auto_reply: boolean, default false
sent_at: timestamp, nullable
delivered_at: timestamp, nullable
read_at: timestamp, nullable
failed_at: timestamp, nullable
created_at: timestamp
```

**conversations**

```
id: UUID, primary key
lead_id: UUID, unique, foreign key → leads
status: ConversationStatus enum
last_message_at: timestamp, nullable
automation_stopped: boolean, default false — true when a human reply is detected
created_at: timestamp
updated_at: timestamp
```

**settings**

```
id: UUID, primary key — single row table
whatsapp_phone_number: string, nullable
whatsapp_phone_number_id: string, nullable — Meta phone number ID
auto_reply_patterns: string[] — configurable keywords/patterns for auto-reply detection
updated_at: timestamp
```

## 3. Enums

**LeadStatus**

- NEW — imported, not yet contacted
- CONTACTED — initial template sent
- FOLLOWUP_1_SENT — follow-up #1 sent
- FOLLOWUP_2_SENT — follow-up #2 sent
- REPLIED — human reply received, automation stopped
- COMPLETED — full sequence finished with no reply
- FAILED — message delivery failed

**CampaignStatus**

- DRAFT — not yet active
- ACTIVE — currently running, only one campaign can be ACTIVE at a time
- PAUSED — temporarily stopped
- ARCHIVED — no longer in use

**MessageDirection**

- OUTBOUND — sent by the system
- INBOUND — received from the lead

**MessageType**

- TEMPLATE — a Meta-approved WhatsApp template
- TEXT — a free-form text message (used for manual replies from Inbox)

**MessageStatus**

- PENDING — not yet sent
- SENT — accepted by Meta
- DELIVERED — delivered to the recipient's device
- READ — read by the recipient
- FAILED — delivery failed

**ConversationStatus**

- ACTIVE — has unread or recent messages requiring attention
- CLOSED — handled, no further action needed

## 4. Status Lifecycle

```
NEW → CONTACTED → FOLLOWUP_1_SENT → FOLLOWUP_2_SENT → COMPLETED

At any stage: human reply received → REPLIED (automation stops)
At any stage: delivery failure → FAILED
```

## 5. Key Constraints and Rules

- Only one campaign can have status ACTIVE at a time. Enforced in application logic.
- Phone numbers are stored in E.164 format. Normalization happens at import time.
- The settings table always has exactly one row.
- automation_stopped on conversations is set to true when a human reply is received. The scheduler checks this before sending any follow-up.
- is_auto_reply on a message is set by the auto-reply detection logic in the webhook handler, not by the user.
