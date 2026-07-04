-- Allow "not selected" to be represented as the school's single status.
-- This is intentionally separate from the backfill migration because newly
-- added enum values cannot always be used safely until the transaction commits.

alter type public.pipeline_stage add value if not exists 'not_selected';
