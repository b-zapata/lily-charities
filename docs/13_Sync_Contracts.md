# Sync Contracts

Status: Phase 1 technical design draft.

This document defines the offline Android sync contract at a product/API level. Exact Supabase RPC SQL or API route code can be implemented later from this plan.

## Guiding Rule

Android should not directly mutate official tables. Android submits mutations to a controlled sync endpoint that creates `change_requests`, pending `photos`, and sync/audit records.

## Recommended API Shape

Use Supabase RPC functions for MVP unless implementation constraints push toward a custom API.

Recommended functions:

| Function | Caller | Purpose |
| --- | --- | --- |
| `mobile_register_device(payload jsonb)` | Android | Create/update `mobile_devices`. |
| `mobile_get_bootstrap(since timestamptz default null)` | Android | Download active school cache, reference data, and user's pending/rejected request statuses. |
| `mobile_sync_push(device_id uuid, client_batch_id text, mutations jsonb)` | Android | Submit queued offline mutations idempotently. |
| `mobile_create_photo_record(payload jsonb)` | Android | Create pending photo metadata after storage upload. |
| `manager_review_change_request(change_request_id uuid, decision jsonb)` | Web | Approve/reject/partially approve with audit and official writes. |
| `manager_generate_agreement_pdf(agreement_id uuid)` | Web/server job | Generate official agreement PDF snapshot. |

## Bootstrap Download

`mobile_get_bootstrap` should return:

- Active official schools.
- Primary contacts.
- Official assessment summary/status.
- Agreement status.
- Setup/lifecycle summary.
- Approved photo metadata and thumbnails when practical.
- Current user's pending/rejected/needs clarification change requests.
- Reference values/enums.
- Server time.

Large photo files should not be automatically downloaded unless needed. The app can lazily fetch thumbnails or full images.

## Push Mutation Envelope

Every queued mutation should use a consistent envelope:

```json
{
  "client_mutation_id": "uuid-from-device",
  "mutation_type": "school_edit",
  "client_created_at": "2026-07-01T10:30:00Z",
  "base_entity_id": "server-school-id-if-any",
  "base_version": 7,
  "payload": {}
}
```

`client_mutation_id` must be unique per device/user and used for idempotency.

## Mutation Types

### `new_school`

Creates a pending `change_requests` row.

Required payload fields:

- School name.
- Latitude.
- Longitude.
- Map pin source.
- Optional address/contact/assessment/agreement/photos if the volunteer completed them together.

Server validation:

- Reject if name or pin is missing.
- Use `school_number = null` in proposed data.
- Official school number is generated only on manager approval.

### `school_edit`

Creates a pending edit request against an existing school.

Required payload fields:

- `school_id`.
- `base_version`.
- Proposed field patch.

Server validation:

- Detect conflict if official version differs from `base_version`.
- Store conflict flag for manager review; do not auto-merge.

### `assessment_submission`

Creates a pending initial assessment review package.

Required payload categories:

- School ID or local pending school reference.
- Address.
- Confirmed map pin.
- Principal/contact name.
- Contact phone.
- Assessment answers.
- Required photo IDs.
- Agreement payload or linked agreement mutation.

Server behavior:

- Create pending change request.
- Mark school visible as `pipeline_stage = assessed` when appropriate.
- Official assessment record is created/updated only after manager approval.

### `agreement_submission`

Creates a pending agreement review package.

Required payload fields:

- Agreement language.
- Agreement terms version.
- Signatory name.
- Signatory authority confirmation.
- Standard terms acceptance.
- Signature photo ID.
- Captured timestamp.

Optional:

- Signatory title.
- Signatory phone.
- Seal/stamp photo.
- Paper fallback photo.

### `photo_upload`

Creates pending photo metadata and optionally a review request.

Photo file upload flow:

1. Android creates local photo record.
2. Android uploads file to private storage pending path.
3. Android calls `mobile_create_photo_record`.
4. Android references returned photo ID in a mutation payload.

### `lifecycle_update`

Creates a pending request to change school status (`pipeline_stage`).

Required:

- School ID.
- Base version.
- Proposed status.
- Optional note.

Manager approval applies the official lifecycle change and creates an audit event.

## Push Response

`mobile_sync_push` should return:

```json
{
  "server_time": "2026-07-01T10:31:00Z",
  "accepted": [
    {
      "client_mutation_id": "local-id",
      "change_request_id": "server-id",
      "status": "pending_review"
    }
  ],
  "rejected": [
    {
      "client_mutation_id": "local-id",
      "code": "missing_required_field",
      "message": "Map pin is required before submission."
    }
  ],
  "id_mappings": [
    {
      "local_entity_id": "local-school-id",
      "server_entity_id": "server-school-id",
      "entity_type": "school"
    }
  ]
}
```

The app should keep rejected sync mutations editable when the error is user-fixable.

## Idempotency

Rules:

- Duplicate `client_mutation_id` from the same user/device returns the existing result.
- Photo upload retry should not create duplicate `photos` rows if checksum/storage path matches an existing pending photo by the same uploader.
- `client_batch_id` should be recorded in `sync_batches`.

## Conflict Handling

Conflicts are manager-mediated for MVP.

Server behavior:

- Compare `base_version` to current official version.
- If different, create the change request anyway with `conflict_detected = true`.
- Include `before_data` and current official data for the review UI.

Manager behavior:

- Apply all, apply some, edit proposed data, reject, or ask for clarification.

## Sync Statuses On Android

Android local statuses:

- `local_only`.
- `queued`.
- `syncing`.
- `synced`.
- `pending_review`.
- `approved`.
- `partially_approved`.
- `rejected`.
- `needs_clarification`.
- `failed`.
- `conflict`.

The Sync screen should group work by these statuses.

## Network Strategy

Use WorkManager for:

- Retrying metadata sync.
- Retrying photo uploads.
- Periodic refresh when allowed.

Use user-initiated sync for large photo batches or when background upload reliability is poor.

## Security Notes

- RPC functions must validate role and active profile server-side.
- Never trust client-provided `submitted_by`; derive it from `auth.uid()`.
- Never trust manager/admin-only fields from Android or volunteer-web payloads.
- Validate all required fields server-side even if Android already validates them.
