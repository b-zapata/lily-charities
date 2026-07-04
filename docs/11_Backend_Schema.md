# Backend Schema

Status: Phase 1 technical design draft.

This document translates the product data model into a Supabase/PostgreSQL schema plan. It is not a final migration file yet, but it should be concrete enough for an implementation agent to create migrations.

## Stack Assumption

- Supabase hosted Postgres.
- Supabase Auth for login.
- Supabase Storage for photos, signature images, and generated agreement PDFs.
- Row-Level Security enabled on all app tables.
- Public schema tables are acceptable for MVP.

## Extensions

Recommended extensions:

```sql
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
```

`pgcrypto` provides `gen_random_uuid()`. `pg_trgm` supports useful fuzzy search on school number, school name, address, and contacts.

## Enums

Create Postgres enums for stable workflow values:

| Enum | Values |
| --- | --- |
| `user_role` | `volunteer`, `manager`, `admin` |
| `pipeline_stage` | `identified`, `assessed`, `selected`, `not_selected`, `setup_in_progress`, `training`, `operational` |
| `selection_outcome` | Legacy compatibility only: `pending`, `selected`, `not_selected`. Do not expose in MVP UI. |
| `change_request_type` | `new_school`, `school_edit`, `assessment_submission`, `agreement_submission`, `photo_upload`, `lifecycle_update` |
| `change_request_status` | `draft`, `pending_review`, `needs_clarification`, `approved`, `partially_approved`, `rejected`, `cancelled` |
| `photo_type` | `school_exterior`, `classroom`, `library_space`, `bookshelf`, `students`, `agreement_signature`, `school_seal`, `paper_agreement`, `training`, `other` |
| `approval_status` | `pending_review`, `approved`, `rejected` |

Use text columns instead of enums only when values are expected to change often. The values above are stable enough for enums.

## Shared Columns

Most official tables should include:

| Column | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `gen_random_uuid()` | Primary key. |
| `created_at` | `timestamptz` | `now()` | UTC. |
| `created_by` | `uuid` | nullable | References `profiles.id` when user-created. |
| `updated_at` | `timestamptz` | `now()` | Maintain through trigger. |
| `updated_by` | `uuid` | nullable | References `profiles.id` when user-updated. |
| `deleted_at` | `timestamptz` | nullable | Soft archive/delete. |
| `version` | `integer` | `1` | Increment on official updates for conflict detection. |

Recommended triggers:

- `set_updated_at()` before update.
- `increment_version()` before update on official mutable tables.

## School Number Generation

Lily school numbers should be stored in `schools.school_number`, not used as primary keys.

Recommended implementation:

```sql
create sequence school_number_seq start with 217;

create or replace function generate_school_number()
returns text
language sql
as $$
  select 'SCHOOL-' || lpad(nextval('school_number_seq')::text, 4, '0');
$$;
```

After importing the current CSV, set the sequence to `217` because the source contains continuous values from `SCHOOL-0001` through `SCHOOL-0216`.

Managers should be able to override a generated number before approval is finalized, but the database must enforce uniqueness.

## Core Tables

### `profiles`

Application profile linked 1:1 to `auth.users`.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key; references `auth.users(id)`. |
| `display_name` | `text` | yes | User-facing name. |
| `email` | `text` | yes | Mirror from auth user for convenience. |
| `phone` | `text` | no | Useful for field coordination. |
| `role` | `user_role` | yes | `volunteer`, `manager`, or `admin`. |
| `preferred_app_language` | `text` | no | UI language, separate from agreement language. |
| `is_active` | `boolean` | yes | Default `true`. |
| `home_area` | `text` | no | Optional field area. |
| `notes` | `text` | no | Internal notes. |
| `last_seen_at` | `timestamptz` | no | Support/audit convenience. |
| `created_at` | `timestamptz` | yes | Default `now()`. |
| `updated_at` | `timestamptz` | yes | Default `now()`. |

Indexes:

- Primary key on `id`.
- Unique lower-case email index.
- Index on `role`.
- Index on `is_active`.

