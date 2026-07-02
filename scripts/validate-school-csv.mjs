import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const csvPath = process.argv[2] ?? path.join("docs", "source_data", "schools_rows.csv");

if (!fs.existsSync(csvPath)) {
  console.error(`Missing CSV: ${csvPath}`);
  process.exit(1);
}

const source = fs.readFileSync(csvPath, "utf8");
const rows = parse(source, {
  columns: true,
  skip_empty_lines: false,
  bom: true
});

const realRows = rows.filter((row) => String(row.school_id ?? "").trim() !== "");
const schoolIds = realRows.map((row) => row.school_id);
const duplicateIds = [...new Set(schoolIds.filter((id, index) => schoolIds.indexOf(id) !== index))];
const coordPattern = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const blankGps = realRows.filter((row) => String(row.gps_coordinates ?? "").trim() === "");
const coordinateGps = realRows.filter((row) => coordPattern.test(String(row.gps_coordinates ?? "")));
const addressLikeGps = realRows.filter((row) => {
  const value = String(row.gps_coordinates ?? "").trim();
  return value !== "" && !coordPattern.test(value);
});
const missingAddress = realRows.filter((row) => String(row.address ?? "").trim() === "");
const missingPrincipalName = realRows.filter((row) => String(row.principal_name ?? "").trim() === "");
const missingPrincipalPhone = realRows.filter((row) => String(row.principal_phone ?? "").trim() === "");
const missingTotalStudents = realRows.filter((row) => String(row.total_students ?? "").trim() === "");
const donorCounts = realRows.reduce((counts, row) => {
  const key = String(row.donor_id ?? "").trim() || "(blank)";
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});

const numericIds = schoolIds
  .map((id) => Number(String(id).replace(/^SCHOOL-/, "")))
  .filter((value) => Number.isFinite(value))
  .sort((a, b) => a - b);

const maxId = numericIds.at(-1) ?? 0;
const missingSequence = [];
for (let i = 1; i <= maxId; i += 1) {
  if (!numericIds.includes(i)) missingSequence.push(i);
}

const report = {
  file: csvPath,
  totalRows: rows.length,
  schoolRows: realRows.length,
  blankRows: rows.length - realRows.length,
  columns: rows[0] ? Object.keys(rows[0]) : [],
  firstSchoolId: schoolIds[0] ?? null,
  lastSchoolId: schoolIds.at(-1) ?? null,
  duplicateSchoolIds: duplicateIds,
  missingSequence,
  gps: {
    blank: blankGps.length,
    parseableCoordinates: coordinateGps.length,
    addressLike: addressLikeGps.length,
    needsMapPinCleanup: realRows.length - coordinateGps.length
  },
  missingFields: {
    address: missingAddress.length,
    principalName: missingPrincipalName.length,
    principalPhone: missingPrincipalPhone.length,
    totalStudents: missingTotalStudents.length
  },
  donorCounts
};

console.log(JSON.stringify(report, null, 2));

if (duplicateIds.length > 0) {
  console.error("Duplicate school_id values found.");
  process.exit(1);
}

if (realRows.length === 0) {
  console.error("No school rows found.");
  process.exit(1);
}
