# Implementation Status

Status: Backend/web checkpoint after role-aware dashboard access, user/profile management, imports, and review-flow hardening.

## Completed

### Phase 2 Backend Foundation

Added Supabase backend foundation files:

- Supabase local config.
- Initial schema migration.
- RLS policy migration.
- Storage bucket/policy migration.
- Dashboard/export views.
- Mobile sync and manager review RPC functions.
- Local CSV validation script.
- Local CSV-to-SQL import generator.

The raw `docs/source_data/schools_rows.csv` file remains local-only and ignored by Git.

### Phase 3 Web Dashboard MVP Scaffold

Added a pnpm workspace and Next.js web dashboard app:

- Login page.
- Server-side dashboard route protection when Supabase env vars are configured.
- Schools table with search/filter UI, using one school status field.
- School detail page.
- Manager create school form.
- Manager edit school form.
- Approval queue.
- Change request review page.
- Export screen scaffold.
- User management table scaffold.
- Current-user profile page.
- Admin-only user profile drill-in page.
- Role-aware dashboard navigation.
- Limited volunteer web access to Schools and Profile.
- Tailwind global CSS is wired correctly.
- Dashboard routes enforce role access when Supabase is configured.
- Schools CSV export route is wired to `school_export_view`.
- Approval review now shows plain proposed changes and manager-friendly decision buttons.
- Volunteer web school creation and school edits create change requests instead of directly updating official data.
- Sign-in lockout table/policy added: 3 failed attempts for the same email locks sign-in for 15 minutes.

The dashboard is wired to the Supabase views and RPC functions defined in the backend migrations. With no Supabase env vars, it renders safe empty states and setup warnings.

### Setup And Import Helpers

Added/updated helpers:

- `pnpm bootstrap:manager` creates or promotes the first manager profile using the Supabase service role key.
- Supabase CLI is available as a local dev dependency through `pnpm supabase`.
- `pnpm generate:school-import` now generates rerunnable import SQL for imported contact rows by replacing contacts marked `Imported from schools_rows.csv`.
- `supabase/README.md` documents local setup, hosted setup, manager bootstrap, and school import flow.

### Review Workflow Backend

Added migration `20260702000600_review_workflow_apply_data.sql`:

- Pending initial assessment submission marks the school as `assessed` while awaiting manager review.
- Manager approval can apply `new_school`, `school_edit`, `assessment_submission`, `agreement_submission`, `photo_upload`, and `lifecycle_update` data.
- Review decisions still write audit events.

Added migration `20260703000300_login_attempt_lockout.sql`:

- Creates `auth_login_attempts` for service-role-only failed login tracking.
- Supports the web 3-attempt / 15-minute lockout policy.

Added migrations `20260703000400_add_not_selected_pipeline_stage.sql` and `20260703000500_collapse_selection_decision_into_status.sql`:

- Adds `not_selected` as a school status.
- Collapses the old selection-decision workflow into the single `pipeline_stage` status field.
- Backfills old `future_potential`/`not_selected` decision rows to `pipeline_stage = not_selected`.

## Validation Run

Commands that passed:

```bash
pnpm validate:school-csv
pnpm generate:school-import
pnpm typecheck
pnpm lint
pnpm build
```

CSV validation result:

- 216 real school rows.
- 1 blank row.
- No duplicate school numbers.
- Continuous `SCHOOL-0001` through `SCHOOL-0216`.
- 0 parseable GPS coordinate pairs.
- All imported schools should start with `needs_map_pin_cleanup = true`.

## Not Yet Done

- Supabase migrations have not been applied to a live/local Supabase instance in this environment because project credentials and a reachable Supabase/Postgres target are not available in this shell.
- RLS/storage policies have not been tested against real Supabase auth sessions yet.
- Generated agreement PDF implementation is still a backend job placeholder.
- User invitation/account creation flow is implemented at MVP level through Supabase Admin API, but still needs real-session testing.
- Android app implementation has not started.

## Next Recommended Steps

1. Install/use Supabase CLI and run migrations locally or against the hosted project.
2. Fix any SQL issues found by `supabase db reset` or `supabase db push`.
3. Create the first manager profile with `pnpm bootstrap:manager`.
4. Import a staging copy of the school CSV using the generated SQL.
5. Create test manager/volunteer accounts.
6. Test RLS, storage uploads, approval review, and CSV export against real Supabase auth sessions.
