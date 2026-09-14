import { prisma } from "../prisma/client";

// Message persistence for the outbound send flow (M4 Steps 4-5). Prisma-only,
// per docs/rules/backend.md.

// "A count of messages sent today" (M4 Step 4) — every OUTBOUND message
// created for this campaign since local midnight, regardless of delivery
// status yet reached (PENDING/SENT/DELIVERED/...): the limit guards how many
// send attempts go out, not how many are later confirmed delivered.
export function countTodaysOutboundMessages(campaignId: string): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return prisma.message.count({
    where: {
      campaignId,
      direction: "OUTBOUND",
      createdAt: { gte: startOfToday },
    },
  });
}

export interface NewOutboundMessageInput {
  leadId: string;
  campaignId: string;
  content: string;
  metaMessageId: string;
  sentAt: Date;
}

export function createOutboundTemplateMessage(data: NewOutboundMessageInput) {
  return prisma.message.create({
    data: {
      leadId: data.leadId,
      campaignId: data.campaignId,
      direction: "OUTBOUND",
      type: "TEMPLATE",
      content: data.content,
      status: "SENT",
      metaMessageId: data.metaMessageId,
      sentAt: data.sentAt,
    },
  });
}
