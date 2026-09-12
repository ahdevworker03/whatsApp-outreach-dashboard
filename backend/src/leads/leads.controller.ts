import { Request, Response } from "express";
import { LeadStatus } from "@prisma/client";
import * as leadsService from "../services/leads.service";

// Thin, HTTP-focused controllers per docs/rules/backend.md — parsing/shaping
// the request and response only; the workflow lives in leads.service.ts.
// Wrapped by asyncHandler (src/lib/asyncHandler.ts) in leads.routes.ts, so a
// thrown/rejected error reaches errorHandler.ts instead of crashing the process.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function importLeads(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded. Expected a multipart 'file' field." });
    return;
  }

  const result = await leadsService.importLeads(req.file.buffer, req.file.originalname);
  res.status(201).json(result);
}

export async function listLeads(req: Request, res: Response): Promise<void> {
  const { status, page, limit } = req.query;

  if (typeof status === "string" && !Object.values(LeadStatus).includes(status as LeadStatus)) {
    res.status(400).json({ error: `Invalid status: ${status}` });
    return;
  }

  const result = await leadsService.listLeads({
    status: typeof status === "string" ? (status as LeadStatus) : undefined,
    page: parsePositiveInt(page),
    limit: parsePositiveInt(limit),
  });
  res.status(200).json(result);
}

export async function getLeadById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!UUID_PATTERN.test(id)) {
    res.status(400).json({ error: `Invalid lead id: ${id}` });
    return;
  }

  const lead = await leadsService.getLeadById(id);
  if (!lead) {
    res.status(404).json({ error: `Lead not found: ${id}` });
    return;
  }

  res.status(200).json(lead);
}

export async function deleteLead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!UUID_PATTERN.test(id)) {
    res.status(400).json({ error: `Invalid lead id: ${id}` });
    return;
  }

  await leadsService.deleteLead(id);
  res.status(200).json({ deleted: true });
}

function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
