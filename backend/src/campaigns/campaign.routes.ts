import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import * as campaignController from "./campaign.controller";

// Mounted at /api/v1/campaign (auth already applied by v1.routes.ts ahead of
// this router). Per docs/architecture/05-api-design.md section 4.
export const campaignRouter = Router();

campaignRouter.get("/", asyncHandler(campaignController.getCurrentCampaign));
campaignRouter.post("/", asyncHandler(campaignController.createCampaign));
campaignRouter.patch("/:id", asyncHandler(campaignController.updateCampaign));
campaignRouter.patch("/:id/status", asyncHandler(campaignController.setCampaignStatus));
