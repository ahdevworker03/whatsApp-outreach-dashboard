# System Architecture

## 1. System Overview

The WhatsApp Outreach Dashboard is a small, single-user application for running WhatsApp outreach campaigns through the official WhatsApp Business Platform. It takes leads exported from the client's existing Google Maps extraction tool as an Excel/CSV file, stores and manages them, sends approved message templates, follows up automatically on a schedule, and lets the client handle replies from an Inbox. Core workflow: Excel/CSV → Dashboard → WhatsApp Business Platform → Leads.

## 2. Architecture Principles

- Single-user system — no multi-tenancy, no roles/permissions.
- Simplicity over abstraction — no layers or patterns the MVP doesn't need.
- Risk-first implementation — prove Meta/WhatsApp send and webhook receive before building UI.
- Official WhatsApp Business Platform only — no unofficial or third-party WhatsApp APIs.
- No unnecessary infrastructure — no Redis, no queues, no microservices.
- One active WhatsApp number, one active campaign at a time.
- Small VPS is enough — the project is low-traffic (~150 messages/day) and does not need overpowered infrastructure.

## 3. System Components

**React frontend**
Served as static files. Provides the Dashboard, Leads, Campaign, Inbox, and Settings pages. No server-side rendering.

**Express backend**
Single Node.js service responsible for the REST API, the WhatsApp webhook endpoint, and the in-process scheduler. Contains the lead/campaign/message logic and auto-reply detection rules.

**PostgreSQL database**
Stores leads, campaigns, messages, conversation/inbox data, and message status/statistics. Single small database instance.

**Meta Cloud API (external dependency)**
The official WhatsApp Business Platform API used to send outbound templates and receive incoming messages/status updates via webhook.

**Nginx**
Reverse proxy in front of the Express backend. Terminates HTTPS and routes browser traffic and Meta webhook calls to Express.

**node-cron scheduler**
In-process scheduler running inside the Express backend. Triggers follow-up #1 and follow-up #2 jobs after their configured delays. No Redis, no external queue/worker.

## 4. Production Topology

```
Browser        → Nginx → Express → PostgreSQL
Meta webhook   → Nginx → Express
node-cron      → Express → Meta Cloud API
```

## 5. Core Workflow

```
Excel/CSV import
  → lead created
  → initial template sent
  → follow-up scheduling (Follow-up #1, then Follow-up #2, per configured delays)
  → auto-reply detection
      - detected automatic reply  → continue follow-up sequence
      - normal/human reply        → stop remaining automatic follow-ups
  → conversation shown in Inbox
  → manual reply from dashboard
```

## 6. External Dependencies

- **Meta Cloud API (WhatsApp Business Platform)** — used for sending templates and receiving messages via webhook. Requires a registered WhatsApp Business number, an approved Meta app, and at least one approved message template.

Outside our control:
- Meta account approval and business verification
- Template approval
- Webhook reachability and Meta platform availability
- Continued API access if WhatsApp/Meta policies are violated

## 7. Explicit Exclusions

- Multiple users, roles, or employee accounts
- Multiple active WhatsApp numbers at the same time
- Redis, message queues, or worker infrastructure
- Microservices — this is a single backend service
- AI features (AI replies, AI sales agent, AI classification for auto-reply detection)
- Google Maps scraping or changes to the existing extraction tool
- Google Sheets sync
