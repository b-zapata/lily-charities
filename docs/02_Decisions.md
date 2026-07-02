# Decisions

Status: Living decision log.

This document records product and architecture decisions that should guide implementation. Update it whenever a decision changes or a major open question is resolved.

## Settled Decisions

| ID | Decision | Rationale |
| --- | --- | --- |
| D001 | Build two main apps: Manager Web Dashboard and native Android app. | Managers and volunteers have different workflows, devices, and connectivity needs. |
| D002 | Android app is offline-first. | Volunteers in Bangladesh may not have reliable internet during school visits. |
| D003 | Address is the primary human-readable location field when available, but it is not required for basic school creation. | Basic school creation should be very lightweight; the map pin is the required location anchor. |
| D004 | A map pin is mandatory and required. | Lily wants every school record/submission to include precise coordinates in addition to address. The app may use device GPS to suggest the initial pin, but the user must confirm/place the map pin. |
| D005 | Managers own the official school database. | Lily needs one trusted source of truth. |
| D006 | Managers and volunteers can both initiate new school creation. | Managers can create official schools directly; volunteer-created schools require manager approval before becoming official. |
| D007 | Volunteers submit proposed changes for approval. | Volunteer-created schools and edits require manager review before becoming official. |
| D008 | Use change requests for approval workflow. | A single review mechanism can handle volunteer-created schools, edits, assessments, agreements, photos, and lifecycle proposals. |
| D009 | Track pipeline stage separately from selection outcome. | A school can be assessed but marked future potential, or selected without yet being operational. |
| D010 | Initial school assessment/checklist is MVP. | It replaces an existing paper workflow. |
| D011 | Each school has one official initial assessment. | Later updates should edit the existing official information rather than create multiple official initial assessments. |
| D012 | Formal long-term impact surveys are V2+. | They are important later but not required to replace the current school-selection workflow. |
| D013 | Basic school creation is separate from the heavier initial assessment workflow. | Managers and volunteers can create a minimal school record first; the initial assessment workflow requires more data. |
| D014 | School agreement capture is MVP. | It replaces the current paper agreement and supports setup readiness. |
| D015 | Agreement should be app-native, not PDF annotation. | A native screen is easier offline, easier on phones, and easier to validate than asking volunteers to sign on top of a PDF. |
| D016 | App language and agreement language are separate choices. | A volunteer may use the app in one language while showing/generating the agreement in another. |
| D017 | Agreement text should be available in both Bangla and English. | The user should select the agreement language each time an agreement is prepared. |
| D018 | Agreement requires a captured digital signature. | The app should support a signature pad flow, likely rotating the phone horizontally for signing. |
| D019 | Keep paper agreement photo as optional fallback/supporting evidence. | Some schools may prefer stamped paper, but app-native signature remains required unless this decision changes. |
| D020 | Generate agreement PDF after approval. | The PDF should be an artifact from structured data, not the field workflow source of truth. |
| D021 | Volunteers see all active schools. | This keeps the field app simple and avoids assignment management in MVP. |
| D022 | Rejected requests remain visible to volunteers with rejection reason. | Volunteers need to understand what happened and what to fix. |
| D023 | Volunteers can edit and resubmit rejected requests. | This supports correction without starting from scratch. |
| D024 | Managers can edit volunteer-proposed data during review. | Managers may communicate with volunteers and correct proposed data directly before approving. |
| D025 | Partial approval is allowed for multi-part submissions. | Managers can approve some parts of a submission and reject or request clarification on others. |
| D026 | Basic new school creation requires only school name and map pin. | Address, contact, assessment, agreement, and photos belong to the heavier initial assessment workflow. |
| D027 | Initial assessment submission moves the school into `assessed` / `pending`; manager selection approval moves it to `selected` / `selected`. | `assessed` means the initial assessment has been submitted and is awaiting or has received a manager decision. If the manager decision is `future_potential` or `not_selected`, the school stays in `assessed` with that outcome. |
| D028 | Volunteers can complete assessment, agreement, and photos for a newly created school before that school is manager-approved. | The app should support attaching the heavier assessment package to a local/pending school. |
| D029 | If a manager partially approves only the school details, the school becomes official immediately. | Other components can remain rejected or needing clarification without blocking official school creation. |
| D030 | Manager-edited proposed data does not require volunteer reconfirmation. | Managers can approve directly after correcting proposed data. |
| D031 | Web dashboard is manager-only for MVP. | Volunteers should not access the web dashboard in the MVP. |
| D032 | Native Android app is volunteer-only for MVP. | Managers may use a mobile app later, but it is not required for MVP. |
| D033 | The team will create the Bangla agreement translation, then Lily managers will review it. | Translation is a required content task before production agreement capture. |
| D034 | Device GPS/current location may provide the required map pin, but a submission cannot be sent until a pin is confirmed. | If map tiles and current location are unavailable, volunteers may save a draft but cannot submit the school or assessment yet. |
| D035 | Use Lily's existing school number format as a first-class manager-visible identifier. | Existing data uses values such as `SCHOOL-0020`, and managers already refer to schools by school name plus school number. Store this separately from the internal UUID primary key. |
| D036 | Imported spreadsheet/current database data should become official data with cleanup flags as needed. | Existing Lily data should not be forced through volunteer approval, but uncertain fields should be visible for manager cleanup. |
| D037 | No special photo privacy rules for MVP. | Volunteers and managers can see school photos and any optional student photos for now. Student photos are not required for initial assessment. |
| D038 | No high-fidelity Figma mockups for MVP. | Lightweight markdown wireframes are enough to define behavior and layout. |
| D039 | MVP prioritizes function over visual polish. | The goal is operational replacement, not a polished public-facing product. |
| D040 | Avoid collecting individual student records in MVP. | Aggregate counts are enough for the selection workflow. |
| D041 | Required initial assessment photos are school exterior, proposed library room/space, classroom or learning environment, and agreement signature image. | Student photos are not required. These photo categories support manager review without creating unnecessary student-photo collection requirements. |
| D042 | Volunteers may propose lifecycle stage or selection outcome changes. | Proposed lifecycle changes require manager approval like other volunteer-submitted changes. |
| D043 | Partial approval feedback can start as one overall manager note. | Component-level approval is required, but itemized per-field feedback can be added later if the review UI needs it. |
| D044 | Auto-generate Lily school numbers when new schools become official, with manager override. | This preserves the existing `SCHOOL-####` convention while avoiding manual numbering work for routine approvals. |
| D045 | Imported schools with missing or invalid map pins should not block launch. | Existing data is incomplete; import those records as official data with cleanup flags, then let managers and volunteers correct map pins over time. New school and initial assessment submissions still require a confirmed pin. |
| D046 | Store `donor_id` on school records for MVP. | Donor workflows are not important for MVP, but the current database includes donor references and Lily may clarify their meaning later. |
| D047 | Use the recommended MVP stack: Supabase/Postgres/Auth/Storage, Next.js/React for web, and native Kotlin/Room/WorkManager for Android. | This keeps the system lightweight, offline-capable, and implementation-friendly for the two-app MVP. |
| D048 | Phase 1 should be docs-first technical design before implementation scaffolding. | Schema, RLS, storage, sync, import, Android local data, and web route contracts should be clear before agents start building. |

## Open Decisions

These should be resolved before backend schema implementation or during Phase 0.

| ID | Question | Why It Matters | Current Notes |
| --- | --- | --- | --- |
| O001 | What exact assessment fields are required before submitting the initial assessment for review? | Affects Android validation and manager review burden. | The initial assessment itself is required, but the exact per-field validation still needs detail. |

## Deferred Decisions

These are intentionally deferred beyond MVP unless Lily changes scope:

- Lead Teacher portal account model.
- Monthly library usage report schema.
- Formal impact survey schema.
- Donor-facing data model.
- Public website integration.
- Native iOS offline strategy.
- Advanced analytics warehouse.

## How To Update This Doc

When a decision changes:

1. Add or update the decision row.
2. Note the new rationale.
3. Update any affected docs.
4. Keep old reasoning if it helps explain the change.
