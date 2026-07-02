-- Lily Charities MVP initial schema.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

do $$
begin
  create type public.user_role as enum ('volunteer', 'manager', 'admin');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.pipeline_stage as enum (
    'identified',
    'assessed',
    'selected',
    'setup_in_progress',
    'training',
    'operational'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.selection_outcome as enum (
    'pending',
    'selected',
    'future_potential',
    'not_selected'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.change_request_type as enum (
    'new_school',
    'school_edit',
    'assessment_submission',
    'agreement_submission',
    'photo_upload',
    'lifecycle_update'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.change_request_status as enum (
    'draft',
    'pending_review',
    'needs_clarification',
    'approved',
    'partially_approved',
    'rejected',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.photo_type as enum (
    'school_exterior',
    'classroom',
    'library_space',
    'bookshelf',
    'students',
    'agreement_signature',
    'school_seal',
    'paper_agreement',
    'training',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.approval_status as enum ('pending_review', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create sequence if not exists public.school_number_seq start with 217;

create or replace function public.generate_school_number()
returns text
language sql
as $$
  select 'SCHOOL-' || lpad(nextval('public.school_number_seq')::text, 4, '0');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.increment_version()
returns trigger
language plpgsql
as $$
begin
  if row(new.*) is distinct from row(old.*) then
    new.version = coalesce(old.version, 0) + 1;
  end if;
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  phone text,
  role public.user_role not null default 'volunteer',
  preferred_app_language text,
  is_active boolean not null default true,
  home_area text,
  notes text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_not_blank check (btrim(email) <> ''),
  constraint profiles_display_name_not_blank check (btrim(display_name) <> '')
);

create unique index if not exists profiles_email_lower_idx on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_is_active_idx on public.profiles (is_active);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  school_number text not null,
  name text not null,
  name_english text,
  name_bangla text,
  alternate_name text,
  address text,
  area text,
  city text,
  district text,
  division text,
  country text not null default 'Bangladesh',
  latitude numeric(10,7),
  longitude numeric(10,7),
  map_pin_confirmed_at timestamptz,
  map_pin_confirmed_by uuid references public.profiles(id),
  map_pin_source text,
  gps_accuracy_meters numeric,
  gps_captured_at timestamptz,
  pipeline_stage public.pipeline_stage not null default 'identified',
  selection_outcome public.selection_outcome not null default 'pending',
  donor_id text,
  is_active boolean not null default true,
  needs_map_pin_cleanup boolean not null default false,
  data_quality_flags jsonb,
  summary_notes text,
  created_source text not null default 'manager',
  created_from_change_request_id uuid,
  source_import_filename text,
  source_import_row_number integer,
  legacy_source_payload jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  version integer not null default 1,
  deleted_at timestamptz,
  constraint schools_number_format check (school_number ~ '^SCHOOL-[0-9]{4,}$'),
  constraint schools_number_unique unique (school_number),
  constraint schools_name_not_blank check (btrim(name) <> ''),
  constraint schools_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint schools_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint schools_map_pin_required_except_import_cleanup check (
    (created_source = 'import' and needs_map_pin_cleanup = true)
    or (latitude is not null and longitude is not null)
  )
);

create index if not exists schools_pipeline_stage_idx on public.schools (pipeline_stage);
create index if not exists schools_selection_outcome_idx on public.schools (selection_outcome);
create index if not exists schools_is_active_idx on public.schools (is_active);
create index if not exists schools_needs_map_pin_cleanup_idx on public.schools (needs_map_pin_cleanup);
create index if not exists schools_donor_id_idx on public.schools (donor_id);
create index if not exists schools_name_trgm_idx on public.schools using gin (name gin_trgm_ops);
create index if not exists schools_name_english_trgm_idx on public.schools using gin (name_english gin_trgm_ops);
create index if not exists schools_name_bangla_trgm_idx on public.schools using gin (name_bangla gin_trgm_ops);
create index if not exists schools_address_trgm_idx on public.schools using gin (address gin_trgm_ops);

create trigger schools_set_updated_at
before update on public.schools
for each row execute function public.set_updated_at();

create trigger schools_increment_version
before update on public.schools
for each row execute function public.increment_version();

create table if not exists public.school_contacts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  role text not null,
  name text not null,
  phone text,
  email text,
  title text,
  is_primary boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint school_contacts_role_not_blank check (btrim(role) <> ''),
  constraint school_contacts_name_not_blank check (btrim(name) <> '')
);

create index if not exists school_contacts_school_id_idx on public.school_contacts (school_id);
create index if not exists school_contacts_school_role_idx on public.school_contacts (school_id, role);
create index if not exists school_contacts_name_trgm_idx on public.school_contacts using gin (name gin_trgm_ops);
create index if not exists school_contacts_phone_trgm_idx on public.school_contacts using gin (phone gin_trgm_ops);
create index if not exists school_contacts_email_trgm_idx on public.school_contacts using gin (email gin_trgm_ops);

create trigger school_contacts_set_updated_at
before update on public.school_contacts
for each row execute function public.set_updated_at();

create trigger school_contacts_increment_version
before update on public.school_contacts
for each row execute function public.increment_version();

create table if not exists public.school_assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.schools(id) on delete cascade,
  form_version text not null default 'school_selection_checklist_v1',
  visit_date date,
  prepared_by_user_id uuid references public.profiles(id),
  prepared_by_name text,
  located_in_dhaka_district boolean,
  underprivileged_or_low_income_area boolean,
  geographic_notes text,
  no_existing_library_facilities boolean,
  secure_space_available_for_library boolean,
  library_space_description text,
  library_space_size text,
  space_sufficient_for_library_needs boolean,
  infrastructure_notes text,
  commitment_from_school_administration boolean,
  supports_establishing_and_maintaining_library boolean,
  willing_to_participate_in_ambassador_program boolean,
  administrative_support_notes text,
  at_least_200_students boolean,
  diverse_student_demographics boolean,
  estimated_total_students integer,
  key_demographics text,
  environment_conducive_to_learning boolean,
  positive_attitude_toward_project boolean,
  potential_challenges_identified boolean,
  suitability_notes text,
  is_good_fit_for_project boolean,
  additional_comments text,
  raw_form_data jsonb,
  source_change_request_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint school_assessments_total_nonnegative check (estimated_total_students is null or estimated_total_students >= 0)
);

create index if not exists school_assessments_visit_date_idx on public.school_assessments (visit_date);
create index if not exists school_assessments_good_fit_idx on public.school_assessments (is_good_fit_for_project);
create index if not exists school_assessments_total_students_idx on public.school_assessments (estimated_total_students);

create trigger school_assessments_set_updated_at
before update on public.school_assessments
for each row execute function public.set_updated_at();

create trigger school_assessments_increment_version
before update on public.school_assessments
for each row execute function public.increment_version();

create table if not exists public.assessment_grade_counts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.school_assessments(id) on delete cascade,
  grade_label text not null,
  student_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_grade_counts_unique unique (assessment_id, grade_label),
  constraint assessment_grade_counts_nonnegative check (student_count is null or student_count >= 0)
);

create trigger assessment_grade_counts_set_updated_at
before update on public.assessment_grade_counts
for each row execute function public.set_updated_at();

create table if not exists public.library_setups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.schools(id) on delete cascade,
  setup_started_date date,
  dedicated_room_confirmed boolean,
  library_space_notes text,
  bookshelf_installed_date date,
  books_delivered_date date,
  lead_teacher_contact_id uuid references public.school_contacts(id),
  student_ambassadors_planned_count integer,
  student_ambassadors_trained_count integer,
  training_scheduled_date date,
  training_completed_date date,
  operational_date date,
  current_notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint library_setups_planned_count_nonnegative check (student_ambassadors_planned_count is null or student_ambassadors_planned_count >= 0),
  constraint library_setups_trained_count_nonnegative check (student_ambassadors_trained_count is null or student_ambassadors_trained_count >= 0)
);