### `auth_login_attempts`

Service-role-only table for web sign-in lockout tracking. This is not a credential store; Supabase Auth remains the credential source of truth.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | `text` | yes | Primary key; normalized lowercase email. |
| `failed_count` | `integer` | yes | Consecutive failed password attempts. |
| `locked_until` | `timestamptz` | no | Future timestamp blocks sign-in. |
| `last_failed_at` | `timestamptz` | no | Most recent failed attempt. |
| `last_success_at` | `timestamptz` | no | Most recent successful sign-in. |
| `created_at` | `timestamptz` | yes | Default `now()`. |
| `updated_at` | `timestamptz` | yes | Maintained by trigger. |

Policy:

- Enable RLS.
- Do not grant client-facing select/insert/update/delete policies.
- Web server actions should access this table only with the Supabase service role key.
- Lock after 3 consecutive failed attempts for the same email; unlock automatically after 15 minutes; reset on successful sign-in.

### `schools`

Official manager-owned school record.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `school_number` | `text` | yes | Unique Lily number like `SCHOOL-0020`. |
| `name` | `text` | yes | Official display name. |
| `name_english` | `text` | no | English name from import or form. |
| `name_bangla` | `text` | no | Bangla name from import or form. |
| `alternate_name` | `text` | no | Previous/local/shorthand name. |
| `address` | `text` | no | Required for initial assessment, not basic creation. |
| `area` | `text` | no | Neighborhood/local area. |
| `city` | `text` | no | City. |
| `district` | `text` | no | District, often Dhaka. |
| `division` | `text` | no | Bangladesh division. |
| `country` | `text` | yes | Default `Bangladesh`. |
| `latitude` | `numeric(10,7)` | no | Required for new submissions; nullable only for imported cleanup records. |
| `longitude` | `numeric(10,7)` | no | Required for new submissions; nullable only for imported cleanup records. |
| `map_pin_confirmed_at` | `timestamptz` | no | When coordinates were confirmed. |
| `map_pin_confirmed_by` | `uuid` | no | References `profiles.id`. |
| `map_pin_source` | `text` | no | `manual`, `device_gps_suggested`, `typed_coordinates`, `import_missing`. |
| `gps_accuracy_meters` | `numeric` | no | Optional GPS metadata. |
| `gps_captured_at` | `timestamptz` | no | Optional GPS metadata. |
| `pipeline_stage` | `pipeline_stage` | yes | Default `identified`. User-facing label: Status. |
| `selection_outcome` | `selection_outcome` | yes | Legacy compatibility field. Default `pending`; do not expose in MVP UI. |
| `donor_id` | `text` | no | Current CSV donor reference. |
| `is_active` | `boolean` | yes | Default `true`. |
| `needs_map_pin_cleanup` | `boolean` | yes | Legacy/import cleanup metadata. Do not expose as a user-editable field. UI should derive missing map pin state from null latitude/longitude. |
| `data_quality_flags` | `jsonb` | no | Import cleanup flags. |
| `summary_notes` | `text` | no | Manager-owned notes. |
| `created_source` | `text` | yes | `import`, `manager`, `approved_change_request`. |
| `created_from_change_request_id` | `uuid` | no | References `change_requests.id`. |
| `source_import_filename` | `text` | no | Example: `schools_rows.csv`. |
| `source_import_row_number` | `integer` | no | CSV row number for audit. |
| `legacy_source_payload` | `jsonb` | no | Original source row for audit/debugging. |
| shared columns | mixed | yes | See shared column section. |

Constraints:

- `school_number` unique.
- `school_number` should match `^SCHOOL-[0-9]{4,}$`.
- Latitude between `-90` and `90` when present.
- Longitude between `-180` and `180` when present.
- For non-import records, latitude and longitude must be present.
- Imported records may have null latitude/longitude. Treat missing map pin as a derived state from null latitude/longitude; `needs_map_pin_cleanup` is legacy/import metadata only.

Indexes:

