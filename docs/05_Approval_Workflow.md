# Approval Workflow

Status: Draft workflow specification.

Volunteers submit proposed data. Managers decide whether it becomes official.

```text
Volunteer creates or edits data
    -> saved locally on Android, or submitted through the limited volunteer web dashboard
    -> synced/submitted as pending change request
    -> manager reviews
    -> approve / reject / needs clarification
    -> official database updated only if approved
    -> audit history recorded
```

## Principles

- Managers own official school records.
- Volunteers can submit proposals but cannot directly overwrite official data.
- Managers can edit volunteer-proposed data during review before approving.
- Managers can partially approve multi-part submissions.
- Every approval decision should be traceable.
- Rejections should explain what needs to change.
- Volunteers can edit and resubmit rejected requests.
- Offline submissions should be safe to retry without creating duplicates.

## Reviewable Submission Types

| Type | Description |
| --- | --- |
| `new_school` | Volunteer proposes a new school. |
| `school_edit` | Volunteer proposes changes to an existing school. |
| `assessment_submission` | Volunteer submits the initial school assessment/checklist. |
| `agreement_submission` | Volunteer submits app-native school agreement data and evidence. |
| `photo_upload` | Volunteer submits photos for manager review. |
| `lifecycle_update` | Volunteer proposes school status changes. |

## Statuses

| Status | Meaning |
| --- | --- |
| `draft` | Saved locally or server-side but not submitted for manager review. |
| `pending_review` | Waiting for manager review. |
| `needs_clarification` | Manager needs more information before final decision. |
| `approved` | Accepted and applied to official records. |
| `partially_approved` | Some components were accepted while others were rejected or need clarification. |
| `rejected` | Not accepted. Official records are not changed. |
| `cancelled` | Withdrawn or superseded. |

## Manager Decisions

| Decision | Result |
| --- | --- |
| Approve | Apply proposed data to official records and create audit event. |
| Reject | Do not apply proposed data; require rejection reason. |
| Needs clarification | Keep request open and ask submitter for more information. |

## New School Review

Manager review should show:

- Lily school number if already assigned, or an assignment/preview if the school is becoming official.
- Proposed school name.
- Address and location fields.
- Required map pin.
- Proposed contacts.
- Attached assessment, agreement, and photos according to the initial assessment requirements.
- Submitter and submission time.

When approved:

- Create official `schools` row for approved school data.
- Auto-generate the Lily `school_number`, unless the manager overrides it.
- Create related official records as approved.
- Map volunteer draft to official school on next sync.

Basic school creation is separate from the heavier initial assessment workflow. Managers and volunteers can create a minimal school first; assessment, agreement, and photos may be part of the initial assessment workflow.

## School Edit Review

Manager review should show:

- Current official values.
- Proposed values.
- Field-level differences.
- Base version used by volunteer.
- Conflict warning if official data changed after the volunteer started editing.

When approved:

- Update only approved fields.
- Increment official record version.
- Create audit event with before/after values.

Managers may correct proposed values before approving. The audit event should preserve the volunteer's original proposed data and the manager-edited applied data.

## Assessment Review

Manager review should show:

- School being assessed.
- Checklist sections and answers.
- Grade-level counts.
- Overall fit recommendation.
- Notes and photos.

When approved:

- Create or update official `school_assessments`.
- If the manager selects the school, set `pipeline_stage = selected`.
- If the manager does not select the school, set `pipeline_stage = not_selected`.
- Create audit event.

While the initial assessment is pending manager decision, the school should be visible as `pipeline_stage = assessed`.

## Agreement Submission Review

The school agreement should be reviewed as structured app data, not merely as a PDF upload.

Manager review should show:

- School record being linked to the agreement.
- School name represented in the agreement.
- Signatory name, title, and contact details.
- Agreement language and terms version.
- Exact agreement text snapshot used at signing time.
- Date of agreement.
- Confirmation that the signer is authorized.
- Confirmation that the school accepts the listed terms.
- Captured signature image.
- Optional school seal/stamp photo.
- Optional paper agreement fallback photo.

When approved:

- Create or update the official `school_agreements` record.
- Mark signature/seal/paper evidence as approved.
- Generate a PDF snapshot from the structured agreement data when possible.
- Add an audit event.

When rejected:

- Do not update the official agreement record.
- Store the manager's rejection reason.
- Keep submitted evidence hidden from official views.
- Add an audit event.

Recommendation: signature, seal, and paper fallback photos should be bundled into the agreement review rather than reviewed independently in the general photo queue.

Digital signature is required for the app-native agreement. School seal/stamp photo means a photo of an official school stamp/seal if the school uses one; it and the paper agreement fallback photo are optional supporting evidence unless Lily later decides otherwise.

## Photo Review

Photo review should show:

- Photo preview.
- Photo type.
- School or submission context.
- Caption.
- Uploaded by.
- Uploaded at.

When approved:

- Mark photo as approved.
- Associate it with the official school or related record.

When rejected:

- Mark photo as rejected.
- Store rejection reason.
- Hide from official school views.

## Clarification Flow

If a manager selects `needs_clarification`:

1. Manager enters a question or instruction.
2. Volunteer sees the request status and message after sync.
3. Volunteer updates or resubmits the relevant draft if needed.
4. Manager reviews the updated request.

For MVP, this can be simple. Full threaded comments are optional.

## Partial Approval

Managers may partially approve a multi-part submission.

Example:

```text
Submission contains:
    - New school details
    - Assessment
    - Agreement
    - Photos

Manager decision:
    - Approve school details
    - Approve assessment
    - Request clarification on agreement
    - Reject one poor-quality photo
```

The system should track decisions at the component level when a submission contains multiple parts.

MVP feedback can be a single overall manager note or rejection reason. Itemized per-field feedback is optional and can be added later if managers need it.

If the manager approves only the school details, the school should become an official school immediately. Rejected or clarification-needed assessment, agreement, or photo components should not block the approved school details from becoming official.

## Resubmission

Rejected requests should remain visible to the volunteer with the rejection reason.

Volunteers should be able to edit and resubmit a rejected request. The resubmitted request should preserve a link to the previous rejected request for history.

## Notifications

MVP can start without push notifications if the Sync screen and submission history are clear.

Useful future notifications:

- Volunteer submission approved.
- Volunteer submission rejected.
- Manager needs clarification.
- Manager has pending approvals.

## History

Every approval decision should produce an audit event showing:

- Who submitted the request.
- Who reviewed it.
- What changed.
- When it was reviewed.
- Whether it was approved, rejected, or sent back for clarification.
- Manager notes or rejection reason.

## Open Questions

- Should photo review be separate for non-agreement photos only?
- Should clarification create a new change request or update the existing one?
- What component-level statuses are needed for partial approval?
