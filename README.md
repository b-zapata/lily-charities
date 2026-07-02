# Lily Charities Operations System

Internal operations system for Lily Charities.

The MVP replaces the current paper-and-Excel workflow for school identification, initial assessment, agreement capture, school data updates, manager review, lifecycle tracking, photos, and export.

## Planned Apps

- Manager Web Dashboard for Rabin, Lauri, and other managers. Web is manager-only for MVP.
- Native Android App for volunteers in Bangladesh. Android is volunteer-only for MVP.

## MVP Principles

- Android works offline first.
- Managers own official school records.
- Volunteers submit proposed changes for approval.
- Preserve Lily school numbers, such as `SCHOOL-0020`, separately from internal IDs.
- Address is the human-readable location when available; map pin is required.
- Pipeline stage and selection outcome are separate.
- Initial school assessment is MVP.
- App-native school agreement capture is MVP.
- Long-term impact surveys are V2+.

## Documentation

Read in this order:

1. [Roadmap](docs/00_Roadmap.md)
2. [Product Requirements](docs/01_Product_Requirements.md)
3. [Decisions](docs/02_Decisions.md)
4. [Data Model](docs/03_Data_Model.md)
5. [School Lifecycle](docs/04_School_Lifecycle.md)
6. [Approval Workflow](docs/05_Approval_Workflow.md)
7. [Offline Sync](docs/06_Offline_Sync.md)
8. [Android App](docs/07_Android_App.md)
9. [Web Dashboard](docs/08_Web_Dashboard.md)
10. [Technical Architecture](docs/09_Technical_Architecture.md)
11. [Wireframes](docs/10_Wireframes.md)
12. [Backend Schema](docs/11_Backend_Schema.md)
13. [RLS And Storage Policies](docs/12_RLS_Storage_Policies.md)
14. [Sync Contracts](docs/13_Sync_Contracts.md)
15. [Import Plan](docs/14_Import_Plan.md)
16. [Android Local Data](docs/15_Android_Local_Data.md)
17. [Web Dashboard Technical Plan](docs/16_Web_Dashboard_Technical_Plan.md)
18. [Implementation Status](docs/17_Implementation_Status.md)

Source paper documents are stored in [docs/original_documents](docs/original_documents).
Source planning data is stored in [docs/source_data](docs/source_data).

## Current Status

Phase 1 technical design is in progress. The current docs translate the product model into Supabase/PostgreSQL schema, RLS policies, storage policies, sync contracts, import planning, Android local data, and web dashboard implementation contracts.

## Development

Install dependencies:

```bash
pnpm install
```

On Windows PowerShell, use `pnpm.cmd` if script execution policy blocks the `.ps1` shims:

```powershell
pnpm.cmd install
```

Run the manager web dashboard:

```bash
pnpm dev
```

PowerShell:

```powershell
pnpm.cmd dev
```

Validate the local school CSV, if present:

```bash
pnpm validate:school-csv
```

Generate local import SQL from the ignored source CSV:

```bash
pnpm generate:school-import
```

Run Supabase migrations through the repo-local CLI:

```bash
pnpm supabase:db:push
```

Bootstrap the first manager profile after Supabase env vars are configured:

```bash
pnpm bootstrap:manager
```

The raw school export in `docs/source_data/schools_rows.csv` is intentionally ignored by Git because it contains sensitive school/contact data.

See [Supabase setup](supabase/README.md) for hosted project setup, manager bootstrap, and import instructions.
