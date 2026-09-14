# M6 — Inbox

Goal (per `docs/planning/01-mvp-plan.md`): view and reply to conversations manually.

Acceptance criteria for the milestone as a whole (from `01-mvp-plan.md`):

- Incoming conversations appear in the inbox with full message history.
- A manual reply is sent successfully and stored as a message.

**Review mode: per-step, not batch.** M6 touches a real Meta platform constraint (the 24-hour customer service window) and writes real outbound messages on the client's behalf. Lower risk than M5's scheduler/crash-window territory (no automation loop, no unattended background job), but still reviewed step-by-step, not handed to Claude Code as one autonomous run.

---

## What already exists from M2/M5 that this milestone builds on

- `conversations` table, `ConversationStatus` enum (`ACTIVE`/`CLOSED`), `automation_stopped` — schema per M2, actively written to by M5's webhook handling (`upsertConversationForLead`).
- `messages` table — both `INBOUND` (webhook-created, M5) and `OUTBOUND` (M4/M5, template sends) rows already exist with correct `direction`, `type`, `status`, `sent_at`/`created_at`.
- `backend/src/webhooks/` — the write-path for incoming messages and conversation upserts. M6 does not change this path; it only reads what it produces, plus adds one new write path (manual reply).
- `backend/src/lib/metaClient.ts`'s `sendTemplateMessage()` — sends **template** messages only. M6's manual reply is `MessageType.TEXT`, a free-form message, which is a different Meta Cloud API call shape (a plain text message body, not a template + components). This does not exist in `metaClient.ts` yet — confirm in Step 0, don't assume.
- Route/controller/repository/service layering convention from `src/leads/`, `src/campaigns/`, `src/messages/` — M6 follows the same pattern under a new `src/inbox/` domain folder.
- API bearer-token auth middleware on `/api/v1/*` — applies here unchanged.

## Confirmed missing at the start of this milestone (to be verified by direct repo inspection in Step 0, not assumed from docs alone)

- No `inbox.repository.ts`, `inbox.service.ts`, `inbox.controller.ts`, or `inbox.routes.ts` anywhere.
- No `GET /api/v1/inbox` or `GET /api/v1/inbox/:conversation_id` route mounted.
- No `POST /api/v1/inbox/:conversation_id/reply` route mounted.
- No `PATCH /api/v1/inbox/:conversation_id/status` route mounted.
- No free-text (non-template) send function in `metaClient.ts` — only the template-send path has ever been exercised (M1, M4, M5).
- No check anywhere for WhatsApp's 24-hour customer service window before sending a free-text message.

---

## Step 0 — Inspect Existing Send Path and Confirm the 24-Hour Window Mechanics

**Objective**
Before writing any code, confirm two things directly against the Meta Cloud API docs and this codebase's existing `metaClient.ts`: (1) the exact request shape for a free-text (non-template) outbound message, and (2) what data this system already has available to determine whether a given conversation is inside its 24-hour window — per `docs/architecture/05-api-design.md` section 10 ("Free-text messages... can only be sent within a 24-hour customer service window after the lead has replied").

**Scope**
Read-only inspection: `backend/src/lib/metaClient.ts`, the `messages` table's timestamp fields, Meta Cloud API's documented text-message endpoint shape. No code changes in this step.

**Questions this step must answer**

1. What does a free-text send request body look like via the Meta Cloud API (`POST /messages` with `type: "text"` instead of `type: "template"`)? Confirm this is a distinct call shape from `sendTemplateMessage()`, not a parameter variant of it.
2. What determines "the 24-hour window" precisely — is it 24 hours from the **most recent inbound message** from that lead, per Meta's own platform rules? Confirm against Meta's documentation, don't assume from the API design doc's one-sentence summary.
3. Does this system currently store what's needed to compute that (i.e., can the most recent `INBOUND` message's `sent_at`/`created_at` for a conversation be queried directly), or does something need to be added?
4. Does Meta's API reject a late free-text send with a clear, catchable error (so the backend could rely on Meta as the enforcement backstop), or does it need to be pre-emptively blocked client-side before ever calling Meta? Confirm — this affects whether the guard is a hard requirement or a defense-in-depth addition.

