/**
 * ONE-OFF VERIFICATION SCRIPT — not part of the app, delete after use.
 * Exercises M5 Step 3 (followup.repository.ts, followup.service.ts) against
 * the real dev database and, where the scenario needs it, the real Meta
 * Cloud API — same style as M4's verify-messages-service.ts /
 * verify-real-send.ts. Confirmed with the user before running: this script
 * makes two real Meta Cloud API sends to +96171819509 (a test number the
 * user controls) and one deliberate real call to an invalid number to
 * exercise the failure path.
 *
 * Covers this milestone's Step 3 "Verification required" list:
 *  1. Due-leads query correctness (followup1/followup2 eligibility,
 *     including the automation_stopped exclusion) — DB-only, no Meta calls.
 *  2. Daily limit respected exactly like the initial send's guard, then a
 *     real Follow-up #1 send once the limit allows it.
 *  3. A failed send (real MetaApiError from an invalid recipient) sets
 *     MessageStatus.FAILED and LeadStatus.FAILED, and does not reschedule.
 *  4. Idempotency: rerunning the job does not re-send to a lead whose
 *     status already moved out of the eligibility window.
 *  5. Follow-up #2 end-to-end: FOLLOWUP_1_SENT -> FOLLOWUP_2_SENT ->
 *     COMPLETED, with a second real Meta send.
 */
import { prisma } from "../src/prisma/client";
import * as followupRepo from "../src/repositories/followup.repository";
import * as followupService from "../src/services/followup.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const REAL_TEST_PHONE = "+96171819509"; // same real test recipient used in M1/M4's live send proofs
const INVALID_TEST_PHONE = "+10000000000"; // deliberately invalid — never a real recipient, exercises the failure path
const HOUR_MS = 60 * 60 * 1000;

