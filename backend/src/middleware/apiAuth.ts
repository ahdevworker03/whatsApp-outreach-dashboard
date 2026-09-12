import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

// Bearer-token gate for /api/v1/* per docs/architecture/05-api-design.md
// section 11. Single-user project — a shared static token is sufficient,
// this is not a full auth system. Does not apply to /webhook, which is
// secured separately via Meta's own hub.verify_token.
export function requireApiAccessToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token || token !== env.apiAccessToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
