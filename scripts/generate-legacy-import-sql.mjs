import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "csv-parse/sync";

const downloadsDir = path.join(os.homedir(), "Downloads");
const donorsCsvPath = process.argv[2] ?? path.join(downloadsDir, "donors_rows.csv");
const photosCsvPath = process.argv[3] ?? path.join(downloadsDir, "photos_rows.csv");
const outputPath = process.argv[4] ?? path.join("tmp", "imports", "legacy_donors_photos_import.generated.sql");

for (const csvPath of [donorsCsvPath, photosCsvPath]) {
  if (!fs.existsSync(csvPath)) {
    console.error(`Missing CSV: ${csvPath}`);
    process.exit(1);
  }
}

function readCsv(csvPath, requiredColumn) {
  const source = fs.readFileSync(csvPath, "utf8");
  return parse(source, {
    columns: true,
    skip_empty_lines: false,
    bom: true
  }).filter((row) => String(row[requiredColumn] ?? "").trim() !== "");
}

const donorRows = readCsv(donorsCsvPath, "donor_id");
const photoRows = readCsv(photosCsvPath, "id").filter((row) => String(row.file_url ?? "").trim() !== "");

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  const text = String(value).trim();
  if (text === "") return "null";
  return `'${text.replaceAll("'", "''")}'`;
}

function sqlTimestamp(value) {
  const text = String(value ?? "").trim();
  return text ? `${sqlString(text)}::timestamptz` : "null";
}

function sqlJson(value) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}

function sqlBoolean(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "t", "yes", "y", "1"].includes(text)) return "true";
  if (["false", "f", "no", "n", "0"].includes(text)) return "false";
  return "false";
}

function sqlNumber(value) {
  const text = String(value ?? "").replaceAll(",", "").trim();
  if (!text) return "null";
  const number = Number(text);
  return Number.isFinite(number) ? String(number) : "null";
}

function inferContentType(fileUrl) {
  let pathname = fileUrl;
  try {
    pathname = new URL(fileUrl).pathname;
  } catch {
    // Keep the original string when legacy data is not a parseable URL.
  }

  const lower = pathname.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

const lines = [];
lines.push("-- Generated from local legacy donors_rows.csv and photos_rows.csv.");
lines.push("-- The source CSVs are intentionally not committed because they contain private contact and school data.");
lines.push("-- Run after migrations, and only against the intended Supabase project.");
lines.push("begin;");

for (const [index, row] of donorRows.entries()) {
  const rowNumber = index + 2;
  const donorId = String(row.donor_id).trim();
  const fullName = String(row.full_name ?? "").trim() || donorId;

  lines.push("");
  lines.push(`-- ${donorId}`);
  lines.push("insert into public.donors (");
  lines.push("  donor_id, full_name, email, phone, organization, amount_donated, anonymous,");
  lines.push("  additional_notes, source_import_filename, source_import_row_number, legacy_source_payload,");
  lines.push("  created_at, updated_at");
  lines.push(") values (");
  lines.push(`  ${sqlString(donorId)}, ${sqlString(fullName)}, ${sqlString(row.email)}, ${sqlString(row.phone)}, ${sqlString(row.organization)}, ${sqlNumber(row.amount_donated)}, ${sqlBoolean(row.anonymous)},`);
  lines.push(`  ${sqlString(row.additional_notes)}, 'donors_rows.csv', ${rowNumber}, ${sqlJson(row)},`);
  lines.push(`  coalesce(${sqlTimestamp(row.created_at)}, now()), coalesce(${sqlTimestamp(row.updated_at)}, now())`);
  lines.push(")");
  lines.push("on conflict (donor_id) do update set");
  lines.push("  full_name = excluded.full_name,");
  lines.push("  email = excluded.email,");
  lines.push("  phone = excluded.phone,");
  lines.push("  organization = excluded.organization,");
  lines.push("  amount_donated = excluded.amount_donated,");
  lines.push("  anonymous = excluded.anonymous,");
  lines.push("  additional_notes = excluded.additional_notes,");
  lines.push("  source_import_filename = excluded.source_import_filename,");
  lines.push("  source_import_row_number = excluded.source_import_row_number,");
  lines.push("  legacy_source_payload = excluded.legacy_source_payload,");
  lines.push("  updated_at = excluded.updated_at;");
}

for (const [index, row] of photoRows.entries()) {
  const rowNumber = index + 2;
  const photoId = String(row.id).trim();
  const schoolNumber = String(row.school_id ?? "").trim();
  const fileUrl = String(row.file_url ?? "").trim();
  const uploadedAt = String(row.uploaded_at ?? "").trim();
  const contentType = inferContentType(fileUrl);

  lines.push("");
  lines.push(`-- Photo ${photoId} ${schoolNumber}`);
  lines.push("with import_actor as (");
  lines.push("  select id");
  lines.push("  from public.profiles");
  lines.push("  where role in ('admin', 'manager')");
  lines.push("  order by case when role = 'admin' then 0 else 1 end, created_at asc");
  lines.push("  limit 1");
  lines.push("), matched_school as (");
  lines.push("  select id");
  lines.push("  from public.schools");
  lines.push(`  where school_number = ${sqlString(schoolNumber)}`);
  lines.push("  limit 1");
  lines.push(")");
  lines.push("insert into public.photos (");
  lines.push("  id, school_id, uploaded_by, photo_type, storage_bucket, storage_path, external_url,");
  lines.push("  content_type, caption, taken_at, approval_status, approved_by, approved_at, created_at,");
  lines.push("  source_import_filename, source_import_row_number, legacy_source_payload");
  lines.push(")");
  lines.push("select");
  lines.push(`  ${sqlString(photoId)}::uuid, matched_school.id, import_actor.id, 'other', 'legacy-external', ${sqlString(`legacy-external/${photoId}`)}, ${sqlString(fileUrl)},`);
  lines.push(`  ${sqlString(contentType)}, ${sqlString(`Imported legacy photo for ${schoolNumber}`)}, ${sqlTimestamp(uploadedAt)}, 'approved', import_actor.id, coalesce(${sqlTimestamp(uploadedAt)}, now()), coalesce(${sqlTimestamp(uploadedAt)}, now()),`);
  lines.push(`  'photos_rows.csv', ${rowNumber}, ${sqlJson(row)}`);
  lines.push("from import_actor");
  lines.push("left join matched_school on true");
  lines.push("on conflict (id) do update set");
  lines.push("  school_id = excluded.school_id,");
  lines.push("  external_url = excluded.external_url,");
  lines.push("  content_type = excluded.content_type,");
  lines.push("  caption = excluded.caption,");
  lines.push("  taken_at = excluded.taken_at,");
  lines.push("  approval_status = excluded.approval_status,");
  lines.push("  approved_by = excluded.approved_by,");
  lines.push("  approved_at = excluded.approved_at,");
  lines.push("  source_import_filename = excluded.source_import_filename,");
  lines.push("  source_import_row_number = excluded.source_import_row_number,");
  lines.push("  legacy_source_payload = excluded.legacy_source_payload;");
}

lines.push("");
lines.push("commit;");
lines.push("");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`Wrote ${outputPath}`);
console.log(`Donors: ${donorRows.length}`);
console.log(`Photos: ${photoRows.length}`);
