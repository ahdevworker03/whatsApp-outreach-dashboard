/**
 * ONE-OFF SCRIPT — generates the .xlsx test fixture for leadFileParser.test.ts.
 * Not part of the app; run once with `npx tsx scripts/gen-lead-fixture.ts`
 * whenever the fixture needs regenerating.
 */
import ExcelJS from "exceljs";

async function main() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");

  sheet.addRow(["Name", "Business Name", "Phone"]);
  sheet.addRow(["Jane Doe", "Acme Kitchens", "+1-415-555-2671"]);
  sheet.addRow(["John Smith", "", "+44 20 7946 0958"]);
  sheet.addRow(["", "Riverside Bakery", "+961 71 819 509"]);
  sheet.addRow(["Maria Lopez", "Lopez Consulting", ""]);

  await workbook.xlsx.writeFile("src/lib/__fixtures__/leads-sample.xlsx");
  console.log("written src/lib/__fixtures__/leads-sample.xlsx");
}

main();
