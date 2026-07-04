# Data Model

Status: Draft proposal for discussion.

This document proposes the data model for the Lily Charities internal operations system. It covers the manager web dashboard, the offline-first Android app, the approval workflow, and the current paper forms being replaced.

The model is intentionally written as a product/data specification first, not final SQL. Once the product decisions are settled, this can be translated into a Supabase/PostgreSQL schema.

## Goals

- Maintain one official school database owned by managers.
- Allow volunteers to collect data offline without directly overwriting official records.
- Preserve the current school selection checklist as structured data.
- Preserve Lily's existing school numbers, such as `SCHOOL-0020`, as manager-visible identifiers.
- Support school status tracking from identification through operational library status.
- Use one school status field for MVP; `not_selected` is a status, and `future_potential` is out of scope.
- Support photos, signed agreements, manager review, audit history, and CSV/Excel export.
- Keep the MVP focused on replacing paper forms and spreadsheets.

## Source Documents

This model is based on:

- `docs/00_Roadmap.md`
- `docs/01_Product_Requirements.md`
- `docs/02_Decisions.md`
- `docs/04_School_Lifecycle.md`
- `docs/05_Approval_Workflow.md`
- `docs/06_Offline_Sync.md`
- `docs/07_Android_App.md`
- `docs/08_Web_Dashboard.md`
- `docs/09_Technical_Architecture.md`
- `docs/10_Wireframes.md`
- `docs/original_documents/School Selection Checklist.pdf`
- `docs/original_documents/School Selection Agreement.pdf`

## Core Design Principles

### Official data vs proposed data

Official school data lives in the main school tables. Volunteers do not update those tables directly.

Volunteer-created schools, checklist submissions, agreement submissions, edits, and photo uploads are submitted as change requests. A manager reviews each request and decides whether it becomes official.

### Internal IDs vs Lily school numbers

Use an internal UUID as the database primary key for every school. Store Lily's existing human-facing school number separately as `school_number`.

Existing records use values such as `SCHOOL-0020`, and managers refer to schools by school name plus school number. The system should preserve imported school numbers, show the number anywhere managers scan or search schools, and include it in exports.

Volunteer-created local drafts do not need a school number. When a school becomes official, the system should auto-generate the next `SCHOOL-####` number and allow a manager override.

### Offline-first collection

The Android app keeps a local cache of approved data plus a local outbox of unsynced volunteer work. Offline work should survive app restarts, bad connections, and partial sync failures.

### App-native agreement capture

The school agreement should be presented as an app-native screen rather than as a PDF annotation workflow. Volunteers should be able to show the agreement text in the selected agreement language, capture signatory details, collect explicit acceptance, capture a digital signature on the device, optionally photograph a school seal or paper fallback document, and sync the agreement later.

After manager approval, the system can generate a clean PDF snapshot from the structured agreement data. The generated PDF is an artifact of the official agreement record, not the source workflow volunteers must manipulate in the field.

### Structured where useful, flexible where prudent

The school selection checklist and school agreement should be stored as structured fields because managers will filter, export, and compare them. Change request payloads can use JSON for proposed field changes because they represent temporary review data.

### Minimal child-level data

The MVP should avoid collecting individual student records. Student data should be aggregate counts only, such as counts by grade. Student photos are not required for initial assessment. For MVP, there are no special privacy restrictions on school photos or optional student photos beyond normal app access: volunteers and managers can see them.

### Preserve history

Approvals, rejections, lifecycle changes, and important edits should be auditable. Managers should be able to understand who changed what, when, and why.

## Conceptual Model

```text
auth.users
    |
    v
profiles
    |
    +----------------------+
    |                      |
    v                      v
schools <---------- change_requests ---------- photos
    |                      |
    +-- school_contacts    +-- audit_events
    |
    +-- school_assessments
    |       |
    |       +-- assessment_grade_counts
    |
    +-- school_agreements
    |
    +-- library_setups
```

The most important relationship is this:

```text
Volunteer app action
    -> local draft/outbox item
    -> synced change request
    -> manager review
    -> official table update
    -> audit event
```

## Entity Summary

| Entity | Purpose | MVP |
| --- | --- | --- |
| `profiles` | App user profiles and roles linked to Supabase Auth users. | Yes |
| `schools` | Official school records and current status. | Yes |
| `school_contacts` | Principals, lead teachers, signatories, and other school contacts. | Yes |
| `school_assessments` | Approved initial school selection checklist submissions. | Yes |
| `assessment_grade_counts` | Grade-level student counts from the checklist. | Yes |
| `school_agreements` | Signed agreement/commitment records. | Yes |
| `library_setups` | Library setup and training milestone details. | Yes |
| `photos` | Uploaded school, assessment, agreement, and library photos. | Yes |
| `change_requests` | Pending, approved, rejected, or cancelled volunteer submissions. | Yes |
| `change_request_comments` | Manager and submitter discussion on a request. | Maybe |
| `audit_events` | Immutable history of approvals and official data changes. | Yes |
| `auth_login_attempts` | Service-role-only sign-in lockout tracking by email. | Yes |
| `export_jobs` | Optional record of CSV/Excel exports. | Maybe |
| `mobile_devices` | Optional registered Android devices for sync diagnostics. | Maybe |
| `sync_batches` | Optional server-side sync attempt tracking. | Maybe |

## Shared Field Conventions

Most server tables should include:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `created_at` | Timestamp | Stored in UTC. |
| `created_by` | UUID | References `profiles.id` when user-created. |
| `updated_at` | Timestamp | Stored in UTC. |
| `updated_by` | UUID | References `profiles.id` when user-updated. |
| `deleted_at` | Timestamp, nullable | Soft delete for records managers may need to recover. |
| `version` | Integer | Incremented on official record updates for conflict detection. |

Recommended conventions:

