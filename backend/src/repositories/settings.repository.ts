import { prisma } from "../prisma/client";

// Settings persistence (M5 Step 1's first consumer: auto-reply pattern
// lookup). Prisma-only, per docs/rules/backend.md. docs/architecture/
// 04-database-design.md section 5: "The settings table always has exactly
// one row" — but nothing has seeded it yet as of M5 (confirmed: `select *
// from settings` returns 0 rows on the dev DB). Callers must handle `null`
// rather than assume the row exists; that's not this repository's call to
// make (no business decisions here).
export function getSettings() {
  return prisma.setting.findFirst();
}
