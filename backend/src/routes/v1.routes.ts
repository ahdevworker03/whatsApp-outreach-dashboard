import { Router } from "express";
import { requireApiAccessToken } from "../middleware/apiAuth";
import { leadsRouter } from "../leads/leads.routes";
import { campaignRouter } from "../campaigns/campaign.routes";
import { messagesRouter } from "../messages/messages.routes";

// Router for /api/v1/*. Every route here requires the bearer token per
// docs/architecture/05-api-design.md section 11.
export const v1Router = Router();

v1Router.use(requireApiAccessToken);

v1Router.use("/leads", leadsRouter);
v1Router.use("/campaign", campaignRouter);
v1Router.use("/messages", messagesRouter);
