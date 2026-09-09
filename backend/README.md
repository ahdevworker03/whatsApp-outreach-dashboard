# Backend — M1: WhatsApp Integration Proof

Scope: prove the outbound template send and inbound webhook round trip
against the Meta Cloud API, per `docs/planning/01-mvp-plan.md` (M1) and
`docs/architecture/03-backend-architecture.md`. No database, campaign
logic, scheduler, or frontend yet — those are later milestones.

## Current status

A Meta test App and free test number are already set up and working —
outbound send has been proven both via the Meta Dashboard directly and via
this codebase's `metaClient.ts` against the live API. Inbound webhook
verification has been proven with a synthetic request; a real inbound
reply and real status callbacks have not yet been observed. Full
step-by-step detail, including what's still open, is tracked in
`docs/development-milestones/01-whatsapp-integration-proof.md`.

## What's here

- `src/index.ts` — minimal Express app: `/health` and the `/webhook` route.
- `src/webhooks/` — Meta webhook verification (`GET /webhook`) and event
  receiver (`POST /webhook`), logging inbound messages and status updates.
- `src/lib/metaClient.ts` — thin client for the Meta Cloud API
  `POST /messages` endpoint (outbound template send).
- `scripts/send-test-message.ts` — CLI to send one real template message,
  independent of the Express app.
- `scripts/one-off-send-test.ts` — throwaway script used to prove
  `metaClient.ts` against the live API with a hardcoded recipient; not a
  permanent part of the app, safe to delete once no longer needed.

## Prerequisites (yours to set up before this can be exercised live)

1. A Meta Business Account and a WhatsApp Business Platform app.
2. The client's WhatsApp number registered on the platform.
3. At least one Meta-approved message template (Meta ships a default
   `hello_world` template on new apps — good enough to prove the round trip).
4. Values for the environment variables below.

## Environment variables

Copy `.env.example` to `.env` and fill in real values. Nothing here is
committed — `.env` is git-ignored. **Set these in `backend/.env`, not the
repo-root `.env`** — the backend's dotenv loading resolves `.env` relative
to the `backend/` working directory, so values placed only at the repo
root are not picked up.

| Variable | Where to get it | Status |
|---|---|---|
| `META_ACCESS_TOKEN` | Meta App Dashboard → WhatsApp → API Setup (temporary token, or a permanent System User token) | Set — test App token |
| `META_PHONE_NUMBER_ID` | Same page — "Phone number ID" | Set — `1365718669952060` (test number) |
| `META_API_VERSION` | Defaults to `v21.0`; only change if you need a different Graph API version | Using default |
| `META_WEBHOOK_VERIFY_TOKEN` | Any string you choose — enter the same value in the webhook config step below | Not yet set — required for the inbound webhook proof below |
| `PORT` | Defaults to `3000` | Using default |

The temporary access token above is short-lived (Meta test tokens expire in
~24 hours); it will need replacing with a fresh temporary token or a
permanent System User token before this stops being a one-off proof.

## Install

```
cd backend
npm install
```

## 1. Prove outbound send

```
npm run send-test-message -- <recipient_e164> <template_name> <language_code>
# e.g.
npm run send-test-message -- +15551234567 hello_world en_US
```

Success looks like a JSON response containing a `messages[0].id` — that's
the Meta-assigned message ID. Check the recipient's WhatsApp for the
delivered message.

## 2. Prove inbound webhook (message + status callbacks)

Start the server:

```
npm run dev
```

Expose it to the internet (Meta must be able to reach it over HTTPS) —
for local testing, a tunnel works:

```
ngrok http 3000
```

In the Meta App Dashboard, configure the webhook:

- Callback URL: `https://<your-tunnel-or-domain>/webhook`
- Verify token: the same value as `META_WEBHOOK_VERIFY_TOKEN`
- Subscribe to the `messages` field

Meta will call `GET /webhook` once to verify — a 200 response with the
echoed challenge confirms this works.

Then:

- Reply from the recipient's phone to the number you sent from. You should
  see `[webhook] inbound message` logged in the server console.
- Watch the server console after sending a template — you should see
  `[webhook] status update` logs for `sent`, `delivered`, and (if the
  recipient opens it) `read`.

## Acceptance (per docs/planning/01-mvp-plan.md, M1)

- [x] A real message is delivered to a real phone — proven via the Meta
      Dashboard's "Send message" button and via `scripts/one-off-send-test.ts`
      against the live API (Meta returned a real message ID).
- [ ] A real reply is received by the backend via webhook (logged).
- [ ] sent/delivered/read/failed status events are observed and logged.

The remaining two require exposing the backend publicly (e.g. ngrok) and
registering the webhook in the Meta App Dashboard — see step-by-step detail
and current status in `docs/development-milestones/01-whatsapp-integration-proof.md`.
