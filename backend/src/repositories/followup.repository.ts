import { prisma } from "../prisma/client";

// Persistence for the follow-up scheduler (M5 Step 3). Prisma-only, per
// docs/rules/backend.md — no business decisions here (the daily-limit check
// and the send itself live in followup.service.ts).

// "A lead where status = CONTACTED and followup1_due_at <= now and the
// lead's conversation (if any) is not automation_stopped" (this milestone's
// Step 3 Scope, verbatim). The OR handles leads with no conversation row yet
// (a reply never arrived) the same as one with automationStopped: false —
// both mean "nothing has stopped this sequence." `campaign` is included
// because the send needs its follow-up template id and delay hours.
export function findLeadsDueForFollowup1(now: Date) {
  return prisma.lead.findMany({
    where: {
      status: "CONTACTED",
      followup1DueAt: { lte: now },
      OR: [{ conversation: null }, { conversation: { automationStopped: false } }],
    },
    include: { campaign: true },
    orderBy: { followup1DueAt: "asc" },
  });
}

// Equivalent query for Follow-up #2, from FOLLOWUP_1_SENT.
export function findLeadsDueForFollowup2(now: Date) {
  return prisma.lead.findMany({
    where: {
      status: "FOLLOWUP_1_SENT",
      followup2DueAt: { lte: now },
      OR: [{ conversation: null }, { conversation: { automationStopped: false } }],
    },
    include: { campaign: true },
    orderBy: { followup2DueAt: "asc" },
  });
}

// On successful Follow-up #1 send: move to FOLLOWUP_1_SENT and schedule
// Follow-up #2 from the campaign's followup2_delay_hours (mirrors
// leads.repository.ts's markLeadContacted for the initial send).
export function markLeadFollowup1Sent(id: string, followup2DueAt: Date) {
  return prisma.lead.update({
    where: { id },
    data: { status: "FOLLOWUP_1_SENT", followup2DueAt },
  });
}

export function markLeadFollowup2Sent(id: string) {
  return prisma.lead.update({ where: { id }, data: { status: "FOLLOWUP_2_SENT" } });
}

// Step 3's interpretive decision: COMPLETED is set immediately after
// Follow-up #2 sends successfully, since nothing further is scheduled after
// it. Called right after markLeadFollowup2Sent, not instead of it, so the
// sequence's final two states both actually get written (this milestone's
// acceptance criteria: "moves to FOLLOWUP_2_SENT, then COMPLETED").
export function markLeadCompleted(id: string) {
  return prisma.lead.update({ where: { id }, data: { status: "COMPLETED" } });
}

// "A failed send sets... LeadStatus.FAILED, it does not reschedule itself"
// (Step 3's Explicit exclusions) — unconditional, no stage check, same
// pattern as webhook.repository.ts's markLeadReplied.
export function markLeadFailed(id: string) {
  return prisma.lead.update({ where: { id }, data: { status: "FAILED" } });
}
