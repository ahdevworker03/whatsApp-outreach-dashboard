import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import * as inboxController from "./inbox.controller";

// Mounted at /api/v1/inbox (auth already applied by v1.routes.ts ahead of
// this router). Per docs/architecture/05-api-design.md section 6.
export const inboxRouter = Router();

inboxRouter.get("/", asyncHandler(inboxController.listInbox));
inboxRouter.get("/:conversation_id", asyncHandler(inboxController.getInboxConversation));
inboxRouter.post("/:conversation_id/reply", asyncHandler(inboxController.replyToInbox));
