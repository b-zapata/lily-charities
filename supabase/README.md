# Supabase Backend

Status: Phase 2 backend foundation.

This folder contains the Supabase schema, RLS/storage policies, views, RPC functions, and seed/import support for the Lily Charities MVP.

## Local Setup

Install the Supabase CLI, then run:

```bash
supabase start
supabase db reset
```

The local source CSV is intentionally ignored by Git:

```text
docs/source_data/schools_rows.csv
```

Use the import scripts in `scripts/` to validate or generate import SQL from the local CSV.

## Migration Order

1. `20260702000100_initial_schema.sql`
2. `20260702000200_rls_policies.sql`
3. `20260702000300_storage.sql`
4. `20260702000400_views.sql`
5. `20260702000500_rpc_functions.sql`

The migrations are written to be readable first. If Supabase CLI reports a policy or function issue, fix the migration rather than patching production manually.
