import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../lib/asyncHandler";
import * as leadsController from "./leads.controller";

// Mounted at /api/v1/leads (auth already applied by v1.routes.ts ahead of
// this router). Per docs/architecture/05-api-design.md section 3.
export const leadsRouter = Router();

// Memory storage: leads.service.ts's parsers (Steps 2-3) operate on Buffers,
// and import files here are small client spreadsheets, not large uploads —
// disk storage would be the production choice for large/high-volume uploads,
// neither of which applies to this single-user tool.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

leadsRouter.post("/import", upload.single("file"), asyncHandler(leadsController.importLeads));
leadsRouter.get("/", asyncHandler(leadsController.listLeads));
leadsRouter.get("/:id", asyncHandler(leadsController.getLeadById));
leadsRouter.delete("/:id", asyncHandler(leadsController.deleteLead));
