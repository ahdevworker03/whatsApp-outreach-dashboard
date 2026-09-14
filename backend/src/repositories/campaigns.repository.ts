import { CampaignStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

// Campaign persistence (M4 Step 1). Prisma-only, per docs/rules/backend.md —
// no business decisions here (e.g. "only one ACTIVE campaign" is enforced in
// campaigns.service.ts, not here).

export interface NewCampaignInput {
  name: string;
  initialTemplateId: string;
  followup1TemplateId: string;
  followup1DelayHours: number;
  followup2TemplateId: string;
  followup2DelayHours: number;
  dailyLimit?: number;
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

export function createCampaign(data: NewCampaignInput) {
  return prisma.campaign.create({
    data: {
      name: data.name,
      status: "DRAFT",
      initialTemplateId: data.initialTemplateId,
      followup1TemplateId: data.followup1TemplateId,
      followup1DelayHours: data.followup1DelayHours,
      followup2TemplateId: data.followup2TemplateId,
      followup2DelayHours: data.followup2DelayHours,
      ...(data.dailyLimit !== undefined ? { dailyLimit: data.dailyLimit } : {}),
    },
  });
}

export function findCampaignById(id: string) {
  return prisma.campaign.findUnique({ where: { id } });
}

// The one campaign currently ACTIVE, if any — used both to enforce "only one
// ACTIVE campaign at a time" (docs/architecture/04-database-design.md section
// 5) and to answer GET /api/v1/campaign's "current" lookup.
export function findActiveCampaign() {
  return prisma.campaign.findFirst({ where: { status: "ACTIVE" } });
}

// Fallback for GET /api/v1/campaign when no campaign is ACTIVE: the most
// recently created DRAFT campaign, per docs/architecture/05-api-design.md
// section 4 ("Get the current active or draft campaign configuration").
export function findLatestDraftCampaign() {
  return prisma.campaign.findFirst({
    where: { status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });
}

export function updateCampaign(id: string, data: UpdateCampaignInput) {
  return prisma.campaign.update({ where: { id }, data });
}

export function setCampaignStatus(id: string, status: CampaignStatus) {
  return prisma.campaign.update({ where: { id }, data: { status } });
}

// Used by the activate/status guard to detect a conflicting ACTIVE campaign
// other than the one being acted on.
export function findOtherActiveCampaign(excludingId: string) {
  const where: Prisma.CampaignWhereInput = { status: "ACTIVE", id: { not: excludingId } };
  return prisma.campaign.findFirst({ where });
}
