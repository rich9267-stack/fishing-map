-- Admin controls, step 9 (first half): the private-spot view, built but LOCKED.
-- Plan rule: the gated boxes stay locked until the privacy page and terms say so and Legal has looked at the wording.
-- So there is a master switch per gated feature (table gate_switches). Both start CLOSED. While a switch is closed,
-- NOBODY can use the feature, not even the owner. Richard opens one later in the SQL Editor, only after the wording is live:
--     update public.gate_switches set is_open = true, changed_at = now() where name = 'private_spots';
-- NEW TABLE gate_switches: a normal table, so the weekly backup picks it up by itself (Sunday's message will say
-- "New table added to the backup: gate_switches"). Nobody can read or write it from the app; only gate_is_open() reports one answer.
-- Monthly totals (second half of step 9) are NOT built yet: they wait on decisions (see plans/step9-open-questions.md).

create table if not exists public.gate_switches (
  name text primary key,
  is_open boolean not null default false,
  note text,
  changed_at timestamptz not null default now()
);
insert into public.gate_switches (name, is_open, note) values
  ('private_spots', false, 'Owner/trusted admins may open one private spot with a typed reason. Open only after privacy page + terms say so and Legal has looked.'),
  ('monthly_totals', false, 'Opt-in monthly totals for agencies. Not built yet.')
on conflict (name) do nothing;
alter table public.gate_switches enable row level security;
revoke all on public.gate_switches from anon, authenticated;

create or replace function public.gate_is_open(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_open from public.gate_switches where name = p_name), false);
$$;
revoke all on function public.gate_is_open(text) from public, anon;
grant execute on function public.gate_is_open(text) to authenticated;

-- find private spots by name (no coordinates in the answer)
create or replace function public.admin_private_spot_find(p_q text) returns table(id uuid, name text, owner_name text, spot_type text, water_type text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('open_private_spots') then raise exception 'You do not have the box for that'; end if;
  if not public.gate_is_open('private_spots') then raise exception 'This is locked until the privacy page and terms say it'; end if;
  p_q := trim(coalesce(p_q, ''));
  if length(p_q) < 2 then raise exception 'Type at least 2 letters of the spot name'; end if;
  return query
    select s.id, s.name,
      (select coalesce(m.display_name, u.email) from auth.users u left join public.members m on lower(m.email) = lower(u.email) where u.id = s.created_by),
      s.spot_type, s.water_type
    from public.spots s
    where s.deleted_at is null and s.visibility = 'private' and s.name ilike '%' || replace(replace(p_q, '%', ''), '_', '') || '%'
    order by s.name limit 20;
end $$;

-- open ONE private spot, with a typed reason. The log line is written first (who, which spot, when, why - never the coordinates).
create or replace function public.admin_open_private_spot(p_spot uuid, p_reason text)
returns table(name text, owner_name text, spot_type text, water_type text, notes text, lat double precision, lng double precision)
language plpgsql security definer set search_path = public as $$
declare s public.spots%rowtype;
begin
  if not public.has_power('open_private_spots') then raise exception 'You do not have the box for that'; end if;
  if not public.gate_is_open('private_spots') then raise exception 'This is locked until the privacy page and terms say it'; end if;
  p_reason := trim(coalesce(p_reason, ''));
  if length(p_reason) < 10 then raise exception 'Write the reason (at least 10 letters)'; end if;
  select * into s from public.spots where id = p_spot and deleted_at is null and visibility = 'private';
  if not found then raise exception 'Private spot not found'; end if;
  perform private.log_admin('private_spot_opened', 'spot', s.id::text, left(s.name, 60) || ' · reason: ' || left(p_reason, 150));
  return query select s.name,
    (select coalesce(m.display_name, u.email) from auth.users u left join public.members m on lower(m.email) = lower(u.email) where u.id = s.created_by),
    s.spot_type, s.water_type, s.notes, s.lat, s.lng;
end $$;
revoke all on function public.admin_private_spot_find(text), public.admin_open_private_spot(uuid, text) from public, anon;
grant execute on function public.admin_private_spot_find(text), public.admin_open_private_spot(uuid, text) to authenticated;
