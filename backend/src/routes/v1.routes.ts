import { Router } from "express";
import { requireApiAccessToken } from "../middleware/apiAuth";

// Router for /api/v1/*. Every route here requires the bearer token per
// docs/architecture/05-api-design.md section 11.
export const v1Router = Router();

v1Router.use(requireApiAccessToken);

// Placeholder route proving the auth gate works (M3 Step 1). Remove once
// Step 6 mounts the real /leads endpoints.
v1Router.get("/ping", (_req, res) => {
  res.status(200).json({ data: { pong: true } });
});
