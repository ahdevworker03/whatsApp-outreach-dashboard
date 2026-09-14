import { ConversationStatus } from "@prisma/client";
import * as repo from "../repositories/inbox.repository";

// M6 Step 1: read-only inbox workflows. Reply (Step 3) and status changes
// (Step 4) add business rules to this file later.

export class ConversationNotFoundError extends Error {
  constructor(id: string) {
    super(`Conversation not found: ${id}`);
    this.name = "ConversationNotFoundError";
  }
}

export interface ListConversationsParams {
  status?: ConversationStatus;
  page?: number;
  limit?: number;
}

const DEFAULT_PAGE_SIZE = 20;

// Ordered by most recent activity (docs/architecture/05-api-design.md
// section 6) — the repository sorts by last_message_at descending.
export async function listConversations(params: ListConversationsParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : DEFAULT_PAGE_SIZE;

  const [conversations, total] = await repo.listConversations({
    status: params.status,
    skip: (page - 1) * limit,
    take: limit,
  });

  return { conversations, total };
}

export async function getConversationById(id: string) {
  const conversation = await repo.findConversationById(id);
  if (!conversation) {
    throw new ConversationNotFoundError(id);
  }
  return conversation;
}
