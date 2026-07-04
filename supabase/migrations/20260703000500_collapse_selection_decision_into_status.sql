-- Collapse the old stage + selection decision model into one school status.
-- Keep selection_outcome as a legacy compatibility column for now, but stop
-- treating it as part of the active product workflow.

update public.schools
set
  pipeline_stage = 'not_selected',
  selection_outcome = 'not_selected'
where selection_outcome in ('not_selected', 'future_potential');

create or replace function public.mobile_get_bootstrap(since timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
begin
  profile_id := public.assert_active_profile();

  return jsonb_build_object(
    'server_time', now(),
    'schools', coalesce((
      select jsonb_agg(to_jsonb(v))
      from public.active_school_summary_view v
      where since is null or v.updated_at > since
    ), '[]'::jsonb),
    'my_change_requests', coalesce((
      select jsonb_agg(to_jsonb(cr) order by cr.updated_at desc)
      from public.change_requests cr
      where cr.submitted_by = profile_id
        and cr.status in ('pending_review', 'needs_clarification', 'partially_approved', 'rejected')
    ), '[]'::jsonb),
    'enums', jsonb_build_object(
      'pipeline_stage', array['identified', 'assessed', 'selected', 'not_selected', 'setup_in_progress', 'training', 'operational'],
      'selection_outcome', array['pending', 'selected', 'not_selected'],
      'photo_type', array['school_exterior', 'classroom', 'library_space', 'bookshelf', 'students', 'agreement_signature', 'school_seal', 'paper_agreement', 'training', 'other']
    )
  );
end;
$$;