- Use `snake_case` names in the database.
- Use UUIDs for server IDs.
- Use `client_uuid` or `client_mutation_id` for offline-created records before a server ID exists.
- Store timestamps in UTC.
- Store user-facing dates separately when the date matters without a time, such as `visit_date` or `agreement_date`.
- Prefer nullable optional fields over placeholder values.

## Enumerations

### `user_role`

| Value | Meaning |
| --- | --- |
| `volunteer` | Field user who can view approved schools and submit change requests from Android or limited web dashboard access. |
| `manager` | Web dashboard user who can review, approve, reject, edit, and export. |
| `admin` | Optional technical/admin role for user and system administration. |

MVP requires `volunteer` and `manager`. `admin` may be useful early for setup even if not exposed as a full product role.

### `pipeline_stage`

User-facing label: Status.

For MVP, this is the single school status field. The name remains `pipeline_stage` in the current database for migration safety.

| Value | Meaning |
| --- | --- |
| `identified` | School is known but not yet fully assessed. |
| `assessed` | Initial assessment has been submitted and is waiting for manager review. |
| `selected` | School has been selected for the project. |
| `not_selected` | School was reviewed and is not selected for the project. |
| `setup_in_progress` | Library setup work has started. |
| `training` | Ambassador/lead teacher training is happening or scheduled. |
| `operational` | Library is operating. |

### `selection_outcome`

Legacy compatibility field only.

`selection_outcome` may still exist in the database while old migrations and legacy data are cleaned up, but new UI and product workflows should not expose it. Do not add `future_potential` to new flows.

### `change_request_type`

| Value | Meaning |
| --- | --- |
| `new_school` | Volunteer proposes adding a new school. |
| `school_edit` | Volunteer proposes edits to an existing school. |
| `assessment_submission` | Volunteer submits the initial school selection checklist. |
| `photo_upload` | Volunteer submits one or more photos for review. |
| `agreement_submission` | Volunteer submits an app-native school agreement with signature evidence. |
| `lifecycle_update` | Volunteer proposes a school status change. |

### `change_request_status`

| Value | Meaning |
| --- | --- |
| `draft` | Saved locally or server-side but not submitted for review. |
| `pending_review` | Submitted and waiting for manager review. |
| `approved` | Approved by a manager and applied to official records. |
| `partially_approved` | Some components were approved while others were rejected or need clarification. |
| `rejected` | Rejected by a manager. |
| `cancelled` | Withdrawn or superseded before review. |
| `needs_clarification` | Manager asks for more information before approval/rejection. |

### `photo_type`

| Value | Meaning |
| --- | --- |
| `school_exterior` | Exterior or entrance. |
| `classroom` | Classroom or learning environment. |
| `library_space` | Proposed or actual library room/space. |
| `bookshelf` | Bookshelf or installed library materials. |
| `students` | Student group or activity photo. |
| `agreement_signature` | Signature captured for app-native agreement. |
| `school_seal` | School seal or stamp evidence. |
| `paper_agreement` | Photo of physically signed paper agreement fallback. |
| `training` | Ambassador or lead teacher training photo. |
| `other` | Other supporting photo. |

### `approval_status`

Used for photos or other records that can exist before final approval.

| Value | Meaning |
| --- | --- |
| `pending_review` | Uploaded but not official. |
| `approved` | Approved for official use. |
| `rejected` | Rejected and hidden from official views. |

### `sync_status`

Used mainly in Android local storage.

| Value | Meaning |
| --- | --- |
| `local_only` | Created locally and never synced. |
| `queued` | Waiting to sync. |
| `syncing` | Currently being uploaded or downloaded. |
| `synced` | Successfully synced with server. |
| `failed` | Sync failed and can be retried. |
| `conflict` | Server data changed since the local edit began. |

## `profiles`

App-level user profile linked to Supabase Auth.

Supabase Auth should own authentication credentials. `profiles` owns application role and display metadata.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Same ID as `auth.users.id`. |
| `display_name` | Text | Yes | User-facing name. |
| `email` | Text | Yes | Usually mirrored from auth user. |
| `phone` | Text | No | Useful for Bangladesh field coordination. |
| `role` | `user_role` | Yes | `volunteer`, `manager`, or `admin`. |
| `preferred_app_language` | Text | No | Optional UI language preference, separate from agreement language. |
| `is_active` | Boolean | Yes | Deactivated users cannot access app data. |
| `home_area` | Text | No | Optional field region/base area. |
| `notes` | Text | No | Internal manager/admin notes. |
| `last_seen_at` | Timestamp | No | Useful for support. |
| `created_at` | Timestamp | Yes | UTC. |
| `updated_at` | Timestamp | Yes | UTC. |

### Relationships

- A profile can submit many `change_requests`.
- A profile can review many `change_requests`.
- A profile can upload many `photos`.
- A profile can create many `audit_events` as actor.

## `auth_login_attempts`

Service-role-only table used by the web dashboard sign-in flow to enforce temporary lockouts.

Supabase Auth owns credentials. This table does not store passwords or password hashes; it only stores failed-attempt counters and lockout timestamps for normalized email addresses.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | Text | Yes | Primary key; normalized lowercase email. |
| `failed_count` | Integer | Yes | Consecutive failed sign-in attempts. |
| `locked_until` | Timestamp | No | If in the future, sign-in is temporarily blocked. |
| `last_failed_at` | Timestamp | No | Last failed attempt. |
| `last_success_at` | Timestamp | No | Last successful sign-in, used when resetting counters. |
| `created_at` | Timestamp | Yes | UTC. |
| `updated_at` | Timestamp | Yes | UTC. |

### MVP policy

- Three consecutive failed password attempts for the same email locks sign-in for 15 minutes.
- A successful sign-in resets `failed_count` and clears `locked_until`.
- The table should have RLS enabled and no client policies; web server actions should access it only through the Supabase service role client.

## `schools`

The official school record. This is the main manager-owned database.

