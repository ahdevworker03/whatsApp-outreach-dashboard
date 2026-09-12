import * as repo from "../repositories/webhook.repository";

interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface StatusUpdate {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

// M2 scope only: persist the message/lead/conversation. Auto-reply detection,
// follow-up scheduling, and real campaign assignment are M4/M5.
export async function handleIncomingMessage(message: IncomingMessage) {
  // Meta delivers webhooks at-least-once — a redelivered event must not
  // create a second row (code-review finding, M2 Step 5).
  const existing = await repo.findMessageByMetaId(message.id);
  if (existing) {
    return existing;
  }

  const phone = message.from.startsWith("+") ? message.from : `+${message.from}`;
  const lead = await repo.upsertLeadByPhone(phone);
  await repo.upsertConversationForLead(lead.id);

  const campaign = await repo.findAnyCampaign();
  if (!campaign) {
    throw new Error(
      "No campaign exists to attach an inbound message to (messages.campaign_id is required). " +
        "Seed a placeholder campaign — see docs/development-milestones/02-backend-foundation-data-model.md, Step 5."
    );
  }

  return repo.createInboundMessage({
    leadId: lead.id,
    campaignId: campaign.id,
    metaMessageId: message.id,
    content: message.text?.body ?? "",
  });
}

const KNOWN_STATUSES = ["SENT", "DELIVERED", "READ", "FAILED"] as const;

export async function handleStatusUpdate(update: StatusUpdate) {
  const status = update.status.toUpperCase();
  if (!KNOWN_STATUSES.includes(status as (typeof KNOWN_STATUSES)[number])) {
    console.warn("[webhook] unrecognized status value, skipping", update.status);
    return;
  }

  const message = await repo.findMessageByMetaId(update.id);
  if (!message) {
    console.warn("[webhook] status update for unknown message, skipping", update.id);
    return;
  }

  const timestamp = new Date(Number(update.timestamp) * 1000);
  await repo.updateMessageStatus(message.id, status as (typeof KNOWN_STATUSES)[number], timestamp);
}
