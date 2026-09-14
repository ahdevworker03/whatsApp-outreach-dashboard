/**
 * ONE-OFF VERIFICATION SCRIPT — not part of the app, delete after use.
 * M5 Step 4, scoped per user direction: only the two "stop behavior"
 * scenarios, chained through their real entry points end-to-end —
 * sendInitialTemplate() -> webhook.service.ts's handleIncomingMessage() ->
 * followup.service.ts's processDueFollowups(). The full no-reply
 * CONTACTED -> FOLLOWUP_1_SENT -> FOLLOWUP_2_SENT -> COMPLETED chain is not
 * re-run here — Step 3's verify-followup-scheduler.ts already proved that
 * state machine end-to-end with real sends; this script only proves the
 * entry-point wiring for the two reply behaviors:
 *
 *  B. initial send -> human reply -> sequence stops (no follow-up sent even
 *     once due).
 *  C. initial send -> auto-reply -> sequence continues (follow-up #1 still
 *     sends once due).
 *
 * Reuses the real ACTIVE placeholder campaign (a07a1643...), same
 * precedent as M4's verify-real-send.ts, and the same real, allow-listed
 * test recipient (+96171819509) used throughout M1/M4/M5 — confirmed with
 * the user before running (3 real Meta Cloud API sends total). The lead
 * row for that phone pre-exists in the dev DB and already carries a
 * genuine historical Message row from M4's own verification (deliberately
 * left in place, per that milestone's Step 6 — NOT test contamination).
 *
 * Cleanup discipline (fixed after an earlier version of this script
 * accidentally deleted that M4 row via a blanket
 * `message.deleteMany({ where: { leadId } })`): every row this script
 * creates is tracked by its own id in createdMessageIds/
 * createdConversationIds as it's created, and cleanup deletes ONLY those
 * specific ids — never a bare `where: { leadId }` — so a pre-existing row
 * for this lead can never be caught by this script's cleanup, on any exit
 * path (success or failure).
 */
import { prisma } from "../src/prisma/client";
import * as messagesService from "../src/services/messages.service";
import * as followupService from "../src/services/followup.service";
import { handleIncomingMessage } from "../src/services/webhook.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const REAL_TEST_PHONE = "+96171819509";
const REAL_TEST_PHONE_WEBHOOK_FORMAT = "96171819509"; // Meta's inbound "from" has no leading "+"
const PLACEHOLDER_CAMPAIGN_ID = "a07a1643-ca3f-4e2d-a117-927f3125d3d6";
const HOUR_MS = 60 * 60 * 1000;

// Every row this script creates is pushed here as it's created, and nothing
// else. Cleanup only ever deletes ids present in these two arrays.
const createdMessageIds: string[] = [];
const createdConversationIds: string[] = [];

