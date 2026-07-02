# School Lifecycle

Status: Draft lifecycle specification.

This document defines how Lily Charities tracks a school from first identification through operational library status.

## Core Rule

Pipeline stage and selection outcome are separate fields.

Example:

```text
Pipeline stage: Assessed
Selection outcome: Future Potential
```

This means the school was assessed but is not currently selected for implementation.

## Pipeline Stages

| Stage | Meaning |
| --- | --- |
| `identified` | School is known to Lily but has not been fully assessed. |
| `assessed` | Initial school assessment/checklist has been submitted and is awaiting or has received a manager selection decision. |
| `selected` | School has been selected for the project. |
| `setup_in_progress` | Library setup work has started. |
| `training` | Ambassador and/or lead teacher training is happening or scheduled. |
| `operational` | Library is operating. |

## Selection Outcomes

| Outcome | Meaning |
| --- | --- |
| `pending` | No final selection decision yet. |
| `selected` | School is selected for the project. |
| `future_potential` | School may be a fit later, but not selected now. |
| `not_selected` | School is not a fit. |

## Default Values

New official school records should default to:

```text
pipeline_stage = identified
selection_outcome = pending
```

Volunteer-created basic school proposals use the same defaults when approved.

When a volunteer submits the initial assessment for review, the visible lifecycle state should become:

```text
pipeline_stage = assessed
selection_outcome = pending
```

The assessment data still requires manager review before becoming the official approved assessment.

When a manager approves the school for selection, the school should move to:

```text
pipeline_stage = selected
selection_outcome = selected
```

If the manager decision is `future_potential` or `not_selected`, the school should remain:

```text
pipeline_stage = assessed
selection_outcome = future_potential OR not_selected
```

## Stage Entry Expectations

These are guidance rules, not all hard database constraints.

| Stage | Expected Data |
| --- | --- |
| `identified` | School name and map pin. |
| `assessed` | Initial school assessment submitted; manager decision may still be pending. |
| `selected` | Manager selection decision and selection outcome set to `selected`. |
| `setup_in_progress` | Setup notes or setup start date. |
| `training` | Training scheduled or completed details. |
| `operational` | Operational date or manager confirmation. |

## Allowed Stage Transitions

Recommended normal transitions:

```text
identified
    -> assessed
    -> selected
    -> setup_in_progress
    -> training
    -> operational
```

Managers should be allowed to correct stages when data cleanup requires it.

Volunteer stage updates should be submitted as change requests.

## Selection Outcome Transitions

Recommended transitions:

```text
pending
    -> selected OR future_potential OR not_selected
```

Managers may move a school back to `pending` if a decision was made in error or needs reconsideration.

## Stage And Outcome Examples

| Pipeline Stage | Selection Outcome | Meaning |
| --- | --- | --- |
| `identified` | `pending` | School is known but not assessed or selected. |
| `assessed` | `pending` | Checklist is complete but no decision yet. |
| `assessed` | `future_potential` | School is not selected now but may be reconsidered. |
| `assessed` | `not_selected` | School was assessed and rejected. |
| `selected` | `selected` | School is selected but setup has not started. |
| `setup_in_progress` | `selected` | Selected school is being prepared. |
| `training` | `selected` | Training is underway or scheduled. |
| `operational` | `selected` | Library is active. |

## Manager Actions

Managers can:

- Set pipeline stage.
- Set selection outcome.
- Correct mistakes.
- Add notes explaining status changes.
- Review volunteer-proposed lifecycle updates.

Every official lifecycle or outcome change should create an audit event.

## Volunteer Actions

Volunteers can:

- Submit an initial assessment for manager review.
- Propose lifecycle stage or selection outcome changes for manager review.
- Add notes/photos supporting a status change if the app exposes that action.

Volunteers cannot directly update official stage or outcome fields.

## Reporting Needs

Managers should be able to filter by:

- Pipeline stage.
- Selection outcome.
- Stage plus outcome combination.
- Missing assessment.
- Missing agreement.
- Pending approvals.
- Operational status.

## Open Questions

- Should the system enforce normal stage transitions, or only warn managers?
- Should `training` represent scheduled training, completed training, or both?
- Should `operational` require an operational date?
