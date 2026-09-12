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

export function upsertConversationForLead(leadId: string) {
  return prisma.conversation.upsert({
    where: { leadId },
    create: { leadId, status: "ACTIVE", lastMessageAt: new Date() },
    update: { lastMessageAt: new Date() },
  });
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
