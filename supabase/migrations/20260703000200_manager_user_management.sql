-- Managers can manage volunteer/manager accounts, but admin accounts remain admin-only.

drop policy if exists "profiles_update_manager_or_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_update_manager_non_admin" on public.profiles;

create policy "profiles_update_manager_non_admin"
on public.profiles for update
using (
  public.is_admin()
  or (
    public.current_role() = 'manager'
    and role <> 'admin'
    and id <> auth.uid()
  )
)
with check (
  public.is_admin()
  or (
    public.current_role() = 'manager'
    and role <> 'admin'
    and id <> auth.uid()
  )
);
