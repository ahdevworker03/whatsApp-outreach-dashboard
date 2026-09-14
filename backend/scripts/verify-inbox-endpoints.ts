/**
 * ONE-OFF VERIFICATION SCRIPT — not part of the app, delete after use.
 * Verifies M6 Step 1's read-only inbox endpoints (GET /api/v1/inbox,
 * GET /api/v1/inbox/:conversation_id) with real HTTP requests against the
 * real dev database, per this step's "Verification required" note.
 *
 * Builds its own minimal Express app (same router wiring as src/index.ts)
 * rather than importing index.ts, so it doesn't also start the follow-up
 * scheduler or bind a second long-running listener.
 */
import express from "express";
import { Server } from "http";
import { prisma } from "../src/prisma/client";
import { env } from "../src/config/env";
import { errorHandler } from "../src/middleware/errorHandler";
import { v1Router } from "../src/routes/v1.routes";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function main() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", v1Router);
  app.use(errorHandler);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as { port: number }).port;
  const base = `http://localhost:${port}/api/v1`;
  const headers = {
    Authorization: `Bearer ${env.apiAccessToken}`,
    "Content-Type": "application/json",
  };

  try {
    console.log("Seeding two conversations (one ACTIVE with 2 messages, one CLOSED)...");
    const campaign = await prisma.campaign.findFirst({ orderBy: { createdAt: "asc" } });
    assert(campaign, "expected a seeded campaign to exist (see M2 Step 5)");

    const leadA = await prisma.lead.create({
      data: { phone: "+15550003001", name: "Inbox Verify A", status: "REPLIED" },
    });
    const leadB = await prisma.lead.create({
      data: { phone: "+15550003002", name: "Inbox Verify B", status: "REPLIED" },
    });

    const olderAt = new Date(Date.now() - 60 * 60 * 1000);
    const newerAt = new Date();

    const convoA = await prisma.conversation.create({
      data: { leadId: leadA.id, status: "ACTIVE", lastMessageAt: olderAt },
    });
    const convoB = await prisma.conversation.create({
      data: { leadId: leadB.id, status: "CLOSED", lastMessageAt: newerAt },
    });

    await prisma.message.create({
      data: {
        leadId: leadA.id,
        campaignId: campaign.id,
        direction: "INBOUND",
        type: "TEXT",
        content: "Hi, interested",
        status: "RECEIVED",
        createdAt: olderAt,
      },
    });
    await prisma.message.create({
      data: {
        leadId: leadA.id,
        campaignId: campaign.id,
        direction: "OUTBOUND",
        type: "TEXT",
        content: "Thanks, will follow up",
        status: "SENT",
        sentAt: new Date(olderAt.getTime() + 1000),
      },
    });

    console.log("\n--- GET /inbox (no filter) ---");
    const listRes = await fetch(`${base}/inbox`, { headers });
    const listBody = await listRes.json();
    assert(listRes.status === 200, `expected 200, got ${listRes.status}: ${JSON.stringify(listBody)}`);
    assert(Array.isArray(listBody.conversations), "expected conversations array");
    assert(typeof listBody.total === "number", "expected numeric total");
    const ids = listBody.conversations.map((c: { id: string }) => c.id);
    assert(ids.includes(convoA.id) && ids.includes(convoB.id), "expected both seeded conversations");
    const idxB = ids.indexOf(convoB.id);
    const idxA = ids.indexOf(convoA.id);
    assert(idxB < idxA, "expected convoB (more recent lastMessageAt) before convoA (ordering check)");
    assert(listBody.conversations[0].lead?.phone, "expected lead included on list rows");
    console.log(`OK: ${listBody.total} conversations, ordered by last_message_at desc, lead included`);

    console.log("\n--- GET /inbox?status=CLOSED ---");
    const filteredRes = await fetch(`${base}/inbox?status=CLOSED`, { headers });
    const filteredBody = await filteredRes.json();
    assert(filteredRes.status === 200, `expected 200, got ${filteredRes.status}`);
    assert(
      filteredBody.conversations.every((c: { status: string }) => c.status === "CLOSED"),
      "expected only CLOSED conversations"
    );
    console.log(`OK: status filter returned ${filteredBody.conversations.length} CLOSED conversation(s)`);

    console.log("\n--- GET /inbox?page=1&limit=1 ---");
    const pagedRes = await fetch(`${base}/inbox?page=1&limit=1`, { headers });
    const pagedBody = await pagedRes.json();
    assert(pagedRes.status === 200, `expected 200, got ${pagedRes.status}`);
    assert(pagedBody.conversations.length === 1, `expected 1 row, got ${pagedBody.conversations.length}`);
    assert(pagedBody.total >= 2, "expected total to reflect full count, not page size");
    console.log("OK: pagination respected, total independent of page size");

    console.log(`\n--- GET /inbox/${convoA.id} ---`);
    const detailRes = await fetch(`${base}/inbox/${convoA.id}`, { headers });
    const detailBody = await detailRes.json();
    assert(detailRes.status === 200, `expected 200, got ${detailRes.status}`);
    assert(detailBody.lead?.messages?.length === 2, "expected 2 messages in full history");
    const directions = detailBody.lead.messages.map((m: { direction: string }) => m.direction);
    assert(
      JSON.stringify(directions) === JSON.stringify(["INBOUND", "OUTBOUND"]),
      `expected chronological [INBOUND, OUTBOUND], got ${JSON.stringify(directions)}`
    );
    console.log("OK: full message history returned in chronological order (both directions)");

    console.log("\n--- GET /inbox/<unknown-uuid> ---");
    const unknownId = "00000000-0000-0000-0000-000000000000";
    const notFoundRes = await fetch(`${base}/inbox/${unknownId}`, { headers });
    const notFoundBody = await notFoundRes.json();
    assert(notFoundRes.status === 404, `expected 404, got ${notFoundRes.status}`);
    assert(typeof notFoundBody.error === "string", "expected error message body");
    console.log("OK: unknown conversation_id returns 404");

    console.log("\n--- GET /inbox/<malformed-id> ---");
    const badIdRes = await fetch(`${base}/inbox/not-a-uuid`, { headers });
    assert(badIdRes.status === 400, `expected 400, got ${badIdRes.status}`);
    console.log("OK: malformed conversation_id returns 400");

    console.log("\n--- GET /inbox without bearer token ---");
    const noAuthRes = await fetch(`${base}/inbox`);
    assert(noAuthRes.status === 401, `expected 401, got ${noAuthRes.status}`);
    console.log("OK: missing bearer token returns 401 (auth middleware unaffected)");

    console.log("\nCleaning up seeded rows...");
    await prisma.conversation.deleteMany({ where: { id: { in: [convoA.id, convoB.id] } } });
    await prisma.message.deleteMany({ where: { leadId: { in: [leadA.id, leadB.id] } } });
    await prisma.lead.deleteMany({ where: { id: { in: [leadA.id, leadB.id] } } });

    console.log("\nALL CHECKS PASSED");
  } finally {
    server.close();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
