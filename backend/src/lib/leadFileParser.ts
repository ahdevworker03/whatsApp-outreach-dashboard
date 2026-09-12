import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";

// Parses an uploaded leads file (CSV or Excel) into a common intermediate row
// structure, before any validation/dedup/persistence (those are Steps 4-5).
// Column headers are matched case-insensitively against the aliases below,
// so a client-provided file doesn't have to use our exact field names.

export interface ParsedLeadRow {
  name?: string;
  businessName?: string;
  phone?: string;
}

const HEADER_ALIASES: Record<keyof ParsedLeadRow, string[]> = {
  name: ["name", "full name", "contact name", "lead name"],
  businessName: ["business name", "business", "company", "company name"],
  phone: ["phone", "phone number", "mobile", "mobile number", "whatsapp", "whatsapp number"],
};

// Case/spacing-insensitive: "Business_Name", "Business-Name" and "business name"
// all normalize to the same key before matching against HEADER_ALIASES.
function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

// Maps each raw column header to the ParsedLeadRow field it represents, or
// undefined for an unrecognized column (ignored, rather than rejected —
// validation of what's required happens in Step 4).
function resolveHeaderFields(headers: string[]): (keyof ParsedLeadRow | undefined)[] {
  const normalized = headers.map(normalizeHeader);
  return normalized.map((header) => {
    const match = (Object.keys(HEADER_ALIASES) as (keyof ParsedLeadRow)[]).find((field) =>
      HEADER_ALIASES[field].includes(header)
    );
    return match;
  });
}

function cellToString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  // ExcelJS can hand back rich objects instead of plain scalars for
  // hyperlinks, formulas, and dates — extract the human-readable text.
  if (typeof value === "object") {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if ("text" in value && typeof (value as { text: unknown }).text === "string") {
      return (value as { text: string }).text;
    }
    if ("result" in value) {
      return cellToString((value as { result: unknown }).result);
    }
    return undefined;
  }

  const stringValue = String(value).trim();
  return stringValue === "" ? undefined : stringValue;
}

export function parseLeadsCsv(input: Buffer | string): ParsedLeadRow[] {
  const records: string[][] = parse(input, {
    trim: true,
    skip_empty_lines: true,
  });

  if (records.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = records;
  const fields = resolveHeaderFields(headerRow);

  return dataRows.map((row) => {
    const parsedRow: ParsedLeadRow = {};
    fields.forEach((field, index) => {
      if (!field) {
        return;
      }
      const value = cellToString(row[index]);
      if (value !== undefined) {
        parsedRow[field] = value;
      }
    });
    return parsedRow;
  });
}

export async function parseLeadsExcel(input: Buffer): Promise<ParsedLeadRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(input as unknown as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cellToString(cell.value) ?? "";
  });
  const fields = resolveHeaderFields(headers.slice(1));

  const parsedRows: ParsedLeadRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const parsedRow: ParsedLeadRow = {};
    fields.forEach((field, index) => {
      if (!field) {
        return;
      }
      const value = cellToString(row.getCell(index + 1).value);
      if (value !== undefined) {
        parsedRow[field] = value;
      }
    });
    parsedRows.push(parsedRow);
  });

  return parsedRows;
}
