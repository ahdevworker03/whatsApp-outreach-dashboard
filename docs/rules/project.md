# Project Rules

## 1. Project

This repository contains the WhatsApp Outreach Dashboard MVP — a single-user WhatsApp outreach tool built on the official WhatsApp Business Platform. `docs/contract/WhatsApp Outreach Dashboard.md` is the approved scope source of truth.

## 2. Repository Structure

```
backend/      # not yet created — Express + Prisma, per docs/architecture/03-backend-architecture.md
frontend/     # not yet created — React, per docs/architecture/01-system-architecture.md
docs/
  contract/       # approved scope (client agreement)
  architecture/   # system, backend, database, API, and technology decisions
  planning/       # milestone plan and agent workflow
  rules/          # this file and other rule files
  testing/        # test plans and acceptance checks
```

## 3. Source of Truth

| Area | Source of Truth |
|---|---|
| Approved scope | docs/contract/WhatsApp Outreach Dashboard.md |
| System architecture | docs/architecture/ |
| Data model | docs/architecture/04-database-design.md |
| API contracts | docs/architecture/05-api-design.md |
| Milestone plan | docs/planning/01-mvp-plan.md |
| Repository rules | docs/rules/ |

Never duplicate a source of truth. If a doc and the code disagree, the doc is updated or the disagreement is flagged — not silently resolved in code alone.

## 4. Development Principles

- Documentation before implementation for each milestone
- Risk-first implementation order, not frontend-first
- Small, scoped changes — one meaningful unit of work at a time
- Simplicity over abstraction
- No unapproved scope expansion
- Single source of truth per concern

## 5. Repository Rules

Repository behavior is defined by the rule files inside docs/rules/. These cover backend conventions, database conventions, coding standards, API contracts, development workflow, and testing. This file (project.md) defines repository-wide identity and structure; the other rule files define specific domains.

## 6. Explicit Non-Goals

- No multi-tenancy, no multiple users, no roles/permissions
- No monorepo — this is a small two-folder repo (backend/, frontend/)
- No offline-first requirements
- No AI-based features
- No infrastructure beyond what is in docs/architecture/02-technology-decisions.md
