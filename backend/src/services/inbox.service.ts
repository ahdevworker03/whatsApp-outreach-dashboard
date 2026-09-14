import { ConversationStatus } from "@prisma/client";
import * as repo from "../repositories/inbox.repository";
import { findAnyCampaign } from "../repositories/webhook.repository";
import { sendTextMessage } from "../lib/metaClient";

// M6 Step 1: read-only inbox workflows. Step 3 adds the manual-reply
// workflow below. Status changes (Step 4) add a further business rule later.

export class ConversationNotFoundError extends Error {
  constructor(id: string) {
    super(`Conversation not found: ${id}`);
    this.name = "ConversationNotFoundError";
  }
}

// M6 Step 0's finding: Meta only accepts a free-text send within 24 hours
// of the customer's most recent inbound message, and this must be blocked
// before ever calling Meta (Step 3's acceptance criteria), not left to
// Meta's own rejection as the only backstop.
export class OutsideCustomerServiceWindowError extends Error {
  constructor(conversationId: string) {
    super(
      `Conversation ${conversationId} is outside the 24-hour customer service window ` +
        "(no inbound message from this lead in the last 24 hours). A free-text reply cannot be sent."
    );
    this.name = "OutsideCustomerServiceWindowError";
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

const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

// POST /api/v1/inbox/:conversation_id/reply (docs/architecture/
// 05-api-design.md section 5). Enforces the 24-hour window, sends via
// metaClient.ts's sendTextMessage(), and records the outcome as a Message
// row either way — mirrors followup.service.ts's send/fail pattern (M5
// Step 3), the closest existing precedent for "send now, record SENT or
// FAILED, no retry."
export async function replyToConversation(conversationId: string, message: string) {
  const conversation = await repo.findConversationWithLead(conversationId);
  if (!conversation) {
    throw new ConversationNotFoundError(conversationId);
  }

  const lastInbound = await repo.findMostRecentInboundMessage(conversation.lead.id);
  const withinWindow =
    lastInbound !== null && Date.now() - lastInbound.createdAt.getTime() < CUSTOMER_SERVICE_WINDOW_MS;
  if (!withinWindow) {
    // Blocked before any Meta call — Step 0's finding that pre-emptive
    // blocking is required, not just Meta's own error as a backstop.
    throw new OutsideCustomerServiceWindowError(conversationId);
  }

  // Message.campaign_id is a required FK with no real per-conversation
  // campaign tracking yet (same constraint webhook.repository.ts's
  // createInboundMessage works around) — prefer the lead's own campaign
  // when it has one, falling back to the placeholder campaign otherwise.
  const campaignId = conversation.lead.campaignId ?? (await findAnyCampaign())?.id;
  if (!campaignId) {
    throw new Error(
      "No campaign exists to attach this reply to (messages.campaign_id is required). " +
        "Seed a placeholder campaign — see docs/development-milestones/02-backend-foundation-data-model.md, Step 5."
    );
  }

  let metaMessageId: string;
  try {
    const metaResponse = await sendTextMessage({ to: conversation.lead.phone, body: message });
    metaMessageId = metaResponse.messages[0].id;
  } catch (error) {
    await repo.createFailedOutboundTextMessage({
      leadId: conversation.lead.id,
      campaignId,
      content: message,
      failedAt: new Date(),
    });
    // Not silently dropped (Step 3's acceptance criteria) — the caller
    // still sees the failure (MetaApiError maps to 502 in errorHandler.ts).
    throw error;
  }

  const sentAt = new Date();
  const outboundMessage = await repo.createOutboundTextMessage({
    leadId: conversation.lead.id,
    campaignId,
    content: message,
    metaMessageId,
    sentAt,
  });
  await repo.updateConversationLastMessageAt(conversationId, sentAt);

  return outboundMessage;
}
