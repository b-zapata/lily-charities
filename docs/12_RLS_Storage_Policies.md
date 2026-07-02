# RLS And Storage Policies

Status: Phase 1 technical design draft.

This document describes the intended Supabase Row-Level Security and Storage access model. Exact SQL policies should be implemented from this plan during backend foundation work.

## Roles

Roles live in `profiles.role`:

- `volunteer`: Android field user.
- `manager`: Web dashboard user.
- `admin`: Technical or system admin.

All policies should also require `profiles.is_active = true`.

## Helper Functions

Create security-definer helper functions:

- `current_profile_id()` returns `auth.uid()`.
- `current_role()` returns the current active profile role.
- `is_manager_or_admin()` returns true for active `manager` or `admin`.
- `is_volunteer()` returns true for active `volunteer`.

Avoid duplicating role lookup logic in every policy.

## Table Policy Matrix

| Table | Volunteer | Manager | Admin |
| --- | --- | --- | --- |
| `profiles` | Read own profile. Update limited own preferences only. | Read active users. Manage volunteer basics if needed. | Full management. |
| `schools` | Read active official schools. No direct insert/update/delete. | Read/create/update/archive official schools. | Same as manager plus admin cleanup. |
| `school_contacts` | Read contacts for active official schools. No direct mutation. | Create/update/archive contacts. | Full management. |
| `school_assessments` | Read approved assessments for active schools. No direct mutation. | Create/update via approval workflow or direct manager edit. | Full management. |
| `assessment_grade_counts` | Read via assessment access. No direct mutation. | Mutate with assessment. | Full management. |
| `school_agreements` | Read approved agreement status/metadata for active schools. Generated PDFs may be manager-only if desired. | Read/create/update after approval; download PDFs. | Full management. |
| `library_setups` | Read setup status for active schools. No direct mutation. | Create/update setup/training/operational milestones. | Full management. |
| `photos` | Read approved photos for active schools; read own pending/rejected uploads. Insert own pending metadata through controlled sync. | Read/review all photos. | Full management. |
| `change_requests` | Insert own requests. Read own requests and statuses. Update own drafts or resubmissions before review if allowed. | Read/review/update all requests. | Full management. |
| `change_request_comments` | Read/write comments on own requests. | Read/write comments on all requests. | Full management. |
| `audit_events` | No direct read by default, or read own request history through views. | Read all audit events. | Full management. |
| `mobile_devices` | Read/update own devices. | Read for support. | Full management. |
| `sync_batches` | Insert/read own sync batches. | Read for support. | Full management. |
| `export_jobs` | No access. | Create/read own exports; managers may read all exports if useful. | Full management. |

## Important Policy Rules

### Volunteers

Volunteers must never directly update official records:

- `schools`
- `school_contacts`
- `school_assessments`
- `assessment_grade_counts`
- `school_agreements`
- `library_setups`

Volunteer work enters the system through `change_requests`, pending `photos`, and sync support tables.

### Managers

Managers can update official records directly in the web dashboard. Manager direct edits should still write `audit_events`.

Manager review actions should preferably happen through RPC functions rather than manual table updates so that official writes, status updates, version increments, and audit events happen together.

### Pending Data

Pending volunteer data is visible to:

- The submitting volunteer.
- Managers/admins.

Pending data should not appear in official school views until approved.

### Rejected Data

Rejected requests remain visible to the submitting volunteer with `review_notes`.

Rejected photos should remain hidden from official galleries but visible in the submitter's submission history and manager review history.

## Recommended Views

Create read-optimized views for app and dashboard use:

- `active_school_summary_view`: active school list with school number, name, address, stage, outcome, pending request count, agreement status, and map-pin cleanup flag.
- `school_detail_view`: official school with primary contacts and setup summary.
- `manager_approval_queue_view`: pending/clarification requests with submitter and school display fields.
- `school_export_view`: flattened school/contact/setup fields for CSV/Excel export.

Use views to simplify clients, but keep RLS on base tables and/or use security-barrier views where needed.

## Storage Buckets

Recommended buckets:

| Bucket | Purpose | Public? |
| --- | --- | --- |
| `school-photos` | School, assessment, setup, training, optional student photos. | No |
| `agreement-evidence` | Signature images, seal/stamp photos, paper fallback photos. | No |
| `generated-agreements` | Server-generated official agreement PDFs. | No |

All buckets should be private.

## Storage Paths

Use deterministic paths so policies and cleanup are straightforward:

```text
school-photos/
  pending/{change_request_id}/{photo_id}.jpg
  schools/{school_id}/{photo_id}.jpg
  thumbnails/{photo_id}.jpg

agreement-evidence/
  pending/{change_request_id}/signature/{photo_id}.png
  pending/{change_request_id}/seal/{photo_id}.jpg
  pending/{change_request_id}/paper/{photo_id}.jpg
  agreements/{agreement_id}/signature/{photo_id}.png
  agreements/{agreement_id}/seal/{photo_id}.jpg
  agreements/{agreement_id}/paper/{photo_id}.jpg

generated-agreements/
  agreements/{agreement_id}/{terms_version}.pdf
```

## Storage Access Rules

Volunteers:

- Upload pending objects only for their own change requests.
- Read objects attached to their own pending/rejected requests.
- Read approved school photos for active schools.
- Do not read generated agreement PDFs by default unless Lily wants them visible in Android.

Managers:

- Read pending and approved media.
- Move/copy or re-associate objects during approval through server-side logic.
- Download generated PDFs.

Admins:

- Full storage access for maintenance.

## Server-Side Storage Operations

Approval should be server-controlled:

1. Volunteer uploads pending file.
2. Volunteer submits metadata in `photos`.
3. Manager approves related request.
4. Server updates `photos.approval_status`.
5. Server associates photo to official entity.
6. Optional: server moves object from pending path to official path, or leaves it in place and treats metadata as authoritative.

For MVP, leaving files in their original pending paths is acceptable if metadata is correct and access policies are safe.

## Audit Requirements

Create `audit_events` for:

- Manager direct school edits.
- Manager approval/rejection/partial approval.
- Lifecycle stage or outcome changes.
- Agreement approval and PDF generation.
- Import completion.
- Map pin cleanup completion.

Do not rely only on Supabase logs for product audit history.