Pending volunteer-created schools do not appear here until approved.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `school_number` | Text | Yes | Lily-facing school number, e.g. `SCHOOL-0020`. Unique. Preserve imported values. Auto-generate when a new school becomes official, with manager override. |
| `name` | Text | Yes | Official display school name. |
| `name_english` | Text | No | English school name when captured separately. Useful for imports and bilingual display. |
| `name_bangla` | Text | No | Bangla school name when captured separately. Validate import encoding before trusting legacy text. |
| `alternate_name` | Text | No | Previous name, shorthand, or other local spelling. |
| `address` | Text | No | Primary human-readable location field when available. Required for initial assessment, not basic creation. |
| `area` | Text | No | Neighborhood/local area. |
| `city` | Text | No | City or municipality. |
| `district` | Text | No | District, such as Dhaka. |
| `division` | Text | No | Bangladesh division if useful. |
| `country` | Text | Yes | Default `Bangladesh`. |
| `latitude` | Decimal | No | Required for new submissions and initial assessments. May be temporarily null only for imported legacy records flagged for cleanup. |
| `longitude` | Decimal | No | Required for new submissions and initial assessments. May be temporarily null only for imported legacy records flagged for cleanup. |
| `map_pin_confirmed_at` | Timestamp | No | When the user confirmed/placed the map pin. |
| `map_pin_confirmed_by` | UUID | No | User who confirmed/placed the map pin. |
| `map_pin_source` | Text | No | Example: `manual`, `device_gps_suggested`, `typed_coordinates`. |
| `gps_accuracy_meters` | Decimal | No | Optional device GPS accuracy if device GPS suggested the initial pin. |
| `gps_captured_at` | Timestamp | No | When device GPS suggestion was captured. |
| `pipeline_stage` | `pipeline_stage` | Yes | Current school status. |
| `selection_outcome` | `selection_outcome` | Yes | Legacy compatibility field only. Do not expose in MVP UI. |
| `donor_id` | Text | No | Current/legacy donor reference, such as `DONOR-0002`. Store for MVP even if donor workflows are deferred. |
| `is_active` | Boolean | Yes | Active vs archived in app. |
| `needs_map_pin_cleanup` | Boolean | Yes | True for imported records missing confirmed coordinates. Defaults false for new records. |
| `data_quality_flags` | JSON | No | Import/cleanup flags such as `missing_map_pin`, `invalid_gps_coordinates`, or `bangla_encoding_issue`. |
| `summary_notes` | Text | No | Manager-owned general notes. |
| `created_source` | Text | Yes | Example: `manager`, `import`, `approved_change_request`. |
| `created_from_change_request_id` | UUID | No | Links to request if proposed by volunteer. |
| `created_at` | Timestamp | Yes | UTC. |
| `created_by` | UUID | No | References `profiles.id`. |
| `updated_at` | Timestamp | Yes | UTC. |
| `updated_by` | UUID | No | References `profiles.id`. |
| `version` | Integer | Yes | Incremented on official edits. |
| `deleted_at` | Timestamp | No | Soft archive/delete. |

### Notes

- `address` is the primary human-readable location field when available, but it is not required for basic school creation.
- A map pin is mandatory for new school submissions and initial assessments.
- Imported legacy records may temporarily exist without a map pin only when `needs_map_pin_cleanup = true`.
- Device GPS may suggest the initial pin location, but the user must confirm or place the map pin.
- If neither map placement nor current-location capture is available, the app may save a draft but cannot submit it.
- `pipeline_stage` should default to `identified`.
- `selection_outcome` may default to `pending` internally until the legacy field is removed.
- `school_number` is not required in volunteer local drafts, but should exist on official school records.
- Managers may edit official school records directly in the web dashboard.
- Volunteer edits to this table should only happen through approved `change_requests`.

### Basic creation vs initial assessment

Creating a basic school record should be minimal. Required fields are school name and map pin.

The initial assessment workflow is heavier and requires address, school/contact information, the initial assessment, agreement with digital signature, and required photos.

Required initial assessment photo categories:

- School exterior.
- Proposed library room/space.
- Classroom or learning environment.
- Agreement signature image.

Student photos are not required for initial assessment.

## `school_contacts`

People associated with a school. This avoids hard-coding only one principal or one lead teacher and gives the system room to track contacts as the school moves through the lifecycle.

### Contact roles

Suggested values:

- `principal`
- `lead_teacher`
- `school_administrator`
- `agreement_signatory`
- `other`

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `school_id` | UUID | Yes | References `schools.id`. |
| `role` | Text or enum | Yes | Contact role. |
| `name` | Text | Yes | Person name. |
| `phone` | Text | No | Phone or WhatsApp. |
| `email` | Text | No | Optional. |
| `title` | Text | No | Example: Head Teacher, Principal. |
| `is_primary` | Boolean | Yes | Primary contact for this role. |
| `notes` | Text | No | Internal notes. |
| `created_at` | Timestamp | Yes | UTC. |
| `created_by` | UUID | No | References `profiles.id`. |
| `updated_at` | Timestamp | Yes | UTC. |
| `updated_by` | UUID | No | References `profiles.id`. |

### MVP mapping from paper form

The paper checklist has:

- Principal Name
- Contact Details

In the digital system, those become a `school_contacts` row with `role = principal`.

## `school_assessments`

Approved initial school assessment/checklist records.

This represents the "School Visit Checklist for Lily Charities Project." The checklist is part of the MVP.

