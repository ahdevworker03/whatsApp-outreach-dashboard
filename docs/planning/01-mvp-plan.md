# Product Backlog

## 1. Overview

This backlog tracks implementation progress milestone by milestone, in risk-first order. Status values used: NOT STARTED, IN PROGRESS, DONE, BLOCKED.

## 2. Milestone Status Table

| Milestone | Status | Notes |
|---|---|---|
| M1: WhatsApp Integration Proof | NOT STARTED | |
| M2: Backend Foundation and Data Model | NOT STARTED | |
| M3: Lead Management and Excel/CSV Import | NOT STARTED | |
| M4: Campaign and Outbound Messaging | NOT STARTED | |
| M5: Follow-up Automation | NOT STARTED | |
| M6: Inbox | NOT STARTED | |
| M7: Frontend | NOT STARTED | |
| M8: VPS Deployment | NOT STARTED | |
| M9: End-to-End Verification and Handover | NOT STARTED | |

## 3. Milestone Detail

### M1: WhatsApp Integration Proof
Goal: prove the full send/receive round-trip with Meta before building anything else.
Steps: Meta Business Account and WhatsApp Business Platform setup, register client's number, minimal Express backend, send one real outbound message, verify webhook with a real incoming reply, verify message status callbacks.
Acceptance: a real message is delivered to a real phone; a real reply is received by the backend via webhook; sent/delivered/read/failed status events are observed and logged.

### M2: Backend Foundation and Data Model
Goal: production-grade backend with the full data model per docs/architecture/04-database-design.md.
Steps: PostgreSQL setup, Prisma schema, core tables, webhook handler persists incoming messages/status, basic API structure and error handling per docs/architecture/03-backend-architecture.md.
Acceptance: all tables and enums from the database design doc exist and migrate cleanly; webhook events are persisted correctly.

### M3: Lead Management and Excel/CSV Import
Goal: import and manage leads reliably.
Steps: Excel/CSV parsing, phone normalization, duplicate detection, lead storage/status lifecycle, leads API endpoints per docs/architecture/05-api-design.md.
Acceptance: a real client-provided Excel/CSV file imports correctly with duplicates and invalid rows handled as expected.

### M4: Campaign and Outbound Messaging
Goal: configure and run a single active campaign that sends the initial template.
Steps: campaign API endpoints (create, update, activate), daily sending limit enforcement, initial template send via Meta Cloud API, lead status update to CONTACTED, message record creation.
Acceptance: a campaign can be created and activated; sending the initial template to a lead updates its status and creates a message record; the daily limit is enforced and not exceeded.

### M5: Follow-up Automation
Goal: automatically send follow-ups and stop on real replies.
Steps: node-cron scheduler checking due leads, follow-up #1 and #2 send logic based on configured delays, auto-reply detection rules, stop-on-human-reply logic.
Acceptance: follow-up #1 and #2 send after their configured delays when no reply is received; a detected auto-reply does not stop the sequence; a human reply stops all remaining follow-ups for that lead.

### M6: Inbox
Goal: view and reply to conversations manually.
Steps: conversation creation/updates wired to incoming messages, inbox API endpoints, manual reply sending within the 24-hour customer service window.
Acceptance: incoming conversations appear in the inbox with full message history; a manual reply is sent successfully and stored as a message.

### M7: Frontend
Goal: build the five MVP pages.
Steps: React app setup, Dashboard, Leads, Campaign, Inbox, and Settings pages wired to the REST API.
Acceptance: all five pages function against the real backend; dashboard statistics match the actual underlying data.

### M8: VPS Deployment
Goal: deploy the system to a small VPS per docs/architecture/01-system-architecture.md and docs/architecture/02-technology-decisions.md.
Steps: VPS provisioning, Nginx reverse proxy, HTTPS via Let's Encrypt/Certbot, systemd service for the backend, environment variables/secrets configuration, database backups.
Acceptance: the app is reachable over HTTPS; the webhook URL is reachable by Meta; the backend restarts automatically via systemd.

### M9: End-to-End Verification and Handover
Goal: confirm the full MVP works end-to-end with real data before final handover.
Steps: run the full workflow with real leads in production, verify acceptance criteria from all prior milestones, final client review, remaining payment, handover.
Acceptance: a real campaign run completes successfully end-to-end in production; the client confirms acceptance of the MVP.
