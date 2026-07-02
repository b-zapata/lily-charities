# Supabase Backend

Status: Backend foundation plus setup/import helpers.

This folder contains the Supabase schema, RLS/storage policies, views, RPC functions, and seed/import support for the Lily Charities MVP.

## Local Setup

Install dependencies, then run the local Supabase CLI:

```bash
pnpm install
pnpm supabase start
pnpm supabase:db:reset
```

Supabase CLI reference:

- https://supabase.com/docs/reference/cli/supabase-start
- https://supabase.com/docs/reference/cli/supabase-db-reset

## Hosted Project Setup

Prerequisites:

- Supabase CLI available through this repo's local dev dependency.
- A Supabase project created.
- Project ref.
- Database password.
- API URL, anon key, and service role key from Supabase project settings.

From the repository root:

```bash
pnpm supabase login
pnpm supabase link --project-ref <project-ref>
pnpm supabase:db:push
```

Supabase CLI reference:

- https://supabase.com/docs/reference/cli/supabase-login
- https://supabase.com/docs/reference/cli/supabase-link
- https://supabase.com/docs/reference/cli/supabase-db-push

Create `apps/web/.env.local` with:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The web dashboard only needs the public URL and anon key at runtime. The service role key is only for local/admin scripts and must never be exposed to the browser.

## First Manager Profile

Create the auth user in Supabase, or let the helper create it by setting `MANAGER_PASSWORD`.

```bash
MANAGER_EMAIL=lauri@example.org MANAGER_NAME="Lauri" pnpm bootstrap:manager
```

PowerShell:

```powershell
$env:MANAGER_EMAIL="lauri@example.org"
$env:MANAGER_NAME="Lauri"
pnpm.cmd bootstrap:manager
```

If the auth user does not exist yet:

```bash
MANAGER_EMAIL=lauri@example.org MANAGER_PASSWORD="temporary-password" MANAGER_NAME="Lauri" pnpm bootstrap:manager
```

PowerShell:

```powershell
$env:MANAGER_EMAIL="lauri@example.org"
$env:MANAGER_PASSWORD="temporary-password"
$env:MANAGER_NAME="Lauri"
pnpm.cmd bootstrap:manager
```

The helper uses `SUPABASE_SERVICE_ROLE_KEY`, creates or finds the auth user, and upserts a `profiles` row with role `manager`.

The local source CSV is intentionally ignored by Git:

```text
docs/source_data/schools_rows.csv
```

Use the import scripts in `scripts/` to validate or generate import SQL from the local CSV.

## School Import

Validate the local source CSV:

```bash
pnpm validate:school-csv
```

Generate ignored SQL:

```bash
pnpm generate:school-import
```

Generated file:

```text
tmp/imports/schools_import.generated.sql
```

This generated SQL contains real school/contact data and must stay ignored. Apply it only to the intended staging or production database after migrations have been pushed. For hosted Supabase, the safest MVP path is to run the generated SQL in the Supabase SQL editor or through a trusted `psql` session using the project database connection string.

## Migration Order

1. `20260702000100_initial_schema.sql`
2. `20260702000200_rls_policies.sql`
3. `20260702000300_storage.sql`
4. `20260702000400_views.sql`
5. `20260702000500_rpc_functions.sql`
6. `20260702000600_review_workflow_apply_data.sql`

The migrations are written to be readable first. If Supabase CLI reports a policy or function issue, fix the migration rather than patching production manually.
