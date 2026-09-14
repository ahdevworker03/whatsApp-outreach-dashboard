import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import {
  LeadAlreadyContactedError,
  LeadNotFoundError,
  UnsupportedLeadFileTypeError,
} from "../services/leads.service";
import { InvalidPhoneNumberError } from "../lib/phone";
import {
  AnotherCampaignActiveError,
  CampaignActiveError,
  CampaignNotFoundError,
} from "../services/campaigns.service";
import {
  DailyLimitReachedError,
  LeadNotEligibleError,
  NoActiveCampaignError,
} from "../services/messages.service";
import { MetaApiError } from "../lib/metaClient";
import { ConversationNotFoundError, OutsideCustomerServiceWindowError } from "../services/inbox.service";

// Global Express error handler per docs/architecture/03-backend-architecture.md:
// catches unhandled errors and returns a consistent JSON error response.
//
// Known domain errors (M3 Step 6) are mapped to their documented status code
// here rather than in each controller, per docs/rules/backend.md: "Let the
// global error handler serialize expected errors; do not re-serialize them
// in controllers."
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[error]", err);

  if (res.headersSent) {
    return;
  }

  if (err instanceof LeadNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof LeadAlreadyContactedError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err instanceof UnsupportedLeadFileTypeError || err instanceof InvalidPhoneNumberError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.message, code: err.code });
    return;
  }

  // Campaign domain errors (M4 Step 1/2).
  if (err instanceof CampaignNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof CampaignActiveError || err instanceof AnotherCampaignActiveError) {
    res.status(409).json({ error: err.message });
    return;
  }

  // Messaging/send domain errors (M4 Step 4/5).
  if (err instanceof NoActiveCampaignError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err instanceof DailyLimitReachedError) {
    res.status(429).json({ error: err.message });
    return;
  }
  if (err instanceof LeadNotEligibleError) {
    res.status(409).json({ error: err.message });
    return;
  }
  // The Meta Cloud API itself rejected/failed the send (e.g. bad/expired
  // token, invalid template, unreachable recipient) — a real upstream
  // failure, not a bug in this backend, so 502 rather than a generic 500.
  if (err instanceof MetaApiError) {
    res.status(502).json({ error: `Meta Cloud API request failed: ${err.message}` });
    return;
  }

  // Inbox domain errors (M6 Step 1/3).
  if (err instanceof ConversationNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof OutsideCustomerServiceWindowError) {
    res.status(409).json({ error: err.message });
    return;
  }

  // Prisma's own error messages include file paths and source snippets —
  // fine for our logs above, not for an API response (M2 Step 7).
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "A record with this value already exists." });
      return;
    }
    res.status(500).json({ error: "Database error." });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
}
