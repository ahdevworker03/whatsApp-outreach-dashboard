/**
 * ONE-OFF VERIFICATION SCRIPT — not part of the app, delete after use.
 * Exercises campaigns.service.ts's exported functions with direct calls
 * against the real dev database (M4 Step 1's acceptance criteria: "each
 * function verified with direct calls against the real dev database").
 * Cleans up every row it creates; does not touch the pre-existing M2
 * placeholder campaign.
 *
 * Updated for the M4 Step 1 fix: createCampaign() no longer blocks on
 * another campaign's ACTIVE status — only setCampaignStatus() to ACTIVE
 * still enforces "only one ACTIVE campaign at a time". Check 6 below now
 * proves creation succeeds while another campaign is ACTIVE (previously it
 * proved the opposite, rejection).
 */
import { prisma } from "../src/prisma/client";
import * as campaignsService from "../src/services/campaigns.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const BASE_INPUT = {
  name: "Verify Campaign",
  initialTemplateId: "jaspers_market_order_confirmation_v1",
  followup1TemplateId: "jaspers_market_order_confirmation_v1",
  followup1DelayHours: 24,
  followup2TemplateId: "jaspers_market_order_confirmation_v1",
  followup2DelayHours: 48,
};

async function main() {
  // Baseline: confirm no campaign is currently ACTIVE before this script's
  // own assertions rely on that (the M2 placeholder is DRAFT, so this should
  // hold in a normal dev DB state).
  const preexistingActive = await prisma.campaign.findFirst({ where: { status: "ACTIVE" } });
  assert(
    preexistingActive === null,
    `expected no campaign ACTIVE before running this script, found ${preexistingActive?.id}`
  );

  console.log("1. createCampaign() creates a DRAFT campaign...");
  const created = await campaignsService.createCampaign(BASE_INPUT);
  assert(created.status === "DRAFT", `expected new campaign to be DRAFT, got ${created.status}`);
  console.log(`   created ${created.id}`);

  console.log("2. updateCampaign() succeeds while DRAFT...");
  const updated = await campaignsService.updateCampaign(created.id, { dailyLimit: 75 });
  assert(updated.dailyLimit === 75, `expected dailyLimit 75, got ${updated.dailyLimit}`);

  console.log("3. setCampaignStatus() to ACTIVE succeeds (nothing else is ACTIVE)...");
  const activated = await campaignsService.setCampaignStatus(created.id, "ACTIVE");
  assert(activated.status === "ACTIVE", `expected ACTIVE, got ${activated.status}`);

  console.log("4. getCurrentCampaign() returns the ACTIVE campaign...");
  const current = await campaignsService.getCurrentCampaign();
  assert(current !== null, "expected a current campaign");
  assert(current!.id === created.id, `expected current campaign to be ${created.id}, got ${current!.id}`);

  console.log("5. updateCampaign() is blocked while ACTIVE...");
  try {
    await campaignsService.updateCampaign(created.id, { dailyLimit: 10 });
    throw new Error("expected updateCampaign to throw for an ACTIVE campaign");
  } catch (error) {
    assert(
      error instanceof campaignsService.CampaignActiveError,
      `expected CampaignActiveError, got ${error}`
    );
  }

  console.log("6. createCampaign() succeeds while another campaign is ACTIVE (corrected: creation is never blocked by status)...");
  const second = await campaignsService.createCampaign({ ...BASE_INPUT, name: "Verify Campaign Two" });
  assert(second.status === "DRAFT", `expected the new campaign to be DRAFT, got ${second.status}`);
  console.log(`   created ${second.id} while ${created.id} is still ACTIVE`);

  console.log("7. setCampaignStatus() to ACTIVE on that second campaign is rejected (unchanged: activation still enforces only one ACTIVE)...");
  try {
    await campaignsService.setCampaignStatus(second.id, "ACTIVE");
    throw new Error("expected setCampaignStatus to throw while another campaign is ACTIVE");
  } catch (error) {
    assert(
      error instanceof campaignsService.AnotherCampaignActiveError,
      `expected AnotherCampaignActiveError, got ${error}`
    );
  }

  console.log("8. Pausing the first campaign, then activating the second, succeeds...");
  await campaignsService.setCampaignStatus(created.id, "PAUSED");
  const secondActivated = await campaignsService.setCampaignStatus(second.id, "ACTIVE");
  assert(secondActivated.status === "ACTIVE", `expected ACTIVE, got ${secondActivated.status}`);

  console.log("9. setCampaignStatus() on a non-existent id throws CampaignNotFoundError...");
  try {
    await campaignsService.setCampaignStatus("00000000-0000-0000-0000-000000000000", "PAUSED");
    throw new Error("expected setCampaignStatus to throw for a non-existent id");
  } catch (error) {
    assert(
      error instanceof campaignsService.CampaignNotFoundError,
      `expected CampaignNotFoundError, got ${error}`
    );
  }

  console.log("\nAll direct-call checks passed.");

  console.log("\nCleaning up rows created by this script...");
  await prisma.campaign.deleteMany({ where: { id: { in: [created.id, second.id] } } });
}

main()
  .catch((error) => {
    console.error("\nVERIFICATION FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
