# M4 — Campaign and Outbound Messaging

Goal (per `docs/planning/01-mvp-plan.md`): configure and run a single active campaign that sends the initial template.

Acceptance criteria for the milestone as a whole:
- A campaign can be created and activated.
- Sending the initial template to a lead updates its status and creates a message record.
- The daily limit is enforced and not exceeded.

**What already exists from M2/M3 that this milestone builds on:**
- `backend/src/lib/metaClient.ts`'s `sendTemplateMessage()` — proven against live Meta in M1, and already variable-substitution-ready: it accepts an optional `components?: TemplateComponent[]` parameter and passes it straight through into the Meta API request body's `template.components` when present, per `docs/architecture/05-api-design.md` section 10. It was written this way from M1 but has never actually been exercised with real variables — M1's proof call sent `hello_world`, which has none. No change to `metaClient.ts` itself is expected this milestone; this milestone is what finally exercises `components` for real.
- `backend/src/repositories/leads.repository.ts` and `backend/src/services/leads.service.ts` — the create/list/find/delete pattern from M3 (`listLeads`, `findLeadById`, etc.), and the layer flow (route → controller → service → repository → Prisma) from `docs/rules/backend.md`. This milestone extends `leads.repository.ts` with one new query (Step 3) and follows the same repository/service split for the new `campaigns` domain (Step 1).
- `backend/prisma/schema.prisma`'s `Campaign` and `Message` models, and the `LeadStatus`/`CampaignStatus`/`MessageStatus` enums — already migrated per M2, unchanged by this milestone.
- The placeholder DRAFT campaign seeded in M2 (`id: a07a1643-ca3f-4e2d-a117-927f3125d3d6`, `status: DRAFT`, all three template fields set to `hello_world`) — a stopgap so `messages.campaign_id`'s required FK could be satisfied before any real campaign system existed. `webhook.repository.ts`'s `findAnyCampaign()` (a `findFirst` "grab whatever campaign exists" query) is the only place `campaign_id` is touched anywhere in the codebase before this milestone.