Each school has one official initial assessment. Pending checklist submissions should live in `change_requests` until approved. Once approved, the official checklist data is copied into `school_assessments`. Later volunteer updates should edit the existing official assessment information rather than creating multiple official initial assessments.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `school_id` | UUID | Yes | References `schools.id`. |
| `form_version` | Text | Yes | Example: `school_selection_checklist_v1`. |
| `visit_date` | Date | No | Date of school visit/checklist. |
| `prepared_by_user_id` | UUID | No | References `profiles.id` if app user. |
| `prepared_by_name` | Text | No | Name written/submitted on form. |
| `source_change_request_id` | UUID | No | Request that created this assessment. |
| `raw_form_data` | JSON | No | Optional full original payload for preservation/debugging. |
| `created_at` | Timestamp | Yes | UTC. |
| `created_by` | UUID | No | References `profiles.id`. |
| `updated_at` | Timestamp | Yes | UTC. |
| `updated_by` | UUID | No | References `profiles.id`. |
| `version` | Integer | Yes | Incremented on official edits. |

### Geographic location fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `located_in_dhaka_district` | Boolean | No | Checklist checkbox. |
| `underprivileged_or_low_income_area` | Boolean | No | Checklist checkbox. |
| `geographic_notes` | Text | No | Checklist notes. |

### Existing infrastructure fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `no_existing_library_facilities` | Boolean | No | Checklist criterion. |
| `secure_space_available_for_library` | Boolean | No | Checklist checkbox. |
| `library_space_description` | Text | No | "Describe the Space." |
| `library_space_size` | Text | No | Keep as text because paper answers may be informal. |
| `space_sufficient_for_library_needs` | Boolean | No | Checklist item. |
| `infrastructure_notes` | Text | No | Checklist notes. |

### Administrative support fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `commitment_from_school_administration` | Boolean | No | Checklist checkbox. |
| `supports_establishing_and_maintaining_library` | Boolean | No | Checklist sub-item. |
| `willing_to_participate_in_ambassador_program` | Boolean | No | Checklist sub-item. |
| `administrative_support_notes` | Text | No | Checklist notes. |

### Student population fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `at_least_200_students` | Boolean | No | Checklist checkbox. |
| `diverse_student_demographics` | Boolean | No | Checklist checkbox. |
| `estimated_total_students` | Integer | No | From checklist. |
| `key_demographics` | Text | No | Age, gender, background, or other notes. |

### Overall suitability fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `environment_conducive_to_learning` | Boolean | No | Checklist checkbox. |
| `positive_attitude_toward_project` | Boolean | No | Checklist checkbox. |
| `potential_challenges_identified` | Boolean | No | Checklist checkbox. |
| `suitability_notes` | Text | No | Checklist notes. |
| `is_good_fit_for_project` | Boolean | No | Checklist final yes/no. |
| `additional_comments` | Text | No | Checklist final comments. |

### Signature fields

The paper checklist has prepared by, signature, and date. This is separate from the required school agreement signature. The assessment itself should not require a digital signature for MVP unless Lily Charities later wants that. Recommended MVP approach:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `signature_photo_id` | UUID | No | Optional reference to `photos.id` if a signature/photo is captured. |
| `signed_at` | Timestamp | No | Optional if signature is captured digitally. |

## `assessment_grade_counts`

Grade-level student counts from the school selection checklist.

The paper form includes Play, KG, Grade-1, Grade-2, Grade-3, Grade-4, Grade-5, and Total.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `assessment_id` | UUID | Yes | References `school_assessments.id`. |
| `grade_label` | Text | Yes | `play`, `kg`, `grade_1`, etc. |
| `student_count` | Integer | No | Count for the grade. |
| `created_at` | Timestamp | Yes | UTC. |
| `updated_at` | Timestamp | Yes | UTC. |

### Recommendation

Store each grade as a row rather than one column per grade. This makes the model more flexible if Lily later adds Grade 6 or changes labels.

For exports, the web dashboard can pivot these rows back into columns.

## `school_agreements`

Official agreement records created from the app-native agreement flow.

The Android app should show the agreement as a readable app page, collect signatory details and explicit acceptance, capture a required digital signature, and allow an optional photo of a school seal or physically signed paper agreement. This is more field-friendly than asking volunteers to render and annotate a PDF on a phone.

The agreement says the school commits to:

- Allocating a dedicated room for library activities.
- Providing at least 30 students for bookshelf photographs.
- Cooperating with student surveys once or twice a year involving 5-10 students.
- Nominating 6 student ambassadors and 1 lead teacher.
- Allocating 1.5-2 hours for ambassador training.
- Providing monthly library usage reports after library activities begin.
- Cooperating overall to complete the program successfully.

Some of these obligations relate to future V2 features, but the agreement itself is useful in MVP.

Pending agreement submissions should live in `change_requests` until approved. Once approved, the official agreement data is copied into `school_agreements`, and the server may generate a clean PDF snapshot.

### Agreement capture model

