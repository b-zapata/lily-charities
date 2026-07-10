-- Allow new schools to be created before an exact map pin is known.
-- Schools without a complete pin are automatically flagged for pin cleanup.

alter table public.schools
  drop constraint if exists schools_map_pin_required_except_import_cleanup;

update public.schools
set
  needs_map_pin_cleanup = true,
  map_pin_confirmed_at = null,
  map_pin_confirmed_by = null,
  map_pin_source = null
where latitude is null
   or longitude is null;

alter table public.schools
  add constraint schools_map_pin_required_except_import_cleanup check (
    needs_map_pin_cleanup = true
    or (latitude is not null and longitude is not null)
  );

create or replace function public.normalize_school_map_pin_state()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is null or new.longitude is null then
    new.latitude := null;
    new.longitude := null;
    new.needs_map_pin_cleanup := true;
    new.map_pin_confirmed_at := null;
    new.map_pin_confirmed_by := null;
    new.map_pin_source := null;
  else
    new.needs_map_pin_cleanup := false;
    new.map_pin_source := coalesce(nullif(new.map_pin_source, ''), 'manual');
  end if;

  return new;
end;
$$;

drop trigger if exists schools_normalize_map_pin_state on public.schools;
create trigger schools_normalize_map_pin_state
before insert or update of latitude, longitude, map_pin_source, needs_map_pin_cleanup
on public.schools
for each row
execute function public.normalize_school_map_pin_state();

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
    if nullif(coalesce(payload #>> '{school,name_english}', payload #>> '{school,name}', payload->>'name'), '') is null then
      raise exception 'School name is required' using errcode = '22023';
    end if;
  end if;

  if mutation_type in ('school_edit', 'assessment_submission', 'agreement_submission', 'photo_upload', 'lifecycle_update')
    and target_school_id is null then
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

  if mutation_type = 'assessment_submission' and target_school_id is not null then
    update public.schools
    set
      pipeline_stage = 'assessed',
      selection_outcome = 'pending'
    where id = target_school_id
      and pipeline_stage in ('identified', 'assessed');
  end if;

  return saved;
end;
$$;
