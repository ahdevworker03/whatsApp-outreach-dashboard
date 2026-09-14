/**
 * ONE-OFF VERIFICATION SCRIPT — not part of the app, delete after use.
 * Exercises leads.repository.ts's findEligibleLeads() against the real dev
 * database (M4 Step 3's acceptance criteria: "correctly returns only NEW
 * leads not already assigned to a campaign, verified against real data").
 * Cleans up every row it creates.
 */
import { prisma } from "../src/prisma/client";
import { findEligibleLeads } from "../src/repositories/leads.repository";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function main() {
  console.log("Seeding one NEW+unassigned, one NEW+assigned, one CONTACTED+unassigned lead...");
  const placeholderCampaign = await prisma.campaign.findFirstOrThrow();

  const eligible = await prisma.lead.create({
    data: { phone: "+15550001001", status: "NEW" },
  });
  const assigned = await prisma.lead.create({
    data: { phone: "+15550001002", status: "NEW", campaignId: placeholderCampaign.id },
  });
  const contacted = await prisma.lead.create({
    data: { phone: "+15550001003", status: "CONTACTED" },
  });

  try {
    console.log("Calling findEligibleLeads()...");
    const results = await findEligibleLeads();
    const ids = results.map((lead) => lead.id);

    assert(ids.includes(eligible.id), "expected the NEW+unassigned lead to be eligible");
    assert(!ids.includes(assigned.id), "expected the NEW+assigned lead to be excluded");
    assert(!ids.includes(contacted.id), "expected the CONTACTED lead to be excluded");
    assert(
      results.every((lead) => lead.status === "NEW" && lead.campaignId === null),
      "expected every returned lead to be NEW with no campaignId"
    );

    console.log(`\nAll checks passed. ${results.length} total eligible lead(s) in the dev DB.`);
  } finally {
    console.log("\nCleaning up rows created by this script...");
    await prisma.lead.deleteMany({ where: { id: { in: [eligible.id, assigned.id, contacted.id] } } });
  }
}

main()
  .catch((error) => {
    console.error("\nVERIFICATION FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
