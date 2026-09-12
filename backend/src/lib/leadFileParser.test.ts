import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseLeadsCsv, parseLeadsExcel } from "./leadFileParser";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

// Both fixtures encode the same four rows: a complete row, a row missing
// business name, a row missing name, and a row missing phone — proving
// missing/empty cells are handled the same way (undefined, not "" or a crash)
// regardless of source format.
const expectedRows = [
  { name: "Jane Doe", businessName: "Acme Kitchens", phone: "+1-415-555-2671" },
  { name: "John Smith", phone: "+44 20 7946 0958" },
  { businessName: "Riverside Bakery", phone: "+961 71 819 509" },
  { name: "Maria Lopez", businessName: "Lopez Consulting" },
];

describe("parseLeadsCsv", () => {
  it("parses a real sample .csv into the common intermediate structure", () => {
    const csv = readFileSync(path.join(FIXTURES_DIR, "leads-sample.csv"));
    expect(parseLeadsCsv(csv)).toEqual(expectedRows);
  });

  it("matches columns case-insensitively and ignores unrecognized columns", () => {
    const csv = "FULL NAME,Notes,PHONE\nAlex Chen,vip,+14155551212\n";
    expect(parseLeadsCsv(csv)).toEqual([{ name: "Alex Chen", phone: "+14155551212" }]);
  });

  it("returns an empty array for a header-only file", () => {
    expect(parseLeadsCsv("Name,Business Name,Phone\n")).toEqual([]);
  });
});

describe("parseLeadsExcel", () => {
  it("parses a real sample .xlsx into the same intermediate structure as the CSV", async () => {
    const xlsx = readFileSync(path.join(FIXTURES_DIR, "leads-sample.xlsx"));
    await expect(parseLeadsExcel(xlsx)).resolves.toEqual(expectedRows);
  });
});
