import { NextFunction, Request, Response } from "express";

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

  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
}
