import * as leadsRepo from "../repositories/leads.repository";
import * as campaignsRepo from "../repositories/campaigns.repository";
import * as messagesRepo from "../repositories/messages.repository";
import { sendTemplateMessage, TemplateComponent } from "../lib/metaClient";
import { LeadNotFoundError } from "./leads.service";

// Send-flow business rules (M4 Steps 4-5). Plain Error subclasses per
// docs/rules/backend.md.

// No campaign is currently ACTIVE to send from. Distinct from "campaign not
// found" (that's a campaigns.service.ts concern) — this is "there is nothing
// configured to send with right now."
export class NoActiveCampaignError extends Error {
  constructor() {
    super("No campaign is currently ACTIVE. Activate a campaign before sending.");
    this.name = "NoActiveCampaignError";
  }
}

// docs/contract's Campaign scope: "Do not assume that the daily limit makes
// non-compliant outreach acceptable" — the limit is enforced as a hard stop,
// not a soft warning: the send is rejected outright, not silently sent
// anyway or silently dropped (M4 Step 4's acceptance criteria).
export class DailyLimitReachedError extends Error {
  constructor(limit: number) {
    super(`Daily sending limit of ${limit} messages has been reached for this campaign today.`);
    this.name = "DailyLimitReachedError";
  }
}

// A lead that isn't NEW has either already been sent the initial template,
// replied, or failed — none of which "send the initial template" should
// silently repeat. Mirrors leads.service.ts's LeadAlreadyContactedError
// reasoning (status only ever leaves NEW once contacted) but scoped to this
// domain since the meaning here ("not eligible to send to") differs from
// delete's ("already contacted, so protect its history").
export class LeadNotEligibleError extends Error {
  constructor(id: string, status: string) {
    super(`Lead ${id} is not eligible for the initial send (status: ${status}, expected NEW).`);
    this.name = "LeadNotEligibleError";
  }
}

// jaspers_market_order_confirmation_v1 is a stand-in test template (M4 —
// see docs/development-milestones/04-campaign-outbound-messaging.md), not
// real client-facing copy. Its {{2}} (order number) and {{3}} (estimated
// delivery) variables have no real meaning for this project; fixed test
// values are used purely to prove metaClient.ts's components substitution
// mechanism actually works end-to-end. {{1}} (name) is the one variable that
// maps onto a real lead field, with a fallback for leads imported with no
// name on file.
const TEST_ORDER_NUMBER = "TEST-0000";
const TEST_ESTIMATED_DELIVERY = "N/A (test send, no real order exists)";
const FALLBACK_LEAD_NAME = "there";

function buildTestTemplateComponents(leadName: string | null): TemplateComponent[] {
  const name = leadName?.trim() || FALLBACK_LEAD_NAME;
  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: name },
        { type: "text", text: TEST_ORDER_NUMBER },
        { type: "text", text: TEST_ESTIMATED_DELIVERY },
      ],
    },
  ];
}

// Human-readable record of what was actually sent, stored in messages.content
// (a required string field — docs/architecture/04-database-design.md doesn't
// specify a format for outbound TEMPLATE content, so this is the most literal
// non-invented choice: name the template and the variables substituted into
// it, clearly marked as test values).
function renderMessageContent(templateName: string, leadName: string | null): string {
  const name = leadName?.trim() || FALLBACK_LEAD_NAME;
  return (
    `Template: ${templateName} | Variables: name="${name}", ` +
    `order_number(test)="${TEST_ORDER_NUMBER}", estimated_delivery(test)="${TEST_ESTIMATED_DELIVERY}"`
  );
}

// POST /api/v1/messages/send (docs/architecture/05-api-design.md section 5):
// sends the active campaign's initial template to exactly one lead. Single-
// lead only — see the milestone doc's Step 5 scope note on why bulk-sending
// to all eligible leads is not implemented here.
export async function sendInitialTemplate(leadId: string) {
  const lead = await leadsRepo.findLeadById(leadId);
  if (!lead) {
    throw new LeadNotFoundError(leadId);
  }
  if (lead.status !== "NEW") {
    throw new LeadNotEligibleError(leadId, lead.status);
  }

  const campaign = await campaignsRepo.findActiveCampaign();
  if (!campaign) {
    throw new NoActiveCampaignError();
  }

  const sentToday = await messagesRepo.countTodaysOutboundMessages(campaign.id);
  if (sentToday >= campaign.dailyLimit) {
    throw new DailyLimitReachedError(campaign.dailyLimit);
  }

  const components = buildTestTemplateComponents(lead.name);
  const metaResponse = await sendTemplateMessage({
    to: lead.phone,
    templateName: campaign.initialTemplateId,
    languageCode: "en_US",
    components,
  });

  const sentAt = new Date();
  const message = await messagesRepo.createOutboundTemplateMessage({
    leadId: lead.id,
    campaignId: campaign.id,
    content: renderMessageContent(campaign.initialTemplateId, lead.name),
    metaMessageId: metaResponse.messages[0].id,
    sentAt,
  });

  const followup1DueAt = new Date(sentAt.getTime() + campaign.followup1DelayHours * 60 * 60 * 1000);
  await leadsRepo.markLeadContacted(lead.id, campaign.id, followup1DueAt);

  return message;
}
