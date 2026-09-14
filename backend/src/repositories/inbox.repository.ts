import { ConversationStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

// Persistence for the Inbox domain. M6 Step 1 added the read-only list/detail
// queries; Step 3 adds the manual-reply write path (an outbound TEXT message
// plus the conversation's last_message_at). Status transitions (Step 4) add
// a further write path later.

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

// Lighter than findConversationById — the reply flow needs the lead's phone
// and campaignId, not the full message history.
export function findConversationWithLead(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: { lead: true },
  });
}

// The 24-hour customer service window is anchored to the customer's most
// recent INBOUND message (M6 Step 0's finding, confirmed against Meta's own
// rule) — not conversations.last_message_at, which moves on outbound sends
// too once this function's caller starts writing OUTBOUND rows. INBOUND rows
// never set sentAt (see webhook.repository.ts's createInboundMessage), so
// createdAt is the only usable timestamp here.
export function findMostRecentInboundMessage(leadId: string) {
  return prisma.message.findFirst({
    where: { leadId, direction: "INBOUND" },
    orderBy: { createdAt: "desc" },
  });
}

export interface NewOutboundTextMessageInput {
  leadId: string;
  campaignId: string;
  content: string;
  metaMessageId: string;
  sentAt: Date;
}

export function createOutboundTextMessage(data: NewOutboundTextMessageInput) {
  return prisma.message.create({
    data: {
      leadId: data.leadId,
      campaignId: data.campaignId,
      direction: "OUTBOUND",
      type: "TEXT",
      content: data.content,
      status: "SENT",
      metaMessageId: data.metaMessageId,
      sentAt: data.sentAt,
    },
  });
}

export interface FailedOutboundTextMessageInput {
  leadId: string;
  campaignId: string;
  content: string;
  failedAt: Date;
}

// Mirrors messages.repository.ts's createFailedOutboundTemplateMessage — a
// send that fails at the Meta call itself still gets a row ("delivery
// failure → FAILED", docs/architecture/04-database-design.md section 4),
// with no metaMessageId since Meta never accepted the request.
export function createFailedOutboundTextMessage(data: FailedOutboundTextMessageInput) {
  return prisma.message.create({
    data: {
      leadId: data.leadId,
      campaignId: data.campaignId,
      direction: "OUTBOUND",
      type: "TEXT",
      content: data.content,
      status: "FAILED",
      failedAt: data.failedAt,
    },
  });
}

export function updateConversationLastMessageAt(id: string, lastMessageAt: Date) {
  return prisma.conversation.update({
    where: { id },
    data: { lastMessageAt },
  });
}

// PATCH /api/v1/inbox/:conversation_id/status (M6 Step 4). Only the manual
// CLOSED transition — automatic reactivation to ACTIVE on a new inbound
// message stays owned by webhook.repository.ts's upsertConversationForLead,
// unchanged by this function.
export function updateConversationStatus(id: string, status: ConversationStatus) {
  return prisma.conversation.update({
    where: { id },
    data: { status },
  });
}
