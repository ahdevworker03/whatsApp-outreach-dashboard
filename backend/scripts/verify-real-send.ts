/**
 * ONE-OFF VERIFICATION SCRIPT — not part of the app, delete after use.
 * M4 Steps 5-6 resumed after META_ACCESS_TOKEN was refreshed: exercises
 * messages.service.ts's sendInitialTemplate() with a REAL Meta Cloud API
 * call (not a guard-only check) against the placeholder campaign (already
 * updated to jaspers_market_order_confirmation_v1 in Step 0) and a real,
 * freshly-created NEW lead, then confirms every Step 5/6 acceptance
 * criterion via direct DB inspection.
 */
import { prisma } from "../src/prisma/client";
import * as campaignsService from "../src/services/campaigns.service";
import * as messagesService from "../src/services/messages.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const REAL_TEST_PHONE = "+96171819509"; // same real test recipient used in M1 Step 3's live send proof
const LEAD_NAME = "Abdallah";

async function main() {
  console.log("0. Confirming no campaign is currently ACTIVE...");
  const preexistingActive = await prisma.campaign.findFirst({ where: { status: "ACTIVE" } });
  assert(
    preexistingActive === null,
    `expected no campaign ACTIVE before running this script, found ${preexistingActive?.id}`
  );

  console.log("1. Activating the placeholder campaign (jaspers_market_order_confirmation_v1)...");
  const campaign = await campaignsService.setCampaignStatus(
    "a07a1643-ca3f-4e2d-a117-927f3125d3d6",
    "ACTIVE"
  );
  assert(campaign.status === "ACTIVE", `expected ACTIVE, got ${campaign.status}`);
  console.log(`   campaign ${campaign.id}, initialTemplateId=${campaign.initialTemplateId}, followup1DelayHours=${campaign.followup1DelayHours}`);

  console.log(`2. Creating a real NEW lead (${REAL_TEST_PHONE}, name="${LEAD_NAME}")...`);
  const lead = await prisma.lead.create({
    data: { phone: REAL_TEST_PHONE, name: LEAD_NAME, status: "NEW" },
  });
  console.log(`   lead ${lead.id}`);

  const beforeSend = new Date();

  try {
    console.log("3. Calling sendInitialTemplate() — REAL Meta Cloud API call...");
    const message = await messagesService.sendInitialTemplate(lead.id);
    console.log("   metaMessageId:", message.metaMessageId);

    assert(
      typeof message.metaMessageId === "string" && message.metaMessageId.startsWith("wamid."),
      `expected a real wamid. message id, got ${message.metaMessageId}`
    );
    assert(message.status === "SENT", `expected message.status SENT, got ${message.status}`);
    assert(message.direction === "OUTBOUND", `expected OUTBOUND, got ${message.direction}`);
    assert(message.type === "TEMPLATE", `expected TEMPLATE, got ${message.type}`);
    assert(message.isAutoReply === false, `expected isAutoReply false, got ${message.isAutoReply}`);
    assert(message.sentAt !== null, "expected sentAt to be set");

    console.log("4. Confirming lead status/campaign/followup1DueAt via direct DB re-fetch...");
    const updatedLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    assert(updatedLead.status === "CONTACTED", `expected CONTACTED, got ${updatedLead.status}`);
    assert(updatedLead.campaignId === campaign.id, `expected campaignId ${campaign.id}, got ${updatedLead.campaignId}`);
    assert(updatedLead.followup1DueAt !== null, "expected followup1DueAt to be set");

    const expectedDueAtMs = message.sentAt!.getTime() + campaign.followup1DelayHours * 60 * 60 * 1000;
    const actualDueAtMs = updatedLead.followup1DueAt!.getTime();
    const driftMs = Math.abs(actualDueAtMs - expectedDueAtMs);
    assert(
      driftMs < 5000,
      `expected followup1DueAt ~${new Date(expectedDueAtMs).toISOString()}, got ${updatedLead.followup1DueAt!.toISOString()} (drift ${driftMs}ms)`
    );
    console.log(`   followup1DueAt: ${updatedLead.followup1DueAt!.toISOString()} (sentAt + ${campaign.followup1DelayHours}h, drift ${driftMs}ms)`);

    console.log("5. Confirming the Message row via direct DB re-fetch...");
    const dbMessage = await prisma.message.findUniqueOrThrow({ where: { id: message.id } });
    assert(dbMessage.leadId === lead.id, "expected message.leadId to match the lead");
    assert(dbMessage.campaignId === campaign.id, "expected message.campaignId to match the campaign");
    assert(dbMessage.metaMessageId === message.metaMessageId, "expected metaMessageId to match");
    assert(dbMessage.isAutoReply === false, "expected is_auto_reply false in the DB row");
    assert(dbMessage.createdAt.getTime() >= beforeSend.getTime(), "expected createdAt after the script started");
    console.log(`   message row ${dbMessage.id}, content: ${dbMessage.content}`);

    console.log("\nAll automatable checks passed. REAL message sent to", REAL_TEST_PHONE);
    console.log("wamid:", message.metaMessageId);
    console.log(
      "\n>>> VISUAL CONFIRMATION STILL REQUIRED: check the WhatsApp app on",
      REAL_TEST_PHONE,
      "and confirm the received message shows the name, order number, and estimated delivery correctly substituted. <<<"
    );
  } finally {
    console.log("\nLeaving the sent lead/message/campaign state in place for inspection — NOT cleaning up automatically this run (Step 6 needs to inspect it).");
  }
}

main()
  .catch((error) => {
    console.error("\nVERIFICATION FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
