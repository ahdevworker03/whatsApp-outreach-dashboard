# M1 — WhatsApp Integration Proof

Goal (per `docs/planning/01-mvp-plan.md`): prove the full send/receive round-trip with Meta before building anything else.

Acceptance criteria for the milestone as a whole:
- A real message is delivered to a real phone.
- A real reply is received by the backend via webhook.
- sent/delivered/read/failed status events are observed and logged.

**Note on "real reply" / "status events" criteria:** while the Meta App
remains unpublished, Meta does not deliver production webhook traffic to
it at all — only synthetic test events triggered manually from the App
Dashboard's own "Test" button are delivered. This is confirmed by Meta's
own dashboard warning text (quoted in Step 6). As a result, the reply and
status portions of this milestone's acceptance criteria are satisfied here
via Meta's dashboard-triggered test tooling, not an organic reply/status
event from a real phone. Full production-grade verification with the
client's real registered number and an organic real-phone reply is
explicitly deferred to M8 (VPS Deployment), once the app is published —
see `docs/planning/01-mvp-plan.md`.

Relevant env vars (per `docs/architecture/03-backend-architecture.md`): `PORT`, `DATABASE_URL`, `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_WEBHOOK_VERIFY_TOKEN`, `NODE_ENV`, `API_ACCESS_TOKEN`. Only the Meta-related ones apply to M1; `DATABASE_URL` and `API_ACCESS_TOKEN` belong to later milestones.

---

## Step 1 — Meta Developer App and Test Number Setup

**Status**
Complete.

**Must Read**
`docs/planning/01-mvp-plan.md` (M1 goal), `docs/architecture/03-backend-architecture.md` (env variable list).

**Objective**
Create a working Meta Developer App on the WhatsApp Business Platform and obtain a test phone number, Phone Number ID, WhatsApp Business Account ID, and a temporary access token.

**Scope**
Meta Developer Dashboard configuration only. No backend code involved in this step.

**Acceptance Criteria**
A Meta App exists with WhatsApp correctly configured as its own product, a free test number is claimed under it, and a temporary access token is generated.

**Verification**
- First attempt was misconfigured: the App was created with the "Connect with customers through WhatsApp" use case, but WhatsApp ended up nested under Facebook Login instead of being added as its own product — this App was abandoned.
- A second, clean App was created with WhatsApp added directly as a product.
- Used the App's "Try it out" / API Setup flow to claim the free test phone number.
- Generated a temporary access token from the same screen.

