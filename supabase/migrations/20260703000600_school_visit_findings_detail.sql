-- Expose school visit grade counts on school details and keep them synced from
-- approved assessment change requests.

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
  to_jsonb(ls) as library_setup,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'grade_label', agc.grade_label,
          'student_count', agc.student_count
        )
        order by agc.grade_label
      )
      from public.assessment_grade_counts agc
      where agc.assessment_id = a.id
    ),
    '[]'::jsonb
  ) as assessment_grade_counts
from public.schools s
left join public.school_assessments a on a.school_id = s.id and a.deleted_at is null
left join public.library_setups ls on ls.school_id = s.id and ls.deleted_at is null
where s.deleted_at is null;

create or replace function public.sync_assessment_grade_counts_from_change_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_assessment_id uuid;
  grade_counts jsonb;
begin
  if new.request_type <> 'assessment_submission'
    or new.status <> 'approved' then
    return new;
  end if;

  select a.id
  into target_assessment_id
  from public.school_assessments a
  where a.source_change_request_id = new.id
     or a.school_id = new.school_id
  order by case when a.source_change_request_id = new.id then 0 else 1 end
  limit 1;

  if target_assessment_id is null then
    return new;
  end if;

  grade_counts := coalesce(
    new.applied_data->'grade_counts',
    new.applied_data #> '{assessment,grade_counts}',
    new.proposed_data->'grade_counts',
    new.proposed_data #> '{assessment,grade_counts}',
    '[]'::jsonb
  );

  if jsonb_typeof(grade_counts) <> 'array' then
    return new;
  end if;

  delete from public.assessment_grade_counts
  where assessment_id = target_assessment_id;

  insert into public.assessment_grade_counts (
    assessment_id,
    grade_label,
    student_count
  )
  select
    target_assessment_id,
    item.value->>'grade_label',
    nullif(item.value->>'student_count', '')::integer
  from jsonb_array_elements(grade_counts) as item(value)
  where nullif(btrim(coalesce(item.value->>'grade_label', '')), '') is not null
  on conflict (assessment_id, grade_label) do update
  set
    student_count = excluded.student_count,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists change_requests_sync_assessment_grade_counts on public.change_requests;
create trigger change_requests_sync_assessment_grade_counts
after update of status, applied_data on public.change_requests
for each row
execute function public.sync_assessment_grade_counts_from_change_request();
