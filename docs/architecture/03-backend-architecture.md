# Backend Architecture

## 1. Overview

The backend is a single Node.js + Express + TypeScript service. It handles the REST API, the WhatsApp webhook, the in-process scheduler, and all business logic. No microservices, no external workers.

## 2. Folder Structure

```
backend/
├── src/
│   ├── routes/         # Express route handlers
│   ├── services/       # Business logic (leads, campaign, messaging, inbox)
│   ├── jobs/           # node-cron scheduler and follow-up job logic
│   ├── webhooks/       # WhatsApp webhook handler
│   ├── middleware/     # Error handling, request validation
│   ├── lib/            # Shared utilities (phone normalization, auto-reply detection)
│   ├── prisma/         # Prisma client instance
│   └── index.ts        # Entry point, Express app setup
├── prisma/
│   └── schema.prisma
├── .env
└── package.json
```

## 3. Core Responsibilities

- Serving the REST API for the frontend
- Handling incoming WhatsApp webhook events from Meta
- Sending outbound messages and templates via Meta Cloud API
- Persisting leads, messages, campaigns, and conversations to PostgreSQL via Prisma
- Running the in-process follow-up scheduler (node-cron)
- Enforcing the daily sending limit
- Auto-reply detection using configurable rules
- Lead and message status lifecycle management

## 4. Request Flow — Outbound Message

```
Frontend → REST API → messaging service → Meta Cloud API → WhatsApp
Meta status callback → webhook handler → message status updated in DB
```

## 5. Request Flow — Incoming Message

```
WhatsApp reply → Meta → webhook handler → auto-reply detection →
  if auto-reply: continue follow-up sequence
  if human reply: stop follow-up, mark conversation active, show in Inbox
```

## 6. Scheduler

node-cron runs inside the Express process. It checks on a regular interval for leads that are due for Follow-up #1 or Follow-up #2 based on configured delays. It respects the daily sending limit. No Redis, no external queue, no separate worker process.

## 7. Environment Variables

- PORT
- DATABASE_URL
- META_ACCESS_TOKEN
- META_PHONE_NUMBER_ID
- META_WEBHOOK_VERIFY_TOKEN
- NODE_ENV
- API_ACCESS_TOKEN

## 8. Error Handling

A global Express error handler catches unhandled errors and returns a consistent JSON error response. Webhook handler failures are logged but do not crash the process. Scheduler job failures are logged per job and do not stop the scheduler. The auth middleware returns 401 for missing or invalid tokens on /api/v1/* routes.
