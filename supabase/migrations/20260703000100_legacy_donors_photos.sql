-- Preserve legacy donor records and allow imported photo rows to point at old public URLs.

create table if not exists public.donors (
  donor_id text primary key,
  full_name text not null,
  email text,
  phone text,
  organization text,
  amount_donated numeric,
  anonymous boolean not null default false,
  additional_notes text,
  source_import_filename text,
  source_import_row_number integer,
  legacy_source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donors_id_format check (donor_id ~ '^DONOR-[0-9]{4,}$'),
  constraint donors_full_name_not_blank check (btrim(full_name) <> '')
);

create index if not exists donors_full_name_trgm_idx on public.donors using gin (full_name gin_trgm_ops);
create index if not exists donors_email_trgm_idx on public.donors using gin (email gin_trgm_ops);
create index if not exists donors_organization_trgm_idx on public.donors using gin (organization gin_trgm_ops);

drop trigger if exists donors_set_updated_at on public.donors;
create trigger donors_set_updated_at
before update on public.donors
for each row execute function public.set_updated_at();

alter table public.donors enable row level security;

drop policy if exists "profiles_update_manager_or_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "donors_select_manager" on public.donors;
create policy "donors_select_manager"
on public.donors for select
using (public.is_manager_or_admin());

drop policy if exists "donors_insert_manager" on public.donors;
create policy "donors_insert_manager"
on public.donors for insert
with check (public.is_manager_or_admin());

drop policy if exists "donors_update_manager" on public.donors;
create policy "donors_update_manager"
on public.donors for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

alter table public.photos
  add column if not exists external_url text,
  add column if not exists source_import_filename text,
  add column if not exists source_import_row_number integer,
  add column if not exists legacy_source_payload jsonb;

create index if not exists photos_external_url_trgm_idx on public.photos using gin (external_url gin_trgm_ops);

create or replace view public.school_export_view
with (security_invoker = true)
as
select
  s.school_number,
  s.name,
  s.name_english,
  s.name_bangla,
  s.address,
  s.area,
  s.city,
  s.district,
  s.division,
  s.country,
  s.latitude,
  s.longitude,
  s.needs_map_pin_cleanup,
  s.pipeline_stage,
  s.selection_outcome,
  s.donor_id,
  pc.name as principal_name,
  pc.phone as principal_phone,
  pc.email as principal_email,
  ltc.name as lead_teacher_name,
  ltc.phone as lead_teacher_phone,
  ltc.email as lead_teacher_email,
  a.visit_date as assessment_visit_date,
  a.is_good_fit_for_project,
  a.estimated_total_students,
  ls.setup_started_date,
  ls.training_completed_date,
  ls.operational_date,
  s.updated_at,
  d.full_name as donor_name,
  d.organization as donor_organization,
  d.anonymous as donor_anonymous
from public.schools s
left join public.donors d on d.donor_id = s.donor_id
left join lateral (
  select c.name, c.phone, c.email
  from public.school_contacts c
  where c.school_id = s.id
    and c.deleted_at is null
    and c.role = 'principal'
  order by c.is_primary desc, c.created_at asc
  limit 1
) pc on true
left join lateral (
  select c.name, c.phone, c.email
  from public.school_contacts c
  where c.school_id = s.id
    and c.deleted_at is null
    and c.role = 'lead_teacher'
  order by c.is_primary desc, c.created_at asc
  limit 1
) ltc on true
left join public.school_assessments a on a.school_id = s.id and a.deleted_at is null
left join public.library_setups ls on ls.school_id = s.id and ls.deleted_at is null
where s.deleted_at is null;