- Unique index on `school_number`.
- B-tree indexes on `pipeline_stage`, `is_active`, `needs_map_pin_cleanup`, `donor_id`.
- Trigram indexes on `name`, `name_english`, `name_bangla`, and `address`.

### `school_contacts`

Normalized principal, lead teacher, local liaison, signatory, and other contacts.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `school_id` | `uuid` | yes | References `schools.id`. |
| `role` | `text` | yes | `principal`, `lead_teacher`, `local_liaison`, `agreement_signatory`, `other`. |
| `name` | `text` | yes | Person name. |
| `phone` | `text` | no | Text to preserve formatting/plus codes. |
| `email` | `text` | no | Optional. |
| `title` | `text` | no | Principal, Head Teacher, etc. |
| `is_primary` | `boolean` | yes | Default `true`. |
| `notes` | `text` | no | Internal notes. |
| shared columns | mixed | yes | See shared column section. |

Indexes:

- `school_id`.
- `(school_id, role)`.
- Trigram indexes on `name`, `phone`, and `email`.

### `school_assessments`

One official initial assessment per school.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `school_id` | `uuid` | yes | Unique reference to `schools.id`. |
| `form_version` | `text` | yes | `school_selection_checklist_v1`. |
| `visit_date` | `date` | no | Date of visit. |
| `prepared_by_user_id` | `uuid` | no | References `profiles.id`. |
| `prepared_by_name` | `text` | no | If captured separately. |
| `located_in_dhaka_district` | `boolean` | no | Checklist field. |
| `underprivileged_or_low_income_area` | `boolean` | no | Checklist field. |
| `geographic_notes` | `text` | no | Notes. |
| `no_existing_library_facilities` | `boolean` | no | Checklist field. |
| `secure_space_available_for_library` | `boolean` | no | Checklist field. |
| `library_space_description` | `text` | no | Text description. |
| `library_space_size` | `text` | no | Free text. |
| `space_sufficient_for_library_needs` | `boolean` | no | Checklist field. |
| `infrastructure_notes` | `text` | no | Notes. |
| `commitment_from_school_administration` | `boolean` | no | Checklist field. |
| `supports_establishing_and_maintaining_library` | `boolean` | no | Checklist field. |
| `willing_to_participate_in_ambassador_program` | `boolean` | no | Checklist field. |
| `administrative_support_notes` | `text` | no | Notes. |
| `at_least_200_students` | `boolean` | no | Checklist field. |
| `diverse_student_demographics` | `boolean` | no | Checklist field. |
| `estimated_total_students` | `integer` | no | Student count. |
| `key_demographics` | `text` | no | Notes. |
| `environment_conducive_to_learning` | `boolean` | no | Checklist field. |
| `positive_attitude_toward_project` | `boolean` | no | Checklist field. |
| `potential_challenges_identified` | `boolean` | no | Checklist field. |
| `suitability_notes` | `text` | no | Notes. |
| `is_good_fit_for_project` | `boolean` | no | Final fit answer. |
| `additional_comments` | `text` | no | Final remarks. |
| `raw_form_data` | `jsonb` | no | Full submitted payload. |
| `source_change_request_id` | `uuid` | no | References `change_requests.id`. |
| shared columns | mixed | yes | See shared column section. |

Indexes:

- Unique index on `school_id`.
- Index on `visit_date`.
- Index on `is_good_fit_for_project`.
- Index on `estimated_total_students`.

### `assessment_grade_counts`

Grade-level counts linked to one assessment.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `assessment_id` | `uuid` | yes | References `school_assessments.id`. |
| `grade_label` | `text` | yes | `play`, `kg`, `grade_1`, etc. |
| `student_count` | `integer` | no | Count for grade. |
| `created_at` | `timestamptz` | yes | Default `now()`. |
| `updated_at` | `timestamptz` | yes | Default `now()`. |

Constraints and indexes:

- Unique `(assessment_id, grade_label)`.
- `student_count >= 0` when present.

### `school_agreements`

