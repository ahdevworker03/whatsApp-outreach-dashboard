import { ConversationStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

// Read-only persistence for the Inbox's list/detail endpoints (M6 Step 1).
// Manual reply (Step 3) and status transitions (Step 4) add write paths here
// later; this file only reads what M5's webhook path already writes.

export interface ListConversationsParams {
  status?: ConversationStatus;
  skip: number;
  take: number;
}

// "Full message history" (docs/architecture/05-api-design.md section 6) means
// the detail endpoint includes every message; the list endpoint includes the
// lead only, so the UI can identify who each conversation is with without a
// second request per row.
export function listConversations(params: ListConversationsParams) {
  const where: Prisma.ConversationWhereInput = params.status ? { status: params.status } : {};

  return Promise.all([
    prisma.conversation.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { lastMessageAt: "desc" },
      include: { lead: true },
    }),
    prisma.conversation.count({ where }),
  ]);
}

// Message has no direct conversation_id FK (docs/architecture/
// 04-database-design.md) — it relates to Conversation only through the
// shared lead_id, so "full message history" for a conversation is queried
// via the lead relation.
export function findConversationById(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      lead: {
        include: { messages: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
}
