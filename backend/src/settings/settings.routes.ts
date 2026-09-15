import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import * as settingsController from "./settings.controller";

// Mounted at /api/v1/settings (auth already applied by v1.routes.ts ahead of
// this router). Per docs/architecture/05-api-design.md section 8.
export const settingsRouter = Router();

settingsRouter.get("/", asyncHandler(settingsController.getSettings));
settingsRouter.patch("/", asyncHandler(settingsController.updateSettings));
