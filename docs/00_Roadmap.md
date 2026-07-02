# Roadmap

Status: Draft execution roadmap.

## Guiding Principle

Every MVP feature must directly support replacing Lily Charities' current paper-and-Excel workflow. If a feature does not make volunteer field collection or manager review easier in the first operational rollout, it belongs in a later phase.

## Build-Ready Definition

Before implementation starts, the product docs should answer:

- What the MVP includes and excludes.
- Which decisions are settled and which are still open.
- What data is official vs proposed.
- How school lifecycle and selection outcome behave.
- How manager approvals work.
- How Android offline sync behaves.
- What the key Android and web screens contain.
- What data must be imported from existing spreadsheets or paper records.

## Phase 0 - Product Definition

Goal: make the product clear enough that implementation decisions are not guesswork.

Deliverables:

- `01_Product_Requirements.md`
- `02_Decisions.md`
- `03_Data_Model.md`
- `04_School_Lifecycle.md`
- `05_Approval_Workflow.md`
- `06_Offline_Sync.md`
- `07_Android_App.md`
- `08_Web_Dashboard.md`
- `10_Wireframes.md`

Key work:

- Confirm MVP scope and V2+ exclusions.
- Resolve open data model questions.
- Define required fields for new school, assessment, agreement, and photo submission.
- Define app-native agreement capture.
- Define allowed lifecycle transitions.
- Define approval states and rejection/clarification behavior.
- Define offline sync and conflict handling.
- Define import mapping for Lily's current flat school table, including school numbers.
- Create lightweight screen specs and wireframes.

Exit criteria:

- The MVP can be explained from the docs without relying on memory.
- Open decisions are either resolved or explicitly deferred.
- The team can start schema and app implementation with confidence.

## Phase 1 - Technical Design

Status: In progress.

Goal: translate product specs into implementation contracts.

Deliverables:

- Supabase/PostgreSQL schema design: `11_Backend_Schema.md`.
- Row-Level Security policy plan: `12_RLS_Storage_Policies.md`.
- Storage bucket and access policy plan: `12_RLS_Storage_Policies.md`.
- Sync API contract: `13_Sync_Contracts.md`.
- Import plan for existing spreadsheet/current database/paper data: `14_Import_Plan.md`.
- Android Room schema outline: `15_Android_Local_Data.md`.
- Web dashboard route and table plan: `16_Web_Dashboard_Technical_Plan.md`.

Key work:

- Convert `03_Data_Model.md` into database tables, enums, indexes, and relationships.
- Define RLS rules for volunteers, managers, and admins.
- Define storage paths for school photos, agreement evidence, and generated PDFs.
- Define sync endpoints or Supabase RPC functions for offline Android submissions.
- Confirm manager direct school creation flow.
- Define exact required assessment field validation.
- Define Lily school number auto-generation with manager override.
- Draft Bangla agreement translation and have Lily managers review it.

Exit criteria:

- Backend schema and permissions are ready to implement.
- Android and web teams know which contracts they are building against.

## Phase 2 - Backend Foundation

Goal: create the trusted data and approval backbone.

Features:

- Authentication.
- User profiles and roles.
- Official school database.
- School contacts.
- School assessments.
- School agreements.
- Library setup milestones.
- Photo metadata and storage.
- Change requests.
- Approval decisions.
- Audit events.
- CSV/Excel export query support.

Exit criteria:

- Managers can maintain official records through backend APIs.
- Volunteers can submit proposed data without directly changing official records.
- RLS prevents unauthorized access and writes.

## Phase 3 - Manager Web Dashboard MVP

Goal: give managers the operational control center before the field app is fully rolled out.

Features:

- Login.
- Schools table with search and filters.
- School details.
- Create/edit official school records.
- Approval queue.
- Assessment review.
- Agreement review.
- Photo review.
- Lifecycle and selection outcome updates.
- User management basics.
- CSV/Excel export.

Exit criteria:

- Managers can replace spreadsheet review for MVP workflows.
- Managers can approve/reject volunteer submissions.
- Managers can inspect agreement evidence and generated PDFs.

## Phase 4 - Android Volunteer MVP

Goal: support offline field collection in Bangladesh.

Features:

- Login.
- Offline school list.
- School details.
- Add new school.
- Propose edits to existing schools.
- Initial school assessment/checklist.
- App-native school agreement capture.
- Photo capture and upload.
- Sync status screen.
- Profile screen.

Exit criteria:

- Volunteers can complete core field workflows offline.
- Sync is reliable after app restarts and poor connectivity.
- Submitted data appears in the manager approval queue.

## Phase 5 - Import And Pilot Prep

Goal: prepare Lily's real data and team for a controlled pilot.

Key work:

- Clean existing school spreadsheet data.
- Import initial official school records.
- Create manager and volunteer accounts.
- Prepare sample schools and test accounts.
- Define pilot checklist.
- Prepare short training notes for managers and volunteers.

Exit criteria:

- Pilot users can log in.
- Real or representative school data is available.
- Known import issues are documented.

## Phase 6 - Testing And Pilot

Pilot users:

- Rabin.
- Lauri.
- 1-2 additional managers.
- 2-3 volunteers.

Focus areas:

- Missing fields.
- Confusing workflows.
- Offline reliability.
- Sync failures and retries.
- Approval process clarity.
- Agreement signing comfort.
- Photo upload performance.
- Export usefulness.

Exit criteria:

- Critical workflow issues are fixed.
- Managers can approve/reject real submissions.
- Volunteers can work offline and sync later.
- Lily is comfortable retiring the matching paper/spreadsheet workflow for MVP scope.

## Phase 7 - Launch

Goal: move the MVP into daily use.

Key work:

- Import final starting data.
- Confirm user accounts.
- Train managers and volunteers.
- Establish support process.
- Retire the replaced paper forms and spreadsheet steps.
- Monitor sync, approvals, and data quality.

## Phase 8 - Future Enhancements

Potential V2+ features:

- Lead Teacher portal.
- Monthly library usage reports.
- Formal impact survey modules.
- Student pre/post surveys.
- Teacher satisfaction surveys.
- Quarterly booklet reviews.
- Analytics dashboard.
- Public website integration.
- Donor dashboard.
- Native iOS app.

These should not block the MVP unless Lily explicitly changes the goal.