```text
Volunteer opens Agreement screen
    -> app shows current agreement text
    -> volunteer selects agreement language
    -> volunteer enters signatory details
    -> signatory confirms authority and acceptance
    -> signatory signs on device
    -> volunteer optionally captures seal/paper photo
    -> app queues agreement_submission change request
    -> manager reviews
    -> approval creates official school_agreements row
    -> server generates PDF snapshot when online
```

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `school_id` | UUID | Yes | References `schools.id`. |
| `agreement_date` | Date | Yes | Date shown on agreement. Defaults to device date, editable if needed. |
| `represented_school_name` | Text | Yes | School name shown in agreement. Usually copied from `schools.name`. |
| `signatory_name` | Text | Yes | Person signing on behalf of school. |
| `signatory_title` | Text | No | Example: Principal, Head Teacher, Administrator. |
| `signatory_contact_id` | UUID | No | References `school_contacts.id` if known. |
| `signatory_phone` | Text | No | Optional phone captured during agreement. |
| `app_language` | Text | No | App UI language used by volunteer, if captured. |
| `agreement_language` | Text | Yes | Agreement language shown to signer, such as `bn` or `en`. |
| `terms_version` | Text | Yes | Example: `school_selection_agreement_v1`. |
| `terms_text_snapshot` | JSON or Text | Yes | Exact agreement text shown at signing time. |
| `authorized_signatory_confirmed` | Boolean | Yes | Signer confirms authority to agree for the school. |
| `accepted_standard_terms` | Boolean | Yes | Signer confirms the school accepts the listed conditions. |
| `accepted_at` | Timestamp | Yes | Timestamp when acceptance/signature was captured. |
| `captured_by_user_id` | UUID | Yes | Volunteer who captured the agreement. |
| `signature_photo_id` | UUID | Yes | Required signature image, references `photos.id` with `photo_type = agreement_signature`. |
| `seal_photo_id` | UUID | No | Optional school seal/stamp image, references `photos.id` with `photo_type = school_seal`. |
| `paper_agreement_photo_id` | UUID | No | Optional fallback photo with `photo_type = paper_agreement`. |
| `generated_pdf_storage_path` | Text | No | Path to server-generated PDF snapshot. |
| `generated_pdf_at` | Timestamp | No | UTC time when PDF was generated. |
| `notes` | Text | No | Manager notes. |
| `source_change_request_id` | UUID | No | Request that submitted the agreement. |
| `approved_by` | UUID | No | Manager who approved the agreement. |
| `approved_at` | Timestamp | No | UTC time when agreement was approved. |
| `created_at` | Timestamp | Yes | UTC. |
| `created_by` | UUID | No | References `profiles.id`. |
| `updated_at` | Timestamp | Yes | UTC. |
| `updated_by` | UUID | No | References `profiles.id`. |

### Recommendation

For MVP, implement the agreement as a native Android screen with structured fields and required digital signature capture. Keep a paper-photo fallback because some schools may prefer a stamped paper artifact, but paper fallback does not replace the required app-native signature unless this decision changes.

The generated PDF should be produced from approved structured data on the server or manager web side after sync. Volunteers should not need to annotate a PDF in the field.

## `library_setups`

Operational details for selected schools as they move into setup, training, and operational status.

This supports the later lifecycle stages without creating long-term impact survey modules.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `school_id` | UUID | Yes | References `schools.id`. |
| `setup_started_date` | Date | No | When setup begins. |
| `dedicated_room_confirmed` | Boolean | No | Agreement/setup follow-through. |
| `library_space_notes` | Text | No | Operational notes about the room. |
| `bookshelf_installed_date` | Date | No | If tracked. |
| `books_delivered_date` | Date | No | If tracked. |
| `lead_teacher_contact_id` | UUID | No | References `school_contacts.id`. |
| `student_ambassadors_planned_count` | Integer | No | Agreement expects 6. |
| `student_ambassadors_trained_count` | Integer | No | Actual count trained. |
| `training_scheduled_date` | Date | No | Planned training date. |
| `training_completed_date` | Date | No | Completed training date. |
| `operational_date` | Date | No | Date library becomes operational. |
| `current_notes` | Text | No | Manager notes. |
| `created_at` | Timestamp | Yes | UTC. |
| `created_by` | UUID | No | References `profiles.id`. |
| `updated_at` | Timestamp | Yes | UTC. |
| `updated_by` | UUID | No | References `profiles.id`. |
| `version` | Integer | Yes | Incremented on official edits. |

### Notes

- This table is not a monthly report module.
- Monthly library usage reports are V2+ unless Lily decides they are needed for MVP.
- This table exists so managers can track setup and training work without using spreadsheets.

## `photos`

Stores metadata for uploaded images. The actual files should live in Supabase Storage or equivalent object storage.

Photos may be attached to schools, assessments, agreements, library setup, or change requests.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `school_id` | UUID | No | References `schools.id` if associated with an official school. |
| `assessment_id` | UUID | No | References `school_assessments.id` if assessment photo. |
| `agreement_id` | UUID | No | References `school_agreements.id` if agreement photo. |
| `library_setup_id` | UUID | No | References `library_setups.id` if setup/training photo. |
| `change_request_id` | UUID | No | References `change_requests.id` when pending/reviewed. |
| `uploaded_by` | UUID | Yes | References `profiles.id`. |
| `photo_type` | `photo_type` | Yes | Categorizes photo. |
| `storage_path` | Text | Yes | Path/key in object storage. |
| `thumbnail_storage_path` | Text | No | Optional thumbnail. |
| `content_type` | Text | Yes | Example: `image/jpeg`. |
| `file_size_bytes` | Integer | No | Useful for support. |
| `checksum` | Text | No | Helps avoid duplicate uploads. |
| `caption` | Text | No | User-entered caption. |
| `taken_at` | Timestamp | No | From device/photo metadata if available. |
| `latitude` | Decimal | No | Optional photo GPS. |
| `longitude` | Decimal | No | Optional photo GPS. |
| `approval_status` | `approval_status` | Yes | Pending, approved, rejected. |
| `approved_by` | UUID | No | References `profiles.id`. |
| `approved_at` | Timestamp | No | UTC. |
| `rejected_by` | UUID | No | References `profiles.id`. |
| `rejected_at` | Timestamp | No | UTC. |
| `rejection_reason` | Text | No | Manager reason. |
| `created_at` | Timestamp | Yes | UTC. |

### Recommendation

Use `approval_status` so photo files can be uploaded before manager approval without immediately appearing in official school galleries.

## `change_requests`

The central approval workflow table.

