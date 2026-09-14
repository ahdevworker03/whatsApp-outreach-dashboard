import { Request, Response } from "express";
import * as messagesService from "../services/messages.service";

// Thin, HTTP-focused controller per docs/rules/backend.md — the send
// workflow lives in messages.service.ts. Wrapped by asyncHandler in
// messages.routes.ts.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/v1/messages/send — docs/architecture/05-api-design.md section 5.
export async function sendInitialTemplate(req: Request, res: Response): Promise<void> {
  const { lead_id } = req.body ?? {};
  if (typeof lead_id !== "string" || !UUID_PATTERN.test(lead_id)) {
    res.status(400).json({ error: `Invalid or missing lead_id: ${lead_id}` });
    return;
  }

  const message = await messagesService.sendInitialTemplate(lead_id);
  res.status(200).json(message);
}
