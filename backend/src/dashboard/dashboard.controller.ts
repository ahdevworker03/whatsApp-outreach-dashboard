import { Request, Response } from "express";
import { prisma } from "../prisma/client";

export async function getStats(req: Request, res: Response) {
  const [
    totalLeads,
    contacted,
    replied,
    waitingForFollowup,
    completed,
    failed
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: { not: "NEW" } } }),
    prisma.lead.count({ where: { status: "REPLIED" } }),
    prisma.lead.count({ where: { status: { in: ["FOLLOWUP_1_SENT", "FOLLOWUP_2_SENT"] } } }),
    prisma.lead.count({ where: { status: "COMPLETED" } }),
    prisma.lead.count({ where: { status: "FAILED" } })
  ]);

  res.json({
    total_leads: totalLeads,
    contacted,
    replied,
    waiting_for_followup: waitingForFollowup,
    completed,
    failed
  });
}
