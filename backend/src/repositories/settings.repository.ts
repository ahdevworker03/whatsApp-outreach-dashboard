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

// M7 Step 5: establishes the "always exactly one row" invariant on first
// access — see settings.service.ts's getOrCreateSettings() for why this
// lives at access time rather than a separate seed step.
export function createDefaultSettings() {
  return prisma.setting.create({
    data: {
      whatsappPhoneNumber: null,
      whatsappPhoneNumberId: null,
      autoReplyPatterns: [],
    },
  });
}

export interface UpdateSettingsInput {
  whatsappPhoneNumber?: string | null;
  whatsappPhoneNumberId?: string | null;
  autoReplyPatterns?: string[];
}

export function updateSettings(id: string, data: UpdateSettingsInput) {
  return prisma.setting.update({
    where: { id },
    data: {
      ...(data.whatsappPhoneNumber !== undefined ? { whatsappPhoneNumber: data.whatsappPhoneNumber } : {}),
      ...(data.whatsappPhoneNumberId !== undefined ? { whatsappPhoneNumberId: data.whatsappPhoneNumberId } : {}),
      ...(data.autoReplyPatterns !== undefined ? { autoReplyPatterns: data.autoReplyPatterns } : {}),
    },
  });
}
