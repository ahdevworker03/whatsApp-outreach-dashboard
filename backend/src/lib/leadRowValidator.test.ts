import { describe, expect, it } from "vitest";
import { validateLeadRows } from "./leadRowValidator";
import type { ParsedLeadRow } from "./leadFileParser";

describe("validateLeadRows", () => {
  it("accepts valid rows and normalizes their phone to E.164", () => {
    const rows: ParsedLeadRow[] = [
      { name: "Jane Doe", businessName: "Acme Kitchens", phone: "+1-415-555-2671" },
    ];

    const result = validateLeadRows(rows, new Set());

    expect(result.valid).toEqual([
      { phone: "+14155552671", name: "Jane Doe", businessName: "Acme Kitchens" },
    ]);
    expect(result.invalid).toEqual([]);
    expect(result.duplicates).toEqual([]);
  });

  it("rejects a row with a missing phone number, and counts it", () => {
    const rows: ParsedLeadRow[] = [{ name: "No Phone" }];

    const result = validateLeadRows(rows, new Set());

    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([{ row: rows[0], reason: "Missing phone number" }]);
  });

  it("rejects a row with an unparseable/invalid phone number, and counts it", () => {
    const rows: ParsedLeadRow[] = [{ name: "Bad Phone", phone: "not a number" }];

    const result = validateLeadRows(rows, new Set());

    expect(result.valid).toEqual([]);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].row).toBe(rows[0]);
    expect(result.invalid[0].reason).toMatch(/invalid phone number/i);
  });

  it("detects a row matching an existing lead's phone as a duplicate, not a new lead", () => {
    const rows: ParsedLeadRow[] = [{ name: "Existing Lead", phone: "+14155552671" }];
    const existingPhones = new Set(["+14155552671"]);

    const result = validateLeadRows(rows, existingPhones);

    expect(result.valid).toEqual([]);
    expect(result.duplicates).toEqual([
      { row: rows[0], phone: "+14155552671", reason: "already exists" },
    ]);
  });

  it("detects a second row in the same file with the same phone as a duplicate", () => {
    const rows: ParsedLeadRow[] = [
      { name: "First", phone: "+1-415-555-2671" },
      { name: "Second", phone: "+1 (415) 555-2671" },
    ];

    // Different formatting/punctuation, same underlying number once normalized.
    const result = validateLeadRows(rows, new Set());

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].name).toBe("First");
    expect(result.duplicates).toEqual([
      { row: rows[1], phone: "+14155552671", reason: "duplicate in file" },
    ]);
  });

  it("handles a realistic mixed batch: valid, invalid, and both duplicate kinds together", () => {
    const rows: ParsedLeadRow[] = [
      { name: "Valid Lead", phone: "+14155552671" },
      { name: "Missing Phone" },
      { name: "Bad Phone", phone: "garbage" },
      { name: "Already In DB", phone: "+442079460958" },
      { name: "Repeated In File", phone: "+14155552671" },
    ];
    const existingPhones = new Set(["+442079460958"]);

    const result = validateLeadRows(rows, existingPhones);

    expect(result.valid.map((row) => row.name)).toEqual(["Valid Lead"]);
    expect(result.invalid).toHaveLength(2);
    expect(result.duplicates).toHaveLength(2);
    expect(result.duplicates.find((duplicate) => duplicate.row.name === "Already In DB")?.reason).toBe(
      "already exists"
    );
    expect(
      result.duplicates.find((duplicate) => duplicate.row.name === "Repeated In File")?.reason
    ).toBe("duplicate in file");
  });
});
