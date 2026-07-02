# Wireframes

Status: Draft lightweight wireframes.

These are behavior and layout sketches, not visual designs. The goal is to define what each screen contains and how users move through core workflows.

## Android App

### Login

```text
+--------------------------------+
| Lily Charities                 |
|                                |
| Email                          |
| [__________________________]   |
| Password                       |
| [__________________________]   |
|                                |
| [ Log In ]                     |
|                                |
| Offline field app              |
+--------------------------------+
```

Notes:

- Login requires internet.
- After login, cached data should remain available offline.

### Schools

```text
+--------------------------------+
| Schools              [Sync]    |
| Search schools...              |
| Filters: Stage, Outcome        |
|                                |
| + School name                  |
|   Address/area                 |
|   Stage - Outcome              |
|   Sync/status marker           |
|                                |
| + School name                  |
|   Address/area                 |
|   Stage - Outcome              |
|                                |
| [ Add School ]                 |
+--------------------------------+
```

Actions:

- Open school details.
- Search cached schools.
- Add new school.
- Open sync screen.

### School Details

```text
+--------------------------------+
| < School Name                  |
| No. SCHOOL-0020                |
| Address                        |
| Stage: Assessed                |
| Outcome: Future Potential      |
|                                |
| Tabs/sections:                 |
| - Overview                     |
| - Contacts                     |
| - Assessment                   |
| - Agreement                    |
| - Photos                       |
|                                |
| [ Propose Edit ]               |
| [ Start Assessment ]           |
| [ Capture Agreement ]          |
| [ Add Photos ]                 |
+--------------------------------+
```

Notes:

- Official data is read-only for volunteers.
- Actions create drafts or change requests.

### New School

```text
+--------------------------------+
| < New School                   |
| School name *                  |
| [__________________________]   |
| Map pin *                      |
| [ Set Map Pin ]                |
| [ Use Current Location ]       |
|                                |
| [ Save Draft ] [ Continue ]    |
+--------------------------------+
```

Required for draft submission:

- School name.
- Map pin.

If the volunteer cannot set a map pin or use current location, the app should allow saving the draft but should not allow continuing/submitting.

Initial assessment next steps:

- Complete assessment.
- Capture agreement.
- Add photos.

Address, principal/contact name, contact phone, agreement, and required photos are required for initial assessment. Required photo categories are school exterior, proposed library room/space, classroom or learning environment, and agreement signature image. Exact assessment field validation still needs to be defined.

### Initial Assessment

```text
+--------------------------------+
| < Initial Assessment           |
| Section 1 of 5                 |
|                                |
| Geographic Location            |
| [ ] Located in Dhaka District  |
| [ ] Underprivileged/low income |
| Notes                          |
| [__________________________]   |
|                                |
| [ Back ]              [ Next ] |
+--------------------------------+
```

Sections:

- School information.
- Geographic location.
- Existing infrastructure.
- Administrative support.
- Student population.
- Overall suitability.
- Final remarks.

### Student Counts

```text
+--------------------------------+
| Student Population             |
| Play       [____]              |
| KG         [____]              |
| Grade 1    [____]              |
| Grade 2    [____]              |
| Grade 3    [____]              |
| Grade 4    [____]              |
| Grade 5    [____]              |
| Total      [auto/manual]       |
|                                |
| [ Back ]              [ Next ] |
+--------------------------------+
```

### School Agreement

```text
+--------------------------------+
| < School Agreement             |
| School: Example School         |
| Agreement language: Bangla/English |
|                                |
| Agreement terms                |
| 1. Dedicated room...           |
| 2. 30 students for photos...   |
| 3. Student survey support...   |
| ...                            |
|                                |
| Signatory name *               |
| [__________________________]   |
| Signatory title                |
| [__________________________]   |
|                                |
| [ ] Authorized to sign         |
| [ ] School accepts terms       |
|                                |
| [ Capture Signature ]          |
| [ Add Seal Photo ]             |
| [ Add Paper Fallback Photo ]   |
|                                |
| [ Save Draft ] [ Submit ]      |
+--------------------------------+
```

Notes:

- Agreement text is app-native and bundled for offline use.
- Agreement language is selected separately from app language.
- Signature is required and captured on device, ideally using a horizontal signature pad.
- Seal and paper fallback photos are optional supporting evidence.
- Sync creates an agreement submission change request.

