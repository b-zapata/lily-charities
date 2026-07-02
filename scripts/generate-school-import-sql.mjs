import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const csvPath = process.argv[2] ?? path.join("docs", "source_data", "schools_rows.csv");
const outputPath = process.argv[3] ?? path.join("tmp", "imports", "schools_import.generated.sql");

if (!fs.existsSync(csvPath)) {
  console.error(`Missing CSV: ${csvPath}`);
  process.exit(1);
}

const source = fs.readFileSync(csvPath, "utf8");
const rows = parse(source, {
  columns: true,
  skip_empty_lines: false,
  bom: true
}).filter((row) => String(row.school_id ?? "").trim() !== "");

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  const text = String(value).trim();
  if (text === "") return "null";
  return `'${text.replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}

function dataQualityFlags(row) {
  const flags = [];
  const notes = [];
  const gps = String(row.gps_coordinates ?? "").trim();
  if (gps === "") flags.push("missing_map_pin");
  else flags.push("invalid_gps_coordinates");
  if (String(row.address ?? "").trim() === "") flags.push("missing_address");
  if (String(row.total_students ?? "").trim() === "") flags.push("missing_total_students");
  if (gps !== "") notes.push(`Original gps_coordinates was not parseable: ${gps}`);
  return { import: { source: "schools_rows.csv", flags, notes } };
}

const lines = [];
lines.push("-- Generated from local docs/source_data/schools_rows.csv.");
lines.push("-- The source CSV is intentionally ignored by Git because it contains sensitive school/contact data.");
lines.push("begin;");

for (const [index, row] of rows.entries()) {
  const rowNumber = index + 2;
  const schoolNumber = String(row.school_id).trim();
  const schoolName = String(row.school_name_english ?? "").trim();
  lines.push("");
  lines.push(`-- ${schoolNumber} ${schoolName}`);
  lines.push("with inserted_school as (");
  lines.push("  insert into public.schools (");
  lines.push("    school_number, name, name_english, name_bangla, address, country,");
  lines.push("    donor_id, is_active, latitude, longitude, map_pin_source,");
  lines.push("    needs_map_pin_cleanup, data_quality_flags, summary_notes, created_source,");
  lines.push("    source_import_filename, source_import_row_number, legacy_source_payload");
  lines.push("  ) values (");
  lines.push(`    ${sqlString(schoolNumber)}, ${sqlString(schoolName)}, ${sqlString(row.school_name_english)}, ${sqlString(row.school_name_bangla)}, ${sqlString(row.address)}, 'Bangladesh',`);
  lines.push(`    ${sqlString(row.donor_id)}, true, null, null, 'import_missing',`);
  lines.push(`    true, ${sqlJson(dataQualityFlags(row))}, ${sqlString(row.additional_notes)}, 'import',`);
  lines.push(`    'schools_rows.csv', ${rowNumber}, ${sqlJson(row)}`);
  lines.push("  )");
  lines.push("  on conflict (school_number) do update set");
  lines.push("    name = excluded.name,");
  lines.push("    name_english = excluded.name_english,");
  lines.push("    name_bangla = excluded.name_bangla,");
  lines.push("    address = excluded.address,");
  lines.push("    donor_id = excluded.donor_id,");
  lines.push("    needs_map_pin_cleanup = excluded.needs_map_pin_cleanup,");
  lines.push("    data_quality_flags = excluded.data_quality_flags,");
  lines.push("    summary_notes = excluded.summary_notes,");
  lines.push("    source_import_filename = excluded.source_import_filename,");
  lines.push("    source_import_row_number = excluded.source_import_row_number,");
  lines.push("    legacy_source_payload = excluded.legacy_source_payload");
  lines.push("  returning id");
  lines.push(")");

  const contactStatements = [];
  if (String(row.principal_name ?? "").trim() !== "") {
    contactStatements.push({
      role: "principal",
      name: row.principal_name,
      phone: row.principal_phone,
      email: row.principal_email,
      title: "Principal"
    });
  }
  if ([row.lead_teacher_name, row.lead_teacher_phone, row.lead_teacher_email].some((value) => String(value ?? "").trim() !== "")) {
    contactStatements.push({
      role: "lead_teacher",
      name: row.lead_teacher_name || row.lead_teacher_phone || "Lead teacher",
      phone: row.lead_teacher_phone,
      email: row.lead_teacher_email,
      title: "Lead Teacher"
    });
  }
  if ([row.local_liaison_name, row.local_liaison_phone, row.local_liaison_email].some((value) => String(value ?? "").trim() !== "")) {
    contactStatements.push({
      role: "local_liaison",
      name: row.local_liaison_name || row.local_liaison_phone || "Local liaison",
      phone: row.local_liaison_phone,
      email: row.local_liaison_email,
      title: "Local Liaison"
    });
  }

  if (contactStatements.length === 0) {
    lines.push("select id from inserted_school;");
  } else {
    lines.push(",");
    lines.push("deleted_import_contacts as (");
    lines.push("  delete from public.school_contacts c");
    lines.push("  using inserted_school");
    lines.push("  where c.school_id = inserted_school.id");
    lines.push("    and c.notes = 'Imported from schools_rows.csv'");
    lines.push("  returning c.id");
    lines.push(")");
    lines.push("insert into public.school_contacts (school_id, role, name, phone, email, title, is_primary, notes, created_at, updated_at)");
    lines.push("select inserted_school.id, contact.role, contact.name, contact.phone, contact.email, contact.title, true, 'Imported from schools_rows.csv', now(), now()");
    lines.push("from inserted_school");
    lines.push("cross join (values");
    lines.push(contactStatements.map((contact) => {
      return `  (${sqlString(contact.role)}, ${sqlString(contact.name)}, ${sqlString(contact.phone)}, ${sqlString(contact.email)}, ${sqlString(contact.title)})`;
    }).join(",\n"));
    lines.push(") as contact(role, name, phone, email, title)");
    lines.push("where contact.name is not null;");
  }
}

lines.push("");
lines.push("select setval('public.school_number_seq', 216, true);");
lines.push("commit;");
lines.push("");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`Wrote ${outputPath}`);