create index if not exists library_setups_setup_started_idx on public.library_setups (setup_started_date);
create index if not exists library_setups_training_completed_idx on public.library_setups (training_completed_date);
create index if not exists library_setups_operational_idx on public.library_setups (operational_date);

create trigger library_setups_set_updated_at
before update on public.library_setups
for each row execute function public.set_updated_at();

create trigger library_setups_increment_version
before update on public.library_setups
for each row execute function public.increment_version();

create table if not exists public.mobile_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_name text,
  platform text not null default 'android',
  app_version text,
  push_token text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mobile_devices_platform_not_blank check (btrim(platform) <> '')
);

create index if not exists mobile_devices_user_id_idx on public.mobile_devices (user_id);

create trigger mobile_devices_set_updated_at
before update on public.mobile_devices
for each row execute function public.set_updated_at();

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  request_type public.change_request_type not null,
  status public.change_request_status not null default 'pending_review',
  school_id uuid references public.schools(id),
  target_entity_type text,
  target_entity_id uuid,
  submitted_by uuid not null references public.profiles(id),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  base_version integer,
  proposed_data jsonb not null default '{}'::jsonb,
  before_data jsonb,
  applied_data jsonb,
  component_decisions jsonb,
  conflict_detected boolean not null default false,
  client_mutation_id text,
  client_created_at timestamptz,
  source_device_id uuid references public.mobile_devices(id),
  supersedes_change_request_id uuid references public.change_requests(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint change_requests_review_notes_on_reject check (status <> 'rejected' or nullif(btrim(coalesce(review_notes, '')), '') is not null)
);

