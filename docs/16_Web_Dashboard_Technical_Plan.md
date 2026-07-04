# Web Dashboard Technical Plan

Status: Phase 1 technical design draft.

This document outlines the role-aware web dashboard implementation plan.

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
| `/login` | Login for managers/admins/volunteers. |
| `/schools` | Main schools table. Visible to all active roles. |
| `/schools/new` | Manager/admin direct school creation; volunteer proposed new school. |
| `/schools/[id]` | School details. Visible to all active roles for active schools. |
| `/schools/[id]/edit` | Manager/admin direct edit; volunteer proposed school edit. |
| `/approvals` | Approval queue. Manager/admin only. |
| `/approvals/[id]` | Review change request. Manager/admin only. |
| `/exports` | CSV/Excel export screen. Manager/admin only. |
| `/users` | Basic user management. Manager/admin only. |
| `/users/[id]` | Admin-only user profile/edit page. |
| `/profile` | Current user's own profile. Visible to all active roles. |
| `/settings` | Lightweight admin/settings if needed. |

Web dashboard access is role-filtered for MVP. Volunteers may use the web dashboard only for schools and profile. The nav should hide manager/admin-only sections, and route-level checks should redirect unauthorized volunteers back to `/schools`.

## Schools Table

Primary query should use `active_school_summary_view`.

Columns:

- School number.
- School name.
- Bangla/English name if useful.
- Address/area.
- District.
- Status.
- Donor ID.
- Missing map pin.
- Initial assessment status/date.
- Agreement status.
- Last updated.

Filters:

- Search by school number, school name, contact, or address.
- Status.
- District/area.
- Donor ID.
- Missing assessment.
- Missing approved agreement.
- Missing map pin.
- Pending change requests.
- Pending photo approvals.

Pending approvals should be surfaced as a conditional badge next to the Approvals item in the left navigation for managers/admins, not as a dedicated Schools table column.

Actions:

- Open school details.
- Create school. Managers/admins create official records directly; volunteers submit `new_school` change requests.
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

- Edit official school as manager/admin, or submit a `school_edit` change request as volunteer.
- Assign/edit school number.
- Add or update map pin.
- Highlight missing map pins automatically when coordinates are absent.
- Update status.
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

MVP starts with synchronous manager/admin-only school CSV export at `/api/exports/schools`, backed by `school_export_view` and `export_jobs` audit rows. Additional export types can follow the same route-handler pattern.

## User Management

MVP basics:

- Invite/create manager and volunteer users.
- Set role.
- Activate/deactivate user.
- View last seen.
- Admins can click a user row to view/edit full profile details and set a new password.

Do not build complex permissions UI in MVP.

## Profile

All active web users can edit their own profile details:

- Name.
- Email.
- Phone.
- Preferred app language.
- Home area.
- Notes.
- Password.

Role and active status are read-only on self profile. Admins edit those fields from `/users/[id]`.

## Login Lockout

The web sign-in action should enforce a simple lockout policy:

- Track failed attempts in `auth_login_attempts` by normalized email.
- After 3 consecutive failed password attempts, lock sign-in for 15 minutes.
- Successful sign-in resets the failed count and clears the lock.
- The table is accessed from server actions with the Supabase service role key only.

## Implementation Notes

- Use server-side auth checks for every role-limited route.
- Prefer typed query helpers for views and RPC calls.
- Keep table views dense and operational, not marketing-styled.
- Do not expose volunteer-only draft payloads except through approval/review contexts.
- Keep exports and approvals auditable.
