# Import Plan

Status: Phase 1 technical design draft.

This document defines how to import Lily's current flat schools table into the MVP database.

## Source File

Repository copy:

```text
docs/source_data/schools_rows.csv
```

Original provided path:

```text
C:\Users\bzapa\Downloads\schools_rows.csv
```

The repository copy should be treated as the current source sample for planning. Before production import, confirm whether this file is the final export or if Lily has a newer export.

## Source Profile

Observed CSV profile:

- 216 actual school records.
- One blank row.
- 21 columns.
- Continuous school numbers from `SCHOOL-0001` through `SCHOOL-0216`.
- No duplicate `school_id` values.
- No missing principal names.
- No missing principal phones.
- One missing address.
- One missing total student count.
- Bangla school names appear valid in the full CSV.
- Donor distribution:
  - `DONOR-0002`: 115 records.
  - `DONOR-0003`: 1 record.
  - Blank: 100 records.
- GPS/location quality:
  - 200 blank `gps_coordinates` values.
  - 16 address-like `gps_coordinates` values.
  - 0 parseable latitude/longitude coordinate pairs.

Import implication: all 216 imported schools should start with `needs_map_pin_cleanup = true` unless Lily provides a separate coordinates file.

## Source Columns

| Source column | Import handling |
| --- | --- |
| `school_id` | `schools.school_number`. Preserve exactly. |
| `school_name_english` | `schools.name_english` and default `schools.name`. |
| `school_name_bangla` | `schools.name_bangla`. |
| `total_students` | Preserve in `legacy_source_payload`; optionally seed `school_assessments.estimated_total_students` only if Lily wants imported counts treated as assessment data. |
| `address` | `schools.address`. |
| `gps_coordinates` | Do not import into latitude/longitude unless parseable. Current file has no parseable coordinate pairs. |
| `principal_name` | `school_contacts` row with role `principal`. |
| `principal_phone` | Principal contact phone. |
| `principal_email` | Principal contact email if present. |
| `lead_teacher_name` | `school_contacts` row with role `lead_teacher` if present. |
| `lead_teacher_phone` | Lead teacher phone. |
| `lead_teacher_email` | Lead teacher email. |
| `student_librarians` | Preserve in `legacy_source_payload`; no MVP individual student table. |
| `local_liaison_name` | `school_contacts` row with role `local_liaison` if present. |
| `local_liaison_phone` | Local liaison phone. |
| `local_liaison_email` | Local liaison email. |
| `donor_id` | `schools.donor_id`, nullable. |
| `additional_notes` | `schools.summary_notes`. |
| `date_installed` | `library_setups.bookshelf_installed_date` or `library_setups.operational_date` only after Lily confirms meaning. Preserve in payload for now. |
| `created_at` | Preserve as source metadata. Use for `schools.created_at` only if acceptable to Lily. |
| `updated_at` | Preserve as source metadata. Use for `schools.updated_at` only if acceptable to Lily. |

## Recommended Initial Import

For each nonblank CSV row:

1. Insert `schools`:
   - `school_number = school_id`.
   - `name = school_name_english`.
   - `name_english = school_name_english`.
   - `name_bangla = school_name_bangla`.
   - `address = address`.
   - `country = Bangladesh`.
   - `pipeline_stage = identified`.
   - `donor_id = nullif(trim(donor_id), '')`.
   - `is_active = true`.
   - `latitude = null`.
   - `longitude = null`.
   - `map_pin_source = import_missing`.
   - `needs_map_pin_cleanup = true`.
   - `data_quality_flags` includes `missing_map_pin` or `invalid_gps_coordinates`.
   - `summary_notes = additional_notes`.
   - `created_source = import`.
   - `source_import_filename = schools_rows.csv`.
   - `source_import_row_number = CSV row number`.
   - `legacy_source_payload = full original row as JSON`.

2. Insert `school_contacts`:
   - Always insert principal contact because source has principal name and phone on all real rows.
   - Insert lead teacher only when any lead teacher field is present.
   - Insert local liaison only when any local liaison field is present.
   - Mark imported contacts with `notes = Imported from schools_rows.csv`.
   - On rerun, replace only contacts with that exact import note for the school, so the import does not duplicate historical contacts.

3. Defer `school_assessments`:
   - The CSV is not the full official initial assessment.
   - Do not create official initial assessments from the CSV unless Lily confirms these values should count as assessment data.

4. Defer `library_setups`:
   - Only one row has `date_installed`.
   - Preserve date in source payload until Lily confirms meaning.

5. Set school number sequence:
   - After import, set `school_number_seq` so the next generated number is `SCHOOL-0217`.

## Data Quality Flags

Recommended flag format in `schools.data_quality_flags`:

```json
{
  "import": {
    "source": "schools_rows.csv",
    "flags": ["missing_map_pin"],
    "notes": []
  }
}
```

Use:

- `missing_map_pin` when `gps_coordinates` is blank.
- `invalid_gps_coordinates` when `gps_coordinates` contains non-coordinate text.
- `missing_address` for the one row missing address.
- `missing_total_students` for the one row missing total students, if total is imported anywhere.

## Cleanup Workflow

Managers should have a dashboard filter for `needs_map_pin_cleanup`.

Cleanup can happen in two ways:

1. Manager edits the official school map pin in the web dashboard.
2. Volunteer proposes a map pin edit from the Android app, which manager approves.

When cleanup is complete:

- Set `latitude` and `longitude`.
- Set `map_pin_confirmed_at`.
- Set `map_pin_confirmed_by`.
- Set `map_pin_source`.
- Set `needs_map_pin_cleanup = false`.
- Remove or mark resolved the map-pin flag in `data_quality_flags`.
- Write an `audit_events` row.

## Import QA Checklist

Before production import:

- Confirm source CSV row count with Lily.
- Confirm whether the blank row should be ignored.
- Confirm Bangla names render correctly in staging.
- Confirm donor IDs should remain on school records as nullable text.
- Confirm `date_installed` meaning.
- Confirm no duplicate `school_id` values.
- Confirm no school numbers beyond `SCHOOL-0216` in newer exports.
- Run import in staging first.
- Compare staging count to source count.
- Spot-check at least 10 schools with managers.
- Verify dashboard filters for donor, school number, missing map pin, and active schools.

## Production Import Recommendation

Import historical schools directly as official records. Do not route them through volunteer approval.

This is historical manager-owned data, not a new field submission. Cleanup flags are enough to make uncertainty visible without blocking MVP launch.
