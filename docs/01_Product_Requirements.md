# Product Requirements

Status: Draft PRD.

## Purpose

Build an internal operations system that helps Lily Charities track schools from first identification through operational library status.

The MVP replaces the current paper forms, manual review, and spreadsheet workflow used for school selection, school data maintenance, library setup, volunteer visits, and manager approvals.

## Problem

Lily Charities currently relies on paper forms, manual review, and spreadsheets. This creates several operational problems:

- Field data is hard to collect consistently.
- Volunteers may work without reliable internet.
- Paper forms and photos are easy to lose or delay.
- Managers must manually review and reconcile updates.
- There is no single trusted source of school truth.
- Lifecycle status and selection outcome can become mixed together.

## Product Goals

- Maintain one official school database owned by managers.
- Let volunteers collect school data offline.
- Digitize the initial school assessment/checklist.
- Digitize school agreement capture.
- Allow volunteers to propose new schools and edits.
- Require manager approval before volunteer submissions become official.
- Track school lifecycle stage separately from selection outcome.
- Support school photos and agreement evidence.
- Export operational data to CSV/Excel.

## Non-Goals For MVP

- Lead Teacher portal.
- Monthly library usage reports.
- Formal long-term impact survey modules.
- Student pre/post surveys.
- Teacher satisfaction surveys.
- Quarterly booklet reviews.
- Public website integration.
- Donor dashboard.
- Native iOS app.
- Advanced analytics.
- High-fidelity Figma or visual design work.

Important clarification: the initial school assessment/checklist is in MVP. Formal long-term impact surveys are out of scope.

## Users

### Volunteer

Primary app: Native Android.

For MVP, the native Android app is volunteer-only. Managers may use a mobile app later, but that should not block the MVP.

Volunteers in Bangladesh need to:

- Log in.
- View all active approved school records offline.
- Add a new school.
- Complete the initial school assessment/checklist.
- Capture app-native school agreement evidence.
- Propose edits to existing school records.
- Add photos.
- See sync status.
- Sync work later when internet is available.

Volunteers do not directly overwrite official school records.

### Manager

Primary app: Web dashboard.

For MVP, the web dashboard is manager-only.

Managers need to:

- Maintain the official school database.
- Review volunteer submissions.
- Approve, reject, or request clarification.
- Track school lifecycle.
- Track selection outcome.
- Review assessments.
- Review agreements.
- Review photos.
- Export data to CSV/Excel.
- Manage users at a basic level.

Known managers include Rabin, Lauri, and other Lily Charities managers.

### Admin

Admin may be a lightweight technical/operational role used for:

- User setup.
- Role changes.
- Account deactivation.
- System configuration.
- Data correction.

This does not need to be a large separate product surface in MVP.

## MVP Scope

### Authentication And Roles

- Login.
- Volunteer role.
- Manager role.
- Optional admin role.
- Active/inactive user status.

### School Database

- Official school records.
- Lily school number, such as `SCHOOL-0020`, stored separately from internal database ID.
- Address as primary human-readable location field when available.
- Required map pin.
- School contacts.
- Principal and lead teacher contacts.
- Lifecycle stage.
- Selection outcome.
- Notes and metadata.

### Initial School Assessment

Digitize the current school selection checklist:

- School information.
- Geographic location criteria.
- Existing infrastructure.
- Administrative support.
- Student population.
- Grade-level student counts.
- Overall suitability.
- Final remarks.
- Prepared by/date metadata.

### School Agreement Capture

Digitize the current agreement as an app-native Android flow:

- Show agreement terms as readable app content.
- Let the user choose the agreement language separately from the app language.
- Capture signatory name and title.
- Confirm signer authority.
- Confirm agreement to terms.
- Capture a digital signature on the device.
- Optionally capture school seal/stamp photo as supporting evidence, if the school uses an official stamp/seal.
- Optionally capture paper agreement fallback photo.
- Generate a PDF snapshot after approval when possible.

### Change Requests And Approval

Volunteer submissions become change requests:

- New school proposal.
- School edit proposal.
- Assessment submission.
- Agreement submission.
- Photo upload.
- Lifecycle update proposal.

Managers review change requests before official data changes.

### Required Fields

Required fields are the same whether the app is online or offline. Offline submissions should save locally and upload automatically once internet is available.

If the volunteer cannot confirm a map pin because map tiles and current location are unavailable, the app should allow saving a draft but should not allow submission.

Basic new school creation and initial assessment are separate workflows.

Basic new school creation should be minimal. Required fields:

- School name.
- Map pin.

Initial assessment requirements are heavier. Required categories include:

- School name.
- Address.
- Map pin.
- Principal/contact name.
- Contact phone.
- Initial assessment.
- Agreement is required.
- Photos are required.

Initial assessment details still need more definition:

- Exact required assessment fields.
- Photo quality guidance, if Lily wants stricter validation later.

Required initial assessment photo types:

- School exterior.
- Proposed library room/space.
- Classroom or learning environment.
- Agreement signature image.

Student photos are not required for initial assessment. School seal/stamp photo and paper agreement fallback photo are optional supporting evidence.

### Android App

- Offline-first.
- Local cache of approved schools.
- Local drafts.
- Sync outbox.
- Retry failed sync.
- Sync status screen.

### Web Dashboard

- Schools table.
- School details.
- Approval queue.
- Assessment review.
- Agreement review.
- Photo review.
- User management basics.
- CSV/Excel export.

## Source Workflows Being Replaced

- Paper school selection checklist.
- Paper school agreement.
- Manual review of volunteer-collected data.
- Spreadsheet-based school tracking.
- Manual photo collection and organization.

## Success Criteria

The MVP is successful if:

- Volunteers can collect field data offline and sync later.
- Managers can review and approve volunteer submissions.
- Lily has a trusted official school database.
- School lifecycle and selection outcome are clearly tracked.
- The initial school assessment is captured digitally.
- School agreement evidence is captured digitally.
- Managers can export data without relying on manual spreadsheet reconciliation.
- Pilot users can complete real workflows with minimal support.

## Key Risks

- Offline sync complexity.
- Poor field connectivity.
- Large photo uploads.
- Confusing approval behavior.
- Agreement signing comfort in the field.
- Imported spreadsheet data quality.
- Photo quality and upload reliability.

## Related Docs

- `00_Roadmap.md`
- `02_Decisions.md`
- `03_Data_Model.md`
- `04_School_Lifecycle.md`
- `05_Approval_Workflow.md`
- `06_Offline_Sync.md`
- `07_Android_App.md`
- `08_Web_Dashboard.md`
- `09_Technical_Architecture.md`
- `10_Wireframes.md`