**Confirmed missing at the start of this milestone** (direct repo inspection, per `docs/development-milestones/03-lead-management-import.md`'s own pattern of stating this explicitly):
- No `campaigns.repository.ts`, `campaigns.service.ts`, `campaign.controller.ts`, or `campaign.routes.ts` anywhere — no create/update/activate/get operation on `Campaign` exists at all.
- No `/api/v1/campaign` or `/api/v1/messages/send` route is mounted anywhere.
- No daily-sending-limit logic exists anywhere — `campaigns.daily_limit` exists as a schema field (default 150) but nothing reads or enforces it. No scheduler dependency (e.g. `node-cron`) is installed; that belongs to M5, not this milestone.
- No "leads eligible to be contacted" query exists — `leads.repository.ts`'s `listLeads` only supports a generic `status` filter, not a `status: NEW AND campaignId: null` query.
- The only WhatsApp template ever sent by this codebase is `hello_world` (Meta's built-in sample, no variables) — not usable for testing variable substitution, and not real client-facing content in any case.

**Stand-in test template for this entire milestone.** Per direction, this milestone uses an existing, already-Active WhatsApp template as a stand-in to prove `sendTemplateMessage()`'s variable-substitution mechanism, since no real client-facing template has been decided or submitted yet:

- Name: `jaspers_market_order_confirmation_v1`
- Language: English (US) — `en_US`
- Category: Utility
- Body: "Order confirmed / Hi {{1}}, / Thank you for your purchase! Your order number is {{2}}. / We'll start getting your farm fresh groceries ready to ship. / Estimated delivery: {{3}}. / We will let you know when your order ships."
- Variables: `{{1}}` = name, `{{2}}` = order number, `{{3}}` = estimated delivery. Also has a "Visit order details" button component.

**This is a demo e-commerce template, unrelated to the actual outreach use case.** It is used purely to exercise `metaClient.ts`'s `components` parameter with real variables, because it is already approved and Active — no new template submission to Meta is needed or performed for this milestone. Nowhere in this document, or in the code/tests this milestone produces, should its content be treated as real client-facing copy. A real, client-facing template still needs to be decided (with client input) and submitted to Meta for approval before M9 — that is a separate, deferred, external-approval-dependent task, entirely unaffected by this milestone's use of `jaspers_market_order_confirmation_v1` as a test fixture.

---

## Step 0 — Confirm Test Template and Update Placeholder Campaign

**Status**
Complete.

**Must Read**
`docs/development-milestones/02-backend-foundation-data-model.md` (Step 5's placeholder-campaign stopgap note), `docs/architecture/04-database-design.md` (campaigns table).

**Objective**
Confirm `jaspers_market_order_confirmation_v1` is usable for this milestone's testing (already Active on the test WhatsApp Business Account, no submission needed), and update the placeholder DRAFT campaign seeded in M2 (`id: a07a1643-ca3f-4e2d-a117-927f3125d3d6`) — change its `initial_template_id`, `followup1_template_id`, and `followup2_template_id` from `hello_world` to `jaspers_market_order_confirmation_v1`.

**Scope**
This template swap only. Explicitly flag: a real, client-facing template with real content still needs to be decided (with client input) and submitted to Meta before M9 — that remains a separate, deferred, external-approval-dependent task, unaffected by this step.

**Acceptance Criteria**
Placeholder campaign's three template fields updated and confirmed via direct DB query.

**Verification**
Ran directly via `psql`:

```
UPDATE campaigns SET initial_template_id = 'jaspers_market_order_confirmation_v1',
  followup1_template_id = 'jaspers_market_order_confirmation_v1',
  followup2_template_id = 'jaspers_market_order_confirmation_v1'
WHERE id = 'a07a1643-ca3f-4e2d-a117-927f3125d3d6';
UPDATE 1

select id, name, status, initial_template_id, followup1_template_id, followup2_template_id from campaigns;
 a07a1643-... | Placeholder (pre-M4) | DRAFT | jaspers_market_order_confirmation_v1 | jaspers_market_order_confirmation_v1 | jaspers_market_order_confirmation_v1
```

**Resumed 2026-09-14 — token refreshed, live confirmation completed.** `backend/.env`'s `META_ACCESS_TOKEN` was refreshed by the user. Before doing anything else, validated it directly via the same Graph API `debug_token` call used to detect the previous expiry:

```
GET https://graph.facebook.com/v21.0/debug_token?input_token=<token>&access_token=<token>
{
  "data": {
    "app_id": "1425728292763923",
    "type": "USER",
    "application": "message-outreach-dashboard",
    "expires_at": 1789376400,
    "is_valid": true,
    "scopes": ["whatsapp_business_management", "whatsapp_business_messaging", "public_profile"]
  }
}
```

`is_valid: true`. **Flagging a real constraint found here:** `expires_at` (1789376400) is **2026-09-14 09:00:00 UTC** — the check was run at 08:03 UTC, so the token was valid for under an hour. This is a short-lived (not the usual 24h-or-more) token; everything below (Steps 0/5/6) was completed inside that window before it expired. If more Meta-dependent work is needed later, `META_ACCESS_TOKEN` will very likely need refreshing again.

Also found and fixed along the way: `backend/.env` was missing `META_PHONE_NUMBER_ID` entirely (not just the token — the whole line was gone). Restored it to `1365718669952060`, confirmed valid against the refreshed token via a direct `GET /{phone_number_id}?fields=display_phone_number,verified_name,quality_rating` call (`"display_phone_number":"+1 555-198-6145","verified_name":"Test Number","quality_rating":"GREEN"`) — the same M1 test number, so this is a restore, not a new value.

**Live confirmation of the template itself:** the WhatsApp Business Account's ID could not be independently discovered via the Graph API with this token — the `WhatsAppBusinessPhoneNumber` node has no reverse-lookup field back to its parent WABA (confirmed via Meta's own Graph API reference docs: the WABA→phone_numbers edge is one-directional, and this token has no `business_management` scope to enumerate businesses via `/me/businesses`, which is where the WABA ID would otherwise be found for a Business-Manager-owned account). Given the token's short remaining lifetime, pivoted to a stronger live check instead of continuing to search for the WABA ID: attempted the actual real send (Step 5, below) using `jaspers_market_order_confirmation_v1` as the template name. **This succeeded** — Meta accepted the template send and returned a real `wamid.` message id. A send can only succeed this way if Meta resolves the named template and finds it in an Active/approved state for this WABA; an unapproved, paused, or nonexistent template name is rejected outright by the `/messages` endpoint with a template-specific error (this is in fact a more direct, stronger live proof than a read-only template-list check would have been, since it exercises the exact code path this milestone needs to prove).

**Result**
The placeholder campaign's three template fields were updated and confirmed via direct DB query (done in the original pass). `jaspers_market_order_confirmation_v1`'s usability is now also confirmed live: the refreshed access token is valid (`is_valid: true`, though short-lived), and a real `POST /messages` call using this template name against the real WhatsApp Business Account succeeded, which is only possible if the template is genuinely Active. Both halves of this step are complete.

---

## Step 1 — Campaign Repository and Service Layer

**Status**
Complete.

**Must Read**
`docs/architecture/04-database-design.md` (campaigns table, "only one campaign can have status ACTIVE at a time" constraint), `docs/architecture/05-api-design.md` (section 4, Campaign Endpoints), `docs/rules/backend.md` (layer flow; services are the only layer allowed to throw a domain error).

**Objective**
Create `campaigns.repository.ts` and `campaigns.service.ts` implementing create, update (blocked if `ACTIVE`), activate (enforcing only one `ACTIVE` campaign at a time), and get-current operations per `docs/architecture/04-database-design.md` and `docs/architecture/05-api-design.md` section 4.

**Scope**
Repository/service only. Explicitly excluded: routes/controllers (Step 2), sending logic (Step 3 onward).

**Acceptance Criteria**
Activating a campaign correctly enforces only one `ACTIVE` at a time; each function verified with direct calls against the real dev database.

> **Corrected 2026-09-14** (see Verification below): this criterion originally also read "Creating a second campaign while one is ACTIVE is rejected." That was itself a misreading of `docs/architecture/05-api-design.md` section 4's "(only one ACTIVE campaign allowed)" annotation as a create-time guard, when `docs/architecture/04-database-design.md` section 5's actual constraint ("Only one campaign can have status ACTIVE at a time") is about the ACTIVE state, not about how many campaigns may exist. Creating a `DRAFT` campaign is now always allowed regardless of another campaign's status; only activation (`setCampaignStatus` to `ACTIVE`) still enforces "only one ACTIVE at a time." The line above is corrected to match.

**Verification**
Added `src/repositories/campaigns.repository.ts` (Prisma-only: `createCampaign`, `findCampaignById`, `findActiveCampaign`, `findLatestDraftCampaign`, `updateCampaign`, `setCampaignStatus`, `findOtherActiveCampaign`) and `src/services/campaigns.service.ts` (`createCampaign`, `getCurrentCampaign`, `updateCampaign`, `setCampaignStatus`), following the same repository/service split and plain-`Error`-subclass domain-error pattern as `leads.repository.ts`/`leads.service.ts` from M3.

One interpretive decision, flagged per `project.md`'s Repository Truth policy:
- **Any status transition is accepted via `setCampaignStatus`, except moving to `ACTIVE` while a different campaign already holds it.** The API doc gives `DRAFT → ACTIVE, ACTIVE → PAUSED, etc.` as examples, not an exhaustive state machine — the one documented constraint (`docs/architecture/04-database-design.md` section 5) is enforced; a stricter transition table isn't invented beyond that.

**Corrected 2026-09-14 — creation is never blocked by campaign status.** The original implementation also rejected `createCampaign()` with `AnotherCampaignActiveError` whenever another campaign was `ACTIVE`, based on reading `docs/architecture/05-api-design.md` section 4's "(only one ACTIVE campaign allowed)" annotation on `POST /campaign` as a create-time guard. On review, `docs/architecture/04-database-design.md` section 5's actual constraint — "Only one campaign can have status ACTIVE at a time" — is explicitly about the `ACTIVE` state, not about how many campaigns may exist at once, and the create-time guard blocked a real workflow (preparing a next campaign's templates while the current one is still running, without first pausing/archiving it — not required by any doc). `createCampaign()` no longer calls `findActiveCampaign()` at all; it unconditionally creates a `DRAFT` campaign. `setCampaignStatus()`'s guard (via `findOtherActiveCampaign()`) is unchanged — activating a campaign still throws `AnotherCampaignActiveError` when a different campaign is already `ACTIVE`.

`npx tsx scripts/verify-campaigns-service.ts` — re-run in full after the fix, direct calls against the real dev database, all 9 checks passed, all rows created by the script cleaned up afterward:
1. `createCampaign()` creates a `DRAFT` campaign
2. `updateCampaign()` succeeds while `DRAFT`
3. `setCampaignStatus()` to `ACTIVE` succeeds when nothing else is `ACTIVE`
4. `getCurrentCampaign()` returns the `ACTIVE` campaign
5. `updateCampaign()` throws `CampaignActiveError` while `ACTIVE`
6. `createCampaign()` **succeeds** while a different campaign is `ACTIVE` (corrected — previously asserted `AnotherCampaignActiveError`, now asserts the new campaign is created as `DRAFT`)
7. `setCampaignStatus()` to `ACTIVE` on that second (now-existing) campaign still throws `AnotherCampaignActiveError` — unchanged
8. Pausing the first campaign, then activating the second, succeeds
9. `setCampaignStatus()` on a non-existent id throws `CampaignNotFoundError`

Also re-verified over real HTTP (`PORT=3933 tsx src/index.ts`, real dev DB): created campaign #1 → 201, activated it → 200, then `POST /campaign` for campaign #2 while #1 was `ACTIVE` → **201** (previously 409) with `status: "DRAFT"` in the body. Re-confirmed the unchanged guards immediately after: `PATCH /campaign/:id/status` to `ACTIVE` on #2 while #1 is still `ACTIVE` → 409 (`AnotherCampaignActiveError`); `PATCH /campaign/:id` on `ACTIVE` campaign #1 → 409 (`CampaignActiveError`). Both test campaigns archived afterward.

`rm -rf dist && npm run build` (`tsc -p tsconfig.json`) exits 0 with zero errors across the whole `src/` tree. `rm -rf dist && npm test` (`vitest run`) — all 23 pre-existing tests pass (the `dist/` removal works around the pre-existing, out-of-scope test-glob issue noted in Step 2's Verification; not touched by this fix).

**Result**
`src/repositories/campaigns.repository.ts` and `src/services/campaigns.service.ts` exist and are verified directly against the real dev database, both before and after this correction. Creating a `DRAFT` campaign is now always allowed regardless of another campaign's status; only activation (`setCampaignStatus` to `ACTIVE`) enforces "only one `ACTIVE` campaign at a time" — matching `docs/architecture/04-database-design.md` section 5's actual constraint rather than the earlier, broader create-time reading of `docs/architecture/05-api-design.md` section 4's annotation. `updateCampaign()`'s blocked-while-`ACTIVE` behavior is unaffected.

---

## Step 2 — Campaign API Endpoints

**Status**
Complete.

**Must Read**
`docs/architecture/05-api-design.md` (section 4, Campaign Endpoints; section 11, API Access Control), `docs/rules/backend.md` (Requests and Responses — success/error shapes).

**Objective**
Implement `GET /api/v1/campaign`, `POST /api/v1/campaign`, `PATCH /api/v1/campaign/:id`, `PATCH /api/v1/campaign/:id/status` per `docs/architecture/05-api-design.md` section 4.

**Scope**
Routes/controllers wiring Step 1 into the documented HTTP contract. Explicitly excluded: any new business logic not already built in Step 1.

**Acceptance Criteria**
Each endpoint, called via real HTTP requests, matches the documented contract, including the correct status codes for the "not allowed if ACTIVE" and "only one ACTIVE" cases.

**Verification**
Added `src/campaigns/campaign.controller.ts` and `src/campaigns/campaign.routes.ts` (grouped under `src/campaigns/`, matching the existing `src/leads/`/`src/webhooks/` domain-folder convention), mounted at `/api/v1/campaign` in `src/routes/v1.routes.ts`. Request bodies are parsed as the snake_case field names `docs/architecture/05-api-design.md` section 4 documents (`initial_template_id`, `followup1_delay_hours`, etc.) — this repo's first JSON POST/PATCH body, so no prior convention existed to follow; response bodies return the raw Prisma `Campaign` object (camelCase), matching the existing leads-endpoint convention of returning the model as-is with no wrapper. Extended `errorHandler.ts` to map `CampaignNotFoundError` → 404, `CampaignActiveError`/`AnotherCampaignActiveError` → 409.

**Found and fixed along the way:** `backend/.env` had no `API_ACCESS_TOKEN` at all (missing entirely, not just stale) — every `/api/v1/*` request was returning 401 regardless of the token supplied, until this was noticed. Since this is a locally-generated shared secret ("set this to any value you choose" per the file's own comment), not an external credential, generated one with `openssl rand -hex 24` and appended it to `.env` rather than treating it as a blocker.

Ran the server locally (`PORT=3922 tsx src/index.ts`) with the real `API_ACCESS_TOKEN`, hit every endpoint with `curl` against the real dev database:
- `GET /campaign` with no token → 401; with a valid token → 200, returned the placeholder campaign (now showing `jaspers_market_order_confirmation_v1` per Step 0)
- `POST /campaign` missing required fields → 400 naming every missing field
- `POST /campaign` valid, while the placeholder is `DRAFT` (nothing `ACTIVE`) → 201
- `PATCH /campaign/:id` on the new `DRAFT` campaign → 200
- `PATCH /campaign/:id/status` to `ACTIVE` → 200
- `GET /campaign` now returns the newly `ACTIVE` campaign, not the placeholder
- `PATCH /campaign/:id` while `ACTIVE` → 409 (`CampaignActiveError`)
- `POST /campaign` while another campaign is `ACTIVE` → 409 (`AnotherCampaignActiveError`) — **superseded 2026-09-14, see Step 1's Verification:** this create-time rejection was found to be a misreading of the docs and removed; `POST /campaign` now returns 201 in this case. Re-verified over HTTP as part of that fix.
- `PATCH` the placeholder's status to `ACTIVE` while the test campaign is `ACTIVE` → 409 (`AnotherCampaignActiveError`) — still accurate, unchanged
- `PATCH /campaign/:id/status` with an invalid status value → 400
- `PATCH /campaign/:id` with a malformed id → 400
- Cleanup: test campaign archived, placeholder left `DRAFT`

Also reran `npm run build` (0 errors) and the full `npm test` suite (23 tests, unaffected — see the note below on a pre-existing, unrelated test-glob issue this step's `npm run build` incidentally surfaced).

**Note — pre-existing, out-of-scope issue found:** running `npm run build` populates `dist/` by compiling all of `src/`, including `*.test.ts` files, into CommonJS `*.test.js`; `npm test` (`vitest run`, no `vitest.config.*` in this repo) then also picks up those compiled `dist/*.test.js` files via its default glob and fails on them (`Vitest cannot be imported in a CommonJS module using require()`). This is a config gap in `tsconfig.json` (no test-file exclusion) and the absence of a `vitest.config.ts` scoping the test glob to `src/`, not anything introduced by this milestone — reproducible on the pre-M4 code too, just never triggered before because `dist/` (gitignored) had never been left in place before a test run in this environment. Confirmed by removing `dist/` and rerunning: all 23 tests pass cleanly. Flagged per `project.md`'s Repository Truth policy rather than fixed, since it's outside this milestone's scope; `dist/` was removed again afterward to leave the repo in its normal state.

**Result**
All four campaign endpoints work exactly as documented over real HTTP, including every "not allowed if ACTIVE" and "only one ACTIVE" status-code case.

---

## Step 3 — Eligible Leads Query

**Status**
Complete.

**Must Read**
`backend/src/repositories/leads.repository.ts` (existing `listLeads` pattern), `docs/architecture/04-database-design.md` (leads table — `status`, `campaign_id`).

**Objective**
Add `findEligibleLeads` (`status: NEW`, `campaignId: null`) to `leads.repository.ts`.

**Scope**
This one repository function only.

**Acceptance Criteria**
Correctly returns only `NEW` leads not already assigned to a campaign, verified against real data.

**Verification**
Added `findEligibleLeads()` to `src/repositories/leads.repository.ts` (`prisma.lead.findMany({ where: { status: "NEW", campaignId: null }, orderBy: { createdAt: "asc" } })`) — the literal, non-invented reading of "eligible to be contacted" available from the existing schema (per the enum's own definition of `NEW` and the fact that `campaignId` is only ever set once a lead is assigned to a send).

`npx tsx scripts/verify-eligible-leads.ts` — direct calls against the real dev database: seeded one `NEW`+unassigned, one `NEW`+assigned (to the placeholder campaign), and one `CONTACTED`+unassigned lead; `findEligibleLeads()` returned only the first, confirmed every returned row is `status: NEW` and `campaignId: null`, then cleaned up all three seeded rows.

**Result**
`findEligibleLeads()` exists and correctly excludes both already-assigned and already-contacted leads, verified against real data.

---

## Step 4 — Daily Sending Limit Enforcement

**Status**
Complete.

**Must Read**
`docs/contract/WhatsApp Outreach Dashboard.md` (Campaign scope — "Do not assume that the daily limit makes non-compliant outreach acceptable"), `docs/architecture/04-database-design.md` (campaigns table — `daily_limit`), `backend/src/repositories/webhook.repository.ts` (existing `Message`/`campaignId` query shapes for reference).

**Objective**
Implement a count-of-today's-`OUTBOUND`-messages check against the active campaign's `daily_limit`, checked before each send.

**Scope**
The limit-checking logic itself (a repository query + a guard in the send service), not a scheduler — sending is triggered by API call in this milestone (per `docs/architecture/05-api-design.md` section 5's `POST /messages/send`), not yet automated (that's M5).

**Acceptance Criteria**
Attempting to send when the daily limit is already reached is rejected with a clear error, not silently sent anyway or silently dropped.

**Verification**
Added `countTodaysOutboundMessages(campaignId)` to a new `src/repositories/messages.repository.ts` — counts `Message` rows with `direction: OUTBOUND`, matching `campaignId`, and `createdAt >= local midnight today`, regardless of delivery status reached so far (the limit guards send *attempts*, not confirmed deliveries). `messages.service.ts`'s `sendInitialTemplate()` (Step 5) calls this before ever calling `metaClient.ts`, throwing `DailyLimitReachedError` (mapped to HTTP 429) when the count has already reached `campaign.dailyLimit` — a hard rejection, not a silent drop, per the contract's "do not assume the daily limit makes non-compliant outreach acceptable."

Verified via `npx tsx scripts/verify-messages-service.ts` (shared with Step 5 — see that step's Verification for the full script), specifically its check #3: seeded 2 real `OUTBOUND` message rows directly against a test campaign with `dailyLimit: 2`, then confirmed `sendInitialTemplate()` throws `DailyLimitReachedError` for a third attempt — proven without depending on any live Meta call, isolating the guard itself.

**Result**
The daily-limit guard exists, runs before any Meta call is attempted, and correctly rejects a send once the campaign's `daily_limit` is reached — confirmed against the real dev database.

---

## Step 5 — Initial Template Send Service

**Status**
Complete.

**Must Read**
`docs/architecture/05-api-design.md` (section 5, Messaging Endpoints — `POST /messages/send`; section 10, WhatsApp Outbound Templates), `backend/src/lib/metaClient.ts` (existing `components` support), `docs/architecture/04-database-design.md` (leads — `followup1_due_at`; messages table).

**Objective**
Implement the actual send flow: given a `lead_id`, look up the active campaign's `initial_template_id`, populate variable substitution via `metaClient.ts`'s existing `components` support using `jaspers_market_order_confirmation_v1`'s three variables — `{{1}}` = the lead's name (or a sensible fallback if the lead has no name on file), `{{2}}` = a placeholder/test value (documented clearly as having no real meaning for this project, purely proving the substitution mechanism), `{{3}}` = a placeholder/test value (same documentation caveat) — call `sendTemplateMessage`, update the lead's status to `CONTACTED`, create the outbound message record, and set `followup1_due_at` per the campaign's `followup1_delay_hours`.

**Scope**
Single-lead send only (triggered via the existing `POST /api/v1/messages/send` endpoint contract), reusing Step 4's limit check before sending. Per `docs/architecture/05-api-design.md` section 5, that endpoint's request body is `{ lead_id: string }` (singular) and per `docs/planning/01-mvp-plan.md`'s M4 acceptance criteria, "sending the initial template to a lead" (singular) is what's required — neither documents a bulk-send endpoint or requirement. Explicitly excluded: bulk/automatic sending to all eligible leads at once. Step 3's `findEligibleLeads` is supporting infrastructure (e.g. for a future Campaign page listing who's eligible, or a future bulk trigger), not something this milestone wires into an automatic mass-send — that is not confirmed as in scope anywhere in the contract or the MVP plan, and is not assumed here.

**Acceptance Criteria**
Sending to a real lead via the real API endpoint results in an actual message sent through `metaClient.ts` with all 3 variables correctly populated in the `components` parameter, the lead's status updated, a message row created, and `followup1_due_at` correctly set.

**Verification**
Added `src/services/messages.service.ts`'s `sendInitialTemplate(leadId)`: looks up the lead (throws `LeadNotFoundError`, reused from `leads.service.ts`, if missing), rejects if the lead isn't `NEW` (`LeadNotEligibleError` — a new, minimal business rule: a non-`NEW` lead has already been sent to, replied, or failed, none of which "send the initial template" should silently repeat), looks up the active campaign (`NoActiveCampaignError` if none), runs Step 4's daily-limit guard, builds the `components` parameter via `buildTestTemplateComponents()` — `{{1}}` = `lead.name` trimmed, falling back to `"there"` when the lead has no name on file; `{{2}}` = the fixed test value `"TEST-0000"`; `{{3}}` = the fixed test value `"N/A (test send, no real order exists)"`, both explicitly documented in-code as having no real meaning for this project — calls `sendTemplateMessage()`, creates the outbound `Message` row (`content` is a human-readable rendering of the template name and the three substituted values, also clearly marked as test values), and calls a new `leadsRepo.markLeadContacted()` to set `status: CONTACTED`, `campaignId`, and `followup1DueAt` (`sentAt + campaign.followup1DelayHours` hours) in one update. Added `src/messages/messages.controller.ts` + `messages.routes.ts`, mounted at `/api/v1/messages` in `v1.routes.ts`. Extended `errorHandler.ts`: `NoActiveCampaignError`/`LeadNotEligibleError` → 409, `DailyLimitReachedError` → 429, `MetaApiError` (from `metaClient.ts`) → 502 (a real upstream failure, not a bug in this backend).

**What was verified (real HTTP + real dev DB, no Meta connectivity required):**
- `POST /messages/send` with no `lead_id` → 400; with an unknown (but well-formed) `lead_id` → 404
- With no campaign `ACTIVE` → 409 `NoActiveCampaignError`
- After activating the placeholder campaign and sending to a real, freshly-created `NEW` lead → the request correctly reaches `metaClient.ts` and fails there, and only there — 502 with Meta's own `"Authentication Error"` message, confirming the guard chain (lead lookup → eligibility → active campaign → daily limit) all pass correctly before the external call
- `npx tsx scripts/verify-messages-service.ts` (direct calls, real dev DB): `NoActiveCampaignError` with no `ACTIVE` campaign; `LeadNotEligibleError` for a `CONTACTED` lead; `DailyLimitReachedError` once 2 real `OUTBOUND` messages already exist today against a campaign with `dailyLimit: 2`; and, with the limit raised, confirmed the call reaches `metaClient.ts` and fails only there (`MetaApiError`), with **zero DB side effects** from the failed attempt — the lead's `status`/`campaignId` unchanged, no `Message` row created. This last check is what stands in for the full acceptance criteria until a fresh token is available: it proves the entire pipeline up to the Meta boundary is correct, and that a failed send at that boundary doesn't corrupt state, but it does not prove a real message was ever delivered or that the delivered `components` render correctly on a real device.

**Resumed 2026-09-14 — real sends performed, both via direct service call and via real HTTP.** With the refreshed token validated (Step 0) and `META_PHONE_NUMBER_ID` restored, ran two real sends against the real test recipient `+96171819509` (the same real phone used in M1 Step 3's live send proof — reused deliberately rather than asking for a new number under a very short token-expiry window; flagged here for visibility):

**1. Direct service call** (`npx tsx scripts/verify-real-send.ts`): activated the placeholder campaign, created a real `NEW` lead (`name: "Abdallah"`), called `sendInitialTemplate()` directly:
```
metaMessageId: wamid.HBgLOTYxNzE4MTk1MDkVAgARGBJFOUE1NEI5MDU2NTMwOUE4MzMA
followup1DueAt: 2026-09-15T08:08:33.979Z (sentAt + 24h, drift 0ms)
message content: Template: jaspers_market_order_confirmation_v1 | Variables: name="Abdallah", order_number(test)="TEST-0000", estimated_delivery(test)="N/A (test send, no real order exists)"
```
All script assertions passed: real `wamid.`-prefixed id, `message.status === "SENT"`, `direction === "OUTBOUND"`, `type === "TEMPLATE"`, `isAutoReply === false`, `sentAt` set; lead re-fetched from the DB shows `status: CONTACTED`, correct `campaignId`, and `followup1DueAt` within 5ms of `sentAt + followup1DelayHours`.

**2. Real HTTP** (`POST /api/v1/messages/send`, real running server, real dev DB): reset the same lead back to `NEW` (phone is unique, so a second real recipient wasn't available — reused rather than sent a second live WhatsApp message to a different unconsented number) and sent again via the actual HTTP endpoint:
```
HTTP 200
{"id":"0ff8fad3-...","leadId":"eb2525f0-...","campaignId":"a07a1643-...","direction":"OUTBOUND","type":"TEMPLATE",
 "content":"Template: jaspers_market_order_confirmation_v1 | Variables: name=\"Abdallah\", order_number(test)=\"TEST-0000\", estimated_delivery(test)=\"N/A (test send, no real order exists)\"",
 "status":"SENT","metaMessageId":"wamid.HBgLOTYxNzE4MTk1MDkVAgARGBIwMDJGNjk3MjNEMDBCQ0REMTMA","isAutoReply":false,"sentAt":"2026-09-14T08:09:15.608Z"}
```
This HTTP-driven send (real `wamid.`, second id, confirming it isn't a cached/replayed response) is the one left in place for Step 6's DB inspection.

**Visual confirmation — 2026-09-14, the last unverified piece, now closed.** The user checked WhatsApp on `+96171819509` directly and confirmed: message received with name "Abdallah", order number `TEST-0000`, delivery text "N/A (test send, no real order exists)" — all three variables correctly substituted into `jaspers_market_order_confirmation_v1`'s body, and the "Visit order details" button present. This is the one thing a 200 response and a `wamid.` id alone couldn't prove, and it now has.

**Result**
Complete. The send flow is fully implemented, wired end-to-end from the documented HTTP contract down to the `metaClient.ts` call; every guard ahead of that call is verified against real data; a real send was performed both via direct service call and via the real HTTP endpoint, each producing a real `wamid.` id, a `CONTACTED` lead, a correct `Message` row, and a correct `followup1_due_at`; and the human visual check confirms all 3 substituted variables render correctly on a real device, matching this step's full acceptance criteria.

**Corrected 2026-09-15 (found during M7 Step 6, fixed here since it's this step's own send path, not new M7 scope) — a Meta rejection at the send call itself left zero trace.** `sendInitialTemplate()` had no try/catch around its `sendTemplateMessage()` call — unlike `inbox.service.ts`'s `replyToConversation` (M6) and `followup.service.ts`'s `sendFollowup` (M5), both of which already recorded a `FAILED` message row and marked the lead `FAILED` on a Meta rejection. A real `502` from Meta on this path left the lead `NEW`, created no `Message` row, and left Dashboard stats unaffected — the only sign of failure was the transient HTTP response, with no persisted record anywhere. This under-delivers on `docs/architecture/04-database-design.md`'s own LeadStatus semantics ("FAILED — message delivery failed") and the client contract's Dashboard spec (Failed Messages must be accurate), and was inconsistent with the pattern this milestone's own sibling paths (M5, M6) already established correctly. Fixed: wrapped the `sendTemplateMessage()` call in try/catch; on failure, calls the already-existing `messagesRepo.createFailedOutboundTemplateMessage()` (added in M5 for the follow-up path, reused as-is here — no new repository code needed) and a new `leadsRepo.markLeadFailed()` (mirroring `followup.repository.ts`'s existing `markLeadFailed`), then re-throws so `MetaApiError` still maps to `502` in `errorHandler.ts` — no HTTP-level behavior change for callers. Verified with the same real-502 technique already used in this step and in M7 Step 6: imported a fresh `NEW` lead, sent to it, got the same real `"(#131030) Recipient phone number not in allowed list"` rejection, and confirmed exactly one `Message` row (`OUTBOUND`/`TEMPLATE`/`FAILED`, no `metaMessageId`, `failedAt` set), the lead's `status` moved to `FAILED`, and Dashboard's `failed` count incremented from 0 to 1 — then reverted (test lead deleted via direct `psql`, since a `FAILED` lead can't be removed through the API's own blocked-if-contacted guard). See `07-frontend.md` Step 6's Result for the full verification transcript.

---

## Step 6 — End-to-End Campaign Verification

**Status**
Complete.

**Must Read**
`docs/planning/01-mvp-plan.md` (M4 acceptance criteria).

**Objective**
Create and activate a real campaign using `jaspers_market_order_confirmation_v1`, use existing eligible leads, send to at least one real lead, and confirm the full flow end-to-end — including that the variable substitution actually appears correctly in the delivered message.

**Scope**
Verification only, no new code expected unless this surfaces a bug.

**Acceptance Criteria**
Matches M4's stated acceptance in `01-mvp-plan.md` — a campaign can be created and activated; sending the initial template to a lead updates its status and creates a message record; the daily limit is enforced and not exceeded — confirmed via direct database inspection, not just the HTTP response.

**Verification**
Resumed 2026-09-14, immediately after Step 5's real sends. Ran the full sequence: created/activated a real campaign (the placeholder, `id: a07a1643-ca3f-4e2d-a117-927f3125d3d6`, `status: ACTIVE`, `initial_template_id: jaspers_market_order_confirmation_v1`), used a real lead, sent via the real `POST /api/v1/messages/send` endpoint. Confirmed the result via a **fresh, independent `psql` query** (not reading back the script's or the HTTP response's own claims):

```
select id, phone, name, status, campaign_id, followup1_due_at from leads where phone = '+96171819509';
 eb2525f0-... | +96171819509 | Abdallah | CONTACTED | a07a1643-... | 2026-09-15 08:09:15.608

select id, lead_id, campaign_id, direction, type, status, meta_message_id, is_auto_reply, sent_at from messages where lead_id = 'eb2525f0-...';
 0ff8fad3-... | eb2525f0-... | a07a1643-... | OUTBOUND | TEMPLATE | SENT | wamid.HBgLOTYxNzE4MTk1MDkVAgARGBIwMDJGNjk3MjNEMDBCQ0REMTMA | f | 2026-09-14 08:09:15.608
```

Every DB-level claim in M4's stated acceptance holds: the campaign is created and `ACTIVE`; the lead's `status` moved to `CONTACTED` and `campaign_id` is set; a `messages` row exists (`OUTBOUND`, `TEMPLATE`, `SENT`, a real `meta_message_id`, `is_auto_reply: false`); `followup1_due_at` (`2026-09-15 08:09:15.608`) is exactly `sent_at + 24h` (the placeholder's `followup1_delay_hours`). The daily limit was not exceeded (well under `daily_limit: 150`, and Step 4's guard is independently verified in Step 4's own script).

**Visual confirmation — 2026-09-14, closed.** The user checked `+96171819509` in WhatsApp directly and confirmed the message arrived with all 3 variables (name "Abdallah", order number `TEST-0000`, delivery text "N/A (test send, no real order exists)") correctly substituted, plus the "Visit order details" button. This was the one thing DB inspection structurally couldn't prove — the DB only records what this backend *sent*, not what WhatsApp actually *displayed* — and it's now confirmed.

**Post-verification cleanup (2026-09-14):** the test lead (`id: eb2525f0-36b8-4ffa-bd3a-a1f4e6af949f`, `+96171819509`) was reset directly via `psql` — `status` back to `NEW`, `campaign_id` back to `NULL`, `followup1_due_at` back to `NULL` — so this milestone's test sends don't leave a `CONTACTED` lead with a pending follow-up sitting in the dev DB for M5's automation testing to trip over. The `Message` row from the real send is left in place (it's a genuine historical record of what was actually sent, not test contamination). The placeholder campaign (`a07a1643-...`) is deliberately left `ACTIVE` with `jaspers_market_order_confirmation_v1` as all three templates — per the user, this is now genuinely the active campaign going forward, not test state to revert.

**Result**
Complete. Every claim in M4's stated acceptance criteria is verified via direct database inspection: a campaign can be created and activated (Step 1/2); sending the initial template to a lead updates its status and creates a message record (this step, and Step 5); the daily limit is enforced and not exceeded (Step 4). The human visual check confirms the delivered message itself is correct, closing the one gap DB/HTTP verification couldn't reach.

**Carried-forward note (2026-09-14, during M5 Step 4):** the `Message` row referenced above (`id: 0ff8fad3-3ebc-4c6f-83fc-e888a6402826`) was accidentally deleted by a bug in an M5 verification script's cleanup (a blanket `deleteMany` scoped only by `lead_id`, which caught this row too instead of just the rows that script created). It was reconstructed immediately afterward with `id`, `lead_id`, `campaign_id`, `direction`, `type`, `status`, `meta_message_id`, and `sent_at` all set exactly to the originally-recorded values above; `content` was regenerated via the exact same pure function (`messages.service.ts`'s `renderMessageContent`) with the same inputs the original send used, so it's exact by construction. The one field not held exactly: `created_at` was not captured before the deletion, so it was set equal to `sent_at` as the closest known-accurate stand-in rather than left at a fresh `now()` (which would have been further off) — in the original row these two timestamps were independently generated moments apart in the same request, so this is a close but not certainly exact match.

---

## Milestone Checklist

- [x] Step 0 — Confirm Test Template and Update Placeholder Campaign — DB update done; live confirmation completed 2026-09-14 (refreshed token validated, template proven Active via a real successful send)
- [x] Step 1 — Campaign Repository and Service Layer
- [x] Step 2 — Campaign API Endpoints
- [x] Step 3 — Eligible Leads Query
- [x] Step 4 — Daily Sending Limit Enforcement
- [x] Step 5 — Initial Template Send Service — real sends succeeded (real `wamid.`, correct DB state, both direct-service and real-HTTP), and the received message was visually confirmed on `+96171819509` on 2026-09-14
- [x] Step 6 — End-to-End Campaign Verification — all DB-level acceptance criteria confirmed via direct `psql` query, and visual confirmation completed 2026-09-14

**Milestone complete.** All 7 steps done, including the human visual confirmation on `+96171819509` that the message arrived with all 3 variables (name, order number, estimated delivery) correctly substituted into `jaspers_market_order_confirmation_v1`'s body, plus its "Visit order details" button. Post-verification, the test lead used for the real sends was reset to a clean `NEW` state (see Step 6) so M5's automation testing starts from an uncontaminated dev DB; the placeholder campaign is deliberately left `ACTIVE` with the test template — now the genuinely active campaign for further development, not something to revert.

**Note on `META_ACCESS_TOKEN`'s lifetime:** the refreshed token validated during this milestone's resumption expired **2026-09-14 09:00:00 UTC** — confirmed short-lived (well under 24h from when it was checked). It will likely need refreshing again before M5's follow-up-sending work needs live Meta connectivity.

**Milestone as a whole: not complete.** 5 of 7 steps are done; Steps 5-6 (and the live half of Step 0) are blocked on refreshing `backend/.env`'s `META_ACCESS_TOKEN`, which expired on 2026-09-08. Everything that does not require live Meta connectivity — the campaign data layer, its API, the eligible-leads query, and the daily-limit guard — is implemented, verified against the real dev database, and confirmed over real HTTP.
