# Android App

Status: Draft app specification.

Primary user: Volunteer.

The Android app is the field collection tool for volunteers in Bangladesh. It must work offline first and sync later.

For MVP, the native Android app is volunteer-only. Managers may use a mobile app later, but manager mobile workflows are not part of MVP.

## Core Principles

- Offline-first.
- Auto-save all field work.
- Simple workflows for low-connectivity environments.
- Volunteers propose changes; they do not directly overwrite official school records.
- Show Lily school number with school name when available.
- Address is the human-readable location when available; map pin is required.
- Device GPS may suggest the starting map location, but the user must confirm/place the map pin.
- Use native screens for forms and agreements rather than asking volunteers to edit PDFs.
- Show sync state clearly.

## Planned Screens

- Login.
- Schools.
- School Details.
- New School.
- Edit School.
- Initial School Assessment.
- School Agreement.
- Photos.
- Sync.
- Profile.

## Navigation

```text
Login
    -> Schools
        -> School Details
            -> Propose Edit
            -> Initial Assessment
            -> School Agreement
            -> Photos
        -> New School
        -> Sync
        -> Profile
```

## Login

Requirements:

- Email/password login through Supabase Auth or chosen auth provider.
- Login requires internet.
- After login, cached approved data remains available offline.
- App should clearly handle expired sessions.

## Schools

The Schools screen should show all active approved schools cached for offline use.

Features:

- Search by school name, Lily school number, and address.
- Filter by school status.
- Show sync/status markers.
- Open School Details.
- Add New School.
- Open Sync screen.

## School Details

Volunteers should see official data as read-only.

Sections:

- Overview.
- Lily school number.
- Contacts.
- Assessment.
- Agreement.
- Photos.
- Setup status, if available.

Actions:

- Propose edit.
- Propose lifecycle change.
- Start or update assessment draft.
- Capture agreement.
- Add photos.

## New School

Basic new school creation should be minimal. It is separate from the heavier initial assessment workflow.

Required fields for creating a basic school record:

- School name.
- Map pin.

Optional fields:

- Area.
- City.
- District.
- Division.
- Country.
- Principal contact.
- Notes.
- Assessment.
- Agreement.
- Photos.

Submitting a volunteer-created school creates a `new_school` change request after sync. Manager-created schools can be created directly as official records in the web dashboard.

Volunteer-created drafts do not require a Lily school number. The number should be auto-generated, with manager override, when a manager approves the school as official.

The map-pin flow should:

- Show a map.
- Try to use device GPS to suggest the initial pin location when available.
- Allow the user to manually move/place the pin.
- Require the user to confirm the pin before submission.
- Allow saving a draft if no pin can be confirmed, but prevent submission until the pin exists.

Required fields should be the same whether the app is online or offline. Offline submissions should remain local until internet is available, then upload automatically.

Volunteers may complete assessment, agreement, and photos for a locally created school before that school is manager-approved. These drafts should stay attached to the local school until sync maps them to an official school.

Initial assessment workflow direction:

- School name is required.
- Address is required.
- Map pin is required.
- Principal/contact name is required.
- Contact phone is required.
- Assessment is required.
- Agreement is required.
- Photos are required.
- Required photo types are school exterior, proposed library room/space, classroom or learning environment, and agreement signature image.
- Student photos are not required.
- Exact assessment-required fields still need to be defined.

## Edit School

Editing an existing school creates a proposed change.

Requirements:

- Store the official record version at edit start.
- Show volunteers that changes require manager approval.
- Save draft offline.
- Sync as `school_edit` change request.

## Initial School Assessment

The assessment is the digital version of the school selection checklist.

Sections:

- School information.
- Geographic location.
- Existing infrastructure.
- Administrative support.
- Student population.
- Grade-level counts.
- Overall suitability.
- Final remarks.

Behavior:

- Auto-save after field changes.
- Allow partial draft.
- Validate required fields before submission once the exact required field list is finalized.
- Sync as `assessment_submission` change request.

## School Agreement Flow

The school agreement should be digitized as an app-native screen.

Recommended flow:

1. Volunteer opens the School Agreement screen for a school.
2. App asks which language to show the agreement in.
3. App shows the agreement text as readable numbered terms.
4. App fills the school name from the selected school record when available.
5. Volunteer enters signatory name, title, and optional contact details.
6. Signatory confirms they are authorized to agree on behalf of the school.
7. Signatory confirms the school accepts the listed terms.
8. App opens a signature pad, ideally in horizontal orientation.
9. Signatory draws their signature on the screen.
10. Volunteer optionally captures a photo of the school seal/stamp as supporting evidence, if the school uses one.
11. Volunteer optionally captures a photo of a physically signed paper agreement as a fallback/supporting artifact.
12. App saves the agreement locally and queues it for sync.

Design notes:

- Show the agreement as app content, not an embedded PDF.
- Bundle the current agreement text in the app so it works offline.
- Track the agreement text version used at signing time.
- Support both Bangla and English agreement text.
- Keep app UI language separate from agreement language.
- Let the volunteer/signatory select the agreement language for each agreement.
- Store signature, seal, and paper fallback images locally until sync succeeds.
- After sync and manager approval, the server can generate a clean PDF snapshot.

## Photos

Photo features:

- Capture photo from camera.
- Select photo type.
- Add optional caption.
- Attach photo to school, assessment, agreement, or setup context.
- Store locally until upload succeeds.
- Show upload/review status.

Photo types:

- School exterior.
- Classroom.
- Library space.
- Bookshelf.
- Students (optional; not required for initial assessment).
- Agreement signature.
- School seal.
- Paper agreement.
- Training.
- Other.

## Sync

The Sync screen should show:

- Last successful sync time.
- Queued submissions.
- Failed submissions.
- Pending manager reviews.
- Rejected submissions.
- Retry action.
- Clear offline state.

See `06_Offline_Sync.md` for sync behavior.

## Profile

The Profile screen should show:

- User name.
- Role.
- Email.
- App language preference.
- Last successful sync.
- Log out.
- App version.

## Local Storage

Use Room for:

- Cached official schools.
- Cached contacts.
- Cached assessment summaries.
- Cached agreement status.
- Draft new schools.
- Draft edits.
- Draft assessments.
- Draft agreements.
- Draft photos.
- Sync outbox.

## Background Work

Use WorkManager for:

- Retryable sync.
- Photo uploads.
- Change request submission.
- Periodic data refresh when allowed.

Large photo uploads may need a user-initiated sync action for reliability.

## Open Questions

- Should assessment be one long form or a section-by-section wizard?
