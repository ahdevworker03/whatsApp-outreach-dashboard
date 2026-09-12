# Backend Rules

These rules describe the conventions actually established in `backend/` by M2 and M3. When code and this file disagree, treat it as a real inconsistency to flag (per `docs/rules/project.md`'s Repository Truth) — not something to silently resolve either way.

## 1. Structure

Flat, not modular-by-domain at every layer — this is a small two-folder repo (`backend/`, `frontend/`), not a monorepo:

```text
backend/src/
  config/        env.ts — fail-fast getters for required env vars
  routes/        v1.routes.ts — mounts domain routers under /api/v1, applies auth
  <domain>/      route + controller pair, grouped by domain (leads/, webhooks/)
  services/      <domain>.service.ts — one file per domain
  repositories/  <domain>.repository.ts — one file per domain, Prisma-only
  middleware/    apiAuth.ts, errorHandler.ts
  lib/           shared/pure logic — phone.ts, leadFileParser.ts, leadRowValidator.ts, asyncHandler.ts
  prisma/        client.ts — the shared Prisma client singleton
```

Route and controller live together under their own domain folder (`src/leads/leads.routes.ts` + `leads.controller.ts`, `src/webhooks/whatsapp.routes.ts` + `whatsapp.controller.ts`). Services and repositories do not get their own domain folder — they live in the shared top-level `services/` and `repositories/` folders, one file per domain. Do not introduce an `apps/api` layout or a `src/modules/<domain>/` tree for a new domain; extend the pattern above instead.

## 2. Layer Flow

route → controller → service → repository → Prisma/database.

- Routes register endpoints and apply middleware only (auth, `multer`, `asyncHandler`) — no business logic.
- Controllers are thin and HTTP-focused: parse the request, call one service function, shape the response. A controller may resolve its own request-level failure directly (a malformed id, an unknown status filter, a missing upload) without involving the service — that's request validation, not a business decision.
- Services own workflows and business rules, and are the only layer allowed to throw a domain error (e.g. `LeadNotFoundError`, `LeadAlreadyContactedError`, `UnsupportedLeadFileTypeError`).
- Repositories are Prisma-only: no business decisions, no calling services, no HTTP awareness.

## 3. Async Handlers

This repo's Express version (4.x) does not catch a rejected promise thrown by an async route handler — it crashes the process instead of reaching the error handler. Wrap every async controller with `src/lib/asyncHandler.ts` rather than repeating try/catch/`next(err)` per route.

## 4. Requests and Responses

Both shapes come from `docs/architecture/05-api-design.md` section 2 — that doc is the source of truth here, not this file:

- Success responses return the documented body with no wrapper (`{ imported, duplicates, failed }`, `{ leads, total }`, the raw resource) — never a `{ data }` envelope.
- Errors return `{ error: string, code?: string }`.
- There is no shared `AppError` class. A domain error is a plain `Error` subclass (e.g. `InvalidPhoneNumberError` in `src/lib/phone.ts`, `LeadNotFoundError` in `src/services/leads.service.ts`) thrown from a service.
- `src/middleware/errorHandler.ts` is the single place that maps a thrown error to its HTTP status and serializes it. Do not catch and re-serialize a known domain error inside a controller — add the mapping to `errorHandler.ts` instead.

## 5. Validation

Three distinct layers, each catching a different kind of problem:

- **Request/schema** (controller): is the input well-formed — a real UUID, a known enum value, a file actually present?
- **Business** (service, e.g. `src/lib/leadRowValidator.ts`): is this input valid *and reconcilable with current data* — required fields present, not a duplicate?
- **Database integrity** (Prisma schema / Postgres constraints): the last backstop, never the only check — see `docs/rules/database.md`'s Integrity section.

## 6. Transactions

No shared transaction/retry helper exists in this repo yet. Use `prisma.$transaction` directly wherever a workflow needs atomicity across more than one write; introduce a shared retry helper only once a second call site actually needs one — do not build it speculatively.

## 7. Testing

- `vitest` (`npm test`) covers pure logic — anything under `src/lib/` gets a co-located `*.test.ts`.
- Code that touches Prisma (repositories, services) is verified with a one-off `scripts/verify-*.ts` script run directly against the real dev database, not mocked. See `docs/rules/testing.md`.

## 8. Scope

- Keep files focused; split by cohesion, not a line-count target.
- Prefer the existing structure and naming over introducing a new pattern for a single file.
