import { parsePhoneNumberWithError, ParseError } from "libphonenumber-js/max";
import type { CountryCode } from "libphonenumber-js/max";

// E.164 normalization for arbitrary import input (docs/architecture/04-database-design.md
// section 5: "Phone numbers are stored in E.164 format. Normalization happens at import
// time."). Unlike the webhook path (webhook.service.ts), which only ever receives Meta's
// already-clean, digits-only `from` field, spreadsheet input can be almost anything —
// dashes, spaces, parentheses, missing "+", local (non-international) formats.
//
// Library choice: `libphonenumber-js`, not hand-rolled regex (per this step's scope).
// It's a maintained, widely-used port of Google's libphonenumber with a much smaller
// footprint than the original, and covers exactly the messy-input cases this step lists
// (spacing/punctuation variants, missing "+", per-country length and prefix rules) that a
// custom regex would either miss or have to reimplement badly. Using the `/max` metadata
// build (not the default `/min`) because `isValid()` under `/min` only checks number
// length — `/max` also validates digit patterns per country, which is what "clearly invalid
// numbers are rejected" requires; `/min`'s looser check would let some invalid numbers
// through unnoticed at import time.
export class InvalidPhoneNumberError extends Error {
  constructor(
    public readonly input: string,
    reason: string
  ) {
    super(`Invalid phone number "${input}": ${reason}`);
    this.name = "InvalidPhoneNumberError";
  }
}

/**
 * Normalizes arbitrary phone number input to E.164 (e.g. "+14155552671").
 *
 * `defaultCountry` is used only to interpret a number with no leading "+"
 * (a local/national format) — an already-international number ("+..." or "00...")
 * is parsed from its own country code regardless of this option. There is no
 * single default country for this project's leads, so callers importing data
 * of unknown origin should omit it; local-format numbers without a "+" will
 * then be rejected rather than guessed at.
 *
 * Throws `InvalidPhoneNumberError` for anything unparseable or invalid —
 * never silently returns a malformed number.
 */
export function normalizePhoneNumber(raw: string, defaultCountry?: CountryCode): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new InvalidPhoneNumberError(raw, "empty");
  }

  let phoneNumber;
  try {
    phoneNumber = parsePhoneNumberWithError(trimmed, defaultCountry);
  } catch (error) {
    if (error instanceof ParseError) {
      throw new InvalidPhoneNumberError(raw, error.message);
    }
    throw error;
  }

  if (!phoneNumber.isValid()) {
    throw new InvalidPhoneNumberError(raw, "not a valid number");
  }

  return phoneNumber.number;
}
