import * as repo from "../repositories/settings.repository";

// Settings business logic (M7 Step 5 — GET/PATCH /api/v1/settings were
// documented in 05-api-design.md section 8 but never implemented in any
// prior milestone: M2's getSettings() is a read-only repository helper for
// the webhook's auto-reply lookup, not an HTTP endpoint, and M5's own
// milestone doc states the settings row was never seeded in the dev DB
// ("0 rows" — confirmed again here). docs/architecture/04-database-design.md
// section 5 states "the settings table always has exactly one row" as an
// invariant; getOrCreateSettings() establishes it on first access rather
// than requiring a separate seed step, the same way M2 seeded a placeholder
// campaign to satisfy the messages.campaign_id invariant elsewhere.

export async function getOrCreateSettings() {
  const existing = await repo.getSettings();
  if (existing) {
    return existing;
  }
  return repo.createDefaultSettings();
}

export interface UpdateSettingsInput {
  whatsappPhoneNumber?: string | null;
  whatsappPhoneNumberId?: string | null;
  autoReplyPatterns?: string[];
}

export async function updateSettings(input: UpdateSettingsInput) {
  const current = await getOrCreateSettings();
  return repo.updateSettings(current.id, input);
}
