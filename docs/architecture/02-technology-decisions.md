# Technology Decisions

## 1. Overview

This document records the technology choices for the WhatsApp Outreach Dashboard MVP and the reasoning behind each.

## 2. Technology Decisions

**Runtime — Node.js + TypeScript**
Chosen over Python or other runtimes. Consistent language across frontend and backend, strong ecosystem for Express and Prisma, TypeScript adds safety without heavy overhead.

**Framework — Express**
Chosen over NestJS or Fastify. Simple, minimal, no unnecessary structure for a project this small.

**Database — PostgreSQL**
Chosen over MySQL or SQLite. Reliable, relational, good Prisma support, handles the data model cleanly.

**ORM — Prisma**
Chosen over raw SQL or other ORMs. Type-safe queries, clean schema definition, good migration tooling.

**Scheduler — node-cron (in-process)**
Chosen over Redis + Bull, BullMQ, or any external queue. The follow-up job is simple and low-frequency (~150 messages/day). An external queue is unnecessary infrastructure for this scale.

**Frontend — React + TypeScript**
Chosen for the five MVP pages. No server-side rendering. Served as static files.

**Reverse proxy — Nginx**
Terminates HTTPS, routes traffic to Express. Standard choice for a manually managed VPS.

**Process manager — systemd**
Keeps the Express backend running. No PM2 or Docker. Native to Linux, sufficient for a single service, supports the DevOps learning goal.

**HTTPS — Let's Encrypt via Certbot**
Free, automated, standard for a small VPS.

**WhatsApp API — Meta Cloud API (official)**
No unofficial or third-party WhatsApp APIs considered. The project requires the official platform.

## 3. Deferred Decisions

- Frontend serving: from Nginx directly as static files, or from Express. To be decided at deployment step.
- VPS provider: not yet selected.

## 4. Explicitly Rejected Approaches

- Redis and external queues — unnecessary for this scale.
- Docker — adds complexity with no benefit for a single manually managed service at this stage.
- Kubernetes or any orchestration — not appropriate for this project.
- NestJS — too much structure for a small single-service backend.
- AI-based auto-reply detection — excluded from MVP scope.
