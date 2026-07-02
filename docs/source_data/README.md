# Source Data

Status: Internal source-data notes.

This folder contains source files used for planning and import design. These files should be treated as source inputs, not generated outputs.

## Files

| File | Source | Notes |
| --- | --- | --- |
| `schools_rows.csv` | Copied locally from `C:\Users\bzapa\Downloads\schools_rows.csv`. | Full current Lily schools table export for Phase 1 planning. This file contains sensitive school/contact data and is intentionally ignored by Git. |

## Current CSV Profile

The local `schools_rows.csv` contains:

- 216 actual school records.
- One blank/empty CSV row.
- 21 columns.
- School numbers from `SCHOOL-0001` through `SCHOOL-0216`.
- No duplicate `school_id` values.
- No missing principal names.
- No missing principal phone values.
- One missing address.
- One missing `total_students` value.
- Donor values:
  - `DONOR-0002`: 115 records.
  - `DONOR-0003`: 1 record.
  - Blank donor value: 100 records.
- `gps_coordinates` values:
  - 200 blank.
  - 16 address-like values.
  - 0 parseable latitude/longitude values.

Import implication: every imported school should be marked with `needs_map_pin_cleanup = true` unless Lily provides a separate coordinates source.

The full CSV appears to preserve Bangla school names correctly as UTF-8. Earlier pasted samples appeared encoding-corrupted, so import QA should still include an encoding check.
