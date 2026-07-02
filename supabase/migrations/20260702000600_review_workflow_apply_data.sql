-- Expand manager review application logic for real approval workflows.

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
    if nullif(coalesce(payload #>> '{school,name}', payload->>'name'), '') is null then
      raise exception 'School name is required' using errcode = '22023';
    end if;
    if coalesce(payload #>> '{school,latitude}', payload->>'latitude') is null
      or coalesce(payload #>> '{school,longitude}', payload->>'longitude') is null then
      raise exception 'Map pin is required' using errcode = '22023';
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
  new_assessment_id uuid;
  new_agreement_id uuid;
  applied jsonb;
  school_patch jsonb;
  assessment_patch jsonb;
  agreement_patch jsonb;
  photo_patch jsonb;
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

  if decision_status is null
    or decision_status not in ('approved', 'partially_approved', 'rejected', 'needs_clarification') then
    raise exception 'Invalid review status' using errcode = '22023';
  end if;

  if decision_status in ('rejected', 'needs_clarification') and nullif(btrim(coalesce(decision->>'review_notes', '')), '') is null then
    raise exception 'Review notes are required' using errcode = '22023';
  end if;

  applied := coalesce(decision->'applied_data', request_row.proposed_data);
  school_patch := case when jsonb_typeof(applied->'school') = 'object' then applied->'school' else applied end;
  assessment_patch := case when jsonb_typeof(applied->'assessment') = 'object' then applied->'assessment' else applied end;
  agreement_patch := case when jsonb_typeof(applied->'agreement') = 'object' then applied->'agreement' else applied end;
  photo_patch := case when jsonb_typeof(applied->'photo') = 'object' then applied->'photo' else applied end;

  if decision_status in ('approved', 'partially_approved') then
    if request_row.request_type = 'new_school' then
      insert into public.schools (
        school_number,
        name,
        name_english,
        name_bangla,
        address,
        area,
        city,
        district,
        division,
        donor_id,
        latitude,
        longitude,
        map_pin_source,
        map_pin_confirmed_at,
        map_pin_confirmed_by,
        pipeline_stage,
        selection_outcome,
        summary_notes,
        created_source,
        created_from_change_request_id,
        created_by,
        updated_by
      )
      values (
        coalesce(nullif(school_patch->>'school_number', ''), public.generate_school_number()),
        coalesce(nullif(school_patch->>'name', ''), nullif(school_patch->>'name_english', '')),
        nullif(school_patch->>'name_english', ''),
        nullif(school_patch->>'name_bangla', ''),
        nullif(school_patch->>'address', ''),
        nullif(school_patch->>'area', ''),
        nullif(school_patch->>'city', ''),
        nullif(school_patch->>'district', ''),
        nullif(school_patch->>'division', ''),
        nullif(school_patch->>'donor_id', ''),
        nullif(school_patch->>'latitude', '')::numeric,
        nullif(school_patch->>'longitude', '')::numeric,
        coalesce(nullif(school_patch->>'map_pin_source', ''), 'manual'),
        now(),
        reviewer_id,
        coalesce(nullif(school_patch->>'pipeline_stage', '')::public.pipeline_stage, 'identified'),
        coalesce(nullif(school_patch->>'selection_outcome', '')::public.selection_outcome, 'pending'),
        nullif(school_patch->>'summary_notes', ''),
        'approved_change_request',
        request_row.id,
        reviewer_id,
        reviewer_id
      )
      returning id into new_school_id;

      if jsonb_typeof(applied->'contacts') = 'array' then
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
        select
          new_school_id,
          coalesce(nullif(contact_item.value->>'role', ''), 'other'),
          contact_item.value->>'name',
          nullif(contact_item.value->>'phone', ''),
          nullif(contact_item.value->>'email', ''),
          nullif(contact_item.value->>'title', ''),
          coalesce(nullif(contact_item.value->>'is_primary', '')::boolean, true),
          reviewer_id,
          reviewer_id
        from jsonb_array_elements(applied->'contacts') as contact_item(value)
        where nullif(btrim(coalesce(contact_item.value->>'name', '')), '') is not null;
      end if;

      update public.change_requests
      set school_id = new_school_id
      where id = request_row.id;

    elsif request_row.request_type = 'school_edit' then
      update public.schools
      set
        school_number = coalesce(nullif(school_patch->>'school_number', ''), school_number),
        name = coalesce(nullif(school_patch->>'name', ''), name),
        name_english = case when school_patch ? 'name_english' then nullif(school_patch->>'name_english', '') else name_english end,
        name_bangla = case when school_patch ? 'name_bangla' then nullif(school_patch->>'name_bangla', '') else name_bangla end,
        alternate_name = case when school_patch ? 'alternate_name' then nullif(school_patch->>'alternate_name', '') else alternate_name end,
        address = case when school_patch ? 'address' then nullif(school_patch->>'address', '') else address end,
        area = case when school_patch ? 'area' then nullif(school_patch->>'area', '') else area end,
        city = case when school_patch ? 'city' then nullif(school_patch->>'city', '') else city end,
        district = case when school_patch ? 'district' then nullif(school_patch->>'district', '') else district end,
        division = case when school_patch ? 'division' then nullif(school_patch->>'division', '') else division end,
        donor_id = case when school_patch ? 'donor_id' then nullif(school_patch->>'donor_id', '') else donor_id end,
        latitude = case when school_patch ? 'latitude' then nullif(school_patch->>'latitude', '')::numeric else latitude end,
        longitude = case when school_patch ? 'longitude' then nullif(school_patch->>'longitude', '')::numeric else longitude end,
        map_pin_source = case
          when school_patch ? 'latitude' or school_patch ? 'longitude' then coalesce(nullif(school_patch->>'map_pin_source', ''), 'manual')
          when school_patch ? 'map_pin_source' then nullif(school_patch->>'map_pin_source', '')
          else map_pin_source
        end,
        map_pin_confirmed_at = case
          when (school_patch ? 'latitude' or school_patch ? 'longitude')
            and coalesce(nullif(school_patch->>'latitude', '')::numeric, latitude) is not null
            and coalesce(nullif(school_patch->>'longitude', '')::numeric, longitude) is not null
          then now()
          else map_pin_confirmed_at
        end,
        map_pin_confirmed_by = case
          when (school_patch ? 'latitude' or school_patch ? 'longitude')
            and coalesce(nullif(school_patch->>'latitude', '')::numeric, latitude) is not null
            and coalesce(nullif(school_patch->>'longitude', '')::numeric, longitude) is not null
          then reviewer_id
          else map_pin_confirmed_by
        end,
        needs_map_pin_cleanup = case
          when (school_patch ? 'latitude' or school_patch ? 'longitude')
            and coalesce(nullif(school_patch->>'latitude', '')::numeric, latitude) is not null
            and coalesce(nullif(school_patch->>'longitude', '')::numeric, longitude) is not null
          then false
          when school_patch ? 'needs_map_pin_cleanup' then (school_patch->>'needs_map_pin_cleanup')::boolean
          else needs_map_pin_cleanup
        end,
        pipeline_stage = coalesce(nullif(school_patch->>'pipeline_stage', '')::public.pipeline_stage, pipeline_stage),
        selection_outcome = coalesce(nullif(school_patch->>'selection_outcome', '')::public.selection_outcome, selection_outcome),
        summary_notes = case when school_patch ? 'summary_notes' then nullif(school_patch->>'summary_notes', '') else summary_notes end,
        is_active = case when school_patch ? 'is_active' then (school_patch->>'is_active')::boolean else is_active end,
        updated_by = reviewer_id
      where id = request_row.school_id;

    elsif request_row.request_type = 'lifecycle_update' then
      update public.schools
      set
        pipeline_stage = coalesce(nullif(applied->>'pipeline_stage', '')::public.pipeline_stage, pipeline_stage),
        selection_outcome = coalesce(nullif(applied->>'selection_outcome', '')::public.selection_outcome, selection_outcome),
        updated_by = reviewer_id
      where id = request_row.school_id;

    elsif request_row.request_type = 'assessment_submission' then
      insert into public.school_assessments (
        school_id,
        form_version,
        visit_date,
        prepared_by_user_id,
        prepared_by_name,
        located_in_dhaka_district,
        underprivileged_or_low_income_area,
        geographic_notes,
        no_existing_library_facilities,
        secure_space_available_for_library,
        library_space_description,
        library_space_size,
        space_sufficient_for_library_needs,
        infrastructure_notes,
        commitment_from_school_administration,
        supports_establishing_and_maintaining_library,
        willing_to_participate_in_ambassador_program,
        administrative_support_notes,
        at_least_200_students,
        diverse_student_demographics,
        estimated_total_students,
        key_demographics,
        environment_conducive_to_learning,
        positive_attitude_toward_project,
        potential_challenges_identified,
        suitability_notes,
        is_good_fit_for_project,
        additional_comments,
        raw_form_data,
        source_change_request_id,
        created_by,
        updated_by
      )
      values (
        request_row.school_id,
        coalesce(nullif(assessment_patch->>'form_version', ''), 'school_selection_checklist_v1'),
        nullif(assessment_patch->>'visit_date', '')::date,
        request_row.submitted_by,
        nullif(assessment_patch->>'prepared_by_name', ''),
        nullif(assessment_patch->>'located_in_dhaka_district', '')::boolean,
        nullif(assessment_patch->>'underprivileged_or_low_income_area', '')::boolean,
        nullif(assessment_patch->>'geographic_notes', ''),
        nullif(assessment_patch->>'no_existing_library_facilities', '')::boolean,
        nullif(assessment_patch->>'secure_space_available_for_library', '')::boolean,
        nullif(assessment_patch->>'library_space_description', ''),
        nullif(assessment_patch->>'library_space_size', ''),
        nullif(assessment_patch->>'space_sufficient_for_library_needs', '')::boolean,
        nullif(assessment_patch->>'infrastructure_notes', ''),
        nullif(assessment_patch->>'commitment_from_school_administration', '')::boolean,
        nullif(assessment_patch->>'supports_establishing_and_maintaining_library', '')::boolean,
        nullif(assessment_patch->>'willing_to_participate_in_ambassador_program', '')::boolean,
        nullif(assessment_patch->>'administrative_support_notes', ''),
        nullif(assessment_patch->>'at_least_200_students', '')::boolean,
        nullif(assessment_patch->>'diverse_student_demographics', '')::boolean,
        nullif(assessment_patch->>'estimated_total_students', '')::integer,
        nullif(assessment_patch->>'key_demographics', ''),
        nullif(assessment_patch->>'environment_conducive_to_learning', '')::boolean,
        nullif(assessment_patch->>'positive_attitude_toward_project', '')::boolean,
        nullif(assessment_patch->>'potential_challenges_identified', '')::boolean,
        nullif(assessment_patch->>'suitability_notes', ''),
        nullif(assessment_patch->>'is_good_fit_for_project', '')::boolean,
        nullif(assessment_patch->>'additional_comments', ''),
        assessment_patch,
        request_row.id,
        reviewer_id,
        reviewer_id
      )
      on conflict (school_id) do update
      set
        form_version = excluded.form_version,
        visit_date = excluded.visit_date,
        prepared_by_user_id = excluded.prepared_by_user_id,
        prepared_by_name = excluded.prepared_by_name,
        located_in_dhaka_district = excluded.located_in_dhaka_district,
        underprivileged_or_low_income_area = excluded.underprivileged_or_low_income_area,
        geographic_notes = excluded.geographic_notes,
        no_existing_library_facilities = excluded.no_existing_library_facilities,
        secure_space_available_for_library = excluded.secure_space_available_for_library,
        library_space_description = excluded.library_space_description,
        library_space_size = excluded.library_space_size,
        space_sufficient_for_library_needs = excluded.space_sufficient_for_library_needs,
        infrastructure_notes = excluded.infrastructure_notes,
        commitment_from_school_administration = excluded.commitment_from_school_administration,
        supports_establishing_and_maintaining_library = excluded.supports_establishing_and_maintaining_library,
        willing_to_participate_in_ambassador_program = excluded.willing_to_participate_in_ambassador_program,
        administrative_support_notes = excluded.administrative_support_notes,
        at_least_200_students = excluded.at_least_200_students,
        diverse_student_demographics = excluded.diverse_student_demographics,
        estimated_total_students = excluded.estimated_total_students,
        key_demographics = excluded.key_demographics,
        environment_conducive_to_learning = excluded.environment_conducive_to_learning,
        positive_attitude_toward_project = excluded.positive_attitude_toward_project,
        potential_challenges_identified = excluded.potential_challenges_identified,
        suitability_notes = excluded.suitability_notes,
        is_good_fit_for_project = excluded.is_good_fit_for_project,
        additional_comments = excluded.additional_comments,
        raw_form_data = excluded.raw_form_data,
        source_change_request_id = excluded.source_change_request_id,
        updated_by = excluded.updated_by
      returning id into new_assessment_id;

      selected_outcome := coalesce(nullif(decision->>'selection_outcome', '')::public.selection_outcome, 'selected');

      update public.schools
      set
        pipeline_stage = case when selected_outcome = 'selected' then 'selected' else 'assessed' end,
        selection_outcome = selected_outcome,
        updated_by = reviewer_id
      where id = request_row.school_id;

    elsif request_row.request_type = 'agreement_submission' then
      insert into public.school_agreements (
        school_id,
        agreement_date,
        represented_school_name,
        signatory_name,
        signatory_title,
        signatory_phone,
        app_language,
        agreement_language,
        terms_version,
        terms_text_snapshot,
        authorized_signatory_confirmed,
        accepted_standard_terms,
        accepted_at,
        captured_by_user_id,
        signature_photo_id,
        seal_photo_id,
        paper_agreement_photo_id,
        notes,
        source_change_request_id,
        approved_by,
        approved_at,
        created_by,
        updated_by
      )
      values (
        request_row.school_id,
        coalesce(nullif(agreement_patch->>'agreement_date', '')::date, current_date),
        coalesce(nullif(agreement_patch->>'represented_school_name', ''), (select s.name from public.schools s where s.id = request_row.school_id)),
        nullif(agreement_patch->>'signatory_name', ''),
        nullif(agreement_patch->>'signatory_title', ''),
        nullif(agreement_patch->>'signatory_phone', ''),
        nullif(agreement_patch->>'app_language', ''),
        coalesce(nullif(agreement_patch->>'agreement_language', ''), 'en'),
        coalesce(nullif(agreement_patch->>'terms_version', ''), 'agreement_v1'),
        coalesce(agreement_patch->'terms_text_snapshot', agreement_patch->'terms', '{}'::jsonb),
        coalesce(nullif(agreement_patch->>'authorized_signatory_confirmed', '')::boolean, false),
        coalesce(nullif(agreement_patch->>'accepted_standard_terms', '')::boolean, false),
        coalesce(nullif(agreement_patch->>'accepted_at', '')::timestamptz, now()),
        coalesce(nullif(agreement_patch->>'captured_by_user_id', '')::uuid, request_row.submitted_by),
        nullif(agreement_patch->>'signature_photo_id', '')::uuid,
        nullif(agreement_patch->>'seal_photo_id', '')::uuid,
        nullif(agreement_patch->>'paper_agreement_photo_id', '')::uuid,
        decision->>'review_notes',
        request_row.id,
        reviewer_id,
        now(),
        reviewer_id,
        reviewer_id
      )
      returning id into new_agreement_id;

      update public.photos
      set
        agreement_id = new_agreement_id,
        approval_status = 'approved',
        approved_by = reviewer_id,
        approved_at = now()
      where id in (
        nullif(agreement_patch->>'signature_photo_id', '')::uuid,
        nullif(agreement_patch->>'seal_photo_id', '')::uuid,
        nullif(agreement_patch->>'paper_agreement_photo_id', '')::uuid
      );

    elsif request_row.request_type = 'photo_upload' then
      if nullif(photo_patch->>'photo_id', '') is not null then
        update public.photos
        set
          approval_status = 'approved',
          approved_by = reviewer_id,
          approved_at = now()
        where id = nullif(photo_patch->>'photo_id', '')::uuid;
      end if;

      if jsonb_typeof(photo_patch->'photo_ids') = 'array' then
        update public.photos
        set
          approval_status = 'approved',
          approved_by = reviewer_id,
          approved_at = now()
        where id in (
          select photo_id.value::uuid
          from jsonb_array_elements_text(photo_patch->'photo_ids') as photo_id(value)
        );
      end if;
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
    jsonb_build_object(
      'decision', decision,
      'new_school_id', new_school_id,
      'new_assessment_id', new_assessment_id,
      'new_agreement_id', new_agreement_id
    )
  );

  return request_row;
end;
$$;
