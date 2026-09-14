import { CampaignStatus } from "@prisma/client";
import * as repo from "../repositories/campaigns.repository";

// Campaign business rules (M4 Step 1). Plain Error subclasses per
// docs/rules/backend.md — no shared AppError class in this repo; controllers
// (Step 2) map these to HTTP status codes via errorHandler.ts.
export class CampaignNotFoundError extends Error {
  constructor(id: string) {
    super(`Campaign not found: ${id}`);
    this.name = "CampaignNotFoundError";
  }
}

// Thrown when trying to update/edit a campaign that is currently ACTIVE.
// docs/architecture/05-api-design.md section 4: "Update campaign
// configuration. Not allowed if campaign is ACTIVE."
export class CampaignActiveError extends Error {
  constructor(id: string) {
    super(`Campaign ${id} is ACTIVE and cannot be modified. Pause or archive it first.`);
    this.name = "CampaignActiveError";
  }
}

// Thrown when activating a campaign while a different campaign already has
// status ACTIVE. docs/architecture/04-database-design.md section 5: "Only
// one campaign can have status ACTIVE at a time. Enforced in application
// logic." — this constraint is about the ACTIVE state itself, not about how
// many campaigns may exist, so it's enforced only at activation time (see
// setCampaignStatus below), not at creation time.
export class AnotherCampaignActiveError extends Error {
  constructor(activeCampaignId: string) {
    super(
      `Campaign ${activeCampaignId} is already ACTIVE. Pause or archive it before activating another.`
    );
    this.name = "AnotherCampaignActiveError";
  }
}

export interface CreateCampaignInput {
  name: string;
  initialTemplateId: string;
  followup1TemplateId: string;
  followup1DelayHours: number;
  followup2TemplateId: string;
  followup2DelayHours: number;
  dailyLimit?: number;
}

// New campaigns are always created as DRAFT (docs/architecture/04-database-
// design.md's CampaignStatus enum: DRAFT — "not yet active"). Creating a
// DRAFT campaign is always allowed, regardless of whether another campaign
// is currently ACTIVE — docs/architecture/04-database-design.md section 5's
// "only one campaign can have status ACTIVE at a time" constraint is about
// the ACTIVE state, not about how many campaigns may exist, and enforcing it
// here would block a real workflow (preparing a next campaign while the
// current one is still running). The "(only one ACTIVE campaign allowed)"
// annotation on POST /campaign in docs/architecture/05-api-design.md section
// 4 was previously read as a create-time guard; that reading is corrected
// here — the one-ACTIVE-at-a-time rule is enforced only at activation time,
// in setCampaignStatus below.
export async function createCampaign(input: CreateCampaignInput) {
  return repo.createCampaign(input);
}

// docs/architecture/05-api-design.md section 4: "Get the current active or
// draft campaign configuration." ACTIVE takes priority; if none is ACTIVE,
// fall back to the most recently created DRAFT campaign. Returns null if
// neither exists (no campaign at all) — not documented as an explicit case,
// but the placeholder row from M2 means this is not expected to bite in
// practice; the controller (Step 2) maps null to 404.
export async function getCurrentCampaign() {
  const active = await repo.findActiveCampaign();
  if (active) {
    return active;
  }
  return repo.findLatestDraftCampaign();
}

export interface UpdateCampaignInput {
  name?: string;
  initialTemplateId?: string;
  followup1TemplateId?: string;
  followup1DelayHours?: number;
  followup2TemplateId?: string;
  followup2DelayHours?: number;
  dailyLimit?: number;
}

export async function updateCampaign(id: string, input: UpdateCampaignInput) {
  const campaign = await repo.findCampaignById(id);
  if (!campaign) {
    throw new CampaignNotFoundError(id);
  }
  if (campaign.status === "ACTIVE") {
    throw new CampaignActiveError(id);
  }
  return repo.updateCampaign(id, input);
}

// PATCH /api/v1/campaign/:id/status. docs/architecture/05-api-design.md
// section 4 gives DRAFT -> ACTIVE, ACTIVE -> PAUSED as examples, not an
// exhaustive state machine, so any status value is accepted here except that
// moving to ACTIVE is rejected while a different campaign already holds it —
// the one documented constraint (docs/architecture/04-database-design.md
// section 5). This is an interpretive choice, flagged per project.md's
// Repository Truth policy rather than silently inventing a stricter
// transition table the docs don't specify.
export async function setCampaignStatus(id: string, status: CampaignStatus) {
  const campaign = await repo.findCampaignById(id);
  if (!campaign) {
    throw new CampaignNotFoundError(id);
  }

  if (status === "ACTIVE") {
    const other = await repo.findOtherActiveCampaign(id);
    if (other) {
      throw new AnotherCampaignActiveError(other.id);
    }
  }

  return repo.setCampaignStatus(id, status);
}
