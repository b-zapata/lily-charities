-- Row-Level Security policies for Lily Charities MVP.

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('manager', 'admin')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin'
$$;

create or replace function public.is_volunteer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'volunteer'
$$;

create or replace function public.can_read_school(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.schools s
    where s.id = target_school_id
      and s.deleted_at is null
      and (
        public.is_manager_or_admin()
        or (s.is_active = true and auth.uid() is not null)
      )
  )
$$;

alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.school_contacts enable row level security;
alter table public.school_assessments enable row level security;
alter table public.assessment_grade_counts enable row level security;
alter table public.library_setups enable row level security;
alter table public.mobile_devices enable row level security;
alter table public.change_requests enable row level security;
alter table public.school_agreements enable row level security;
alter table public.photos enable row level security;
alter table public.change_request_comments enable row level security;
alter table public.audit_events enable row level security;
alter table public.export_jobs enable row level security;
alter table public.sync_batches enable row level security;

create policy "profiles_select_self_or_manager"
on public.profiles for select
using (id = auth.uid() or public.is_manager_or_admin());

create policy "profiles_insert_admin"
on public.profiles for insert
with check (public.is_admin());

create policy "profiles_update_manager_or_admin"
on public.profiles for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "schools_select_active_or_manager"
on public.schools for select
using (
  deleted_at is null
  and (
    public.is_manager_or_admin()
    or (is_active = true and auth.uid() is not null)
  )
);

create policy "schools_insert_manager"
on public.schools for insert
with check (public.is_manager_or_admin());

create policy "schools_update_manager"
on public.schools for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "school_contacts_select_readable_school"
on public.school_contacts for select
using (deleted_at is null and public.can_read_school(school_id));

create policy "school_contacts_manager_insert"
on public.school_contacts for insert
with check (public.is_manager_or_admin());

create policy "school_contacts_manager_update"
on public.school_contacts for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "school_assessments_select_readable_school"
on public.school_assessments for select
using (deleted_at is null and public.can_read_school(school_id));

create policy "school_assessments_manager_insert"
on public.school_assessments for insert
with check (public.is_manager_or_admin());

create policy "school_assessments_manager_update"
on public.school_assessments for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "assessment_grade_counts_select_via_assessment"
on public.assessment_grade_counts for select
using (
  exists (
    select 1
    from public.school_assessments a
    where a.id = assessment_id
      and public.can_read_school(a.school_id)
  )
);

create policy "assessment_grade_counts_manager_insert"
on public.assessment_grade_counts for insert
with check (public.is_manager_or_admin());

create policy "assessment_grade_counts_manager_update"
on public.assessment_grade_counts for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "library_setups_select_readable_school"
on public.library_setups for select
using (deleted_at is null and public.can_read_school(school_id));

create policy "library_setups_manager_insert"
on public.library_setups for insert
with check (public.is_manager_or_admin());

create policy "library_setups_manager_update"
on public.library_setups for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "mobile_devices_select_own_or_manager"
on public.mobile_devices for select
using (user_id = auth.uid() or public.is_manager_or_admin());

create policy "mobile_devices_insert_own"
on public.mobile_devices for insert
with check (user_id = auth.uid());

create policy "mobile_devices_update_own_or_manager"
on public.mobile_devices for update
using (user_id = auth.uid() or public.is_manager_or_admin())
with check (user_id = auth.uid() or public.is_manager_or_admin());

create policy "change_requests_select_own_or_manager"
on public.change_requests for select
using (submitted_by = auth.uid() or public.is_manager_or_admin());

create policy "change_requests_insert_own"
on public.change_requests for insert
with check (submitted_by = auth.uid());

create policy "change_requests_update_own_draft_or_manager"
on public.change_requests for update
using (
  public.is_manager_or_admin()
  or (submitted_by = auth.uid() and status in ('draft', 'needs_clarification', 'rejected'))
)
with check (
  public.is_manager_or_admin()
  or (submitted_by = auth.uid() and status in ('draft', 'pending_review'))
);

create policy "school_agreements_select_readable_or_submitter"
on public.school_agreements for select
using (
  public.can_read_school(school_id)
  or captured_by_user_id = auth.uid()
  or public.is_manager_or_admin()
);

create policy "school_agreements_manager_insert"
on public.school_agreements for insert
with check (public.is_manager_or_admin());

create policy "school_agreements_manager_update"
on public.school_agreements for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "photos_select_allowed"
on public.photos for select
using (
  public.is_manager_or_admin()
  or uploaded_by = auth.uid()
  or (
    approval_status = 'approved'
    and school_id is not null
    and public.can_read_school(school_id)
  )
  or exists (
    select 1
    from public.change_requests cr
    where cr.id = photos.change_request_id
      and cr.submitted_by = auth.uid()
  )
);

create policy "photos_insert_own_pending"
on public.photos for insert
with check (
  uploaded_by = auth.uid()
  and approval_status = 'pending_review'
);

create policy "photos_update_manager"
on public.photos for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "change_request_comments_select_participant"
on public.change_request_comments for select
using (
  public.is_manager_or_admin()
  or exists (
    select 1
    from public.change_requests cr
    where cr.id = change_request_id
      and cr.submitted_by = auth.uid()
  )
);

create policy "change_request_comments_insert_participant"
on public.change_request_comments for insert
with check (
  public.is_manager_or_admin()
  or exists (
    select 1
    from public.change_requests cr
    where cr.id = change_request_id
      and cr.submitted_by = auth.uid()
  )
);

create policy "audit_events_select_manager"
on public.audit_events for select
using (public.is_manager_or_admin());

create policy "audit_events_insert_manager"
on public.audit_events for insert
with check (public.is_manager_or_admin());

create policy "export_jobs_select_manager"
on public.export_jobs for select
using (public.is_manager_or_admin());

create policy "export_jobs_insert_manager"
on public.export_jobs for insert
with check (public.is_manager_or_admin() and requested_by = auth.uid());

create policy "export_jobs_update_manager"
on public.export_jobs for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "sync_batches_select_own_or_manager"
on public.sync_batches for select
using (user_id = auth.uid() or public.is_manager_or_admin());

create policy "sync_batches_insert_own"
on public.sync_batches for insert
with check (user_id = auth.uid());

create policy "sync_batches_update_own_or_manager"
on public.sync_batches for update
using (user_id = auth.uid() or public.is_manager_or_admin())
with check (user_id = auth.uid() or public.is_manager_or_admin());
