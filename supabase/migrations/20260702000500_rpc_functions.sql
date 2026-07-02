-- RPC functions for mobile sync and manager review.

create or replace function public.assert_manager_or_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_manager_or_admin() then
    raise exception 'Manager or admin role required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_active_profile()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  profile_id uuid;
begin
  select id into profile_id
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if profile_id is null then
    raise exception 'Active profile required' using errcode = '42501';
  end if;

  return profile_id;
end;
$$;

create or replace function public.mobile_register_device(payload jsonb)
returns public.mobile_devices
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  existing_id uuid;
  saved public.mobile_devices;
begin
  profile_id := public.assert_active_profile();
  existing_id := nullif(payload->>'device_id', '')::uuid;

  if existing_id is not null then
    update public.mobile_devices
    set
      device_name = coalesce(payload->>'device_name', device_name),
      platform = coalesce(payload->>'platform', platform),
      app_version = coalesce(payload->>'app_version', app_version),
      push_token = coalesce(payload->>'push_token', push_token),
      last_seen_at = now()
    where id = existing_id
      and user_id = profile_id
    returning * into saved;
  end if;

  if saved.id is null then
    insert into public.mobile_devices (
      user_id,
      device_name,
      platform,
      app_version,
      push_token,
      last_seen_at
    )
    values (
      profile_id,
      payload->>'device_name',
      coalesce(payload->>'platform', 'android'),
      payload->>'app_version',
      payload->>'push_token',
      now()
    )
    returning * into saved;
  end if;

  return saved;
end;
$$;

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
      'pipeline_stage', array['identified', 'assessed', 'selected', 'setup_in_progress', 'training', 'operational'],
      'selection_outcome', array['pending', 'selected', 'future_potential', 'not_selected'],
      'photo_type', array['school_exterior', 'classroom', 'library_space', 'bookshelf', 'students', 'agreement_signature', 'school_seal', 'paper_agreement', 'training', 'other']
    )
  );
end;
$$;

create or replace function public.mobile_create_photo_record(payload jsonb)
returns public.photos
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  saved public.photos;
begin
  profile_id := public.assert_active_profile();

  insert into public.photos (
    school_id,
    change_request_id,
    uploaded_by,
    photo_type,
    storage_bucket,
    storage_path,
    thumbnail_storage_path,
    content_type,
    file_size_bytes,
    checksum,
    caption,
    taken_at,
    latitude,
    longitude,
    approval_status
  )
  values (
    nullif(payload->>'school_id', '')::uuid,
    nullif(payload->>'change_request_id', '')::uuid,
    profile_id,
    (payload->>'photo_type')::public.photo_type,
    payload->>'storage_bucket',
    payload->>'storage_path',
    payload->>'thumbnail_storage_path',
    coalesce(payload->>'content_type', 'image/jpeg'),
    nullif(payload->>'file_size_bytes', '')::integer,
    payload->>'checksum',
    payload->>'caption',
    nullif(payload->>'taken_at', '')::timestamptz,
    nullif(payload->>'latitude', '')::numeric,
    nullif(payload->>'longitude', '')::numeric,
    'pending_review'
  )
  returning * into saved;

  return saved;
end;
$$;

create or replace function public.create_change_request_from_mutation(
  profile_id uuid,
  device_id uuid,
  mutation jsonb
)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  mutation_type public.change_request_type;
  payload jsonb;
  existing public.change_requests;
  saved public.change_requests;
  target_school_id uuid;
  base_version_value integer;
