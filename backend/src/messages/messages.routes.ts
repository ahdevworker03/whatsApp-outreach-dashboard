import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import * as messagesController from "./messages.controller";

// Mounted at /api/v1/messages (auth already applied by v1.routes.ts ahead of
// this router). Per docs/architecture/05-api-design.md section 5.
export const messagesRouter = Router();

messagesRouter.post("/send", asyncHandler(messagesController.sendInitialTemplate));
