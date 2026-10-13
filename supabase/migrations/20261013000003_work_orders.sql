-- Work orders, status transitions and status history.
-- See docs/data-model.md, docs/requirements.md (transition matrix) and docs/security.md.

create type public.work_order_status as enum (
  'new',
  'assigned',
  'in_progress',
  'waiting_parts',
  'waiting_authorization',
  'resolved',
  'cancelled'
);

create type public.work_order_priority as enum ('low', 'medium', 'high', 'critical');

-- Allowed transitions. Mirrors lib/domain/work-orders.ts (verified by tests).
create function public.work_order_transition_allowed(
  p_from public.work_order_status,
  p_to public.work_order_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from::text, p_to::text) in (
    ('new', 'assigned'), ('new', 'in_progress'), ('new', 'cancelled'),
    ('assigned', 'in_progress'), ('assigned', 'cancelled'),
    ('in_progress', 'waiting_parts'), ('in_progress', 'waiting_authorization'),
    ('in_progress', 'resolved'), ('in_progress', 'cancelled'),
    ('waiting_parts', 'in_progress'), ('waiting_parts', 'cancelled'),
    ('waiting_authorization', 'in_progress'), ('waiting_authorization', 'cancelled')
  );
$$;

revoke execute on function public.work_order_transition_allowed(public.work_order_status, public.work_order_status) from public, anon;
grant execute on function public.work_order_transition_allowed(public.work_order_status, public.work_order_status) to authenticated;

-- Per-year counter for human-readable numbers (OT-YYYY-NNNNN).
create table public.work_order_counters (
  year integer primary key,
  last_value integer not null
);

alter table public.work_order_counters enable row level security;
revoke all on table public.work_order_counters from anon, authenticated;
-- No policies: only the security definer trigger writes here.

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  -- Placeholder default; always replaced by work_orders_before_insert.
  work_order_number text not null unique default 'pending',
  equipment_id uuid not null references public.equipment (id) on delete restrict,
  title text not null check (title <> '' and char_length(title) <= 120),
  description text check (description is null or char_length(description) <= 2000),
  priority public.work_order_priority not null default 'medium',
  status public.work_order_status not null default 'new',
  reported_at timestamptz not null default now(),
  target_date date,
  assigned_technician_id uuid references public.profiles (id) on delete set null,
  started_at timestamptz,
  resolved_at timestamptz,
  failure_cause text check (failure_cause is null or char_length(failure_cause) <= 1000),
  resolution_notes text check (resolution_notes is null or char_length(resolution_notes) <= 2000),
  labor_cost numeric(12, 2) not null default 0,
  parts_cost numeric(12, 2) not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint work_orders_labor_cost_non_negative check (labor_cost >= 0),
  constraint work_orders_parts_cost_non_negative check (parts_cost >= 0),
  constraint work_orders_started_after_reported
    check (started_at is null or started_at >= reported_at),
  constraint work_orders_resolved_after_reported
    check (resolved_at is null or resolved_at >= reported_at),
  constraint work_orders_resolved_after_started
    check (resolved_at is null or started_at is null or resolved_at >= started_at),
  constraint work_orders_resolved_at_matches_status
    check ((status = 'resolved') = (resolved_at is not null)),
  constraint work_orders_assigned_requires_technician
    check (status <> 'assigned' or assigned_technician_id is not null)
);

comment on table public.work_orders is 'Maintenance work orders. Never deleted; cancelled orders remain for traceability.';

create index work_orders_equipment_id_idx on public.work_orders (equipment_id);
create index work_orders_status_idx on public.work_orders (status);
create index work_orders_priority_idx on public.work_orders (priority);
create index work_orders_reported_at_idx on public.work_orders (reported_at);
create index work_orders_target_date_idx on public.work_orders (target_date);
create index work_orders_assigned_technician_id_idx on public.work_orders (assigned_technician_id);

create table public.work_order_status_history (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete restrict,
  previous_status public.work_order_status,
  new_status public.work_order_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 500)
);

create index work_order_status_history_work_order_id_idx
  on public.work_order_status_history (work_order_id, changed_at);

-- Triggers -----------------------------------------------------------------

create function public.is_active_technician(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile_id and p.is_active and p.role = 'technician'
  );
$$;

revoke execute on function public.is_active_technician(uuid) from public, anon, authenticated;

create function public.work_orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer;
  v_seq integer;
begin
  if not exists (
    select 1 from public.equipment e where e.id = new.equipment_id and e.is_active
  ) then
    raise exception 'equipment_not_available' using errcode = 'P0001';
  end if;

  if new.assigned_technician_id is not null then
    if public.current_app_role() is distinct from 'admin' then
      raise exception 'assignment_not_allowed' using errcode = 'P0001';
    end if;
    if not public.is_active_technician(new.assigned_technician_id) then
      raise exception 'invalid_technician' using errcode = 'P0001';
    end if;
  end if;

  new.reported_at := coalesce(new.reported_at, now());
  if new.reported_at > now() + interval '5 minutes' then
    raise exception 'reported_at_in_future' using errcode = 'P0001';
  end if;

  -- Server-controlled fields.
  new.status := case when new.assigned_technician_id is null then 'new' else 'assigned' end;
  new.started_at := null;
  new.resolved_at := null;
  new.created_by := auth.uid();
  new.title := btrim(new.title);
  new.description := nullif(btrim(new.description), '');
  new.failure_cause := nullif(btrim(new.failure_cause), '');
  new.resolution_notes := nullif(btrim(new.resolution_notes), '');

  v_year := extract(year from (now() at time zone 'America/Mexico_City'))::integer;
  insert into public.work_order_counters as c (year, last_value)
  values (v_year, 1)
  on conflict (year) do update set last_value = c.last_value + 1
  returning last_value into v_seq;

  new.work_order_number := format(
    'OT-%s-%s', v_year, lpad(v_seq::text, greatest(5, length(v_seq::text)), '0')
  );
  return new;
