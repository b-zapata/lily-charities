-- Private storage buckets and object policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('school-photos', 'school-photos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp']),
  ('agreement-evidence', 'agreement-evidence', false, 20971520, array['image/jpeg', 'image/png', 'image/webp']),
  ('generated-agreements', 'generated-agreements', false, 10485760, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "storage_select_allowed_media"
on storage.objects for select
using (
  public.is_manager_or_admin()
  or exists (
    select 1
    from public.photos p
    where p.storage_bucket = bucket_id
      and p.storage_path = name
      and (
        p.uploaded_by = auth.uid()
        or p.approval_status = 'approved'
        or exists (
          select 1
          from public.change_requests cr
          where cr.id = p.change_request_id
            and cr.submitted_by = auth.uid()
        )
      )
  )
  or exists (
    select 1
    from public.school_agreements a
    where bucket_id = 'generated-agreements'
      and a.generated_pdf_storage_path = name
      and public.can_read_school(a.school_id)
      and public.is_manager_or_admin()
  )
);

create policy "storage_insert_pending_media"
on storage.objects for insert
with check (
  public.is_manager_or_admin()
  or (
    auth.uid() is not null
    and bucket_id in ('school-photos', 'agreement-evidence')
    and (storage.foldername(name))[1] = 'pending'
  )
);

create policy "storage_update_manager"
on storage.objects for update
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

create policy "storage_delete_admin"
on storage.objects for delete
using (public.is_admin());
