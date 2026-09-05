# Backend Rules

## Table of Contents

| # | Section |
| - | ------- |
| 1 | [Architecture](#architecture) |
| 2 | [Module Structure](#module-structure) |
| 3 | [Layer Responsibilities](#layer-responsibilities) |
| 4 | [Requests and Responses](#requests-and-responses) |
| 5 | [Validation](#validation) |
| 6 | [Transactions](#transactions) |
| 7 | [Business Rule Ownership](#business-rule-ownership) |
| 8 | [Scope](#scope) |
| 9 | [Contracts and Types](#contracts-and-types) |

These rules govern backend structure and request flow in `apps/api`. Framework and language specifics belong in the corresponding skills.

## Architecture

- Follow modular, feature-first backend organization under `src/modules/`.
- Preserve the layer flow:

```text
route → controller → service → repository → Prisma/database
```

- Each module owns its business domain; do not spread a domain's logic across unrelated modules.

## Module Structure

Use consistent module filenames where the responsibility exists:

```text
<domain>.routes.ts
<domain>.controller.ts
<domain>.service.ts
<domain>.repository.ts
<domain>.validation.ts
<domain>.types.ts
```

Do not require a module to include a file for a responsibility it does not have.

## Layer Responsibilities

- Routes register endpoints and apply middleware only; no business logic.
- Controllers remain thin and HTTP-focused.
- Services own workflows, business rules, and transactions.
- Repositories own persistence and hide Prisma details.
- Controllers do not access Prisma directly.
- Repositories do not call services or contain business decisions.

## Requests and Responses

- Use the shared `AppError(status, code, message)` for expected failures.
- Preserve the success shape `{ data }`.
- Preserve the error shape `{ error: { code, message } }`.
- Let the global error handler serialize expected errors; do not re-serialize them in controllers.

## Validation

Validate at three distinct layers:

- request/schema validation
- service/business validation
- database integrity constraints

Refer to `api-contracts.md` for generated API validation behavior.

## Transactions

- Use the existing shared transaction infrastructure (`transaction` and `retrySerializable`).
- Make multi-record lifecycle changes transactional when atomicity matters.
- Use serializable transactions for concurrency-sensitive lifecycle changes according to established repository patterns.
- Retry only documented serialization conflicts.
- Map Prisma errors through the existing error-normalization helpers in `database/errors.ts`.

## Business Rule Ownership

- Every business rule should have one clear owning domain.
- Cross-domain workflows may coordinate through service-level boundaries without duplicating the underlying rule.
- Example: Rental owns rental overlap/booking rules; Maintenance owns maintenance lifecycle rules. Both may influence vehicle operational availability.

## Scope

- Keep files focused.
- Roughly 250–300 lines is a guideline where practical, not a mechanical limit.
- Split a file only when it improves cohesion, correctness, or testability.

## Contracts and Types

- Follow `docs/rules/api-contracts.md` for the API spec and generated code.
- Follow `docs/rules/typeScript-rules.md` for strict typing.

Do not duplicate those rules here.
