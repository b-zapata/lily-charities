-- App-level sign-in lockout tracking for the manager/volunteer web dashboard.
-- Access is service-role only; no client RLS policies are intentionally granted.

create table if not exists public.auth_login_attempts (
  email text primary key,
  failed_count integer not null default 0,
  locked_until timestamptz,
  last_failed_at timestamptz,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_login_attempts_failed_count_nonnegative check (failed_count >= 0),
  constraint auth_login_attempts_email_not_blank check (btrim(email) <> '')
);

drop trigger if exists auth_login_attempts_set_updated_at on public.auth_login_attempts;
create trigger auth_login_attempts_set_updated_at
before update on public.auth_login_attempts
for each row execute function public.set_updated_at();

alter table public.auth_login_attempts enable row level security;
