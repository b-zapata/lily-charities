# Android Local Data

Status: Phase 1 technical design draft.

This document outlines the Android Room schema and offline sync responsibilities for the volunteer-only MVP app.

## Stack

- Native Android.
- Kotlin.
- Jetpack Compose.
- Room for local data.
- WorkManager for sync.
- Hilt for dependency injection.
- Navigation Compose.

## Local Data Principles

- Approved server data is cached for offline reading.
- Volunteer work is saved as drafts first.
- Submitted work goes into a durable outbox.
- Official records are not overwritten locally until server sync confirms the update.
- Local IDs must map to server IDs after sync/approval.
- Required fields are validated locally and again on the server.

## Room Tables

### Cached Official Data

`cached_schools`:

- `id`.
- `school_number`.
- `name`.
- `name_english`.
- `name_bangla`.
- `address`.
- `area`.
- `city`.
- `district`.
- `division`.
- `country`.
- `latitude`.
- `longitude`.
- `needs_map_pin_cleanup`.
- `pipeline_stage`.
- `donor_id`.
- `is_active`.
- `version`.
- `updated_at`.
- `last_synced_at`.

`cached_contacts`:

- `id`.
- `school_id`.
- `role`.
- `name`.
- `phone`.
- `email`.
- `title`.
- `is_primary`.
- `updated_at`.

`cached_assessment_summaries`:

- `id`.
- `school_id`.
- `visit_date`.
- `estimated_total_students`.
- `is_good_fit_for_project`.
- `updated_at`.

`cached_agreement_statuses`:

- `school_id`.
- `agreement_id`.
- `agreement_date`.
- `agreement_language`.
- `approved_at`.
- `generated_pdf_available`.

`cached_photo_metadata`:

- `id`.
- `school_id`.
- `photo_type`.
- `thumbnail_storage_path`.
- `approval_status`.
- `caption`.
- `updated_at`.

### Draft Tables

`draft_new_schools`:

- `local_id`.
- `school_name`.
- `address`.
- `latitude`.
- `longitude`.
- `map_pin_source`.
- `map_pin_confirmed`.
- `notes`.
- `created_at`.
- `updated_at`.
- `sync_status`.

Basic new school submission requires `school_name`, `latitude`, and `longitude`. If no pin is available, save draft but do not enqueue submission.

`draft_school_edits`:

- `local_id`.
- `school_id`.
- `base_version`.
- `field_patch_json`.
- `created_at`.
- `updated_at`.
- `sync_status`.

`draft_assessments`:

- `local_id`.
- `school_id` or `local_school_id`.
- `form_version`.
- `address`.
- `principal_name`.
- `principal_phone`.
- `assessment_payload_json`.
- `grade_counts_json`.
- `created_at`.
- `updated_at`.
- `sync_status`.

`draft_agreements`:

- `local_id`.
- `school_id` or `local_school_id`.
- `agreement_language`.
- `terms_version`.
- `terms_text_snapshot_json`.
- `signatory_name`.
- `signatory_title`.
- `authorized_signatory_confirmed`.
- `accepted_standard_terms`.
- `accepted_at`.
- `signature_local_photo_id`.
- `seal_local_photo_id`.
- `paper_agreement_local_photo_id`.
- `created_at`.
- `updated_at`.
- `sync_status`.

`draft_photos`:

- `local_id`.
- `school_id` or `local_school_id`.
- `draft_assessment_id`.
- `draft_agreement_id`.
- `photo_type`.
- `local_file_path`.
- `caption`.
- `taken_at`.
- `latitude`.
- `longitude`.
- `checksum`.
- `upload_status`.
- `server_photo_id`.
- `created_at`.

### Sync Tables

`outbox_mutations`:

- `client_mutation_id`.
- `mutation_type`.
- `local_entity_id`.
- `server_entity_id`.
- `base_version`.
- `payload_json`.
- `status`.
- `attempt_count`.
- `last_error_code`.
- `last_error_message`.
- `created_at`.
- `updated_at`.
- `last_attempt_at`.

`id_mappings`:

- `local_id`.
- `server_id`.
- `entity_type`.
- `created_at`.

`submission_statuses`:

- `change_request_id`.
- `client_mutation_id`.
- `school_id`.
- `request_type`.
- `status`.
- `review_notes`.
- `submitted_at`.
- `reviewed_at`.
- `updated_at`.

`mobile_device_state`:

- `device_id`.
- `last_bootstrap_sync_at`.
- `last_push_sync_at`.
- `last_successful_sync_at`.
- `app_version`.

## Required Local Validation

New school:

- School name.
- Confirmed map pin.

Initial assessment:

- School name.
- Address.
- Confirmed map pin.
- Principal/contact name.
- Contact phone.
- Completed assessment payload.
- Agreement completed with required signature.
- Required photos:
  - School exterior.
  - Proposed library room/space.
  - Classroom or learning environment.
  - Agreement signature image.

Agreement:

- Agreement language.
- Signatory name.
- Authority confirmation.
- Terms acceptance.
- Signature image.

Lifecycle proposal:

- School ID.
- Base version.
- Proposed status.

## WorkManager Jobs

Recommended workers:

- `BootstrapSyncWorker`: download official active data.
- `PhotoUploadWorker`: upload pending photo files.
- `OutboxPushWorker`: submit queued mutations.
- `SubmissionStatusWorker`: refresh review statuses.

Large photo batches may require user-initiated sync to avoid unreliable background upload behavior.

## Conflict Behavior

When local edit base version differs from server version:

- Server creates change request with `conflict_detected = true`.
- Android shows request as pending/conflict-aware if returned.
- Manager resolves conflict in web dashboard.
- Android does not attempt automatic merge.

## UI Implications

Schools list:

- Search by school name, school number, and address.
- Show status.
- Show sync markers.
- Show map-pin cleanup indicator if helpful.

School details:

- Official data read-only.
- Actions create drafts/change requests.
- Show rejection/clarification status for user's submissions.

Sync screen:

- Queued submissions.
- Uploading photos.
- Failed sync with retry.
- Pending manager review.
- Rejected/needs clarification items.

## Data Retention

- Keep local draft data until submitted and acknowledged.
- Keep uploaded local photo files until server upload is confirmed.
- Do not delete rejected request data automatically; volunteers may resubmit after editing.
- Allow future cleanup of approved photo files if device storage becomes a problem.
