-- NEDVI OS: persistencia real del CRM de clientes en Supabase

alter table public.customers
  add column if not exists timeline jsonb not null default '[]'::jsonb;

create unique index if not exists customers_folio_unique
  on public.customers(folio)
  where folio is not null;

create sequence if not exists public.nedvi_customer_folio_seq;

do $$
declare
  max_folio integer;
begin
  select coalesce(max((regexp_match(folio, '^NEDVI-CLI-([0-9]+)$'))[1]::integer), 0)
    into max_folio
  from public.customers
  where folio ~ '^NEDVI-CLI-[0-9]+$';

  if max_folio > 0 then
    perform setval('public.nedvi_customer_folio_seq', max_folio, true);
  else
    perform setval('public.nedvi_customer_folio_seq', 1, false);
  end if;
end $$;

create or replace function public.assign_customer_folio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.folio is null or btrim(new.folio) = '' then
    new.folio := 'NEDVI-CLI-' || lpad(nextval('public.nedvi_customer_folio_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists customers_assign_folio on public.customers;
create trigger customers_assign_folio
before insert on public.customers
for each row execute function public.assign_customer_folio();

create or replace function public.touch_customer_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at
before update on public.customers
for each row execute function public.touch_customer_updated_at();

create or replace function public.has_nedvi_permission(permission_name text)
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
      and (
        lower(coalesce(p.role::text, '')) = 'administracion'
        or permission_name = any(coalesce(p.permissions, '{}'::text[]))
      )
  );
$$;

grant execute on function public.has_nedvi_permission(text) to authenticated;

alter table public.customers enable row level security;

drop policy if exists admin_manage_customers on public.customers;
drop policy if exists nedvi_staff_read_customers on public.customers;
drop policy if exists crm_staff_select_customers on public.customers;
drop policy if exists crm_staff_insert_customers on public.customers;
drop policy if exists crm_staff_update_customers on public.customers;
drop policy if exists crm_staff_delete_customers on public.customers;

create policy crm_staff_select_customers
on public.customers for select to authenticated
using (public.has_nedvi_permission('commercial'));

create policy crm_staff_insert_customers
on public.customers for insert to authenticated
with check (public.has_nedvi_permission('commercial'));

create policy crm_staff_update_customers
on public.customers for update to authenticated
using (public.has_nedvi_permission('commercial'))
with check (public.has_nedvi_permission('commercial'));

create policy crm_staff_delete_customers
on public.customers for delete to authenticated
using (public.has_nedvi_permission('commercial'));

grant select, insert, update, delete on public.customers to authenticated;
grant usage, select on sequence public.nedvi_customer_folio_seq to authenticated;