Every volunteer-created school, school edit, checklist submission, agreement submission, photo upload, or lifecycle update should create a change request.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `request_type` | `change_request_type` | Yes | New school, edit, assessment, etc. |
| `status` | `change_request_status` | Yes | Current review status. |
| `school_id` | UUID | No | Existing school target. Null for proposed new school until approved. |
| `target_entity_type` | Text | No | Example: `school`, `assessment`, `photo`, `agreement`. |
| `target_entity_id` | UUID | No | Existing target record, if applicable. |
| `submitted_by` | UUID | Yes | References `profiles.id`. |
| `submitted_at` | Timestamp | No | UTC when submitted for review. |
| `reviewed_by` | UUID | No | Manager profile ID. |
| `reviewed_at` | Timestamp | No | UTC. |
| `review_notes` | Text | No | Manager notes for approval/rejection. |
| `base_version` | Integer | No | Official record version when volunteer started editing. |
| `proposed_data` | JSON | Yes | Proposed full object or field patch. |
| `before_data` | JSON | No | Snapshot/diff of official data before proposed change. |
| `applied_data` | JSON | No | Data actually applied after manager approval. |
| `component_decisions` | JSON | No | Per-component decisions for partial approval, such as school/assessment/agreement/photos. |
| `conflict_detected` | Boolean | Yes | True if official record changed since `base_version`. |
| `client_mutation_id` | Text | No | Android offline mutation ID for idempotency. |
| `client_created_at` | Timestamp | No | Time on device when created. |
| `source_device_id` | UUID | No | Optional references `mobile_devices.id`. |
| `supersedes_change_request_id` | UUID | No | If replacing/resubmitting an earlier rejected or cancelled request. |
| `created_at` | Timestamp | Yes | UTC. |
| `updated_at` | Timestamp | Yes | UTC. |

### Proposed data shape

`proposed_data` should be structured by request type.

For `new_school`:

```json
{
  "school": {
    "school_number": null,
    "name": "Example School",
    "address": null,
    "district": "Dhaka",
    "latitude": 23.8103,
    "longitude": 90.4125,
    "map_pin_source": "device_gps_suggested",
    "pipeline_stage": "identified"
  },
  "contacts": [],
  "assessment": {},
  "local_photo_ids": []
}
```

For `school_edit`:

```json
{
  "fields": {
    "address": {
      "from": "Old address",
      "to": "New address"
    },
    "district": {
      "from": null,
      "to": "Dhaka"
    }
  }
}
```

For `assessment_submission`:

```json
{
  "assessment": {
    "form_version": "school_selection_checklist_v1",
    "located_in_dhaka_district": true,
    "underprivileged_or_low_income_area": true,
    "is_good_fit_for_project": true
  },
  "grade_counts": [
    { "grade_label": "play", "student_count": 20 },
    { "grade_label": "kg", "student_count": 30 }
  ]
}
```

For `agreement_submission`:

```json
{
  "agreement": {
    "agreement_date": "2026-07-01",
    "represented_school_name": "Example School",
    "signatory_name": "Example Signatory",
    "signatory_title": "Principal",
    "app_language": "en",
    "agreement_language": "bn",
    "terms_version": "school_selection_agreement_v1",
    "authorized_signatory_confirmed": true,
    "accepted_standard_terms": true,
    "accepted_at": "2026-07-01T10:30:00Z"
  },
  "photo_ids": {
    "signature": "local-photo-signature",
    "seal": "local-photo-seal",
    "paper_agreement": null
  }
}
```

### Approval behavior

Submitting an initial assessment for manager review should move the school to `pipeline_stage = assessed` while manager review is pending. The submitted assessment data itself remains pending until manager review.

When a manager approves:

- `new_school` creates a row in `schools`, plus related contacts/assessment/photos if included.
- `school_edit` updates only approved official fields.
- `assessment_submission` creates or updates `school_assessments`. If the manager selects the school, it sets `pipeline_stage = selected`. If the manager does not select the school, it sets `pipeline_stage = not_selected`.
- `photo_upload` marks photos as approved and associates them with the official entity.
- `agreement_submission` creates or updates `school_agreements` and may trigger PDF generation.
- `lifecycle_update` updates `schools.pipeline_stage`.
- Multi-part submissions may be partially approved with component-level decisions.
- Component-level partial approval is required for multi-part submissions; itemized per-field feedback is optional for MVP. A single manager review note is acceptable.
- Managers may edit proposed data before approval; `applied_data` should preserve the manager-edited version.
- An `audit_events` row is created.
- The affected official record `version` is incremented.

When a manager rejects:

- Official records are not changed.
- The request stores `review_notes`.
- Pending photos remain hidden from official views.
- An `audit_events` row is created.
- The volunteer may edit and resubmit; the new request should link back via `supersedes_change_request_id`.

## `change_request_comments`

Optional MVP table for discussion around a request. This becomes useful if managers need to ask volunteers for clarification instead of simply approving or rejecting.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `change_request_id` | UUID | Yes | References `change_requests.id`. |
| `author_id` | UUID | Yes | References `profiles.id`. |
| `body` | Text | Yes | Comment text. |
| `created_at` | Timestamp | Yes | UTC. |

## `audit_events`

Immutable event history for important actions.

This table should be append-only from app code.

### Event types

Suggested values:

- `school_created`
- `school_updated`
- `school_archived`
- `assessment_created`
- `assessment_updated`
- `agreement_created`
- `agreement_pdf_generated`
- `library_setup_updated`
- `photo_approved`
- `photo_rejected`
- `change_request_submitted`
- `change_request_approved`
- `change_request_rejected`
- `lifecycle_changed`
- `school_status_changed`
- `export_created`
- `user_deactivated`

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `event_type` | Text or enum | Yes | Type of event. |
| `actor_id` | UUID | No | References `profiles.id`. Null for system events. |
| `entity_type` | Text | Yes | Example: `school`, `change_request`, `photo`. |
| `entity_id` | UUID | Yes | ID of affected record. |
| `school_id` | UUID | No | References `schools.id` for easier filtering. |
| `change_request_id` | UUID | No | References `change_requests.id` if applicable. |
| `before_data` | JSON | No | Previous data when relevant. |
| `after_data` | JSON | No | New data when relevant. |
| `metadata` | JSON | No | IP, device, export filters, etc. |
| `created_at` | Timestamp | Yes | UTC. |

## `export_jobs`

Optional table for tracking CSV/Excel exports from the web dashboard.

