# Technical Architecture

Status: Draft architecture outline.

This document captures the planned technical direction. Detailed Phase 1 implementation contracts live in:

- `11_Backend_Schema.md`
- `12_RLS_Storage_Policies.md`
- `13_Sync_Contracts.md`
- `14_Import_Plan.md`
- `15_Android_Local_Data.md`
- `16_Web_Dashboard_Technical_Plan.md`

## Planned Stack

### Backend

- Supabase.
- PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Row-Level Security.

### Android

- Kotlin.
- Jetpack Compose.
- Room.
- WorkManager.
- Hilt.
- Navigation Compose.

### Web

- Next.js.
- React.
- Tailwind CSS.
- TanStack Table or similar table library.

## Backend Responsibilities

- Store official school records.
- Store pending change requests.
- Enforce volunteer/manager/admin permissions.
- Store uploaded photos and agreement evidence.
- Generate agreement PDF snapshots from approved structured agreement data.
- Maintain audit history.
- Support CSV/Excel exports.

## Database

Primary entities are defined in `03_Data_Model.md`.

Expected MVP tables:

- `profiles`
- `schools`
- `school_contacts`
- `school_assessments`
- `assessment_grade_counts`
- `school_agreements`
- `library_setups`
- `photos`
- `change_requests`
- `audit_events`

Optional MVP tables:

- `change_request_comments`
- `export_jobs`
- `mobile_devices`
- `sync_batches`

## Permissions And RLS

RLS should enforce:

- Volunteers can read all approved active schools.
- Volunteers and managers can see school photos and any optional student photos in MVP.
- Pending or rejected photo visibility should still follow approval workflow status.
- Volunteers can create change requests.
- Volunteers can read their own submission statuses.
- Volunteers cannot directly update official school records.
- Managers can read and update official school records.
- Managers can review and resolve change requests.
- Admins can manage users and system settings.

Detailed policies are in `12_RLS_Storage_Policies.md`.

## Storage

Object storage should hold:

- School photos.
- Assessment photos.
- Agreement signature images.
- School seal/stamp photos.
- Paper agreement fallback photos.
- Generated agreement PDF snapshots.

The database should store metadata and storage paths. It should not store large binary files directly.

## Android Responsibilities

For MVP, the native Android app is volunteer-only. Managers may use a mobile app later, but manager mobile workflows should not block MVP delivery.

- Cache approved school data for offline use.
- Capture new schools, edits, assessments, agreements, and photos offline.
- Present the school agreement as a native app screen.
- Capture a required agreement signature, optional seal photo, and optional paper fallback photo.
- Support required map pin placement, with device GPS as an optional initial-location suggestion.
- Queue sync work through WorkManager.
- Show sync and submission status.

See `06_Offline_Sync.md` and `07_Android_App.md`.

## Web Responsibilities

For MVP, the web dashboard has role-filtered access:

- Managers/admins get the full operational dashboard.
- Volunteers get limited web access to Schools and Profile only.
- Volunteer-created schools and edits from the web dashboard must become `change_requests`, not direct writes to official tables.
- Manager/admin dashboard: schools table and details, direct official edits, approval queue, agreement review, photo review, user management, CSV/Excel export, and generated agreement PDF viewing/downloading.
- Volunteer dashboard: schools table/details, proposed new school, proposed school edits, and self profile management.

The left navigation and route-level checks should both enforce these boundaries.

See `08_Web_Dashboard.md`.

## Sync Architecture

Android should sync through a controlled server contract, not by directly mutating official tables.

Recommended pattern:

```text
Android local draft
    -> outbox mutation
    -> server validates request
    -> change_request created
    -> manager review
    -> official table update
```

Photo uploads may be multi-step:

```text
local file
    -> storage upload
    -> photo metadata
    -> change request context
```

## Agreement PDF Generation

Agreement capture is app-native. After manager approval:

1. Official structured agreement data is stored.
2. Required digital signature evidence is associated.
3. A PDF snapshot can be generated from the structured data.
4. The generated PDF path is stored on the agreement record.

PDF generation can be implemented server-side or through a trusted backend job. The Android app should not be responsible for generating the official PDF.

The app UI language and agreement language are separate. The generated agreement PDF should use the language selected for that agreement.

## Import Strategy

Before launch, existing spreadsheet data should be imported.

Recommended approach:

- Import existing schools as official records.
- Preserve existing Lily school numbers such as `SCHOOL-0020` in `schools.school_number`.
- Use internal UUIDs as primary keys; do not reuse legacy `school_id` values as database IDs.
- Preserve original source columns when useful.
- Import records with missing or invalid map pins as official records with cleanup flags instead of blocking launch.
- Flag uncertain or incomplete fields for manager cleanup.
- Normalize flat contact columns into `school_contacts`.
- Store current `donor_id` values on school records as nullable text for MVP.
- Validate Bangla text encoding before import; the full CSV appears valid, but earlier pasted samples were corrupted.
- Treat `gps_coordinates` as untrusted unless it parses as coordinates; the full CSV has 0 parseable coordinate pairs.
- Do not force volunteer approval for historical data unless Lily wants a review pass.

See `14_Import_Plan.md` for the full CSV profile and mapping.

## Environments

Recommended environments:

- Local development.
- Staging/pilot.
- Production.

MVP can start simple, but production data should not be mixed with development/testing data.

## Open Technical Questions

- How should generated PDFs be produced and stored?
- How large are expected photo uploads?
- Will Lily provide a separate coordinates source for existing schools, or should map pins be cleaned up manually over time?
