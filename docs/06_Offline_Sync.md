# Offline Sync

Status: Draft sync strategy.

The Android app must work offline. Volunteers should be able to view cached schools, create new school drafts, complete assessments, capture agreements, take photos, close the app, reopen it, and sync later.

## Goals

- Support field work without internet.
- Prevent volunteers from directly overwriting official records.
- Preserve all local drafts until successfully synced or intentionally deleted.
- Make sync status understandable to volunteers.
- Let managers resolve conflicts through the approval workflow.
- Recover from partial failures, app restarts, and poor connectivity.

Required fields are the same whether the app is online or offline. Offline mode changes when data uploads, not what data is required.

Basic school creation and initial assessment are separate workflows. A basic school record can be created with minimal required fields, while the initial assessment workflow requires assessment, agreement, and photos.

## Non-Goals For MVP

- Real-time collaboration.
- Automatic conflict merging.
- Background sync guarantees when Android restricts work.
- Full offline manager dashboard.
- Peer-to-peer sync between devices.

## Local Data Categories

### Cached official data

Read-only data copied from the server for offline use:

- All active schools.
- School contacts.
- Official initial assessment summaries.
- Approved agreement status.
- Library setup status.
- Approved photo metadata and thumbnails when practical.

### Local drafts

Volunteer-created data that has not become a server change request yet:

- New school drafts.
- School edit drafts.
- Assessment drafts.
- Agreement drafts.
- Photo drafts.

### Outbox mutations

Queued sync operations waiting to be sent to the server.

Examples:

- Create change request for new school.
- Create change request for school edit.
- Create change request for assessment submission.
- Create change request for agreement submission.
- Upload photo file.
- Attach uploaded photo to change request.

## Sync Statuses

| Status | Meaning |
| --- | --- |
| `local_only` | Saved on device only. |
| `queued` | Ready to sync when network is available. |
| `syncing` | Currently being uploaded or downloaded. |
| `synced` | Successfully synced with server. |
| `failed` | Sync failed and can be retried. |
| `conflict` | Server data changed since local edit began. |

## Outbox Rules

- Every local submission gets a stable client mutation ID.
- Sync requests must be idempotent using the client mutation ID.
- Failed items stay in the outbox.
- Photo file uploads and metadata submissions can be separate steps.
- A later outbox item should not depend on an earlier item unless the dependency is recorded.
- The user should be able to retry failed sync items.
- The app should show enough error information for support without exposing confusing technical logs.

## Download Sync

The app should download:

- Current user profile and role.
- All active official schools.
- Official contacts.
- Official lifecycle and selection status.
- Official initial assessment summaries.
- Approved agreement status.
- Pending/reviewed status for the volunteer's submitted change requests.

Recommended approach:

- Track `last_successful_sync_at`.
- Fetch records changed since the last sync when possible.
- Fall back to full refresh if incremental sync fails or the app version changes significantly.

## Upload Sync

The app should upload:

- New school proposals.
- School edit proposals.
- Assessment submissions.
- Agreement submissions.
- Photos and evidence files.

Upload order should generally be:

1. Upload files needed by the submission.
2. Create or update photo metadata.
3. Create the change request payload.
4. Mark the local item as synced once the server confirms receipt.

## Conflict Handling

Official records should include a `version`.

When a volunteer starts editing an existing school:

1. Android stores the current official `version`.
2. Android includes that `base_version` in the change request.
3. Server compares `base_version` with current official version.
4. If different, server marks the request as conflict-detected.
5. Manager reviews the proposed change against the current official record.

For MVP, managers resolve conflicts manually. The app should not attempt automatic merges.

## New School Flow

```text
Volunteer creates basic new school offline
    -> local draft saved
    -> basic required fields captured, including map pin
    -> if no map pin can be confirmed, draft can be saved but not submitted
    -> outbox mutation queued
    -> sync creates pending change request
    -> manager approves
    -> server creates official school
    -> next sync maps local draft to official school
```

Volunteers may complete assessment, agreement, and photos for a locally created school before that school is manager-approved. These drafts should attach to the local school ID and later map to the official school if the school is approved.

## Initial Assessment Flow

```text
Volunteer prepares initial assessment offline
    -> school name, address, and map pin confirmed
    -> if no map pin can be confirmed, draft can be saved but not submitted
    -> principal/contact name and phone captured
    -> assessment completed
    -> agreement completed with digital signature
    -> required photos attached
    -> outbox mutations queued
    -> sync creates pending change request package
    -> school is visible as assessed while manager review is pending
    -> manager reviews and may partially approve components
```

## School Edit Flow

```text
Volunteer edits cached school
    -> local draft stores base school version
    -> outbox mutation queued
    -> sync creates pending change request
    -> manager approves/rejects
    -> next sync updates volunteer submission status
```

## Assessment Flow

```text
Volunteer completes checklist offline
    -> assessment draft saved
    -> outbox mutation queued
    -> sync creates assessment_submission change request
    -> manager approves
    -> official assessment record created or updated
```

## Agreement Flow

```text
Volunteer captures app-native agreement offline
    -> agreement language selected independently from app language
    -> agreement text version stored
    -> signatory details stored
    -> acceptance confirmations stored
    -> required digital signature stored locally
    -> optional seal/paper photos stored locally
    -> file uploads queued
    -> agreement_submission change request queued
    -> manager approves
    -> official agreement record created
    -> generated PDF created after approval when online
```

## Photo Flow

```text
Volunteer captures photo offline
    -> file stored locally
    -> metadata draft saved
    -> upload queued
    -> file uploaded to storage
    -> metadata synced
    -> photo appears in review context
```

## Error Recovery

The app should handle:

- No network.
- Authentication expired.
- Partial photo upload failure.
- Server validation failure.
- Duplicate submission retry.
- Server-side conflict detection.
- App restart during sync.

Recommended user-facing states:

- Waiting for internet.
- Uploading.
- Needs attention.
- Synced.
- Reviewed.
- Rejected.

## Sync Screen Requirements

The Sync screen should show:

- Last successful sync time.
- Number of queued items.
- Number of failed items.
- Number of pending manager reviews.
- Per-item status for unsynced or failed submissions.
- Retry action.
- Clear explanation when the app is offline.

## Data Retention

- Local drafts should remain until submitted or deleted by the volunteer.
- Synced submissions should remain visible in submission history.
- Local photo files should not be deleted until upload is confirmed.
- The app may later clean up local copies of approved photos if storage becomes a problem.

## Implementation Notes

- Use Room for local persistence.
- Use WorkManager for retryable background sync.
- Use foreground or user-initiated sync for large photo uploads when needed.
- Use stable client-generated IDs for all offline-created drafts.
- Keep sync logic in a repository/service layer, not directly in UI screens.
