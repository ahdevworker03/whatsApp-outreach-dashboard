import { Router } from "express";
import { receiveWebhookEvent, verifyWebhook } from "./whatsapp.controller";

// Mounted at /webhook (not under /api/v1) per docs/architecture/05-api-design.md:
// Meta requires a clean, fixed URL configured in the App Dashboard.
export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get("/", verifyWebhook);
whatsappWebhookRouter.post("/", receiveWebhookEvent);