create index if not exists change_requests_status_idx on public.change_requests (status);
create index if not exists change_requests_type_idx on public.change_requests (request_type);
create index if not exists change_requests_school_id_idx on public.change_requests (school_id);
create index if not exists change_requests_submitted_by_idx on public.change_requests (submitted_by);
create index if not exists change_requests_reviewed_by_idx on public.change_requests (reviewed_by);
create index if not exists change_requests_submitted_at_idx on public.change_requests (submitted_at);
create unique index if not exists change_requests_client_mutation_unique_idx
  on public.change_requests (submitted_by, source_device_id, client_mutation_id)
  where client_mutation_id is not null;

create trigger change_requests_set_updated_at
before update on public.change_requests
for each row execute function public.set_updated_at();

alter table public.schools
  add constraint schools_created_from_change_request_fk
  foreign key (created_from_change_request_id) references public.change_requests(id);

alter table public.school_assessments
  add constraint school_assessments_source_change_request_fk
  foreign key (source_change_request_id) references public.change_requests(id);

create table if not exists public.school_agreements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  agreement_date date not null,
  represented_school_name text not null,
  signatory_name text not null,
  signatory_title text,
  signatory_contact_id uuid references public.school_contacts(id),
  signatory_phone text,
  app_language text,
  agreement_language text not null,
  terms_version text not null,
  terms_text_snapshot jsonb not null,
  authorized_signatory_confirmed boolean not null,
  accepted_standard_terms boolean not null,
  accepted_at timestamptz not null,
  captured_by_user_id uuid not null references public.profiles(id),
  signature_photo_id uuid,
  seal_photo_id uuid,
  paper_agreement_photo_id uuid,
  generated_pdf_storage_path text,
  generated_pdf_at timestamptz,
  notes text,
  source_change_request_id uuid references public.change_requests(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint school_agreements_represented_name_not_blank check (btrim(represented_school_name) <> ''),
  constraint school_agreements_signatory_name_not_blank check (btrim(signatory_name) <> ''),
  constraint school_agreements_language_supported check (agreement_language in ('en', 'bn')),
  constraint school_agreements_authorized_true check (authorized_signatory_confirmed = true),
  constraint school_agreements_terms_true check (accepted_standard_terms = true)
);

