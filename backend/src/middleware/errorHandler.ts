import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

// Global Express error handler per docs/architecture/03-backend-architecture.md:
// catches unhandled errors and returns a consistent JSON error response.
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