Official app-native signed school agreement records.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `school_id` | `uuid` | yes | References `schools.id`. |
| `agreement_date` | `date` | yes | Date shown on agreement. |
| `represented_school_name` | `text` | yes | Snapshot name used in agreement. |
| `signatory_name` | `text` | yes | Required. |
| `signatory_title` | `text` | no | Optional. |
| `signatory_contact_id` | `uuid` | no | References `school_contacts.id`. |
| `signatory_phone` | `text` | no | Optional. |
| `app_language` | `text` | no | UI language. |
| `agreement_language` | `text` | yes | `en` or `bn`. |
| `terms_version` | `text` | yes | Agreement content version. |
| `terms_text_snapshot` | `jsonb` | yes | Exact terms shown. |
| `authorized_signatory_confirmed` | `boolean` | yes | Must be true for approval. |
| `accepted_standard_terms` | `boolean` | yes | Must be true for approval. |
| `accepted_at` | `timestamptz` | yes | Captured signing timestamp. |
| `captured_by_user_id` | `uuid` | yes | Volunteer who captured. |
| `signature_photo_id` | `uuid` | yes | References `photos.id`. |
| `seal_photo_id` | `uuid` | no | References `photos.id`. |
| `paper_agreement_photo_id` | `uuid` | no | References `photos.id`. |
| `generated_pdf_storage_path` | `text` | no | Storage key. |
| `generated_pdf_at` | `timestamptz` | no | Timestamp. |
| `notes` | `text` | no | Manager notes. |
| `source_change_request_id` | `uuid` | no | References `change_requests.id`. |
| `approved_by` | `uuid` | no | Manager. |
| `approved_at` | `timestamptz` | no | Timestamp. |
| shared columns | mixed | yes | See shared column section. |

Indexes:

- `school_id`.
- `agreement_language`.
- `approved_at`.

### `library_setups`

Setup/training/operational milestone tracking.

Use one row per school for MVP.

Important columns:

- `school_id`.
- `setup_started_date`.
- `dedicated_room_confirmed`.
- `library_space_notes`.
- `bookshelf_installed_date`.
- `books_delivered_date`.
- `lead_teacher_contact_id`.
- `student_ambassadors_planned_count`.
- `student_ambassadors_trained_count`.
- `training_scheduled_date`.
- `training_completed_date`.
- `operational_date`.
- `current_notes`.
- Shared columns.

Indexes:

- Unique `school_id`.
- `setup_started_date`.
- `training_completed_date`.
- `operational_date`.

### `photos`

Metadata for files stored in Supabase Storage.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `school_id` | `uuid` | no | Official school context. |
| `assessment_id` | `uuid` | no | Assessment context. |
| `agreement_id` | `uuid` | no | Agreement context. |
| `library_setup_id` | `uuid` | no | Setup context. |
| `change_request_id` | `uuid` | no | Pending review context. |
| `uploaded_by` | `uuid` | yes | References `profiles.id`. |
| `photo_type` | `photo_type` | yes | Required. |
| `storage_bucket` | `text` | yes | Bucket name. |
| `storage_path` | `text` | yes | Object key. |
| `thumbnail_storage_path` | `text` | no | Optional. |
| `content_type` | `text` | yes | Example: `image/jpeg`. |
| `file_size_bytes` | `integer` | no | Optional. |
| `checksum` | `text` | no | Optional dedupe. |
| `caption` | `text` | no | Optional. |
| `taken_at` | `timestamptz` | no | Device/photo metadata. |
| `latitude` | `numeric(10,7)` | no | Optional photo GPS. |
| `longitude` | `numeric(10,7)` | no | Optional photo GPS. |
| `approval_status` | `approval_status` | yes | Default `pending_review`. |
| `approved_by` | `uuid` | no | Manager. |
| `approved_at` | `timestamptz` | no | Timestamp. |
| `rejected_by` | `uuid` | no | Manager. |
| `rejected_at` | `timestamptz` | no | Timestamp. |
| `rejection_reason` | `text` | no | Required when rejected. |
| `created_at` | `timestamptz` | yes | Default `now()`. |

Indexes:

