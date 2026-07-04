# School Lifecycle

Status: Draft lifecycle specification.

This document defines how Lily Charities tracks a school from first identification through operational library status.

## Core Rule

School lifecycle is tracked with one status field.

The current implementation uses the database field `pipeline_stage` as the school status. Do not build a separate user-facing selection decision field for MVP. The old `selection_outcome` field may exist in the database temporarily for compatibility, but it is not part of the active workflow.

## Statuses

| Status | Meaning |
| --- | --- |
| `identified` | School is known to Lily but has not been fully assessed. |
| `assessed` | Initial school assessment/checklist has been submitted and is waiting for manager review. |
| `selected` | School has been selected for the project. |
| `not_selected` | School was assessed or reviewed and is not selected for the project. |
| `setup_in_progress` | Library setup work has started. |
| `training` | Ambassador and/or lead teacher training is happening or scheduled. |
| `operational` | Library is operating. |

`future_potential` is not part of the MVP status list.

## Default Values

New official school records should default to:

```text
pipeline_stage = identified
```

Volunteer-created basic school proposals use the same default when approved.

When a volunteer submits the initial assessment for review, the visible lifecycle state should become:

```text
pipeline_stage = assessed
```

The assessment data still requires manager review before becoming the official approved assessment.

When a manager reviews the initial assessment:

- Selected school: set `pipeline_stage = selected`.
- Not selected school: set `pipeline_stage = not_selected`.

## Status Entry Expectations

These are guidance rules, not all hard database constraints.

| Status | Expected Data |
| --- | --- |
| `identified` | School name and map pin. |
| `assessed` | Initial school assessment submitted; manager review is pending. |
| `selected` | Manager has selected the school for Lily's project. |
| `not_selected` | Manager has decided not to move forward with the school. |
| `setup_in_progress` | Setup notes or setup start date. |
| `training` | Training scheduled or completed details. |
| `operational` | Operational date or manager confirmation. |

## Normal Transitions

Recommended normal transitions:

```text
identified
    -> assessed
    -> selected OR not_selected

selected
    -> setup_in_progress
    -> training
    -> operational
```

Managers should be allowed to correct statuses when data cleanup requires it.

Volunteer status updates should be submitted as change requests.

## Manager Actions

Managers can:

- Set school status.
- Correct mistakes.
- Add notes explaining status changes.
- Review volunteer-proposed status updates.

Every official lifecycle/status change should create an audit event.

## Volunteer Actions

Volunteers can:

- Submit an initial assessment for manager review.
- Propose school status changes for manager review.
- Add notes/photos supporting a status change if the app exposes that action.

Volunteers cannot directly update official status fields.

## Reporting Needs

Managers should be able to filter by:

- School status.
- Missing assessment.
- Missing agreement.
- Pending approvals.
- Operational status.

## Open Questions

- Should the system enforce normal status transitions, or only warn managers?
- Should `training` represent scheduled training, completed training, or both?
- Should `operational` require an operational date?
