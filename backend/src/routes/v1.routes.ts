import { Router } from "express";
import { requireApiAccessToken } from "../middleware/apiAuth";
import { leadsRouter } from "../leads/leads.routes";

// Router for /api/v1/*. Every route here requires the bearer token per
// docs/architecture/05-api-design.md section 11.
export const v1Router = Router();

v1Router.use(requireApiAccessToken);

v1Router.use("/leads", leadsRouter);
