-- Profiles and roles.
-- Single-company MVP: no tenant column. See docs/data-model.md and docs/security.md.

create type public.app_role as enum ('admin', 'technician');

-- Shared trigger function to maintain updated_at on every table.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 120),
  role public.app_role not null default 'technician',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profile and role for each auth user.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically for every new auth user.
-- Role always starts as technician; promotion to admin is an explicit action.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role of the current user, or null when unauthenticated or inactive.
-- security definer avoids RLS recursion when policies on profiles call it.
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active;
$$;

revoke execute on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

-- Row Level Security -------------------------------------------------------

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, role, is_active) on table public.profiles to authenticated;

create policy "Active users can read profiles"
  on public.profiles
  for select
  to authenticated
  using ((select public.current_app_role()) is not null);

create policy "Admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using ((select public.current_app_role()) = 'admin')
  with check ((select public.current_app_role()) = 'admin');

-- No insert/delete policies: inserts come from handle_new_user,
-- deletes cascade from auth.users.
