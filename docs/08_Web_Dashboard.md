# Web Dashboard

Status: Draft dashboard specification.

Primary users: managers/admins, with limited volunteer access.

The web dashboard is the manager/admin control center for official school data, approval review, lifecycle tracking, users, and exports. Volunteers may also use the web dashboard for a limited browser workflow: schools and profile only.

For MVP, volunteer web access is intentionally narrow. Volunteers can view active official schools, create proposed new schools, propose edits to existing schools, and manage their own profile. Volunteer web submissions must become change requests and require manager/admin approval before official data changes.

## Core Principles

- Managers maintain official records.
- Volunteer submissions are reviewed before becoming official.
- Managers can edit volunteer-proposed data before approving.
- Managers can partially approve multi-part submissions.
- Tables should be dense, searchable, and exportable.
- Workflow clarity matters more than visual polish.
- Agreement and photo evidence should be easy to inspect.
- Route-level access should hide and block manager/admin-only pages from volunteers.

## Planned Screens

- Login.
- Schools.
- School Details.
- School Create/Edit for volunteers as approval-request submissions.
- Approval Queue.
- Change Request Review.
- Agreement Review.
- Photo Review.
- User Management.
- Profile.
- Reports / Exports.

## Schools Table

Primary list of official schools.

Columns:

- Lily school number.
- School name.
- Address/area.
- District.
- Status.
- Initial assessment date.
- Agreement status.
- Last updated.

Filters:

- Search by school number, school name, contact, or address.
- Status.
- District/area.
- Missing assessment.
- Missing approved agreement.
- Missing map pin.
- Pending change requests.
- Pending agreement submissions.
- Pending photo approvals.

Actions:

- Open school details.
- Create school. Managers/admins create official records directly; volunteers submit proposed schools for approval.
- Export filtered results.

## School Details

Sections:

- Overview.
- Lily school number.
- Contacts.
- Visit summary.
- Location eligibility.
- Library readiness.
- School support.
- Student population.
- Project fit.
- Agreement.
- Library setup.
- Photos.
- Change history.

Actions:

- Edit official school as manager/admin, or submit a proposed edit as volunteer.
- Backfill or correct initial assessment checklist fields as manager/admin.
- Assign or edit Lily school number.
- Add or update map pin. Schools with no coordinates should be highlighted automatically as missing a pin.
- Update status.
- Add manager notes.
- View pending requests for school.
- Export school detail if needed.

## Approval Queue

The approval queue should show all pending manager review items.

Columns:

- Request type.
- School number and name.
- Submitted by.
- Submitted at.
- Status.
- Conflict flag.

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

Bulk approval is not recommended for MVP because submissions can contain nuanced field data and photos.

## Change Request Review

Generic review page for:

- New school proposals.
- School edits.
- Assessment submissions.
- Lifecycle updates.

Review should show:

- Submitter.
- Submitted time.
- School context.
- Proposed data.
- Current official data when applicable.
- Field-level diff when applicable.
- Conflict warning when applicable.
- Attached photos.
- Manager notes.

Decision actions:

- Approve.
- Reject with reason.
- Needs clarification.
- Edit proposed data before approving.
- Partially approve components when a request contains multiple parts.

## Agreement Review

Managers need a clear review view for app-native agreement submissions.

The review page should show:

- School record being linked to the agreement.
- School name as represented in the agreement.
- Signatory name and title.
- Signatory contact details, if provided.
- Agreement date.
- Agreement language.
- Terms version.
- Exact agreement text snapshot used at signing.
- Authorization confirmation.
- Terms acceptance confirmation.
- Signature image.
- Optional school seal/stamp photo, if the school uses one.
- Optional paper agreement fallback photo.

Manager actions:

- Approve agreement.
- Reject agreement with reason.
- Mark as needs clarification.
- Open generated PDF once available.

After approval, the dashboard should show the official agreement on the School Details page and allow managers to view/download the generated PDF snapshot.

## Photo Review

Photo review should support:

- Large preview.
- Photo type.
- Caption.
- School or request context.
- Submitted by.
- Approval/rejection controls.

Agreement signature/seal/paper photos should usually be reviewed inside Agreement Review, not as standalone photo approvals.

## User Management

MVP basics:

- List users.
- Create/invite users if auth flow supports it.
- Set role.
- Activate/deactivate user.
- View last seen/sync metadata if available.
- Admins can open a user row/profile and edit profile fields, role, active status, and password.
- Managers can manage volunteer/manager accounts but cannot manage admin accounts.

Roles:

- Volunteer.
- Manager.
- Admin.

## Reports / Exports

Export formats:

- CSV.
- Excel.

Recommended exports:

- Schools.
- Assessments.
- Agreements.
- Approval history.

Export filters should match the Schools table and relevant review pages.

Exports are manager/admin-only for MVP.

## Profile

All web users can access their own profile page.

Editable self-service fields:

- Name.
- Email.
- Phone.
- Preferred app language.
- Home area.
- Notes.
- Password.

Role and active status are visible but not self-editable.

## Volunteer Web Access

Volunteers should only see these left-nav items:

- Schools.
- Profile.

Volunteers must not see or access:

- Approval Queue.
- Change Request Review.
- Exports.
- User Management.

If a volunteer manually navigates to a manager/admin-only route, the app should redirect them back to Schools.

## Dashboard Metrics

Small, useful counts:

- Total schools.
- Pending approvals.
- Missing assessments.
- Missing agreements.
- Operational schools.
- Schools selected.

Avoid advanced analytics in MVP.

## Open Questions

- Should agreement PDF generation happen automatically or on demand?
- Should exports be generated instantly or recorded as export jobs?