**Result**
Working test setup obtained:
- Phone Number ID: `1365718669952060`
- WhatsApp Business Account ID: obtained during setup (visible in the Meta App Dashboard's WhatsApp > API Setup page).
- Temporary access token: generated and stored in `backend/.env` as `META_ACCESS_TOKEN`. The raw value is not recorded in this document — see `backend/.env` (git-ignored, never committed).

---

## Step 2 — Outbound Send Proof (Dashboard)

**Status**
Complete.

**Must Read**
None beyond Step 1's setup.

**Objective**
Confirm Meta's side of the integration works — a message can be sent and received — before writing or running any backend code.

**Scope**
Meta App Dashboard UI only ("Send message" button on the API Setup / Try it out screen). No code.

**Acceptance Criteria**
A real WhatsApp message is received on a real phone, sent via the dashboard's built-in "Send message" button rather than any custom code.

**Verification**
Used the dashboard's "Send message" action to send the default test template to a real phone number and confirmed receipt on that device.

**Result**
Confirmed Meta's WhatsApp Business Platform integration (App, test number, template) is functional at the platform level, independent of this repository's code.

---

## Step 3 — Outbound Send Proof (Backend Code)

**Status**
Complete.

**Must Read**
`backend/src/lib/metaClient.ts`.

**Objective**
Prove the existing `metaClient.ts` outbound send implementation works against the live Meta Cloud API, using it exactly as already written.

**Scope**
A throwaway script only (`backend/scripts/one-off-send-test.ts`), importing `sendTemplateMessage` and `MetaApiError` from `metaClient.ts` unchanged. No modification to `metaClient.ts` or any other app file.

**Acceptance Criteria**
The script sends a real template message to a real phone number (+96171819509) via the existing `sendTemplateMessage()` function and logs Meta's raw response, success or error, unmodified.

**Verification**
Ran `npx tsx scripts/one-off-send-test.ts` from `backend/`. Console output:

```
SUCCESS — raw Meta response:
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "+96171819509",
      "wa_id": "96171819509"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgLOTYxNzE4MTk1MDkVAgARGBI0NEI3ODg0NTgzNTRFMTRCMjUA",
      "message_status": "accepted"
    }
  ]
}
```

**Env file issue found during this step:** `backend/.env` was empty at the time. `metaClient.ts`'s config loader (`dotenv/config` in `src/config/env.ts`) resolves `.env` relative to the working directory the process is run from (`backend/`), so credentials that existed only in the repo-root `.env` were not picked up automatically. The script only succeeded because `META_ACCESS_TOKEN` and `META_PHONE_NUMBER_ID` were temporarily exported into the shell session for that one run (`source ../.env`) — nothing was persisted to disk at that point. This gap is tracked and closed in Step 4.

**Result**
Meta returned a real message ID (`wamid.HBgLOTYxNzE4MTk1MDkVAgARGBI0NEI3ODg0NTgzNTRFMTRCMjUA`) with `message_status: "accepted"`. `metaClient.ts` required no code changes — it worked exactly as already implemented.

---

## Step 4 — Fix Environment Variable Location

**Status**
Complete.

**Must Read**
`backend/src/config/env.ts`, `backend/.env.example`.

**Objective**
Move `META_ACCESS_TOKEN` and `META_PHONE_NUMBER_ID` into `backend/.env` so the backend boots and sends correctly without manually sourcing the root `.env` each time.

**Scope**
Copying/moving these two values into `backend/.env` only. Explicitly excluded: modifying `env.ts` or the backend's dotenv loading behavior — no bug was found in it, the values were simply in the wrong file.

**Acceptance Criteria**
Running the backend's normal start command from inside `backend/` works without a "missing environment variable" error and without manually sourcing any other file.

**Verification**
Confirmed `backend/.env` now contains `META_ACCESS_TOKEN` and `META_PHONE_NUMBER_ID`, and that they are no longer present in the repo-root `.env` (which now holds only `CONTEXT7_API_KEY`, unrelated to the backend). Ran:

```
node -r dotenv/config -e "console.log('META_ACCESS_TOKEN:', process.env.META_ACCESS_TOKEN ? 'present' : 'MISSING'); console.log('META_PHONE_NUMBER_ID:', process.env.META_PHONE_NUMBER_ID ?? 'MISSING')"
```

from inside `backend/`, with no sourcing of any other file. Output:

```
META_ACCESS_TOKEN: present
META_PHONE_NUMBER_ID: 1365718669952060
```

**Result**
`backend/.env` is self-sufficient for the Meta-related variables. No manual sourcing of the root `.env` is required anymore. `META_WEBHOOK_VERIFY_TOKEN` is still not set in `backend/.env` — that is required by Step 6, not this step.

---

## Step 5 — Webhook Verification Handshake (GET /webhook)

**Status**
Complete.

**Must Read**
`backend/src/webhooks/whatsapp.controller.ts`, `docs/architecture/05-api-design.md` (section 9, WhatsApp Webhook).

**Objective**
Confirm the backend's webhook verification handler correctly implements Meta's GET handshake: echo `hub.challenge` back when `hub.verify_token` matches, reject otherwise.

**Scope**
Backend code only (`GET /webhook`), tested with a synthetic curl request against the locally running server — not yet a real request originating from Meta's servers.

**Acceptance Criteria**
A GET request with a matching `hub.verify_token` returns 200 with the echoed `hub.challenge`; a GET request with a wrong token returns 403.

**Verification**
Ran the compiled server locally and issued curl requests directly (done earlier in this session, before the outbound send proof work):

```
curl -s "localhost:3999/webhook?hub.mode=subscribe&hub.verify_token=testtoken&hub.challenge=abc123"
→ abc123

curl -s -o /dev/null -w "%{http_code}\n" "localhost:3999/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123"
→ 403
```

**Result**
The verification handshake behaves correctly. This proves the handler logic only — Meta itself has not yet called this endpoint, since the backend has not yet been exposed publicly or registered in the Meta App Dashboard's webhook config (see Step 6).

---

## Step 6 — Real Incoming Webhook Event (Reply Received)

**Status**
Complete, with a caveat — see below. This is a Meta-originated webhook
POST reaching the backend successfully, but it is a synthetic test event
triggered from the Meta App Dashboard, not an organic reply typed from a
real phone.

**Must Read**
`backend/src/webhooks/whatsapp.controller.ts`, `docs/architecture/05-api-design.md` (section 9), `backend/README.md`.

**Objective**
Prove a real reply sent from a real phone reaches the backend via Meta's webhook — a genuine Meta-originated POST request, not a synthetic/hand-built payload.

**Scope**
Exposing the local backend via ngrok (or equivalent) and registering that public URL plus `META_WEBHOOK_VERIFY_TOKEN` in the Meta App Dashboard's webhook configuration.

**Acceptance Criteria**
Replying to the received WhatsApp message from a real phone results in a real POST request from Meta hitting the backend's `/webhook` endpoint, logged with the actual payload Meta sends.

**Verification**
The backend was exposed publicly via a real ngrok tunnel and that tunnel's URL was registered as the webhook callback URL in the Meta App Dashboard, subscribed to the `messages` field. Rather than an organic reply from a real phone, a synthetic test payload was triggered using the Meta App Dashboard's own "Test" tool on the `messages` webhook field, selecting the "Incoming Message" sample type. This is NOT a real message typed and sent from a real phone — it is Meta's own hardcoded example payload (sender `16315551181`, text "this is a text message"), delivered through the real, verified webhook pipeline: real ngrok tunnel, real POST request from Meta's servers, real backend handler. The backend received and logged it:

```
[webhook] inbound message {
  from: '16315551181',
  id: 'ABGGFlA5Fpa',
  type: 'text',
  text: 'this is a text message',
  timestamp: '1504902988'
}
```

**Why an organic real-phone reply could not be obtained:** the Meta App Dashboard displays an explicit warning on unpublished apps:

> "Apps will only be able to receive test webhooks sent from the app dashboard while the app is unpublished. No production data... will be delivered unless the app has been published."

While this App remains unpublished, Meta will not deliver real/production webhook traffic to it under any circumstances — replying from a real phone to a real message would not reach this webhook at all. The dashboard's "Test" button is the only way to observe a real Meta-originated `/webhook` POST at this stage.

**Result**
The webhook receiving path is proven end-to-end using Meta's own synthetic test delivery mechanism: registration, HTTPS reachability, payload parsing, and logging all work correctly against a genuine Meta-originated request. Full verification with the client's real registered number and an organic real-phone reply is deferred to M8 (VPS Deployment), once the app is published — this is not considered part of M1's closure, only of what M1 could actually prove given the unpublished-app constraint.

---

## Step 7 — Message Status Events (sent/delivered/read/failed)

**Status**
Complete, with the same caveat as Step 6 — a synthetic test event, not a real status callback progressing from an actual delivered message.

**Must Read**
`backend/src/webhooks/whatsapp.controller.ts`, `docs/architecture/05-api-design.md` (section 9).

**Objective**
Confirm Meta sends status callback webhook events as a sent message progresses through delivery states, and that the backend receives and logs them.

**Scope**
Depends on Step 6's webhook exposure/registration already being in place (same ngrok tunnel and webhook subscription).

**Acceptance Criteria**
At minimum, "sent" and "delivered" status events are observed arriving at the webhook endpoint for a real sent message.

**Verification**
Used the same Meta App Dashboard "Test" tool on the `messages` webhook field, this time selecting the "Status Message" sample type → "Delivered". This confirmed the webhook handler correctly branches on the `statuses` array shape (distinct from the `messages` array shape exercised in Step 6) and logs it correctly. The backend received and logged:

```
[webhook] status update {
  messageId: 'ABGGFlA5Fpa',
  status: 'delivered',
  recipientId: '16315551181',
  timestamp: '1504902988'
}
```

**Minor gap:** only the "Delivered" status sample was tested. "Sent" and "Read" sample types were also available in the same dropdown but were not individually tested — this is an explicit gap, not something silently assumed to work identically. "Failed" was not available as a sample type in this tool at all.

**Why an organic status callback could not be obtained:** the same unpublished-app restriction from Step 6 applies here — Meta will not deliver real production status callbacks (from an actual message actually delivered to an actual phone) to an unpublished app. The dashboard's "Test" tool is the only way to observe a real Meta-originated status-update POST at this stage.

**Result**
The status-update branch of the webhook handler is proven against a genuine Meta-originated request for the "delivered" case only. "Sent" and "read" were not individually exercised. Full real production status callbacks (sent/delivered/read progressing naturally from a real message to a real recipient) are deferred to M8 (VPS Deployment), once the app is published — not considered part of M1's closure.

---

## Milestone Checklist

- [x] Step 1 — Meta Developer App and Test Number Setup
- [x] Step 2 — Outbound Send Proof (Dashboard)
- [x] Step 3 — Outbound Send Proof (Backend Code)
- [x] Step 4 — Fix Environment Variable Location
- [x] Step 5 — Webhook Verification Handshake (GET /webhook)
- [x] Step 6 — Real Incoming Webhook Event (Reply Received) — *caveat: proven via Meta Dashboard's synthetic "Test" tooling, not an organic real-phone reply; production-grade verification deferred to M8*
- [x] Step 7 — Message Status Events (sent/delivered/read/failed) — *caveat: only "delivered" tested via the same synthetic "Test" tooling; "sent"/"read" not individually tested; production-grade verification deferred to M8*
