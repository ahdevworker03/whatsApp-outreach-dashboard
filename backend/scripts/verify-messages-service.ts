/**
 * ONE-OFF VERIFICATION SCRIPT — not part of the app, delete after use.
 * Exercises messages.service.ts's sendInitialTemplate() guards (M4 Step 4's
 * daily-limit enforcement, plus the NoActiveCampaignError/LeadNotEligibleError
 * guards) against the real dev database.
 *
 * Does NOT verify an actual successful Meta send — META_ACCESS_TOKEN is
 * currently expired (see docs/development-milestones/
 * 04-campaign-outbound-messaging.md, Step 5/6's status). This script proves
 * every guard rejects before ever reaching metaClient.ts, and that the one
 * case which *does* reach it (all guards passed) fails only at the Meta call
 * itself (MetaApiError), with zero DB side effects from that failed attempt.
 */
import { prisma } from "../src/prisma/client";
import * as messagesService from "../src/services/messages.service";
import { MetaApiError } from "../src/lib/metaClient";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function main() {
  const preexistingActive = await prisma.campaign.findFirst({ where: { status: "ACTIVE" } });
  assert(
    preexistingActive === null,
    `expected no campaign ACTIVE before running this script, found ${preexistingActive?.id}`
  );

  console.log("Seeding a NEW eligible lead and a CONTACTED lead...");
  const eligibleLead = await prisma.lead.create({
    data: { phone: "+15550002001", name: "Verify Guard", status: "NEW" },
  });
  const contactedLead = await prisma.lead.create({
    data: { phone: "+15550002002", status: "CONTACTED" },
  });

  try {
    console.log("1. sendInitialTemplate() with no ACTIVE campaign throws NoActiveCampaignError...");
    try {
      await messagesService.sendInitialTemplate(eligibleLead.id);
      throw new Error("expected sendInitialTemplate to throw with no ACTIVE campaign");
    } catch (error) {
      assert(
        error instanceof messagesService.NoActiveCampaignError,
        `expected NoActiveCampaignError, got ${error}`
      );
    }

    console.log("2. sendInitialTemplate() on a non-NEW lead throws LeadNotEligibleError...");
    const campaign = await prisma.campaign.create({
      data: {
        name: "Verify Send Guards",
        status: "ACTIVE",
        initialTemplateId: "jaspers_market_order_confirmation_v1",
        followup1TemplateId: "jaspers_market_order_confirmation_v1",
        followup1DelayHours: 24,
        followup2TemplateId: "jaspers_market_order_confirmation_v1",
        followup2DelayHours: 48,
        dailyLimit: 2,
      },
    });
    try {
      await messagesService.sendInitialTemplate(contactedLead.id);
      throw new Error("expected sendInitialTemplate to throw for a CONTACTED lead");
    } catch (error) {
      assert(
        error instanceof messagesService.LeadNotEligibleError,
        `expected LeadNotEligibleError, got ${error}`
      );
    }

    console.log("3. sendInitialTemplate() throws DailyLimitReachedError once today's count meets dailyLimit...");
    // dailyLimit is 2 — seed 2 fake OUTBOUND messages already "sent today"
    // for this campaign, directly via Prisma (no real Meta call), to prove
    // the guard counts and rejects without ever depending on a live send.
    const fillerLead1 = await prisma.lead.create({ data: { phone: "+15550002003", status: "CONTACTED", campaignId: campaign.id } });
    const fillerLead2 = await prisma.lead.create({ data: { phone: "+15550002004", status: "CONTACTED", campaignId: campaign.id } });
    await prisma.message.createMany({
      data: [
        {
          leadId: fillerLead1.id,
          campaignId: campaign.id,
          direction: "OUTBOUND",
          type: "TEMPLATE",
          content: "filler 1",
          status: "SENT",
          sentAt: new Date(),
        },
        {
          leadId: fillerLead2.id,
          campaignId: campaign.id,
          direction: "OUTBOUND",
          type: "TEMPLATE",
          content: "filler 2",
          status: "SENT",
          sentAt: new Date(),
        },
      ],
    });

    try {
      await messagesService.sendInitialTemplate(eligibleLead.id);
      throw new Error("expected sendInitialTemplate to throw once the daily limit is reached");
    } catch (error) {
      assert(
        error instanceof messagesService.DailyLimitReachedError,
        `expected DailyLimitReachedError, got ${error}`
      );
    }

    console.log("4. Raising the limit, all guards pass, the call reaches metaClient.ts and fails there only (expired token)...");
    await prisma.campaign.update({ where: { id: campaign.id }, data: { dailyLimit: 100 } });
    const leadBefore = await prisma.lead.findUniqueOrThrow({ where: { id: eligibleLead.id } });
    try {
      await messagesService.sendInitialTemplate(eligibleLead.id);
      console.log(
        "   NOTE: the send actually succeeded (a fresh Meta token must be in place) — not the expected-failure path this script assumes."
      );
    } catch (error) {
      assert(
        error instanceof MetaApiError,
        `expected the failure to surface as MetaApiError (expired token), got ${error}`
      );
      console.log(`   confirmed: failed only at the Meta call itself — ${error.message}`);
    }
    const leadAfter = await prisma.lead.findUniqueOrThrow({ where: { id: eligibleLead.id } });
    assert(
      leadAfter.status === leadBefore.status && leadAfter.campaignId === leadBefore.campaignId,
      "expected the lead to be untouched after a failed Meta call (no partial side effects)"
    );
    const messageCount = await prisma.message.count({ where: { leadId: eligibleLead.id } });
    assert(messageCount === 0, "expected no message row created for a failed Meta call");

    console.log("\nAll guard checks passed.");

    await prisma.message.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.lead.deleteMany({ where: { id: { in: [fillerLead1.id, fillerLead2.id] } } });
    await prisma.campaign.delete({ where: { id: campaign.id } });
  } finally {
    console.log("\nCleaning up rows created by this script...");
    await prisma.message.deleteMany({
      where: { leadId: { in: [eligibleLead.id, contactedLead.id] } },
    });
    await prisma.lead.deleteMany({ where: { id: { in: [eligibleLead.id, contactedLead.id] } } });
  }
}

main()
  .catch((error) => {
    console.error("\nVERIFICATION FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
