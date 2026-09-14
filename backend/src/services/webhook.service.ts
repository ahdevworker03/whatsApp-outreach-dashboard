import * as repo from "../repositories/webhook.repository";
import * as settingsRepo from "../repositories/settings.repository";
import { detectAutoReply } from "../lib/autoReplyDetector";

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

// M2 persists the message/lead/conversation. M5 Step 1 adds auto-reply
// detection (setting is_auto_reply on the inbound row). M5 Step 2 adds
// stop-on-human-reply: a genuine (non-auto) reply stops the remaining
// follow-up sequence and moves the lead to REPLIED, at any stage. Real
// campaign assignment beyond the M2 placeholder is still out of scope here.
export async function handleIncomingMessage(message: IncomingMessage) {
  // Meta delivers webhooks at-least-once — a redelivered event must not
  // create a second row (code-review finding, M2 Step 5).
  const existing = await repo.findMessageByMetaId(message.id);
  if (existing) {
    return existing;
  }

  const phone = message.from.startsWith("+") ? message.from : `+${message.from}`;
  const lead = await repo.upsertLeadByPhone(phone);

  // M5 Step 1: settings.auto_reply_patterns may not exist yet (the settings
  // table isn't seeded as of this milestone — see settings.repository.ts) —
  // treat a missing row the same as an empty pattern list, which
  // detectAutoReply already fails safe on (never classifies as auto-reply).
  const settings = await settingsRepo.getSettings();
  const isAutoReply = detectAutoReply(message.text?.body ?? "", settings?.autoReplyPatterns ?? []);

  // M5 Step 2: a genuine human reply (isAutoReply === false) stops the
  // remaining follow-up sequence — no partial/soft-stop, per this step's
  // Scope — and moves the lead to REPLIED regardless of its current stage.
  // A detected auto-reply does neither: it must not stop a running sequence
  // and must not touch lead status (this step's acceptance criteria).
  await repo.upsertConversationForLead(lead.id, { stopAutomation: !isAutoReply });
  if (!isAutoReply) {
    await repo.markLeadReplied(lead.id);
  }

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
    isAutoReply,
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
