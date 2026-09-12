import { InvalidPhoneNumberError, normalizePhoneNumber } from "./phone";
import type { ParsedLeadRow } from "./leadFileParser";

// Validates and deduplicates Step 3's parsed rows before persistence (Step 5).
// `leads.phone` is the only required/unique field on the Lead model (name and
// business_name are nullable) — see docs/architecture/04-database-design.md.
// The database's unique constraint on phone is a backstop, not a substitute
// for this: per docs/rules/database.md, "Database constraints complement
// application validation; they do not replace it" — duplicates and invalid
// rows need to be counted and reported back to the importer (M3's stated
// acceptance criteria), not just silently rejected by Postgres.

export interface ValidLeadRow {
  phone: string; // normalized E.164
  name?: string;
  businessName?: string;
}

export interface InvalidLeadRow {
  row: ParsedLeadRow;
  reason: string;
}

export interface DuplicateLeadRow {
  row: ParsedLeadRow;
  phone: string; // normalized E.164
  reason: "already exists" | "duplicate in file";
}

export interface LeadRowValidationResult {
  valid: ValidLeadRow[];
  invalid: InvalidLeadRow[];
  duplicates: DuplicateLeadRow[];
}

/**
 * `existingPhones` is the set of already-normalized E.164 phone numbers
 * currently in the `leads` table (Step 5's repository looks these up) — kept
 * as an input rather than a query here so this stays pure validation/dedup
 * logic with no persistence dependency, per this step's scope.
 */
export function validateLeadRows(
  rows: ParsedLeadRow[],
  existingPhones: ReadonlySet<string>
): LeadRowValidationResult {
  const valid: ValidLeadRow[] = [];
  const invalid: InvalidLeadRow[] = [];
  const duplicates: DuplicateLeadRow[] = [];
  const seenInFile = new Set<string>();

  for (const row of rows) {
    if (!row.phone) {
      invalid.push({ row, reason: "Missing phone number" });
      continue;
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhoneNumber(row.phone);
    } catch (error) {
      const reason = error instanceof InvalidPhoneNumberError ? error.message : "Invalid phone number";
      invalid.push({ row, reason });
      continue;
    }

    if (existingPhones.has(normalizedPhone)) {
      duplicates.push({ row, phone: normalizedPhone, reason: "already exists" });
      continue;
    }

    if (seenInFile.has(normalizedPhone)) {
      duplicates.push({ row, phone: normalizedPhone, reason: "duplicate in file" });
      continue;
    }
    seenInFile.add(normalizedPhone);

    valid.push({
      phone: normalizedPhone,
      name: row.name,
      businessName: row.businessName,
    });
  }

  return { valid, invalid, duplicates };
}
