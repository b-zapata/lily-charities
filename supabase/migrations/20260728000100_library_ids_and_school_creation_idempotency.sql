-- Give operational schools a permanent library ID and make web school creation
-- idempotent across repeated form submissions.

create temporary table test_school_cleanup_ids on commit drop as
select id
from public.schools
where substring(school_number from '^SCHOOL-([0-9]+)$')::bigint >= 217;

create temporary table test_school_cleanup_change_request_ids on commit drop as
select distinct request_id as id
from (
  select change_request.id as request_id
  from public.change_requests change_request
  where change_request.school_id in (select id from test_school_cleanup_ids)

  union all

  select school.created_from_change_request_id as request_id
  from public.schools school
  where school.id in (select id from test_school_cleanup_ids)
    and school.created_from_change_request_id is not null
) requests;

delete from public.audit_events
where school_id in (select id from test_school_cleanup_ids)
   or change_request_id in (select id from test_school_cleanup_change_request_ids);

delete from public.school_agreements
where school_id in (select id from test_school_cleanup_ids);

delete from public.photos
where school_id in (select id from test_school_cleanup_ids);

delete from public.school_assessments
where school_id in (select id from test_school_cleanup_ids);

delete from public.library_setups
where school_id in (select id from test_school_cleanup_ids);

update public.change_requests
set supersedes_change_request_id = null
where supersedes_change_request_id in (select id from test_school_cleanup_change_request_ids);

update public.schools
set created_from_change_request_id = null
where created_from_change_request_id in (select id from test_school_cleanup_change_request_ids);

update public.school_assessments
set source_change_request_id = null
where source_change_request_id in (select id from test_school_cleanup_change_request_ids);

update public.school_agreements
set source_change_request_id = null
where source_change_request_id in (select id from test_school_cleanup_change_request_ids);

delete from public.change_requests
where id in (select id from test_school_cleanup_change_request_ids);

delete from public.schools
where id in (select id from test_school_cleanup_ids);

select setval('public.school_number_seq', 216, true);

alter table public.schools
  add column if not exists library_id text,
  add column if not exists creation_submission_id uuid;

alter table public.schools
  drop constraint if exists schools_library_id_format;

alter table public.schools
  add constraint schools_library_id_format
  check (library_id is null or library_id ~ '^LIBRARY-[0-9]{4,}$');

create unique index if not exists schools_library_id_unique_idx
  on public.schools (library_id)
  where library_id is not null;

create unique index if not exists schools_creation_submission_unique_idx
  on public.schools (creation_submission_id)
  where creation_submission_id is not null;

create unique index if not exists change_requests_web_mutation_unique_idx
  on public.change_requests (submitted_by, client_mutation_id)
  where source_device_id is null
    and client_mutation_id is not null;

create sequence if not exists public.library_id_seq start with 1;

create or replace function public.generate_library_id()
returns text
language sql
security definer
set search_path = public
as $$
  select 'LIBRARY-' || lpad(nextval('public.library_id_seq')::text, 4, '0');
$$;

do $$
declare
  existing_max bigint;
  assigned_max bigint;
begin
  select coalesce(
    max(substring(library_id from '([0-9]+)$')::bigint),
    0
  )
  into existing_max
  from public.schools
  where library_id is not null;

  with candidates as (
    select
      id,
      row_number() over (order by school_number, id) + existing_max as library_sequence
    from public.schools
    where pipeline_stage = 'operational'
      and library_id is null
  )
  update public.schools school
  set library_id = 'LIBRARY-' || lpad(candidates.library_sequence::text, 4, '0')
  from candidates
  where school.id = candidates.id;

  select coalesce(
    max(substring(library_id from '([0-9]+)$')::bigint),
    0
  )
  into assigned_max
  from public.schools
  where library_id is not null;

  if assigned_max = 0 then
    perform setval('public.library_id_seq', 1, false);
  else
    perform setval('public.library_id_seq', assigned_max, true);
  end if;
end
$$;

create or replace function public.assign_library_id_when_operational()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pipeline_stage = 'operational' and new.library_id is null then
    new.library_id = public.generate_library_id();
  end if;
  return new;
end;
$$;

drop trigger if exists schools_assign_library_id_when_operational on public.schools;
create trigger schools_assign_library_id_when_operational
before insert or update of pipeline_stage on public.schools
for each row execute function public.assign_library_id_when_operational();

create or replace view public.active_school_summary_view
with (security_invoker = true)
as
select
  s.id,
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
  s.is_active,
  s.version,
  s.updated_at,
  pc.name as principal_name,
  pc.phone as principal_phone,
  ltc.name as lead_teacher_name,
  ltc.phone as lead_teacher_phone,
  a.id as assessment_id,
  a.visit_date as assessment_visit_date,
  a.estimated_total_students,
  ag.id as agreement_id,
  ag.approved_at as agreement_approved_at,
  ls.setup_started_date,
  ls.training_completed_date,
  ls.operational_date,
  (
    select count(*)::integer
    from public.change_requests cr
    where cr.school_id = s.id
      and cr.status in ('pending_review', 'needs_clarification')
  ) as pending_approvals_count,
  s.library_id
from public.schools s
left join lateral (
  select c.name, c.phone
  from public.school_contacts c
  where c.school_id = s.id
    and c.deleted_at is null
    and c.role = 'principal'
  order by c.is_primary desc, c.created_at asc
  limit 1
) pc on true
left join lateral (
  select c.name, c.phone
  from public.school_contacts c
  where c.school_id = s.id
    and c.deleted_at is null
    and c.role = 'lead_teacher'
  order by c.is_primary desc, c.created_at asc
  limit 1
) ltc on true
left join public.school_assessments a on a.school_id = s.id and a.deleted_at is null
left join lateral (
  select agreement.id, agreement.approved_at
  from public.school_agreements agreement
  where agreement.school_id = s.id
    and agreement.deleted_at is null
  order by agreement.approved_at desc nulls last, agreement.created_at desc
  limit 1
) ag on true
left join public.library_setups ls on ls.school_id = s.id and ls.deleted_at is null
where s.deleted_at is null;

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
  d.anonymous as donor_anonymous,
  s.library_id
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
