-- Read-optimized views for Android and manager dashboard.

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
  ) as pending_approvals_count
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

create or replace view public.manager_approval_queue_view
with (security_invoker = true)
as
select
  cr.id,
  cr.request_type,
  cr.status,
  cr.school_id,
  s.school_number,
  coalesce(s.name, cr.proposed_data #>> '{school,name}') as school_name,
  cr.submitted_by,
  submitter.display_name as submitter_name,
  cr.submitted_at,
  cr.reviewed_by,
  reviewer.display_name as reviewer_name,
  cr.reviewed_at,
  cr.conflict_detected,
  cr.component_decisions,
  cr.created_at,
  cr.updated_at
from public.change_requests cr
left join public.schools s on s.id = cr.school_id
left join public.profiles submitter on submitter.id = cr.submitted_by
left join public.profiles reviewer on reviewer.id = cr.reviewed_by
where cr.status in ('pending_review', 'needs_clarification');

create or replace view public.school_detail_view
with (security_invoker = true)
as
select
  s.*,
  coalesce(
    (
      select jsonb_agg(to_jsonb(c) order by c.role, c.is_primary desc, c.created_at)
      from public.school_contacts c
      where c.school_id = s.id
        and c.deleted_at is null
    ),
    '[]'::jsonb
  ) as contacts,
  to_jsonb(a) as assessment,
  to_jsonb(ls) as library_setup
from public.schools s
left join public.school_assessments a on a.school_id = s.id and a.deleted_at is null
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
  s.updated_at
from public.schools s
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