async function main() {
  console.log("Capturing the pre-existing real lead's state to restore afterward...");
  const originalRealLead = await prisma.lead.findUniqueOrThrow({ where: { phone: REAL_TEST_PHONE } });

  console.log("Seeding two isolated test campaigns (PAUSED — status is irrelevant to the scheduler)...");
  const campaignMain = await prisma.campaign.create({
    data: {
      name: "Verify Followup Scheduler - Main",
      status: "PAUSED",
      initialTemplateId: "jaspers_market_order_confirmation_v1",
      followup1TemplateId: "jaspers_market_order_confirmation_v1",
      followup1DelayHours: 24,
      followup2TemplateId: "jaspers_market_order_confirmation_v1",
      followup2DelayHours: 48,
      dailyLimit: 100,
    },
  });
  const campaignLimit = await prisma.campaign.create({
    data: {
      name: "Verify Followup Scheduler - Daily Limit",
      status: "PAUSED",
      initialTemplateId: "jaspers_market_order_confirmation_v1",
      followup1TemplateId: "jaspers_market_order_confirmation_v1",
      followup1DelayHours: 24,
      followup2TemplateId: "jaspers_market_order_confirmation_v1",
      followup2DelayHours: 48,
      dailyLimit: 1,
    },
  });

  const createdLeadIds: string[] = [];
  const createdMessageCampaignIds = [campaignMain.id, campaignLimit.id];

  try {
    console.log("\n1. Due-leads query correctness (no Meta calls)...");
    const now = new Date();
    const eligible1 = await prisma.lead.create({
      data: {
        phone: "+15550009001",
        status: "CONTACTED",
        campaignId: campaignMain.id,
        followup1DueAt: new Date(now.getTime() - HOUR_MS),
      },
    });
    const notDue1 = await prisma.lead.create({
      data: {
        phone: "+15550009002",
        status: "CONTACTED",
        campaignId: campaignMain.id,
        followup1DueAt: new Date(now.getTime() + HOUR_MS),
      },
    });
    const stopped1 = await prisma.lead.create({
      data: {
        phone: "+15550009003",
        status: "CONTACTED",
        campaignId: campaignMain.id,
        followup1DueAt: new Date(now.getTime() - HOUR_MS),
      },
    });
    await prisma.conversation.create({
      data: { leadId: stopped1.id, status: "ACTIVE", automationStopped: true },
    });
    const eligible2 = await prisma.lead.create({
      data: {
        phone: "+15550009004",
        status: "FOLLOWUP_1_SENT",
        campaignId: campaignMain.id,
        followup2DueAt: new Date(now.getTime() - HOUR_MS),
      },
    });
    const stopped2 = await prisma.lead.create({
      data: {
        phone: "+15550009005",
        status: "FOLLOWUP_1_SENT",
        campaignId: campaignMain.id,
        followup2DueAt: new Date(now.getTime() - HOUR_MS),
      },
    });
    await prisma.conversation.create({
      data: { leadId: stopped2.id, status: "ACTIVE", automationStopped: true },
    });
    createdLeadIds.push(eligible1.id, notDue1.id, stopped1.id, eligible2.id, stopped2.id);

    const due1 = await followupRepo.findLeadsDueForFollowup1(now);
    const due1Ids = due1.map((l) => l.id);
    assert(due1Ids.includes(eligible1.id), "expected eligible1 in followup1 due list");
    assert(!due1Ids.includes(notDue1.id), "expected notDue1 excluded (not yet due)");
    assert(!due1Ids.includes(stopped1.id), "expected stopped1 excluded (automation_stopped)");

    const due2 = await followupRepo.findLeadsDueForFollowup2(now);
    const due2Ids = due2.map((l) => l.id);
    assert(due2Ids.includes(eligible2.id), "expected eligible2 in followup2 due list");
    assert(!due2Ids.includes(stopped2.id), "expected stopped2 excluded (automation_stopped)");
    console.log("   query correctness confirmed.");

    console.log("\n   Cleaning up Step 1's leads/conversations before moving on...");
    await prisma.conversation.deleteMany({ where: { leadId: { in: [stopped1.id, stopped2.id] } } });
    await prisma.lead.deleteMany({
      where: { id: { in: [eligible1.id, notDue1.id, stopped1.id, eligible2.id, stopped2.id] } },
    });

    console.log("\n2. Daily limit respected, then a real Follow-up #1 send once it allows one...");
    const fillerLead = await prisma.lead.create({
      data: { phone: "+15550009006", status: "CONTACTED", campaignId: campaignLimit.id },
    });
    createdLeadIds.push(fillerLead.id);
    await prisma.message.create({
      data: {
        leadId: fillerLead.id,
        campaignId: campaignLimit.id,
        direction: "OUTBOUND",
        type: "TEMPLATE",
        content: "filler (fills campaignLimit's dailyLimit of 1)",
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await prisma.lead.update({
      where: { id: originalRealLead.id },
      data: {
        status: "CONTACTED",
        campaignId: campaignLimit.id,
        followup1DueAt: new Date(now.getTime() - HOUR_MS),
        followup2DueAt: null,
      },
    });

    let summary = await followupService.processDueFollowups();
    console.log("   run summary (limit reached):", summary);
    const afterLimitReached = await prisma.lead.findUniqueOrThrow({ where: { id: originalRealLead.id } });
    assert(afterLimitReached.status === "CONTACTED", "expected the due lead untouched while the daily limit is reached");
    const messagesBeforeRaise = await prisma.message.count({
      // Scoped to campaignLimit — originalRealLead already has an unrelated
      // pre-existing message from M4's own verification, under a different
      // campaign.
      where: { leadId: originalRealLead.id, campaignId: campaignLimit.id },
    });
    assert(messagesBeforeRaise === 0, "expected no message row created while the daily limit blocked the send");

    console.log("   raising campaignLimit's dailyLimit — this triggers a REAL Meta send to", REAL_TEST_PHONE, "...");
    await prisma.campaign.update({ where: { id: campaignLimit.id }, data: { dailyLimit: 100 } });
    summary = await followupService.processDueFollowups();
    console.log("   run summary (limit raised):", summary);

    const afterFollowup1 = await prisma.lead.findUniqueOrThrow({ where: { id: originalRealLead.id } });
    assert(afterFollowup1.status === "FOLLOWUP_1_SENT", `expected FOLLOWUP_1_SENT, got ${afterFollowup1.status}`);
    assert(afterFollowup1.followup2DueAt !== null, "expected followup2DueAt to be set after Follow-up #1");
    const followup1Message = await prisma.message.findFirstOrThrow({
      // Scoped to campaignLimit — originalRealLead already has an unrelated
      // OUTBOUND message from M4's own verification, under a different
      // campaign, that must not be picked up here.
      where: { leadId: originalRealLead.id, direction: "OUTBOUND", campaignId: campaignLimit.id },
    });
    assert(followup1Message.status === "SENT", `expected SENT, got ${followup1Message.status}`);
    assert(
      typeof followup1Message.metaMessageId === "string" && followup1Message.metaMessageId.startsWith("wamid."),
      `expected a real wamid., got ${followup1Message.metaMessageId}`
    );
    console.log("   Follow-up #1 real send confirmed. wamid:", followup1Message.metaMessageId);

    console.log("\n3. A real failed send (invalid recipient) sets MessageStatus.FAILED and LeadStatus.FAILED...");
    const failLead = await prisma.lead.create({
      data: {
        phone: INVALID_TEST_PHONE,
        status: "CONTACTED",
        campaignId: campaignMain.id,
        followup1DueAt: new Date(now.getTime() - HOUR_MS),
      },
    });
    createdLeadIds.push(failLead.id);

    summary = await followupService.processDueFollowups();
    console.log("   run summary (failure path):", summary);
    const afterFail = await prisma.lead.findUniqueOrThrow({ where: { id: failLead.id } });
    assert(afterFail.status === "FAILED", `expected FAILED, got ${afterFail.status}`);
    const failMessage = await prisma.message.findFirstOrThrow({ where: { leadId: failLead.id } });
    assert(failMessage.status === "FAILED", `expected FAILED, got ${failMessage.status}`);
    assert(failMessage.metaMessageId === null, "expected no metaMessageId on a failed send");
    assert(failMessage.failedAt !== null, "expected failedAt to be set");
    console.log("   failure path confirmed.");

    console.log("\n4. Idempotency: rerunning does not re-send to leads no longer in the eligibility window...");
    const messageCountBeforeRerun = await prisma.message.count({
      where: { leadId: { in: [originalRealLead.id, failLead.id] } },
    });
    summary = await followupService.processDueFollowups();
    console.log("   run summary (rerun, nothing newly due):", summary);
    const messageCountAfterRerun = await prisma.message.count({
      where: { leadId: { in: [originalRealLead.id, failLead.id] } },
    });
    assert(
      messageCountAfterRerun === messageCountBeforeRerun,
      `expected no new messages on rerun, went from ${messageCountBeforeRerun} to ${messageCountAfterRerun}`
    );
    console.log("   idempotency confirmed (status-driven — no double send).");

    console.log(
      "\n5. Follow-up #2 end-to-end: FOLLOWUP_1_SENT -> FOLLOWUP_2_SENT -> COMPLETED, real Meta send to",
      REAL_TEST_PHONE,
      "..."
    );
    await prisma.lead.update({
      where: { id: originalRealLead.id },
      data: { followup2DueAt: new Date(now.getTime() - HOUR_MS) },
    });
    summary = await followupService.processDueFollowups();
    console.log("   run summary (followup #2):", summary);
    const afterFollowup2 = await prisma.lead.findUniqueOrThrow({ where: { id: originalRealLead.id } });
    assert(afterFollowup2.status === "COMPLETED", `expected COMPLETED, got ${afterFollowup2.status}`);
    const followup2Message = await prisma.message.findFirstOrThrow({
      where: {
        leadId: originalRealLead.id,
        direction: "OUTBOUND",
        campaignId: campaignLimit.id,
        id: { not: followup1Message.id },
      },
    });
    assert(followup2Message.status === "SENT", `expected SENT, got ${followup2Message.status}`);
    assert(
      typeof followup2Message.metaMessageId === "string" && followup2Message.metaMessageId.startsWith("wamid."),
      `expected a real wamid., got ${followup2Message.metaMessageId}`
    );
    console.log("   Follow-up #2 real send + COMPLETED transition confirmed. wamid:", followup2Message.metaMessageId);

    console.log("\nAll Step 3 checks passed.");
  } finally {
    console.log("\nCleaning up rows created by this script...");
    await prisma.message.deleteMany({ where: { campaignId: { in: createdMessageCampaignIds } } });
    await prisma.conversation.deleteMany({ where: { leadId: { in: createdLeadIds } } });
    await prisma.lead.deleteMany({ where: { id: { in: createdLeadIds } } });
    await prisma.campaign.deleteMany({ where: { id: { in: [campaignMain.id, campaignLimit.id] } } });

    console.log("Restoring the pre-existing real lead to its original state...");
    await prisma.lead.update({
      where: { id: originalRealLead.id },
      data: {
        status: originalRealLead.status,
        campaignId: originalRealLead.campaignId,
        followup1DueAt: originalRealLead.followup1DueAt,
        followup2DueAt: originalRealLead.followup2DueAt,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error("\nVERIFICATION FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
