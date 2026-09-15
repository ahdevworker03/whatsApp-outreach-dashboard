import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import * as dashboardController from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", asyncHandler(dashboardController.getStats));