create index if not exists school_agreements_school_id_idx on public.school_agreements (school_id);
create index if not exists school_agreements_language_idx on public.school_agreements (agreement_language);
create index if not exists school_agreements_approved_at_idx on public.school_agreements (approved_at);

create trigger school_agreements_set_updated_at
before update on public.school_agreements
for each row execute function public.set_updated_at();

create trigger school_agreements_increment_version
before update on public.school_agreements
for each row execute function public.increment_version();

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  assessment_id uuid references public.school_assessments(id) on delete set null,
  agreement_id uuid references public.school_agreements(id) on delete set null,
  library_setup_id uuid references public.library_setups(id) on delete set null,
  change_request_id uuid references public.change_requests(id) on delete set null,
  uploaded_by uuid not null references public.profiles(id),
  photo_type public.photo_type not null,
  storage_bucket text not null,
  storage_path text not null,
  thumbnail_storage_path text,
  content_type text not null,
  file_size_bytes integer,
  checksum text,
  caption text,
  taken_at timestamptz,
  latitude numeric(10,7),
  longitude numeric(10,7),
  approval_status public.approval_status not null default 'pending_review',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id),
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint photos_storage_unique unique (storage_bucket, storage_path),
  constraint photos_content_type_not_blank check (btrim(content_type) <> ''),
  constraint photos_file_size_nonnegative check (file_size_bytes is null or file_size_bytes >= 0),
  constraint photos_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint photos_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint photos_rejection_reason_required check (approval_status <> 'rejected' or nullif(btrim(coalesce(rejection_reason, '')), '') is not null)
);

create index if not exists photos_school_id_idx on public.photos (school_id);
create index if not exists photos_change_request_id_idx on public.photos (change_request_id);
create index if not exists photos_uploaded_by_idx on public.photos (uploaded_by);
create index if not exists photos_approval_status_type_idx on public.photos (approval_status, photo_type);

alter table public.school_agreements
  add constraint school_agreements_signature_photo_fk
  foreign key (signature_photo_id) references public.photos(id);

alter table public.school_agreements
  add constraint school_agreements_seal_photo_fk
  foreign key (seal_photo_id) references public.photos(id);

alter table public.school_agreements
  add constraint school_agreements_paper_photo_fk
  foreign key (paper_agreement_photo_id) references public.photos(id);

create table if not exists public.change_request_comments (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid not null references public.change_requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  constraint change_request_comments_body_not_blank check (btrim(body) <> '')
);

create index if not exists change_request_comments_request_idx on public.change_request_comments (change_request_id);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  school_id uuid references public.schools(id),
  change_request_id uuid references public.change_requests(id),
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_event_type_not_blank check (btrim(event_type) <> ''),
  constraint audit_events_entity_type_not_blank check (btrim(entity_type) <> '')
);

create index if not exists audit_events_actor_id_idx on public.audit_events (actor_id);
create index if not exists audit_events_school_id_idx on public.audit_events (school_id);
create index if not exists audit_events_change_request_id_idx on public.audit_events (change_request_id);
create index if not exists audit_events_created_at_idx on public.audit_events (created_at);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id),
  export_type text not null,
  filters jsonb,
  status text not null default 'completed',
  storage_path text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint export_jobs_export_type_not_blank check (btrim(export_type) <> '')
);

create index if not exists export_jobs_requested_by_idx on public.export_jobs (requested_by);
create index if not exists export_jobs_created_at_idx on public.export_jobs (created_at);

create table if not exists public.sync_batches (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.mobile_devices(id),
  user_id uuid not null references public.profiles(id),
  client_batch_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'started',
  mutation_count integer not null default 0,
  error_summary text,
  constraint sync_batches_mutation_count_nonnegative check (mutation_count >= 0)
);

create index if not exists sync_batches_device_id_idx on public.sync_batches (device_id);
create index if not exists sync_batches_user_id_idx on public.sync_batches (user_id);
create index if not exists sync_batches_started_at_idx on public.sync_batches (started_at);
