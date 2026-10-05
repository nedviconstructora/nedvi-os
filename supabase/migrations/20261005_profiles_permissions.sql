-- NEDVI OS: perfiles y permisos persistentes en Supabase
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists position text,
  add column if not exists permissions text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

update public.profiles p
set
  email = coalesce(p.email, u.email),
  full_name = coalesce(
    p.full_name,
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1)
  )
from auth.users u
where p.id = u.id;

update public.profiles
set permissions = case
  when lower(unaccent(coalesce(role, ''))) = 'administracion' then array[
    'dashboard','commercial','projects','purchasing','operations','agenda',
    'human-resources','finance','indicators','settings','coral','client-portal'
  ]::text[]
  when lower(unaccent(coalesce(role, ''))) = 'supervisor' then array[
    'dashboard','commercial','projects','purchasing','operations','agenda'
  ]::text[]
  when lower(unaccent(coalesce(role, ''))) = 'cliente' then array['client-portal']::text[]
  else permissions
end
where coalesce(array_length(permissions, 1), 0) = 0;

create or replace function public.is_nedvi_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and lower(unaccent(coalesce(p.role, ''))) = 'administracion'
  );
$$;

grant execute on function public.is_nedvi_admin() to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_nedvi_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_nedvi_admin())
with check (public.is_nedvi_admin());

grant select, update on public.profiles to authenticated;

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_profile_updated_at();