For small MVP exports, the app can generate files directly without storing export history. If Lily wants accountability around exports, use this table.

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Yes | Primary key. |
| `requested_by` | UUID | Yes | References `profiles.id`. |
| `export_type` | Text | Yes | Example: `schools`, `assessments`, `photos`. |
| `format` | Text | Yes | `csv` or `xlsx`. |
| `filters` | JSON | No | Filters used for export. |
| `row_count` | Integer | No | Number of exported rows. |
| `storage_path` | Text | No | If generated file is stored. |
| `created_at` | Timestamp | Yes | UTC. |
| `completed_at` | Timestamp | No | UTC. |
| `status` | Text | Yes | `pending`, `completed`, `failed`. |
| `error_message` | Text | No | Failure reason. |

## Android Offline Data Model

The Android app should have local tables that mirror the approved server data needed by volunteers, plus local-only tables for drafts and sync.

This is a Room database model, not necessarily identical to the server schema.

### Local cached tables

| Local table | Purpose |
| --- | --- |
| `local_profile` | Current logged-in user's profile and role. |
| `local_schools` | Cached approved schools available offline. |
| `local_school_contacts` | Cached contacts for offline viewing. |
| `local_school_assessments` | Cached approved assessments. |
| `local_assessment_grade_counts` | Cached grade counts. |
| `local_library_setups` | Cached setup/training info. |
| `local_photos` | Cached photo metadata and local file references. |

### Local draft/outbox tables

| Local table | Purpose |
| --- | --- |
| `draft_schools` | New schools created offline before sync. |
| `draft_school_edits` | Edits to existing schools before sync. |
| `draft_assessments` | In-progress school selection checklists. |
| `draft_agreements` | In-progress app-native agreement submissions. |
| `draft_photos` | Photos captured offline and waiting upload. |
| `outbox_mutations` | Ordered list of sync operations to send to server. |
| `sync_state` | Last successful sync time, cursor, and error state. |

### `outbox_mutations`

The outbox is critical for offline reliability.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/Text | Yes | Client-generated mutation ID. |
| `mutation_type` | Text | Yes | Maps to change request type or photo upload step. |
| `local_entity_type` | Text | Yes | Draft table/entity. |
| `local_entity_id` | Text | Yes | Local draft ID. |
| `server_entity_id` | UUID | No | Filled after successful sync. |
| `payload` | JSON/Text | Yes | Data to send. |
| `status` | `sync_status` | Yes | Queued, synced, failed, conflict, etc. |
| `attempt_count` | Integer | Yes | Retry tracking. |
| `last_attempt_at` | Timestamp | No | Device timestamp. |
| `last_error` | Text | No | Most recent sync error. |
| `created_at` | Timestamp | Yes | Device timestamp. |
| `updated_at` | Timestamp | Yes | Device timestamp. |

### Offline new school flow

```text
Volunteer creates school offline
    -> local draft school is created
    -> assessment, agreement, and photo drafts can be attached before manager approval
    -> outbox mutation is queued
    -> sync creates server change_request with pending_review status
    -> manager approves
    -> server creates official school
    -> next Android sync maps local draft to official school_id
```

### Offline edit flow

```text
Volunteer edits cached school offline
    -> app records base school version
    -> outbox mutation is queued
    -> sync creates change_request
    -> manager reviews field diff
    -> approval updates official school if accepted
```

### Offline photo flow

```text
Volunteer captures photo offline
    -> photo file stays on device
    -> metadata is stored in draft_photos
    -> upload mutation is queued
    -> sync uploads file to storage
    -> server creates pending photo/change request
    -> manager approves or rejects
```

### Offline agreement flow

```text
Volunteer starts agreement offline
    -> app shows locally bundled agreement text
    -> signatory details, acceptance, and signature are saved locally
    -> optional seal or paper agreement photos are saved locally
    -> agreement_submission mutation is queued
    -> sync uploads signature/photo files and creates change_request
    -> manager approves
    -> official school_agreements row is created
    -> server generates PDF snapshot when online
```

## Conflict Handling

Conflicts happen when official server data changes after the volunteer starts an offline edit.

Recommended approach:

- Each official record has a `version`.
- Android stores the `base_version` when the volunteer starts editing.
- The sync request includes `base_version`.
- If the current server version differs, mark the change request as `conflict_detected = true`.
- Managers still see the proposed change, but the review UI should clearly show that the official record changed since the volunteer began editing.

For MVP, conflict handling can be manager-mediated rather than automatic merging.

## Web Dashboard Data Needs

The web dashboard needs to query:

- All schools.
- Schools by `school_number`.
- Schools filtered by status (`pipeline_stage`).
- Schools missing an assessment.
- Schools missing a signed agreement.
- Schools with pending agreement submissions.
- Schools with pending change requests.
- Schools with pending photo approvals.
- Recent activity/audit events.
- Assessment checklist fields for review and export.
- Contacts, lead teacher, and principal information.
- Library setup/training milestones.

Managers/admins can access the full dashboard data set. Volunteers should only see active official schools and their own profile in the web dashboard. Any volunteer school creation or school edit from web must be stored as a `change_requests` row until approved.

## Export Model

CSV/Excel export should support at least:

### Schools export

Recommended columns:

- School number
- School name
- English school name
- Bangla school name
- Alternate name
- Address
- Area
- City
- District
- Division
- Country
- Latitude
- Longitude
- School status
- Donor ID
- Missing map pin, derived from empty latitude/longitude; not user-editable
- Principal name
- Principal contact
- Lead teacher name
- Lead teacher contact
- Initial assessment date
- Good fit for project
- Estimated total students
- Library setup started date
- Training completed date
- Operational date
- Last updated at

### Assessment export

Recommended columns:

- School number
- School name
- Visit date
- Prepared by
- Located in Dhaka District
- Underprivileged or low-income area
- No existing library facilities
- Secure space available
- Space sufficient
- Administration commitment
- Willing for ambassador program
- At least 200 students
- Estimated total students
- Grade counts
- Environment conducive to learning
- Positive attitude
- Challenges identified
- Good fit for project
- Additional comments

