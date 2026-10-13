-- Equipment catalog. See docs/data-model.md.

create type public.equipment_status as enum (
  'available',
  'rented',
  'in_maintenance',
  'out_of_service'
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null
    check (asset_code <> '' and char_length(asset_code) <= 40),
  serial_number text
    check (serial_number is null or (serial_number <> '' and char_length(serial_number) <= 60)),
  brand text not null check (brand <> '' and char_length(brand) <= 60),
  model text not null check (model <> '' and char_length(model) <= 60),
  hour_meter numeric(10, 1) check (hour_meter is null or hour_meter >= 0),
  operational_status public.equipment_status not null default 'available',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.equipment is 'Forklift catalog. Deactivate instead of deleting.';

-- Case-insensitive uniqueness; multiple NULL serial numbers are allowed.
create unique index equipment_asset_code_key on public.equipment (lower(asset_code));
create unique index equipment_serial_number_key on public.equipment (lower(serial_number))
  where serial_number is not null;
create index equipment_operational_status_idx on public.equipment (operational_status);
create index equipment_is_active_idx on public.equipment (is_active);

-- Normalize text input for every writer (app and direct API calls alike).
create function public.normalize_equipment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.asset_code = btrim(new.asset_code);
  new.serial_number = nullif(btrim(new.serial_number), '');
  new.brand = btrim(new.brand);
  new.model = btrim(new.model);
  return new;
end;
$$;

create trigger equipment_normalize
  before insert or update on public.equipment
  for each row execute function public.normalize_equipment();

create trigger equipment_set_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();

-- Row Level Security -------------------------------------------------------

alter table public.equipment enable row level security;

revoke all on table public.equipment from anon;
revoke all on table public.equipment from authenticated;
grant select, insert, update on table public.equipment to authenticated;

create policy "Active users can read equipment"
  on public.equipment
  for select
  to authenticated
  using ((select public.current_app_role()) is not null);

create policy "Admins can create equipment"
  on public.equipment
  for insert
  to authenticated
  with check ((select public.current_app_role()) = 'admin');

create policy "Admins can update equipment"
  on public.equipment
  for update
  to authenticated
  using ((select public.current_app_role()) = 'admin')
  with check ((select public.current_app_role()) = 'admin');

-- No delete policy: equipment is deactivated, never physically deleted.
