import { prisma } from "../prisma/client";

// Persistence for webhook-driven writes (M2 Step 5/6). Controllers never
// touch Prisma directly (docs/rules/backend.md) — this is the only place
// that does, on their behalf via the service layer.

// upsert instead of find-then-create: two concurrent webhook deliveries for
// the same new phone/lead would otherwise both pass the "not found" check
// and race on the unique constraint (code-review finding, M2 Step 5).
export function upsertLeadByPhone(phone: string) {
  return prisma.lead.upsert({
    where: { phone },
    create: { phone, status: "NEW" },
    update: {},
  });
}

// M5 Step 1: an incoming message also reactivates a CLOSED conversation —
// a new reply is exactly "has unread or recent messages requiring
// attention" (ConversationStatus.ACTIVE's own definition), so `status` is
// reset to ACTIVE on every incoming message, not just `lastMessageAt` (M2's
// original update branch only touched the latter).
//
// M5 Step 2: `stopAutomation` is the caller's already-made decision (a
// genuine human reply, not an auto-reply — see webhook.service.ts) about
// whether this message stops the remaining follow-up sequence. When true,
// `automationStopped` is set on both the create and update branch. When
// false (an auto-reply, or the very first message), the update branch
// leaves `automationStopped` untouched rather than writing `false` over
// it — a detected auto-reply must not *resume* a sequence a prior human
// reply already stopped (docs/architecture/04-database-design.md section 5:
// "automation_stopped... true when a human reply is received" — nothing
// un-sets it). The create branch has no prior value to preserve, so it's
// written explicitly either way.
export function upsertConversationForLead(leadId: string, options: { stopAutomation: boolean }) {
  return prisma.conversation.upsert({
    where: { leadId },
    create: {
      leadId,
      status: "ACTIVE",
      lastMessageAt: new Date(),
      automationStopped: options.stopAutomation,
    },
    update: {
      status: "ACTIVE",
      lastMessageAt: new Date(),
      ...(options.stopAutomation ? { automationStopped: true } : {}),
    },
  });
}

// M5 Step 2: a human (non-auto-reply) message moves the lead to REPLIED at
// any stage of the sequence — docs/architecture/04-database-design.md
// section 4: "At any stage: human reply received → REPLIED" (no stage is
// exempted). Distinct from upsertLeadByPhone's update branch (which never
// touches status) because this is a real business transition, not just
// "the lead already exists."
export function markLeadReplied(id: string) {
  return prisma.lead.update({ where: { id }, data: { status: "REPLIED" } });
}

// No campaign system exists until M4, but messages.campaign_id is a required
// FK per docs/architecture/04-database-design.md. Attach inbound messages to
// whatever campaign exists (a placeholder row is seeded for M2 — see
// docs/development-milestones/02-backend-foundation-data-model.md, Step 5).
export function findAnyCampaign() {
  return prisma.campaign.findFirst({ orderBy: { createdAt: "asc" } });
}

export function createInboundMessage(data: {
  leadId: string;
  campaignId: string;
  metaMessageId: string;
  content: string;
  isAutoReply: boolean;
}) {
  return prisma.message.create({
    data: {
      leadId: data.leadId,
      campaignId: data.campaignId,
      direction: "INBOUND",
      type: "TEXT",
      content: data.content,
      status: "RECEIVED",
      metaMessageId: data.metaMessageId,
      isAutoReply: data.isAutoReply,
    },
  });
}

export function findMessageByMetaId(metaMessageId: string) {
  return prisma.message.findFirst({ where: { metaMessageId } });
}

const STATUS_TIMESTAMP_FIELD = {
  sent: "sentAt",
  delivered: "deliveredAt",
  read: "readAt",
  failed: "failedAt",
} as const;

export function updateMessageStatus(
  id: string,
  status: "SENT" | "DELIVERED" | "READ" | "FAILED",
  timestamp: Date
) {
  const field = STATUS_TIMESTAMP_FIELD[status.toLowerCase() as keyof typeof STATUS_TIMESTAMP_FIELD];
  return prisma.message.update({
    where: { id },
    data: { status, [field]: timestamp },
  });
}
