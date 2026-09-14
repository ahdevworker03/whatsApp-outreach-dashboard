import { Request, Response } from "express";
import { ConversationStatus } from "@prisma/client";
import * as inboxService from "../services/inbox.service";

// Thin, HTTP-focused controllers per docs/rules/backend.md — the workflow
// lives in inbox.service.ts. Wrapped by asyncHandler in inbox.routes.ts.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/v1/inbox — docs/architecture/05-api-design.md section 6.
export async function listInbox(req: Request, res: Response): Promise<void> {
  const { status, page, limit } = req.query;

  if (
    typeof status === "string" &&
    !Object.values(ConversationStatus).includes(status as ConversationStatus)
  ) {
    res.status(400).json({ error: `Invalid status: ${status}` });
    return;
  }

  const result = await inboxService.listConversations({
    status: typeof status === "string" ? (status as ConversationStatus) : undefined,
    page: parsePositiveInt(page),
    limit: parsePositiveInt(limit),
  });
  res.status(200).json(result);
}

// GET /api/v1/inbox/:conversation_id — docs/architecture/05-api-design.md
// section 6.
export async function getInboxConversation(req: Request, res: Response): Promise<void> {
  const { conversation_id } = req.params;
  if (!UUID_PATTERN.test(conversation_id)) {
    res.status(400).json({ error: `Invalid conversation id: ${conversation_id}` });
    return;
  }

  const conversation = await inboxService.getConversationById(conversation_id);
  res.status(200).json(conversation);
}

function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