**Acceptance Criteria**
Clear, evidence-based answers to all four questions, citing Meta's actual documented API behavior and this codebase's actual current state — not inferred from the architecture doc's one-line summary alone.

**Result**

1. **Free-text request shape is distinct from the template call.** Confirmed against Meta's Cloud API `POST /{phone-number-id}/messages` shape (cross-checked via `fbsamples/whatsapp-api-examples` and the typed `@whatsapp-cloudapi/types` package):

   ```json
   {
     "messaging_product": "whatsapp",
     "recipient_type": "individual",
     "to": "+15551234567",
     "type": "text",
     "text": { "body": "message text", "preview_url": false }
   }
   ```

   This is a sibling of `sendTemplateMessage()`'s body, not a parameter variant — `type: "text"` + a `text.body` key replaces `type: "template"` + the `template` object entirely. Same endpoint, same auth header, same `messaging_product`/`to` envelope. `metaClient.ts` currently only implements the `template` variant (`sendTemplateMessage`, lines 46–76) — no `text` variant exists yet. Confirms Step 2's plan: an additive `sendTextMessage()` sibling function, not a modification of the existing one.

2. **The 24-hour window is measured from the customer's most recent inbound message, per Meta's own platform rule** (WhatsApp's "customer service window" / session messaging policy): a business can send free-form (non-template) messages only within 24 hours of the last message *received from* that customer; after that, only pre-approved templates are accepted. This matches `05-api-design.md` section 10's summary — no discrepancy found, just confirming it's Meta's actual rule (not just this repo's paraphrase) and that it's anchored to **inbound**, not to any outbound activity.

3. **This system does not yet store an explicit "last inbound at" value — but it can derive one, and there's a real gap to account for.** Checked `webhook.repository.ts`'s `createInboundMessage()` (lines 70–89): it sets `direction: "INBOUND"`, `status: "RECEIVED"`, and lets `createdAt` default to `now()` via Prisma — it does **not** set `sentAt` (that field is only ever populated by the outbound-send/status-update path). So for INBOUND rows, `sentAt` is always `null`; the only reliable timestamp is `createdAt`. The window check must therefore be: *most recent `Message` row for this conversation's lead where `direction = 'INBOUND'`, ordered by `createdAt` desc* — not `sentAt`. This is directly queryable (no schema change needed): `prisma.message.findFirst({ where: { leadId, direction: "INBOUND" }, orderBy: { createdAt: "desc" } })`. Note `conversations.last_message_at` (set by `upsertConversationForLead`) is updated on **every** incoming message regardless of direction going forward (once Step 3 adds outbound replies, `last_message_at` will also move on outbound sends) — so `last_message_at` alone is **not** a safe proxy for "most recent inbound"; Step 3's window check must query `messages` directly, not read `conversations.last_message_at`.

4. **Meta does reject a late free-text send with a distinct, catchable error — but pre-emptive client-side blocking is still required, not optional.** Meta's documented behavior for a session-message send outside the 24-hour window is a 4xx response carrying error code `131047` ("Message failed to send because more than 24 hours have passed since the customer last replied to this number"), which `MetaApiError` (already structured around `body.error.{message,code,...}`) can catch like any other failure. However, per this milestone's own Step 3 acceptance criteria ("rejected with a clear error **before** any Meta call is attempted") and standard practice for this rule, the guard must be pre-emptive in the service layer: relying on Meta alone would mean every late reply attempt burns a real API call, returns a less specific in-app error, and (per Meta's Cloud API rate/quality policies) repeated rejected sends can affect the number's quality rating. Conclusion: implement the client-side check as the primary gate in Step 3's service layer (per its `Explicit exclusions` note — not in `metaClient.ts`), with Meta's `131047` rejection remaining as a defense-in-depth backstop, not the primary mechanism.

**Answers summary:** (1) distinct call shape, confirmed — additive `sendTextMessage()`. (2) window = 24h from most recent **inbound** message, confirmed against Meta's own rule. (3) not currently stored explicitly; derivable via `messages` query on `direction: INBOUND` ordered by `createdAt` — `sentAt` is null on inbound rows, and `conversations.last_message_at` is not a safe proxy. (4) Meta does reject late sends (error `131047`) but pre-emptive service-layer blocking is required per this milestone's own acceptance criteria, with Meta's rejection as backstop only.

---

## Step 1 — Inbox Repository and List/Detail Endpoints

**Objective**
Implement `GET /api/v1/inbox` (list conversations, ordered by `last_message_at` descending, optional `status` filter, pagination) and `GET /api/v1/inbox/:conversation_id` (single conversation with full message history) per `docs/architecture/05-api-design.md` section 6.

**Scope**
Read-only endpoints only. No sending, no status changes.

**Explicit exclusions**
Manual reply (Step 2), 24-hour window logic (Step 2/3), mark-as-closed (Step 3).

**Acceptance Criteria**

- `GET /api/v1/inbox` returns conversations ordered by most recent activity, respects `status` filter and pagination, matches the documented response shape.
- `GET /api/v1/inbox/:conversation_id` returns full message history for that conversation, both `INBOUND` and `OUTBOUND`, in chronological order.
- Unknown `conversation_id` returns 404.

**Verification required**
Real HTTP requests against the real dev DB, using conversations/messages already created by M5's verification runs (or freshly seeded if needed) — confirm response shape and ordering directly, not just a 200 status.

**Result**

Implemented following the existing `leads/`/`campaigns/`/`messages/` layering (`docs/rules/backend.md`):

- `backend/src/repositories/inbox.repository.ts` — `listConversations()` (ordered by `lastMessageAt` desc, optional `status` where-clause, includes `lead`), `findConversationById()` (includes `lead` with its `messages` ordered by `createdAt` asc — `Message` has no direct `conversation_id` FK, so full history is reached via the shared `leadId`).
  Message history is joined via `lead_id` rather than a direct conversation FK because `conversations.lead_id` is unique per the schema — one lead has exactly one conversation, so this join is equivalent to a conversation-scoped query. Not a workaround.
- `backend/src/services/inbox.service.ts` — `listConversations()` (pagination defaults, same shape as `leads.service.ts`), `getConversationById()` (throws `ConversationNotFoundError` when missing).
- `backend/src/inbox/inbox.controller.ts` + `inbox.routes.ts` — `GET /` and `GET /:conversation_id`, validating `status` against the `ConversationStatus` enum and `conversation_id` as a UUID before hitting the service, mirroring `leads.controller.ts`'s pattern (including its local `UUID_PATTERN`/`parsePositiveInt`, since no shared helper exists yet in this repo).
- Mounted `inboxRouter` at `/api/v1/inbox` in `routes/v1.routes.ts` (behind the existing bearer-token middleware, unchanged).
- Added `ConversationNotFoundError` → 404 mapping in `middleware/errorHandler.ts`.

**Verification:** `npm run build` (tsc) passes clean. Real HTTP requests via `backend/scripts/verify-inbox-endpoints.ts` against the real dev DB (seeded 2 conversations — one `ACTIVE` with an `INBOUND` + `OUTBOUND` message pair, one `CLOSED` with a more recent `lastMessageAt` — cleaned up after):

- `GET /inbox` → 200, both seeded rows present, `CLOSED` (newer `lastMessageAt`) ordered before `ACTIVE` (older), each row's `lead` included.
- `GET /inbox?status=CLOSED` → 200, only `CLOSED` rows returned.
- `GET /inbox?page=1&limit=1` → 200, 1 row returned, `total` reflects the full count, not the page size.
- `GET /inbox/:id` (existing) → 200, `lead.messages` has both messages in chronological order `[INBOUND, OUTBOUND]`.
- `GET /inbox/<unknown-uuid>` → 404 with `{ error }`.
- `GET /inbox/<malformed-id>` → 400 (request-level validation, no service/DB call).
- `GET /inbox` without a bearer token → 401 (existing auth middleware unaffected).

All checks passed. No manual reply, window logic, or status-change endpoint touched, per this step's explicit exclusions.

---

## Step 2 — Free-Text Send in `metaClient.ts`

**Objective**
Add a free-text send function to `metaClient.ts` (e.g. `sendTextMessage`) implementing the call shape confirmed in Step 0. This is additive — `sendTemplateMessage()` is not modified.

**Scope**
`metaClient.ts` only. No route, no service wiring yet — that's Step 3.

**Explicit exclusions**
No 24-hour window check in this step — that belongs in the service layer (Step 3), not the low-level Meta client. `metaClient.ts` stays a thin, honest wrapper around the actual API call, consistent with `sendTemplateMessage()`'s existing shape.

**Acceptance Criteria**
`sendTextMessage()` (or equivalent) exists, follows the same error-handling pattern as `sendTemplateMessage()` (`MetaApiError` on failure), and is proven against the real Meta API with at least one real message to the test number.

**Verification required**
One real send to +96171819509 (or the current test number in use), confirmed received.

**Result**

Added `sendTextMessage()` to `backend/src/lib/metaClient.ts` as an additive sibling of `sendTemplateMessage()` — same request envelope (`messaging_product`, `to`, auth header, endpoint), swapping `type: "template"` + `template` for `type: "text"` + `text: { body }`, per Step 0's confirmed request shape. Same `MetaApiError` error-handling path (non-2xx response → thrown `MetaApiError(status, body)`). No 24-hour window check added here — stays a thin wrapper, per this step's Explicit exclusions; that logic belongs in Step 3's service layer.

`npm run build` passes clean.

**Verification:** a one-off throwaway script (deleted after use, per its own docstring) called `sendTextMessage({ to: "+96171819509", body: ... })` against the live Meta Cloud API. Succeeded:

```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "+96171819509", "wa_id": "96171819509" }],
  "messages": [{ "id": "wamid.HBgLOTYxNzE4MTk1MDkVAgARGBI5Q0FDNzFCNkEzOTE0Mjc0MUUA" }]
}
```

Note: the very first attempt in this sandboxed dev shell hit a connect timeout. Investigated before accepting that as sandbox noise rather than a code issue: retried the identical request (same URL, headers, body, no sandbox override) and it succeeded outright; separately confirmed `curl` and Node `fetch` behave identically against this host with no sandbox override (both succeed). So it was a one-off, non-reproducible first-connection hiccup in this dev shell's outbound path — not Node-specific, not host-specific, not anything about `sendTextMessage()`'s request shape (identical headers/timeout/proxy config to `sendTemplateMessage()`, which has sent real messages without issue since M1). Sandbox-only; not expected to recur on the M8 VPS, and nothing in `metaClient.ts` needs a change.

---

## Step 3 — Manual Reply Endpoint with 24-Hour Window Enforcement

**Objective**
Implement `POST /api/v1/inbox/:conversation_id/reply` per `docs/architecture/05-api-design.md` section 5: accept `{ message: string }`, enforce the 24-hour window (per Step 0's findings), call Step 2's `sendTextMessage()`, create the outbound `Message` row (`type: TEXT`), update `conversations.last_message_at`.

**Scope**
This endpoint only. Reuses Step 1 and Step 2.

**Explicit exclusions**
No retry logic on failure — matches the existing pattern (failed send → `MessageStatus.FAILED`, no auto-retry). No bulk/broadcast reply.

**Acceptance Criteria**

- A reply sent within the 24-hour window succeeds: message sent via Meta, `Message` row created (`OUTBOUND`, `TEXT`), conversation's `last_message_at` updated.
- A reply attempted outside the 24-hour window is rejected with a clear error **before** any Meta call is attempted (per Step 0's findings on whether pre-emptive blocking is required) — not silently sent and not silently dropped.
- Empty or missing `message` body → 400.
- Unknown `conversation_id` → 404.

**Verification required**
Real HTTP requests against the real dev DB. Both branches tested: a reply to a conversation with a recent inbound message (within window — real Meta send, real receipt confirmed), and a reply to a conversation whose most recent inbound message is artificially backdated past 24 hours (rejected, confirmed no Meta call was attempted and no message row created).

**Result**

Implemented `POST /api/v1/inbox/:conversation_id/reply` reusing Step 1/2's building blocks:

- `inbox.repository.ts` — `findConversationWithLead()` (lighter than the Step 1 detail query), `findMostRecentInboundMessage(leadId)` (per Step 0: ordered by `createdAt` desc, since INBOUND rows never set `sentAt`), `createOutboundTextMessage()` / `createFailedOutboundTextMessage()` (mirrors `messages.repository.ts`'s template-send pair), `updateConversationLastMessageAt()`.
- `inbox.service.ts` — `replyToConversation()`: looks up the conversation (404 via `ConversationNotFoundError` if missing), computes the window from the lead's most recent INBOUND message and rejects **before any Meta call** via a new `OutsideCustomerServiceWindowError` (mapped to 409) if it's missing or older than 24h, resolves `campaign_id` from the lead's own campaign (falling back to the same placeholder-campaign lookup the webhook path already uses, for the same required-FK reason), then calls `sendTextMessage()`. On success: `Message` row `OUTBOUND`/`TEXT`/`SENT` with `metaMessageId`+`sentAt`, and `conversations.last_message_at` updated. On failure: a `FAILED` row is written (mirrors `followup.service.ts`'s pattern) and the original error is rethrown so it's never silently dropped — `errorHandler.ts` already maps `MetaApiError` to 502.
- `inbox.controller.ts` — validates `conversation_id` as a UUID and `message` as a non-empty string at the request level (per `docs/rules/backend.md`: this is request validation, not a business decision) before ever reaching the service.
- `errorHandler.ts` — added `OutsideCustomerServiceWindowError` → 409.

`npm run build` passes clean.

**Verification:** real HTTP requests via a one-off script (deleted after use) against the real dev DB and the live Meta Cloud API:

- **Within window** (a conversation whose lead has a just-now INBOUND message, using the shared test number +96171819509): reply → 200, `OUTBOUND`/`TEXT`/`SENT` with a real `wamid.*` id, exactly one new `Message` row, `conversations.last_message_at` updated to the send time.
- **Outside window** (INBOUND message backdated 25h): reply → 409, rejected inside the service before `sendTextMessage()` was ever called (no `MetaApiError` in the logs, only `OutsideCustomerServiceWindowError`), zero new `Message` rows, `last_message_at` untouched — not silently sent, not silently dropped.
- Empty `{ message: "" }` and missing `message` → 400, both before touching the service.
- Unknown `conversation_id` → 404.

All checks passed.

**Meta-failure branch (added after review):** the above didn't yet exercise a Meta-side send rejection (only the outside-window pre-emptive rejection, which never reaches `sendTextMessage()`). Verified separately with a within-window conversation whose lead's phone Meta itself rejects (`131030 Recipient phone number not in allowed list` — a real API call, not simulated):

- Client received **502**, not a raw 500 — `{"error":"Meta Cloud API request failed: (#131030) Recipient phone number not in allowed list"}`, confirming `errorHandler.ts`'s existing `MetaApiError` mapping applies unchanged.
- Exactly one `Message` row was written with `status: FAILED`, `failedAt` set, `metaMessageId: null` — confirming `createFailedOutboundTextMessage()` completes before the error is rethrown, not skipped.
- `conversations.last_message_at` was untouched by the failed attempt (only written on the success path).

---

## Step 4 — Mark Conversation Closed

**Objective**
Implement `PATCH /api/v1/inbox/:conversation_id/status` per `docs/architecture/05-api-design.md` section 6: accept `{ status: "CLOSED" }`, update the conversation.

**Scope**
This endpoint only.

**Explicit exclusions**
No automatic re-opening logic here — M5 already handles reactivation to `ACTIVE` on a new inbound message (`upsertConversationForLead`'s existing behavior). This step only adds the manual `CLOSED` transition; it does not change M5's existing reactivation behavior.

**Acceptance Criteria**

- `PATCH .../status` with `{ status: "CLOSED" }` on an `ACTIVE` conversation succeeds, confirmed via DB query.
- Invalid status value → 400.
- Unknown `conversation_id` → 404.

**Verification required**
Real HTTP request against the real dev DB, plus confirmation that a subsequent inbound message (simulated) correctly reactivates it to `ACTIVE` per M5's existing behavior — i.e. Step 4 doesn't accidentally break that.

**Result**

Implemented `PATCH /api/v1/inbox/:conversation_id/status`:

- `inbox.repository.ts` — `updateConversationStatus(id, status)`.
- `inbox.service.ts` — `closeConversation(id)`: existence check (`ConversationNotFoundError` → 404, already mapped) then sets `status: CLOSED`.
- `inbox.controller.ts` — `updateInboxStatus`: validates `conversation_id` as a UUID, and — **interpretive choice, flagged per `docs/rules/project.md`'s Repository Truth** — restricts the accepted `status` value to exactly `"CLOSED"` rather than any `ConversationStatus` enum value. This step's own objective quotes the request body as `{ status: "CLOSED" }` specifically (not the general enum campaign's status endpoint accepts), and its Explicit exclusions rule out reopening logic here; the doc doesn't state whether a manual `ACTIVE` transition should be rejected or silently accepted, so this treats anything other than `"CLOSED"` — including `"ACTIVE"` — as invalid for this endpoint rather than inventing an undocumented manual-reopen feature. Worth a look if manual reopen turns out to be wanted later.
- Reused the existing `ConversationNotFoundError`; no new error class needed.
- `inbox.routes.ts` — `PATCH /:conversation_id/status`.

`npm run build` passes clean.

**Verification:** real HTTP requests via a one-off script (deleted after use) against the real dev DB:

- `PATCH .../status { status: "CLOSED" }` on an `ACTIVE` conversation → 200, confirmed `CLOSED` both in the response and by a direct DB query.
- `PATCH .../status { status: "BOGUS" }` → 400.
- `PATCH .../status` on an unknown `conversation_id` → 404.
- Simulated a new inbound message via `webhook.service.ts`'s `handleIncomingMessage()` (M5's existing path, called directly rather than through the real webhook endpoint) against the just-closed conversation: confirmed it reactivates to `ACTIVE` exactly as before — Step 4 does not interfere with M5's reactivation behavior.

All checks passed.

---

## Step 5 — End-to-End Inbox Verification

**Objective**
Confirm the full Inbox workflow: incoming message → appears in `GET /api/v1/inbox` → `GET .../:id` shows full history → manual reply sent within window → appears in history → mark closed → new incoming message reactivates it.

**Scope**
Verification only, no new code expected unless this surfaces a bug.

**Acceptance Criteria**
Matches M6's stated acceptance in `01-mvp-plan.md` — incoming conversations appear in the inbox with full message history; a manual reply is sent successfully and stored as a message — confirmed via direct database inspection and real HTTP responses together, not either alone.

**Result**

No bugs surfaced; no new application code was needed (verification only, per this step's Scope). Ran one end-to-end script (deleted after use) driving the real `/webhook` and `/api/v1` endpoints together — not the direct `handleIncomingMessage()` shortcut used in earlier steps' scripts — against the real dev DB and the live Meta API, using the shared test number (+96171819509) so the reply branch is a real send, not simulated:

1. **Incoming message** — a real `POST /webhook` payload (Meta's documented shape: `entry[].changes[].value.messages[]`) → 200 immediately, then polled until the async-processed `INBOUND` `Message` row landed (per `05-api-design.md` section 9's "always 200 immediately, process after").
2. **Appears in `GET /api/v1/inbox`** — the conversation is present in the list.
3. **`GET .../:id` shows full history** — the new inbound message is in `lead.messages`.
4. **Manual reply sent within the window** — `POST .../reply` → 200, `status: SENT`, a real `wamid.*` id from Meta.
5. **Appears in history** — re-fetching the conversation shows the reply as an `OUTBOUND` row, content matching exactly what was sent, chronologically last.
6. **Mark closed** — `PATCH .../status { status: "CLOSED" }` → 200, confirmed `CLOSED` via both the response and a direct DB query.
7. **New incoming message reactivates it** — a second real `POST /webhook` inbound message → conversation confirmed back to `ACTIVE` via direct DB query.

All 7 steps passed in one continuous run — both of the milestone's stated acceptance criteria (`01-mvp-plan.md`) are confirmed together, via real HTTP responses and direct DB inspection, not either alone.

---

## Milestone Checklist

- [x] Step 0 — Inspect Existing Send Path and Confirm the 24-Hour Window Mechanics
- [x] Step 1 — Inbox Repository and List/Detail Endpoints
- [x] Step 2 — Free-Text Send in metaClient.ts
- [x] Step 3 — Manual Reply Endpoint with 24-Hour Window Enforcement
- [x] Step 4 — Mark Conversation Closed
- [x] Step 5 — End-to-End Inbox Verification
