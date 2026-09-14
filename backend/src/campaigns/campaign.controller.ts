import { Request, Response } from "express";
import { CampaignStatus } from "@prisma/client";
import * as campaignsService from "../services/campaigns.service";

// Thin, HTTP-focused controllers per docs/rules/backend.md — parsing/shaping
// the request and response only; the workflow lives in campaigns.service.ts.
// Wrapped by asyncHandler (src/lib/asyncHandler.ts) in campaign.routes.ts.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCurrentCampaign(_req: Request, res: Response): Promise<void> {
  const campaign = await campaignsService.getCurrentCampaign();
  if (!campaign) {
    res.status(404).json({ error: "No campaign configured yet." });
    return;
  }
  res.status(200).json(campaign);
}

export async function createCampaign(req: Request, res: Response): Promise<void> {
  const body = req.body ?? {};
  const missing = REQUIRED_FIELDS.filter((field) => body[field] === undefined || body[field] === null);
  if (missing.length > 0) {
    res.status(400).json({ error: `Missing required field(s): ${missing.join(", ")}` });
    return;
  }

  const campaign = await campaignsService.createCampaign({
    name: body.name,
    initialTemplateId: body.initial_template_id,
    followup1TemplateId: body.followup1_template_id,
    followup1DelayHours: body.followup1_delay_hours,
    followup2TemplateId: body.followup2_template_id,
    followup2DelayHours: body.followup2_delay_hours,
    dailyLimit: body.daily_limit,
  });
  res.status(201).json(campaign);
}

export async function updateCampaign(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!UUID_PATTERN.test(id)) {
    res.status(400).json({ error: `Invalid campaign id: ${id}` });
    return;
  }

  const body = req.body ?? {};
  const campaign = await campaignsService.updateCampaign(id, {
    name: body.name,
    initialTemplateId: body.initial_template_id,
    followup1TemplateId: body.followup1_template_id,
    followup1DelayHours: body.followup1_delay_hours,
    followup2TemplateId: body.followup2_template_id,
    followup2DelayHours: body.followup2_delay_hours,
    dailyLimit: body.daily_limit,
  });
  res.status(200).json(campaign);
}

const KNOWN_STATUSES = new Set(Object.values(CampaignStatus));

export async function setCampaignStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!UUID_PATTERN.test(id)) {
    res.status(400).json({ error: `Invalid campaign id: ${id}` });
    return;
  }

  const { status } = req.body ?? {};
  if (typeof status !== "string" || !KNOWN_STATUSES.has(status as CampaignStatus)) {
    res.status(400).json({ error: `Invalid status: ${status}` });
    return;
  }

  const campaign = await campaignsService.setCampaignStatus(id, status as CampaignStatus);
  res.status(200).json(campaign);
}

// docs/architecture/05-api-design.md section 4's POST /campaign request body:
// name, initial_template_id, followup1_template_id, followup1_delay_hours,
// followup2_template_id, followup2_delay_hours, daily_limit (daily_limit is
// optional — the schema defaults it to 150).
const REQUIRED_FIELDS = [
  "name",
  "initial_template_id",
  "followup1_template_id",
  "followup1_delay_hours",
  "followup2_template_id",
  "followup2_delay_hours",
] as const;