begin
  mutation_type := (mutation->>'mutation_type')::public.change_request_type;
  payload := coalesce(mutation->'payload', '{}'::jsonb);

  select *
  into existing
  from public.change_requests
  where submitted_by = profile_id
    and source_device_id is not distinct from device_id
    and client_mutation_id = mutation->>'client_mutation_id'
  limit 1;

  if existing.id is not null then
    return existing;
  end if;

  target_school_id := nullif(coalesce(mutation->>'base_entity_id', payload->>'school_id'), '')::uuid;
  base_version_value := nullif(mutation->>'base_version', '')::integer;

  if mutation_type = 'new_school' then
    if nullif(payload #>> '{school,name}', '') is null then
      raise exception 'School name is required' using errcode = '22023';
    end if;
    if payload #>> '{school,latitude}' is null or payload #>> '{school,longitude}' is null then
      raise exception 'Map pin is required' using errcode = '22023';
    end if;
  end if;

  if mutation_type in ('school_edit', 'assessment_submission', 'lifecycle_update') and target_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;

  insert into public.change_requests (
    request_type,
    status,
    school_id,
    submitted_by,
    submitted_at,
    base_version,
    proposed_data,
    before_data,
    conflict_detected,
    client_mutation_id,
    client_created_at,
    source_device_id
  )
  values (
    mutation_type,
    'pending_review',
    target_school_id,
    profile_id,
    now(),
    base_version_value,
    payload,
    case
      when target_school_id is not null then (
        select to_jsonb(s) from public.schools s where s.id = target_school_id
      )
      else null
    end,
    case
      when target_school_id is not null and base_version_value is not null then (
        select s.version <> base_version_value from public.schools s where s.id = target_school_id
      )
      else false
    end,
    mutation->>'client_mutation_id',
    nullif(mutation->>'client_created_at', '')::timestamptz,
    device_id
  )
  returning * into saved;

  return saved;
end;
$$;

create or replace function public.mobile_sync_push(
  device_id uuid,
  client_batch_id text,
  mutations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  batch_id uuid;
  mutation jsonb;
  saved public.change_requests;
  accepted jsonb := '[]'::jsonb;
  rejected jsonb := '[]'::jsonb;
begin
  profile_id := public.assert_active_profile();

  insert into public.sync_batches (device_id, user_id, client_batch_id, status, mutation_count)
  values (device_id, profile_id, client_batch_id, 'started', jsonb_array_length(coalesce(mutations, '[]'::jsonb)))
  returning id into batch_id;

  for mutation in select * from jsonb_array_elements(coalesce(mutations, '[]'::jsonb))
  loop
    begin
      saved := public.create_change_request_from_mutation(profile_id, device_id, mutation);
      accepted := accepted || jsonb_build_array(jsonb_build_object(
        'client_mutation_id', mutation->>'client_mutation_id',
        'change_request_id', saved.id,
        'status', saved.status
      ));
    exception when others then
      rejected := rejected || jsonb_build_array(jsonb_build_object(
        'client_mutation_id', mutation->>'client_mutation_id',
        'code', sqlstate,
        'message', sqlerrm
      ));
    end;
  end loop;

  update public.sync_batches
  set
    completed_at = now(),
    status = case when jsonb_array_length(rejected) = 0 then 'completed' else 'completed_with_errors' end,
    error_summary = case when jsonb_array_length(rejected) = 0 then null else rejected::text end
  where id = batch_id;

  return jsonb_build_object(
    'server_time', now(),
    'accepted', accepted,
    'rejected', rejected,
    'id_mappings', '[]'::jsonb
  );
end;
$$;

create or replace function public.manager_review_change_request(
  change_request_id uuid,
  decision jsonb
)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer_id uuid;
  request_row public.change_requests;
  decision_status public.change_request_status;
  selected_outcome public.selection_outcome;
  new_school_id uuid;
  applied jsonb;
begin
  perform public.assert_manager_or_admin();
  reviewer_id := auth.uid();
  decision_status := (decision->>'status')::public.change_request_status;

  select *
  into request_row
  from public.change_requests
  where id = change_request_id
  for update;

  if request_row.id is null then
    raise exception 'Change request not found' using errcode = '22023';
  end if;

  if decision_status not in ('approved', 'partially_approved', 'rejected', 'needs_clarification') then
    raise exception 'Invalid review status' using errcode = '22023';
  end if;

  if decision_status in ('rejected', 'needs_clarification') and nullif(btrim(coalesce(decision->>'review_notes', '')), '') is null then
    raise exception 'Review notes are required' using errcode = '22023';
  end if;

  applied := coalesce(decision->'applied_data', request_row.proposed_data);

  if decision_status in ('approved', 'partially_approved') then
    if request_row.request_type = 'new_school' then
      insert into public.schools (
        school_number,
        name,
        address,
        district,
        latitude,
        longitude,
        map_pin_source,
        map_pin_confirmed_at,
        map_pin_confirmed_by,
        pipeline_stage,
        selection_outcome,
        created_source,
        created_from_change_request_id,
        created_by
      )
      values (
        coalesce(nullif(applied #>> '{school,school_number}', ''), public.generate_school_number()),
        applied #>> '{school,name}',
        applied #>> '{school,address}',
        applied #>> '{school,district}',
        nullif(applied #>> '{school,latitude}', '')::numeric,
        nullif(applied #>> '{school,longitude}', '')::numeric,
        applied #>> '{school,map_pin_source}',
        now(),
        reviewer_id,
        coalesce(nullif(applied #>> '{school,pipeline_stage}', '')::public.pipeline_stage, 'identified'),
        coalesce(nullif(applied #>> '{school,selection_outcome}', '')::public.selection_outcome, 'pending'),
        'approved_change_request',
        request_row.id,
        reviewer_id
      )
      returning id into new_school_id;

      update public.change_requests
      set school_id = new_school_id
      where id = request_row.id;
    elsif request_row.request_type = 'lifecycle_update' then
      update public.schools
      set
        pipeline_stage = coalesce(nullif(applied->>'pipeline_stage', '')::public.pipeline_stage, pipeline_stage),
        selection_outcome = coalesce(nullif(applied->>'selection_outcome', '')::public.selection_outcome, selection_outcome),
        updated_by = reviewer_id
      where id = request_row.school_id;
    elsif request_row.request_type = 'assessment_submission' then
      selected_outcome := coalesce(nullif(decision->>'selection_outcome', '')::public.selection_outcome, 'selected');

      update public.schools
      set
        pipeline_stage = case when selected_outcome = 'selected' then 'selected' else 'assessed' end,
        selection_outcome = selected_outcome,
        updated_by = reviewer_id
      where id = request_row.school_id;
    end if;
  end if;

  update public.change_requests
  set
    status = decision_status,
    reviewed_by = reviewer_id,
    reviewed_at = now(),
    review_notes = decision->>'review_notes',
    applied_data = applied,
    component_decisions = decision->'component_decisions'
  where id = request_row.id
  returning * into request_row;

  insert into public.audit_events (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    school_id,
    change_request_id,
    before_data,
    after_data,
    metadata
  )
  values (
    reviewer_id,
    'change_request_reviewed',
    'change_request',
    request_row.id,
    request_row.school_id,
    request_row.id,
    request_row.before_data,
    request_row.applied_data,
    jsonb_build_object('decision', decision)
  );

  return request_row;
end;
$$;
