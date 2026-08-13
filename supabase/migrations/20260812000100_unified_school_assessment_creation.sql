-- Create a manually entered school and its initial assessment atomically.
-- Imported schools continue to enter the pipeline at the identified stage.

create or replace function public.create_school_with_initial_assessment(
  p_creation_submission_id uuid,
  p_payload jsonb
)
returns table (
  school_id uuid,
  school_number text,
  assessment_id uuid,
  agreement_id uuid,
  was_created boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  existing_school public.schools;
  new_school_id uuid;
  new_school_number text;
  new_contact_id uuid;
  new_assessment_id uuid;
  new_agreement_id uuid;
  school_name_english text;
  school_name_bangla text;
  school_address text;
  school_district text;
  school_latitude numeric;
  school_longitude numeric;
  principal_name text;
  principal_phone text;
  principal_email text;
  principal_title text;
  visit_date date;
begin
  if actor_id is null or not coalesce(public.is_manager_or_admin(), false) then
    raise exception 'Manager role is required.' using errcode = '42501';
  end if;
  if p_creation_submission_id is null then
    raise exception 'creation_submission_id is required' using errcode = '22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'p_payload must be an object' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_creation_submission_id::text));

  select school.*
  into existing_school
  from public.schools school
  where school.creation_submission_id = p_creation_submission_id
  limit 1;

  if existing_school.id is not null then
    if existing_school.created_by is distinct from actor_id then
      raise exception 'This submission identifier has already been used.' using errcode = '23505';
    end if;
    if existing_school.deleted_at is not null then
      raise exception 'This submission belongs to a deleted school.' using errcode = '23505';
    end if;

    select assessment.id
    into new_assessment_id
    from public.school_assessments assessment
    where assessment.school_id = existing_school.id
      and assessment.deleted_at is null;

    select agreement.id
    into new_agreement_id
    from public.school_agreements agreement
    where agreement.school_id = existing_school.id
      and agreement.deleted_at is null
    order by agreement.created_at desc
    limit 1;

    if new_assessment_id is null or new_agreement_id is null then
      raise exception 'The existing unified school submission is incomplete.';
    end if;

    school_id := existing_school.id;
    school_number := existing_school.school_number;
    assessment_id := new_assessment_id;
    agreement_id := new_agreement_id;
    was_created := false;
    return next;
    return;
  end if;

  school_name_english := nullif(btrim(p_payload #>> '{school,name_english}'), '');
  school_name_bangla := nullif(btrim(p_payload #>> '{school,name_bangla}'), '');
  school_address := nullif(btrim(p_payload #>> '{school,address}'), '');
  school_district := nullif(btrim(p_payload #>> '{school,district}'), '');
  school_latitude := nullif(p_payload #>> '{school,latitude}', '')::numeric;
  school_longitude := nullif(p_payload #>> '{school,longitude}', '')::numeric;
  principal_name := nullif(btrim(p_payload #>> '{principal,name}'), '');
  principal_phone := nullif(btrim(p_payload #>> '{principal,phone}'), '');
  principal_email := nullif(btrim(p_payload #>> '{principal,email}'), '');
  principal_title := coalesce(nullif(btrim(p_payload #>> '{principal,title}'), ''), 'Principal');
  visit_date := coalesce(nullif(p_payload #>> '{assessment,visit_date}', '')::date, current_date);

  if school_name_english is null or school_name_bangla is null or school_address is null then
    raise exception 'School name in English, school name in Bangla, and address are required.' using errcode = '22023';
  end if;
  if principal_name is null or principal_phone is null then
    raise exception 'Principal name and phone are required.' using errcode = '22023';
  end if;
  if (school_latitude is null) <> (school_longitude is null) then
    raise exception 'Both latitude and longitude are required when adding a map pin.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payload->'grade_counts') <> 'array'
    or jsonb_array_length(p_payload->'grade_counts') <> 8 then
    raise exception 'All grade counts and the total are required.' using errcode = '22023';
  end if;
  if (
    select count(distinct grade.value->>'grade_label')
    from jsonb_array_elements(p_payload->'grade_counts') grade(value)
    where grade.value->>'grade_label' in (
      'play', 'kg', 'grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'total'
    )
  ) <> 8 then
    raise exception 'Grade counts do not match the required grade levels.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payload->'photos') <> 'array'
    or jsonb_array_length(p_payload->'photos') <> 3 then
    raise exception 'All three assessment photos are required.' using errcode = '22023';
  end if;
  if (
    select count(distinct photo.value->>'photo_type')
    from jsonb_array_elements(p_payload->'photos') photo(value)
    where photo.value->>'photo_type' in ('school_exterior', 'principal_meeting', 'library_space')
  ) <> 3 then
    raise exception 'Assessment photos do not match the required photo types.' using errcode = '22023';
  end if;
  if nullif(btrim(p_payload #>> '{agreement,terms_text_snapshot,typed_signature}'), '') is null then
    raise exception 'Typed signature is required.' using errcode = '22023';
  end if;
  if nullif(btrim(p_payload #>> '{agreement,terms_version}'), '') is null
    or jsonb_typeof(p_payload #> '{agreement,terms_text_snapshot}') <> 'object' then
    raise exception 'School agreement terms are required.' using errcode = '22023';
  end if;
  if p_payload #>> '{assessment,underprivileged_or_low_income_area}' not in ('true', 'false')
    or p_payload #>> '{assessment,is_good_fit_for_project}' not in ('true', 'false') then
    raise exception 'Assessment answers are required.' using errcode = '22023';
  end if;

  new_school_number := public.generate_school_number();
  insert into public.schools (
    school_number,
    name,
    name_english,
    name_bangla,
    address,
    district,
    latitude,
    longitude,
    needs_map_pin_cleanup,
    map_pin_source,
    map_pin_confirmed_at,
    map_pin_confirmed_by,
    pipeline_stage,
    selection_outcome,
    created_source,
    creation_submission_id,
    created_by,
    updated_by
  )
  values (
    new_school_number,
    school_name_english,
    school_name_english,
    school_name_bangla,
    school_address,
    school_district,
    school_latitude,
    school_longitude,
    school_latitude is null,
    case when school_latitude is not null then coalesce(nullif(p_payload #>> '{school,map_pin_source}', ''), 'manual') end,
    case when school_latitude is not null then now() end,
    case when school_latitude is not null then actor_id end,
    'assessed',
    'pending',
    'manager',
    p_creation_submission_id,
    actor_id,
    actor_id
  )
  returning id into new_school_id;

  insert into public.school_contacts (
    school_id,
    role,
    name,
    phone,
    email,
    title,
    is_primary,
    created_by,
    updated_by
  )
  values (
    new_school_id,
    'principal',
    principal_name,
    principal_phone,
    principal_email,
    principal_title,
    true,
    actor_id,
    actor_id
  )
  returning id into new_contact_id;

  insert into public.school_agreements (
    school_id,
    agreement_date,
    represented_school_name,
    signatory_name,
    signatory_title,
    signatory_contact_id,
    signatory_phone,
    app_language,
    agreement_language,
    terms_version,
    terms_text_snapshot,
    authorized_signatory_confirmed,
    accepted_standard_terms,
    accepted_at,
    captured_by_user_id,
    notes,
    approved_by,
    approved_at,
    created_by,
    updated_by
  )
  values (
    new_school_id,
    visit_date,
    school_name_english,
    principal_name,
    principal_title,
    new_contact_id,
    principal_phone,
    'en',
    'en',
    p_payload #>> '{agreement,terms_version}',
    p_payload #> '{agreement,terms_text_snapshot}',
    true,
    true,
    now(),
    actor_id,
    'Website-native typed signature captured for the school agreement.',
    actor_id,
    now(),
    actor_id,
    actor_id
  )
  returning id into new_agreement_id;

  insert into public.school_assessments (
    school_id,
    form_version,
    visit_date,
    prepared_by_user_id,
    prepared_by_name,
    underprivileged_or_low_income_area,
    commitment_from_school_administration,
    supports_establishing_and_maintaining_library,
    willing_to_participate_in_ambassador_program,
    at_least_200_students,
    estimated_total_students,
    is_good_fit_for_project,
    additional_comments,
    raw_form_data,
    created_by,
    updated_by
  )
  values (
    new_school_id,
    coalesce(nullif(p_payload #>> '{assessment,form_version}', ''), 'initial_assessment_wizard_v1'),
    visit_date,
    actor_id,
    nullif(btrim(p_payload #>> '{assessment,prepared_by_name}'), ''),
    (p_payload #>> '{assessment,underprivileged_or_low_income_area}')::boolean,
    true,
    true,
    true,
    (p_payload #>> '{assessment,at_least_200_students}')::boolean,
    (p_payload #>> '{assessment,estimated_total_students}')::integer,
    (p_payload #>> '{assessment,is_good_fit_for_project}')::boolean,
    nullif(btrim(p_payload #>> '{assessment,additional_comments}'), ''),
    p_payload #> '{assessment,raw_form_data}',
    actor_id,
    actor_id
  )
  returning id into new_assessment_id;

  insert into public.assessment_grade_counts (assessment_id, grade_label, student_count)
  select
    new_assessment_id,
    grade.value->>'grade_label',
    (grade.value->>'student_count')::integer
  from jsonb_array_elements(p_payload->'grade_counts') grade(value);

  insert into public.photos (
    school_id,
    assessment_id,
    uploaded_by,
    photo_type,
    storage_bucket,
    storage_path,
    content_type,
    file_size_bytes,
    caption,
    approval_status
  )
  select
    new_school_id,
    new_assessment_id,
    actor_id,
    (photo.value->>'photo_type')::public.photo_type,
    photo.value->>'storage_bucket',
    photo.value->>'storage_path',
    photo.value->>'content_type',
    (photo.value->>'file_size_bytes')::integer,
    photo.value->>'caption',
    'pending_review'
  from jsonb_array_elements(p_payload->'photos') photo(value);

  update public.photos
  set
    approval_status = 'approved',
    approved_by = actor_id,
    approved_at = now()
  where assessment_id = new_assessment_id;

  insert into public.audit_events (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    school_id,
    after_data,
    metadata
  )
  values
  (
    actor_id,
    'school_created',
    'school',
    new_school_id,
    new_school_id,
    jsonb_build_object(
      'school_number', new_school_number,
      'name', school_name_english,
      'name_english', school_name_english,
      'name_bangla', school_name_bangla,
      'address', school_address,
      'district', school_district,
      'latitude', school_latitude,
      'longitude', school_longitude,
      'needs_map_pin_cleanup', school_latitude is null,
      'pipeline_stage', 'assessed'
    ),
    jsonb_build_object('source', 'manager_dashboard_unified_wizard')
  ),
  (
    actor_id,
    'initial_assessment_completed',
    'school_assessment',
    new_assessment_id,
    new_school_id,
    jsonb_build_object(
      'assessment', p_payload #> '{assessment,raw_form_data}',
      'agreement_id', new_agreement_id,
      'photo_ids', (
        select coalesce(jsonb_agg(photo.id order by photo.created_at), '[]'::jsonb)
        from public.photos photo
        where photo.assessment_id = new_assessment_id
      )
    ),
    jsonb_build_object('source', 'manager_dashboard_unified_wizard')
  );

  school_id := new_school_id;
  school_number := new_school_number;
  assessment_id := new_assessment_id;
  agreement_id := new_agreement_id;
  was_created := true;
  return next;
end;
$$;

revoke all on function public.create_school_with_initial_assessment(uuid, jsonb) from public;
grant execute on function public.create_school_with_initial_assessment(uuid, jsonb) to authenticated;