- `school_id`.
- `change_request_id`.
- `uploaded_by`.
- `(approval_status, photo_type)`.
- Unique `storage_bucket, storage_path`.

### `change_requests`

Central approval workflow table.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `request_type` | `change_request_type` | yes | Workflow type. |
| `status` | `change_request_status` | yes | Default `pending_review` once submitted. |
| `school_id` | `uuid` | no | Null for proposed new school until approval. |
| `target_entity_type` | `text` | no | `school`, `assessment`, `agreement`, `photo`, etc. |
| `target_entity_id` | `uuid` | no | Existing target if applicable. |
| `submitted_by` | `uuid` | yes | Volunteer profile. |
| `submitted_at` | `timestamptz` | no | UTC. |
| `reviewed_by` | `uuid` | no | Manager profile. |
| `reviewed_at` | `timestamptz` | no | UTC. |
| `review_notes` | `text` | no | Required for rejection. |
| `base_version` | `integer` | no | Official version at edit start. |
| `proposed_data` | `jsonb` | yes | Proposed payload. |
| `before_data` | `jsonb` | no | Server snapshot/diff before review. |
| `applied_data` | `jsonb` | no | Manager-edited applied data. |
| `component_decisions` | `jsonb` | no | For partial approval. |
| `conflict_detected` | `boolean` | yes | Default `false`. |
| `client_mutation_id` | `text` | no | Idempotency key. |
| `client_created_at` | `timestamptz` | no | Device timestamp. |
| `source_device_id` | `uuid` | no | References `mobile_devices.id`. |
| `supersedes_change_request_id` | `uuid` | no | Resubmission chain. |
| `created_at` | `timestamptz` | yes | Default `now()`. |
| `updated_at` | `timestamptz` | yes | Default `now()`. |

Indexes:

- `status`.
- `request_type`.
- `school_id`.
- `submitted_by`.
- `reviewed_by`.
- `submitted_at`.
- Unique partial index on `(submitted_by, source_device_id, client_mutation_id)` where `client_mutation_id is not null`.

### Supporting Tables

`change_request_comments`:

- `id`, `change_request_id`, `author_id`, `body`, `created_at`.

`audit_events`:

- `id`, `actor_id`, `event_type`, `entity_type`, `entity_id`, `school_id`, `change_request_id`, `before_data`, `after_data`, `metadata`, `created_at`.

`export_jobs`:

- Optional table for tracking manager exports: `id`, `requested_by`, `export_type`, `filters`, `status`, `storage_path`, `created_at`, `completed_at`.

`mobile_devices`:

- `id`, `user_id`, `device_name`, `platform`, `app_version`, `last_seen_at`, `created_at`.

`sync_batches`:

- `id`, `device_id`, `user_id`, `started_at`, `completed_at`, `status`, `mutation_count`, `error_summary`.

## Required Validation

Server-side validation should enforce:

- Volunteers cannot submit a new school without `name`, `latitude`, and `longitude`.
- Volunteer web submissions for new schools and school edits must create `change_requests`, not direct official writes.
- Volunteers cannot submit an initial assessment without address, principal/contact name, contact phone, completed assessment payload, agreement payload/signature, and required photos.
- Required initial assessment photos: school exterior, proposed library room/space, classroom or learning environment, agreement signature image.
- Student photos are optional.
- Rejections require `review_notes`.
- Manager approval of a new school must assign a unique `school_number`.
- Imported schools may have missing coordinates only with `created_source = 'import'` and `needs_map_pin_cleanup = true`.
- Web sign-in should lock for 15 minutes after 3 consecutive failed password attempts for the same email.

## Migration Order

1. Extensions.
2. Enums.
3. Helper functions and triggers.
4. `profiles`.
5. `auth_login_attempts`.
6. `schools`.
7. Child official tables: contacts, assessments, grade counts, agreements, library setups.
8. `photos`.
9. Workflow/support tables: change requests, comments, audit events, devices, sync batches, exports.
10. Indexes.
11. RLS policies.
12. Storage buckets and storage policies.
13. Seed/import scripts.
