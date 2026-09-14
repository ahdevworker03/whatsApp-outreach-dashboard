import { Campaign, Lead } from "@prisma/client";
import * as followupRepo from "../repositories/followup.repository";
import * as messagesRepo from "../repositories/messages.repository";
import { sendTemplateMessage } from "../lib/metaClient";
import { buildTestTemplateComponents, renderMessageContent } from "./messages.service";

// Follow-up send workflow (M5 Step 3). Reuses metaClient.ts and the daily-
// limit guard from messages.repository.ts — same pattern as
// messages.service.ts's sendInitialTemplate, adapted for follow-up templates
// and driven by the scheduler (src/jobs/followupScheduler.ts) rather than an
// HTTP request.

type LeadDueForFollowup = Lead & { campaign: Campaign | null };

type FollowupOutcome = "sent" | "failed" | "skipped_daily_limit";

export interface FollowupRunSummary {
  followup1Sent: number;
  followup2Sent: number;
  failed: number;
  skippedDailyLimit: number;
}

function tally(summary: FollowupRunSummary, followupNumber: 1 | 2, outcome: FollowupOutcome): void {
  if (outcome === "sent") {
    followupNumber === 1 ? summary.followup1Sent++ : summary.followup2Sent++;
  } else if (outcome === "failed") {
    summary.failed++;
  } else {
    summary.skippedDailyLimit++;
  }
}

// Entry point for the scheduler tick. Per docs/architecture/
// 03-backend-architecture.md section 8 ("Scheduler job failures are logged
// per job and do not stop the scheduler"), a failure processing one lead
// must not prevent the rest of this run's due leads from being attempted —
// every per-lead step below is wrapped so nothing thrown escapes the loop.
export async function processDueFollowups(): Promise<FollowupRunSummary> {
  const summary: FollowupRunSummary = {
    followup1Sent: 0,
    followup2Sent: 0,
    failed: 0,
    skippedDailyLimit: 0,
  };
  const now = new Date();

  const followup1Leads = await followupRepo.findLeadsDueForFollowup1(now);
  for (const lead of followup1Leads) {
    const outcome = await sendFollowupSafely(lead, 1);
    tally(summary, 1, outcome);
  }

  const followup2Leads = await followupRepo.findLeadsDueForFollowup2(now);
  for (const lead of followup2Leads) {
    const outcome = await sendFollowupSafely(lead, 2);
    tally(summary, 2, outcome);
  }

  return summary;
}

// Catches anything sendFollowup itself doesn't already handle (e.g. an
// unexpected DB error), so one bad lead can never stop the loop above.
async function sendFollowupSafely(
  lead: LeadDueForFollowup,
  followupNumber: 1 | 2
): Promise<FollowupOutcome> {
  try {
    return await sendFollowup(lead, followupNumber);
  } catch (error) {
    console.error(
      `[followup-scheduler] unexpected error processing lead ${lead.id} (Follow-up #${followupNumber})`,
      error
    );
    return "failed";
  }
}

async function sendFollowup(lead: LeadDueForFollowup, followupNumber: 1 | 2): Promise<FollowupOutcome> {
  const campaign = lead.campaign;
  if (!campaign) {
    // Shouldn't happen: a CONTACTED/FOLLOWUP_1_SENT lead always has
    // campaignId set by messages.service.ts's markLeadContacted or this same
    // module's markLeadFollowup1Sent. Defensive-only.
    console.error(`[followup-scheduler] lead ${lead.id} is due but has no campaign, skipping`);
    return "failed";
  }

  // Same guard as sendInitialTemplate, reused as-is (this milestone's
  // acceptance criteria: "the daily limit is respected... shared guard, not
  // a separate limit").
  const sentToday = await messagesRepo.countTodaysOutboundMessages(campaign.id);
  if (sentToday >= campaign.dailyLimit) {
    return "skipped_daily_limit";
  }

  const templateName = followupNumber === 1 ? campaign.followup1TemplateId : campaign.followup2TemplateId;
  const components = buildTestTemplateComponents(lead.name);

  let metaMessageId: string;
  try {
    const metaResponse = await sendTemplateMessage({
      to: lead.phone,
      templateName,
      languageCode: "en_US",
      components,
    });
    metaMessageId = metaResponse.messages[0].id;
  } catch (error) {
    console.error(`[followup-scheduler] send failed for lead ${lead.id} (Follow-up #${followupNumber})`, error);
    await messagesRepo.createFailedOutboundTemplateMessage({
      leadId: lead.id,
      campaignId: campaign.id,
      content: `Template: ${templateName} | Follow-up #${followupNumber} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      failedAt: new Date(),
    });
    await followupRepo.markLeadFailed(lead.id);
    return "failed";
  }

  const sentAt = new Date();
  await messagesRepo.createOutboundTemplateMessage({
    leadId: lead.id,
    campaignId: campaign.id,
    content: renderMessageContent(templateName, lead.name),
    metaMessageId,
    sentAt,
  });

  if (followupNumber === 1) {
    const followup2DueAt = new Date(sentAt.getTime() + campaign.followup2DelayHours * 60 * 60 * 1000);
    await followupRepo.markLeadFollowup1Sent(lead.id, followup2DueAt);
  } else {
    await followupRepo.markLeadFollowup2Sent(lead.id);
    await followupRepo.markLeadCompleted(lead.id);
  }

  return "sent";
}
