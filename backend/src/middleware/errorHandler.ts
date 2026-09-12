import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import {
  LeadAlreadyContactedError,
  LeadNotFoundError,
  UnsupportedLeadFileTypeError,
} from "../services/leads.service";
import { InvalidPhoneNumberError } from "../lib/phone";

// Global Express error handler per docs/architecture/03-backend-architecture.md:
// catches unhandled errors and returns a consistent JSON error response.
//
// Known domain errors (M3 Step 6) are mapped to their documented status code
// here rather than in each controller, per docs/rules/backend.md: "Let the
// global error handler serialize expected errors; do not re-serialize them
// in controllers."
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[error]", err);

  if (res.headersSent) {
    return;
  }

  if (err instanceof LeadNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof LeadAlreadyContactedError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err instanceof UnsupportedLeadFileTypeError || err instanceof InvalidPhoneNumberError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.message, code: err.code });
    return;
  }

  // Prisma's own error messages include file paths and source snippets —
  // fine for our logs above, not for an API response (M2 Step 7).
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "A record with this value already exists." });
      return;
    }
    res.status(500).json({ error: "Database error." });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
}
