# Web Dashboard Technical Plan

Status: Phase 1 technical design draft.

This document outlines the manager-only web dashboard implementation plan.

## Stack

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- Supabase client/server helpers.
- TanStack Table or similar for dense manager tables.

## Routes

Recommended route structure:

| Route | Purpose |
| --- | --- |
| `/login` | Manager login. |
| `/schools` | Main schools table. |
| `/schools/new` | Manager-created official school. |
| `/schools/[id]` | School details. |
| `/schools/[id]/edit` | Direct manager edit. |
| `/approvals` | Approval queue. |
| `/approvals/[id]` | Review change request. |
| `/exports` | CSV/Excel export screen. |
| `/users` | Basic user management. |
| `/settings` | Lightweight admin/settings if needed. |

Web dashboard is manager-only for MVP. Volunteers should not use the web dashboard.

## Schools Table

Primary query should use `active_school_summary_view`.

Columns:

- School number.
- School name.
- Bangla/English name if useful.
- Address/area.
- District.
- Pipeline stage.
- Selection outcome.
- Donor ID.
- Needs map pin cleanup.
- Initial assessment status/date.
- Agreement status.
- Pending approvals count.
- Last updated.

Filters:

- Search by school number, school name, contact, or address.
- Pipeline stage.
- Selection outcome.
- District/area.
- Donor ID.
- Missing assessment.
- Missing approved agreement.
- Needs map pin cleanup.
- Pending change requests.
- Pending photo approvals.

Actions:

- Open school details.
- Create school.
- Export filtered results.

## School Details

Sections:

- Overview.
- Contacts.
- Assessment.
- Agreement.
- Library setup.
- Photos.
- Change history.

Actions:

- Edit official school.
- Assign/edit school number.
- Add or update map pin.
- Clear map pin cleanup flag when coordinates are confirmed.
- Update lifecycle stage.
- Update selection outcome.
- Add manager notes.
- View pending requests for school.
- Export school detail if needed.

## Approval Queue

Primary query should use `manager_approval_queue_view`.

Columns:

- Request type.
- School number/name.
- Submitted by.
- Submitted at.
- Status.
- Conflict flag.
- Component summary.

Filters:

- Request type.
- Status.
- Submitter.
- Date range.
- School.
- Conflict detected.

Actions:

- Open review.
- Approve.
- Reject.
- Mark needs clarification.

Bulk approval is not recommended for MVP.

## Change Request Review

Review page requirements:

- Show current official values.
- Show volunteer proposed values.
- Show manager-editable proposed/applied values.
- Show photos and agreement evidence in context.
- Show conflict warning when `conflict_detected = true`.
- Allow component-level partial approval.
- Capture one overall manager note/rejection reason for MVP.
- Write audit event on decision.

Manager decision should call `manager_review_change_request`, not manually update official tables from the client.

## Agreement Review

Show:

- School number/name.
- Agreement language.
- Exact terms version.
- Signatory name/title.
- Authority confirmation.
- Terms acceptance.
- Signature image.
- Optional seal/stamp photo.
- Optional paper fallback photo.

Actions:

- Approve agreement.
- Reject with reason.
- Request clarification.
- Generate or download PDF after approval.

## Photos

Photos should usually be reviewed in context:

- Initial assessment photos inside assessment review.
- Agreement signature/seal/paper photos inside agreement review.
- General photo uploads in photo review context.

Standalone photo queue can be minimal for MVP.

## Exports

Export types:

- Schools.
- Assessments.
- Agreements.
- Approval history.
- Photos metadata.

Export implementation options:

1. Client-triggered CSV from server-side query for small datasets.
2. `export_jobs` table and background job if exports become large.

MVP can start with synchronous CSV/Excel export as long as it is manager-only and audited.

## User Management

MVP basics:

- Invite/create manager and volunteer users.
- Set role.
- Activate/deactivate user.
- View last seen.

Do not build complex permissions UI in MVP.

## Implementation Notes

- Use server-side auth checks for every manager route.
- Prefer typed query helpers for views and RPC calls.
- Keep table views dense and operational, not marketing-styled.
- Do not expose volunteer-only draft payloads except through approval/review contexts.
- Keep exports and approvals auditable.