### Approval export

Recommended columns:

- Request ID
- Request type
- Status
- School number
- School name
- Submitted by
- Submitted at
- Reviewed by
- Reviewed at
- Review notes

### Agreement export

Recommended columns:

- School number
- School name
- Agreement date
- Signatory name
- Signatory title
- Agreement language
- Terms version
- Authorized signatory confirmed
- Accepted standard terms
- Seal photo present
- Paper fallback photo present
- Generated PDF present
- Approved by
- Approved at

## Existing Data Import Mapping

Lily's current school database appears to be a single flat school table. The MVP should not preserve that table shape, but it should preserve the data and familiar identifiers.

Observed current columns from sample rows:

- `school_id`, such as `SCHOOL-0020`.
- `school_name_english`.
- `school_name_bangla`.
- `total_students`.
- `address`.
- `gps_coordinates`.
- Principal contact fields.
- Lead teacher contact fields.
- Student librarian JSON/list.
- Local liaison contact fields.
- `donor_id`.
- `additional_notes`.
- `date_installed`.
- `created_at` and `updated_at`.

Recommended import mapping:

| Current column | New model target | Notes |
| --- | --- | --- |
| `school_id` | `schools.school_number` | Preserve exactly; do not use as internal primary key. |
| `school_name_english` | `schools.name_english`, and likely `schools.name` | Use as display name when no better official name exists. |
| `school_name_bangla` | `schools.name_bangla` | Full CSV appears to preserve UTF-8 Bangla names; still validate encoding during import QA because earlier pasted samples were corrupted. |
| `total_students` | Preserve in `schools.legacy_source_payload`; optionally seed `school_assessments.estimated_total_students` only if Lily confirms the flat table should count as assessment data. | The CSV is not the full official initial assessment. |
| `address` | `schools.address` | Keep as human-readable location. |
| `gps_coordinates` | `schools.latitude` / `schools.longitude` only if parseable coordinates | Full CSV has 0 parseable coordinate pairs, so imported schools should start with map-pin cleanup flags. |
| Principal fields | `school_contacts` with role `principal` | Normalize into contact rows. |
| Lead teacher fields | `school_contacts` with role `lead_teacher` | Normalize into contact rows. |
| Local liaison fields | `school_contacts` with role `local_liaison` | Add role value if used. |
| `student_librarians` | Defer or store as notes/import metadata | Individual student records are out of MVP scope. |
| `donor_id` | `schools.donor_id` | Store as nullable text for MVP. Lily may later clarify whether this should become a donor relationship table. |
| `additional_notes` | `schools.summary_notes` | Preserve manager notes. |
| `date_installed` | Preserve in `legacy_source_payload`; optionally map to setup milestone after Lily confirms meaning. | Only one row in the current CSV has this value. |
| `created_at`, `updated_at` | Imported audit/source metadata | Preserve where practical without pretending imported timestamps are app-created events. |

Import cleanup flags should identify missing or invalid map pins, encoding issues, suspicious GPS values, duplicate school numbers, and missing required official fields.

Missing or invalid map pins in imported records should not block launch. Import those schools as official records with `needs_map_pin_cleanup = true` and a relevant `data_quality_flags` entry. New school creation and initial assessment submissions still require a confirmed pin before submission.

## Permissions Summary

### Volunteer

Can:

- View all approved active schools synced to Android.
- Create local drafts offline.
- Submit new school proposals.
- Submit school edit proposals.
- Submit school selection checklists.
- Submit app-native school agreements with signature evidence.
- Submit photos.
- View status of their own submitted change requests.

Cannot:

- Directly update official school records.
- Approve/reject change requests.
- Export all data.
- Manage users.

### Manager

Can:

- View all official schools.
- Create and edit official school records.
- Review pending change requests.
- Approve/reject volunteer submissions.
- Update school status.
- Manage photos and agreements.
- View generated agreement PDFs and original signature/seal evidence.
- Export CSV/Excel.
- View audit history.

### Admin

Optional role for:

- Managing users.
- Deactivating accounts.
- System configuration.
- Fixing data issues.

## MVP Tables

Recommended MVP server tables:

1. `profiles`
2. `schools`
3. `school_contacts`
4. `school_assessments`
5. `assessment_grade_counts`
6. `school_agreements`
7. `library_setups`
8. `photos`
9. `change_requests`
10. `audit_events`
11. `auth_login_attempts`

Recommended optional MVP tables:

1. `change_request_comments`
2. `export_jobs`
3. `mobile_devices`
4. `sync_batches`

## Explicitly Out Of Scope For This Model In MVP

These may be added later but should not shape the MVP database too heavily:

- Lead Teacher portal login and submissions.
- Monthly library usage reports.
- Formal impact survey modules.
- Student pre/post surveys.
- Teacher satisfaction surveys.
- Quarterly booklet reviews.
- Donor dashboard.
- Public website integration.
- Native iOS app sync state.
- Advanced analytics warehouse.

## Open Product Questions

These should be discussed before final schema implementation:

1. Which assessment fields are required for the initial assessment workflow?
2. What exact import format will Lily provide for the full existing school database?
3. What does `donor_id` mean operationally, and should it later become a relationship to a donor table?

## Initial Recommendation

Start with the MVP tables listed above and implement the approval workflow around `change_requests`.

The most important architectural decision is to keep official records clean and manager-owned while letting volunteers work quickly offline. The proposed model does that by treating volunteer activity as proposed data until approved.

For the school selection checklist, use explicit structured columns in `school_assessments` and `assessment_grade_counts`. Those fields come directly from the current paper form and will be useful for filters and exports.

For photos and agreements, store files in object storage and keep metadata in relational tables. The agreement should be captured as structured app data first, then rendered into a PDF snapshot after approval.