async function main() {
  console.log("Confirming the placeholder campaign is ACTIVE (required by sendInitialTemplate)...");
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: PLACEHOLDER_CAMPAIGN_ID } });
  assert(campaign.status === "ACTIVE", `expected the placeholder campaign ACTIVE, got ${campaign.status}`);

  console.log("Capturing the pre-existing real lead's state to restore afterward...");
  const originalRealLead = await prisma.lead.findUniqueOrThrow({ where: { phone: REAL_TEST_PHONE } });
  assert(originalRealLead.status === "NEW", `expected the real lead to start NEW, got ${originalRealLead.status}`);
  const preexistingMessageIds = new Set(
    (await prisma.message.findMany({ where: { leadId: originalRealLead.id }, select: { id: true } })).map(
      (m) => m.id
    )
  );
  console.log(
    `   ${preexistingMessageIds.size} pre-existing message row(s) for this lead will be left untouched throughout.`
  );

  const leadId = originalRealLead.id;
  let settingsRowId: string | undefined;

  try {
    console.log("\n=== Scenario B: initial send -> human reply -> sequence stops ===");
    console.log("1. sendInitialTemplate() — REAL Meta send #1...");
    const initialMessageB = await messagesService.sendInitialTemplate(leadId);
    createdMessageIds.push(initialMessageB.id);
    assert(
      typeof initialMessageB.metaMessageId === "string" && initialMessageB.metaMessageId.startsWith("wamid."),
      `expected a real wamid., got ${initialMessageB.metaMessageId}`
    );
    const leadAfterInitialB = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    assert(leadAfterInitialB.status === "CONTACTED", `expected CONTACTED, got ${leadAfterInitialB.status}`);
    assert(leadAfterInitialB.followup1DueAt !== null, "expected followup1DueAt to be set");
    console.log("   confirmed: CONTACTED, followup1DueAt set. wamid:", initialMessageB.metaMessageId);

    console.log(
      "2. Simulating an inbound HUMAN reply via the webhook handler (no auto_reply_patterns seeded, so this is unambiguously human)..."
    );
    const inboundMessageB = await handleIncomingMessage({
      from: REAL_TEST_PHONE_WEBHOOK_FORMAT,
      id: `verify-e2e-human-reply-${Date.now()}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: "text",
      text: { body: "Hey, I have a question about my order" },
    });
    createdMessageIds.push(inboundMessageB.id);
    const leadAfterReply = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    assert(leadAfterReply.status === "REPLIED", `expected REPLIED, got ${leadAfterReply.status}`);
    const conversationAfterReply = await prisma.conversation.findUniqueOrThrow({ where: { leadId } });
    createdConversationIds.push(conversationAfterReply.id);
    assert(conversationAfterReply.automationStopped === true, "expected automationStopped true after a human reply");
    console.log("   confirmed: status REPLIED, conversation.automationStopped true.");

    console.log("3. Pushing followup1_due_at into the past (simulated delay) and running the scheduler...");
    await prisma.lead.update({
      where: { id: leadId },
      data: { followup1DueAt: new Date(Date.now() - HOUR_MS) },
    });
    const summaryB = await followupService.processDueFollowups();
    console.log("   run summary:", summaryB);
    const leadAfterSchedulerB = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    assert(leadAfterSchedulerB.status === "REPLIED", `expected REPLIED (untouched), got ${leadAfterSchedulerB.status}`);
    const messagesForLeadAfterB = await prisma.message.findMany({ where: { leadId }, select: { id: true } });
    const newMessagesAfterB = messagesForLeadAfterB.filter((m) => !preexistingMessageIds.has(m.id));
    assert(
      newMessagesAfterB.length === 2,
      `expected exactly the 2 messages this scenario created so far (initial + inbound reply), got ${newMessagesAfterB.length} new — a follow-up may have been sent despite the human reply`
    );
    console.log("   confirmed: no follow-up sent — sequence correctly stopped by the human reply.");

    console.log("\nResetting the lead for Scenario C (deleting only this script's own rows, tracked by id)...");
    await prisma.message.deleteMany({ where: { id: { in: createdMessageIds } } });
    await prisma.conversation.deleteMany({ where: { id: { in: createdConversationIds } } });
    createdMessageIds.length = 0;
    createdConversationIds.length = 0;
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "NEW", campaignId: null, followup1DueAt: null, followup2DueAt: null },
    });

    console.log("\n=== Scenario C: initial send -> auto-reply -> sequence continues ===");
    console.log("Seeding a settings row with an auto_reply_patterns entry (dev DB currently has 0 settings rows)...");
    const settingsRow = await prisma.setting.create({
      data: { autoReplyPatterns: ["out of office"] },
    });
    settingsRowId = settingsRow.id;

    console.log("1. sendInitialTemplate() — REAL Meta send #2...");
    const initialMessageC = await messagesService.sendInitialTemplate(leadId);
    createdMessageIds.push(initialMessageC.id);
    assert(
      typeof initialMessageC.metaMessageId === "string" && initialMessageC.metaMessageId.startsWith("wamid."),
      `expected a real wamid., got ${initialMessageC.metaMessageId}`
    );
    const leadAfterInitialC = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    assert(leadAfterInitialC.status === "CONTACTED", `expected CONTACTED, got ${leadAfterInitialC.status}`);
    console.log("   confirmed: CONTACTED. wamid:", initialMessageC.metaMessageId);

    console.log("2. Simulating an inbound AUTO-REPLY via the webhook handler (matches the seeded pattern)...");
    const inboundMessageC = await handleIncomingMessage({
      from: REAL_TEST_PHONE_WEBHOOK_FORMAT,
      id: `verify-e2e-auto-reply-${Date.now()}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: "text",
      text: { body: "I am currently OUT OF OFFICE, back Monday" },
    });
    createdMessageIds.push(inboundMessageC.id);
    const leadAfterAutoReply = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    assert(
      leadAfterAutoReply.status === "CONTACTED",
      `expected status untouched (CONTACTED), got ${leadAfterAutoReply.status}`
    );
    const conversationAfterAutoReply = await prisma.conversation.findUniqueOrThrow({ where: { leadId } });
    createdConversationIds.push(conversationAfterAutoReply.id);
    assert(conversationAfterAutoReply.automationStopped === false, "expected automationStopped false after an auto-reply");
    assert(inboundMessageC.isAutoReply === true, "expected the inbound message marked is_auto_reply true");
    console.log("   confirmed: status untouched, automationStopped false, message marked is_auto_reply.");

    console.log("3. Pushing followup1_due_at into the past and running the scheduler — expect a REAL Follow-up #1 send...");
    await prisma.lead.update({
      where: { id: leadId },
      data: { followup1DueAt: new Date(Date.now() - HOUR_MS) },
    });
    const summaryC = await followupService.processDueFollowups();
    console.log("   run summary:", summaryC);
    const leadAfterFollowup1 = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    assert(leadAfterFollowup1.status === "FOLLOWUP_1_SENT", `expected FOLLOWUP_1_SENT, got ${leadAfterFollowup1.status}`);
    assert(leadAfterFollowup1.followup2DueAt !== null, "expected followup2DueAt to be set");
    const followup1Message = await prisma.message.findFirstOrThrow({
      where: { leadId, direction: "OUTBOUND", id: { notIn: [...preexistingMessageIds, initialMessageC.id] } },
    });
    createdMessageIds.push(followup1Message.id);
    assert(followup1Message.status === "SENT", `expected SENT, got ${followup1Message.status}`);
    assert(
      typeof followup1Message.metaMessageId === "string" && followup1Message.metaMessageId.startsWith("wamid."),
      `expected a real wamid., got ${followup1Message.metaMessageId}`
    );
    console.log(
      "   confirmed: Follow-up #1 sent despite the auto-reply — sequence correctly continued. wamid:",
      followup1Message.metaMessageId
    );

    console.log("\nAll Step 4 (scoped) checks passed.");
  } finally {
    if (settingsRowId) {
      console.log("\nCleaning up the seeded settings row...");
      await prisma.setting.deleteMany({ where: { id: settingsRowId } });
    }
    console.log(
      `Cleaning up this script's own rows only — ${createdMessageIds.length} message(s), ${createdConversationIds.length} conversation(s), matched strictly by id (never by leadId alone)...`
    );
    if (createdMessageIds.length > 0) {
      await prisma.message.deleteMany({ where: { id: { in: createdMessageIds } } });
    }
    if (createdConversationIds.length > 0) {
      await prisma.conversation.deleteMany({ where: { id: { in: createdConversationIds } } });
    }
    console.log("Restoring the real lead to its original state...");
    await prisma.lead.update({
      where: { id: leadId },
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
