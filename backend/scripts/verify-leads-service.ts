/**
 * ONE-OFF VERIFICATION SCRIPT — not part of the app, delete after use.
 * Exercises leads.service.ts's exported functions with direct calls against
 * the real dev database (M3 Step 5's acceptance criteria: "produces correct
 * results against the real dev database, not just type-checks"). Cleans up
 * every row it creates.
 */
import { prisma } from "../src/prisma/client";
import * as leadsService from "../src/services/leads.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function main() {
  const csv = Buffer.from(
    "Name,Business Name,Phone\n" +
      "Verify One,Acme Test,+14155552671\n" + // valid
      "Verify Two,,not a phone\n" + // invalid phone
      "Verify Three,Repeat Co,+14155552671\n" // duplicate-in-file of row 1
  );

  console.log("1. importLeads() with a fresh CSV...");
  const firstImport = await leadsService.importLeads(csv, "verify-leads.csv");
  console.log("   result:", firstImport);
  assert(firstImport.imported === 1, `expected 1 imported, got ${firstImport.imported}`);
  assert(firstImport.failed === 1, `expected 1 failed, got ${firstImport.failed}`);
  assert(firstImport.duplicates === 1, `expected 1 duplicate, got ${firstImport.duplicates}`);

  console.log("2. importLeads() again with the same file (all now duplicates-in-DB)...");
  const secondImport = await leadsService.importLeads(csv, "verify-leads.csv");
  console.log("   result:", secondImport);
  assert(secondImport.imported === 0, `expected 0 imported on re-import, got ${secondImport.imported}`);
  assert(
    secondImport.duplicates === 2,
    `expected 2 duplicates on re-import (existing + in-file), got ${secondImport.duplicates}`
  );

  console.log("3. listLeads() finds the imported lead...");
  const { leads, total } = await leadsService.listLeads({ status: "NEW" });
  const created = leads.find((lead) => lead.phone === "+14155552671");
  assert(created !== undefined, "expected the imported lead to appear in listLeads()");
  assert(total >= 1, "expected total >= 1");
  console.log(`   found lead ${created!.id}, total NEW leads: ${total}`);

  console.log("4. getLeadById() returns it with a messages array...");
  const fetched = await leadsService.getLeadById(created!.id);
  assert(fetched !== null, "expected getLeadById to find the lead");
  assert(Array.isArray(fetched!.messages), "expected a messages array (empty, none sent yet)");
  console.log(`   messages: ${fetched!.messages.length}`);

  console.log("5. getLeadById() with a random UUID returns null...");
  const missing = await leadsService.getLeadById("00000000-0000-0000-0000-000000000000");
  assert(missing === null, "expected null for a non-existent id");

  console.log("6. deleteLead() succeeds while status is still NEW...");
  await leadsService.deleteLead(created!.id);
  const afterDelete = await leadsService.getLeadById(created!.id);
  assert(afterDelete === null, "expected the lead to be gone after delete");

  console.log("7. deleteLead() on a non-existent id throws LeadNotFoundError...");
  try {
    await leadsService.deleteLead(created!.id);
    throw new Error("expected deleteLead to throw for an already-deleted id");
  } catch (error) {
    assert(
      error instanceof leadsService.LeadNotFoundError,
      `expected LeadNotFoundError, got ${error}`
    );
  }

  console.log("8. deleteLead() on a CONTACTED lead throws LeadAlreadyContactedError...");
  const contactedImport = await leadsService.importLeads(
    Buffer.from("Name,Phone\nContacted Lead,+442079460958\n"),
    "verify-contacted.csv"
  );
  assert(contactedImport.imported === 1, "setup: expected the contacted-lead fixture to import");
  const contactedLead = await prisma.lead.findUniqueOrThrow({ where: { phone: "+442079460958" } });
  await prisma.lead.update({ where: { id: contactedLead.id }, data: { status: "CONTACTED" } });
  try {
    await leadsService.deleteLead(contactedLead.id);
    throw new Error("expected deleteLead to throw for a CONTACTED lead");
  } catch (error) {
    assert(
      error instanceof leadsService.LeadAlreadyContactedError,
      `expected LeadAlreadyContactedError, got ${error}`
    );
  }

  console.log("\nAll direct-call checks passed.");

  console.log("\nCleaning up rows created by this script...");
  await prisma.lead.deleteMany({
    where: { phone: { in: ["+14155552671", "+442079460958"] } },
  });
}

main()
  .catch((error) => {
    console.error("\nVERIFICATION FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