end;
$$;

create trigger work_orders_before_insert
  before insert on public.work_orders
  for each row execute function public.work_orders_before_insert();

create function public.work_orders_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := public.current_app_role();
begin
  if new.work_order_number is distinct from old.work_order_number
    or new.equipment_id is distinct from old.equipment_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'immutable_field' using errcode = 'P0001';
  end if;

  -- Technicians may only change status, costs, notes and work timestamps.
  if v_role is distinct from 'admin' and (
    new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.priority is distinct from old.priority
    or new.target_date is distinct from old.target_date
    or new.reported_at is distinct from old.reported_at
    or new.assigned_technician_id is distinct from old.assigned_technician_id
  ) then
    raise exception 'field_not_allowed' using errcode = 'P0001';
  end if;

  if new.assigned_technician_id is distinct from old.assigned_technician_id
    and new.assigned_technician_id is not null
    and not public.is_active_technician(new.assigned_technician_id) then
    raise exception 'invalid_technician' using errcode = 'P0001';
  end if;

  if new.reported_at > now() + interval '5 minutes' then
    raise exception 'reported_at_in_future' using errcode = 'P0001';
  end if;

  -- Assigning a technician to a new order moves it to "assigned".
  if old.status = 'new' and new.status = 'new' and new.assigned_technician_id is not null then
    new.status := 'assigned';
  end if;

  if new.status is distinct from old.status then
    if not public.work_order_transition_allowed(old.status, new.status) then
      raise exception 'invalid_status_transition'
        using errcode = 'P0001', detail = format('%s -> %s', old.status, new.status);
    end if;
    if new.status = 'in_progress' and new.started_at is null then
      new.started_at := now();
    end if;
    if new.status = 'resolved' and new.resolved_at is null then
      new.resolved_at := now();
    end if;
  end if;

  new.title := btrim(new.title);
  new.description := nullif(btrim(new.description), '');
  new.failure_cause := nullif(btrim(new.failure_cause), '');
  new.resolution_notes := nullif(btrim(new.resolution_notes), '');
  return new;
end;
$$;

create trigger work_orders_before_update
  before update on public.work_orders
  for each row execute function public.work_orders_before_update();

create trigger work_orders_set_updated_at
  before update on public.work_orders
  for each row execute function public.set_updated_at();

-- Records creation and every status change. The optional note comes from the
-- transaction-local setting written by change_work_order_status().
create function public.work_orders_record_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.work_order_status_history (work_order_id, previous_status, new_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.work_order_status_history (work_order_id, previous_status, new_status, changed_by, note)
    values (
      new.id, old.status, new.status, auth.uid(),
      nullif(btrim(current_setting('app.status_note', true)), '')
    );
  end if;
  return null;
end;
$$;

create trigger work_orders_record_status
  after insert or update on public.work_orders
  for each row execute function public.work_orders_record_status();

-- Status change entry point. Runs as the caller, so RLS applies to the update.
create function public.change_work_order_status(
  p_work_order_id uuid,
  p_new_status public.work_order_status,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'note_too_long' using errcode = 'P0001';
  end if;

  perform set_config('app.status_note', coalesce(p_note, ''), true);

  update public.work_orders
  set status = p_new_status
  where id = p_work_order_id;

  if not found then
    raise exception 'work_order_not_found' using errcode = 'P0001';
  end if;

  perform set_config('app.status_note', '', true);
end;
$$;

revoke execute on function public.change_work_order_status(uuid, public.work_order_status, text) from public, anon;
grant execute on function public.change_work_order_status(uuid, public.work_order_status, text) to authenticated;

-- Trigger functions are not callable through the API.
revoke execute on function public.work_orders_before_insert() from public, anon, authenticated;
revoke execute on function public.work_orders_before_update() from public, anon, authenticated;
revoke execute on function public.work_orders_record_status() from public, anon, authenticated;

-- Row Level Security -------------------------------------------------------

alter table public.work_orders enable row level security;
alter table public.work_order_status_history enable row level security;

revoke all on table public.work_orders from anon, authenticated;
revoke all on table public.work_order_status_history from anon, authenticated;
grant select, insert, update on table public.work_orders to authenticated;
grant select on table public.work_order_status_history to authenticated;

create policy "Active users can read work orders"
  on public.work_orders
  for select
  to authenticated
  using ((select public.current_app_role()) is not null);

create policy "Active users can create work orders"
  on public.work_orders
  for insert
  to authenticated
  with check ((select public.current_app_role()) is not null);

create policy "Admins and assigned technicians can update work orders"
  on public.work_orders
  for update
  to authenticated
  using (
    (select public.current_app_role()) = 'admin'
    or (
      (select public.current_app_role()) = 'technician'
      and assigned_technician_id = (select auth.uid())
    )
  )
  with check (
    (select public.current_app_role()) = 'admin'
    or (
      (select public.current_app_role()) = 'technician'
      and assigned_technician_id = (select auth.uid())
    )
  );

create policy "Active users can read status history"
  on public.work_order_status_history
  for select
  to authenticated
  using ((select public.current_app_role()) is not null);

-- No delete policies anywhere; history is written only by the trigger.