### Photos

```text
+--------------------------------+
| < Photos                       |
| [ Take Photo ] [ Choose Type ] |
|                                |
| Pending upload                 |
| - Library space photo          |
| - School exterior photo        |
|                                |
| Uploaded                       |
| - Approved photo               |
+--------------------------------+
```

Photo types:

- School exterior.
- Classroom.
- Library space.
- Bookshelf.
- Students (optional, not required for initial assessment).
- Agreement signature.
- School seal.
- Paper agreement.
- Training.
- Other.

### Sync

```text
+--------------------------------+
| Sync                           |
| Last synced: Today 10:32       |
|                                |
| Queued: 3                      |
| Failed: 1                      |
| Pending manager review: 5      |
|                                |
| Items needing attention        |
| - Photo upload failed          |
|   [ Retry ]                    |
|                                |
| [ Sync Now ]                   |
+--------------------------------+
```

## Manager Web Dashboard

### Schools Table

```text
+----------------------------------------------------------------+
| Schools                                   [Export] [New School] |
| Search...                                                       |
| Filters: Stage | Outcome | District | Missing assessment        |
|         Missing agreement | Pending requests                    |
|                                                                |
| No.         Name        District   Stage        Outcome       Updated |
| SCHOOL-0020 Example     Dhaka      Assessed     Future Pot.   Jul 1  |
| SCHOOL-0001 Example 2   Dhaka      Operational  Selected      Jun 28 |
+----------------------------------------------------------------+
```

### School Details

```text
+----------------------------------------------------------------+
| SCHOOL-0020 - School Name                        [Edit] [Export]|
| Address                                                        |
| Stage: Assessed                  Outcome: Future Potential      |
|                                                                |
| Sections                                                       |
| - Overview                                                     |
| - Contacts                                                     |
| - Assessment                                                   |
| - Agreement                                                    |
| - Photos                                                       |
| - Change history                                               |
+----------------------------------------------------------------+
```

### Approval Queue

```text
+----------------------------------------------------------------+
| Approval Queue                                                  |
| Filters: Type | Status | Submitter | Date                       |
|                                                                |
| Type          School             Submitted By   Submitted At   Status |
| New school    Pending number     Volunteer A    Jul 1          Pending|
| Agreement     SCHOOL-0020        Volunteer B    Jul 1          Pending|
| Photo         SCHOOL-0020        Volunteer A    Jun 30         Pending|
+----------------------------------------------------------------+
```

### Change Request Review

```text
+----------------------------------------------------------------+
| Review Change Request                                           |
| Type: School Edit                                               |
| School: Example School                                          |
| Submitted by: Volunteer A                                       |
|                                                                |
| Field              Current Value       Proposed Value           |
| Address            Old address         New address              |
| District           blank               Dhaka                    |
|                                                                |
| Manager notes                                                |
| [__________________________________________________________]    |
|                                                                |
| [Approve] [Reject] [Needs Clarification]                       |
+----------------------------------------------------------------+
```

### Agreement Review

```text
+----------------------------------------------------------------+
| Agreement Review                                                |
| School: Example School                                          |
| Date: Jul 1, 2026                                               |
| Signatory: Name, Principal                                      |
| Language: Bangla                                                |
| Terms version: school_selection_agreement_v1                    |
|                                                                |
| Confirmations                                                   |
| [x] Authorized signer                                           |
| [x] School accepts terms                                        |
|                                                                |
| Signature image                                                 |
| Seal photo, if present                                          |
| Paper fallback photo, if present                                |
|                                                                |
| [Approve] [Reject] [Needs Clarification]                       |
+----------------------------------------------------------------+
```

### Reports / Export

```text
+----------------------------------------------------------------+
| Reports / Export                                                |
| Export type: Schools / Assessments / Agreements / Approvals     |
| Filters                                                        |
| [ Stage ] [ Outcome ] [ District ] [ Date range ]               |
|                                                                |
| [ Download CSV ] [ Download Excel ]                             |
+----------------------------------------------------------------+
```

## Open Wireframe Questions

- Should Android use tabs or stacked sections on School Details?
- Should assessment be one long form or a wizard by section?
- Should photo capture happen from each workflow or from one shared photo screen?
- Should manager approval review show JSON diff details for technical users?
