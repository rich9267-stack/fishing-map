-- Admin controls, step 9 second half + two small fixes. No new table (columns/functions only), so the weekly backup needs nothing.
--
-- MONTHLY TOTALS (opt-in; locked behind gate_switches 'monthly_totals', which stays CLOSED until the privacy page + terms say so):
--   * A person turns on "include my catches in the monthly totals" in Settings (off by default). It only counts catches logged AFTER they turned it on,
--     and they can turn it off at any time (it stops counting future AND past catches, because past ones are only counted while the setting is on).
--   * A catch counts only if it is VERIFIED: it has a photo (not hidden) AND a GPS stamp (catch_geo) taken within 30 minutes of the catch with accuracy 100 m or better.
--   * Output: month, area, species, number of catches, number of fish. No names, photos, exact spots or per-person numbers.
--     A line is shown only when at least 3 different people contributed to it, so nobody can be picked out.
--   * "Area" is the state. Florida is found with a rough box (see private.area_of; verify with a proper boundary file before sending anything to an agency).
--     Other states show as "Other" until their boxes are added, then totals can be sent to that state's wildlife agency.
--   * Needs the "Dashboard" box and an open switch; every look is written to the admin log (month only).
-- FIXES: an owner can see which of their spots the team hid (my_hidden_spots); the Reports screen can tell which reported catches still have a visible photo.

alter table public.app_prefs add column if not exists share_totals boolean not null default false;
alter table public.app_prefs add column if not exists share_totals_at timestamptz;

create or replace function public.my_share_totals() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select share_totals from public.app_prefs where user_id = auth.uid()), false);
$$;

create or replace function public.set_share_totals(p_on boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_member() then raise exception 'sign in first'; end if;
  if p_on and not public.gate_is_open('monthly_totals') then raise exception 'This is not available yet'; end if;
  insert into public.app_prefs (user_id, share_totals, share_totals_at) values (auth.uid(), p_on, case when p_on then now() end)
  on conflict (user_id) do update set share_totals = excluded.share_totals,
    share_totals_at = case when excluded.share_totals then now() else null end, updated_at = now();
  return p_on;
end $$;

create or replace function private.area_of(p_lat double precision, p_lng double precision) returns text
language sql immutable as $$
  select case when p_lat between 24.3 and 30.75 and p_lng between -87.63 and -79.8 then 'Florida' else 'Other' end;
$$;

create or replace function private.monthly_totals_core(p_year integer, p_month integer, p_min_people integer)
returns table(area text, species text, catches bigint, fish bigint)
language sql stable security definer set search_path = public as $$
  with v as (
    select c.id, c.created_by, c.species, coalesce(c.how_many, 1) as n, private.area_of(g.lat, g.lng) as area
    from public.catches c
    join public.app_prefs ap on ap.user_id = c.created_by and ap.share_totals and c.caught_at >= ap.share_totals_at
    join public.catch_geo g on g.catch_id = c.id and g.accuracy_m <= 100 and abs(extract(epoch from (g.captured_at - c.caught_at))) <= 1800
    where c.deleted_at is null and c.species is not null
      and c.caught_at >= make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC')
      and c.caught_at <  make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC') + interval '1 month'
      and exists (select 1 from public.photos p where p.catch_id = c.id and p.hidden_at is null)
  )
  select v.area, v.species, count(*)::bigint, sum(v.n)::bigint
  from v group by v.area, v.species
  having count(distinct v.created_by) >= p_min_people
  order by 1, 3 desc;
$$;
revoke all on function private.monthly_totals_core(integer, integer, integer) from public, anon, authenticated;

create or replace function public.monthly_totals(p_year integer, p_month integer)
returns table(area text, species text, catches bigint, fish bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_power('dashboard') then raise exception 'You need the "Dashboard" box for that'; end if;
  if not public.gate_is_open('monthly_totals') then raise exception 'This is locked until the privacy page and terms say it'; end if;
  if p_month not between 1 and 12 or p_year not between 2024 and 2100 then raise exception 'Pick a real month'; end if;
  perform private.log_admin('monthly_totals_viewed', 'report', p_year::text || '-' || lpad(p_month::text, 2, '0'), null);
  return query select * from private.monthly_totals_core(p_year, p_month, 3);
end $$;

-- how many people are opted in (a number only), for the admin screen
create or replace function public.monthly_totals_optins() returns bigint
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('dashboard') then raise exception 'You need the "Dashboard" box for that'; end if;
  if not public.gate_is_open('monthly_totals') then raise exception 'This is locked until the privacy page and terms say it'; end if;
  return (select count(*) from public.app_prefs where share_totals);
end $$;

-- FIX: the owner of a hidden spot can see which of their spots the team hid
create or replace function public.my_hidden_spots() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.spots where created_by = auth.uid() and hidden_at is not null and deleted_at is null;
$$;

-- FIX: which reported catches still have a photo showing / hidden (so "Hide photo only" appears only when it can do something)
create or replace function public.admin_photo_state(p_ids uuid[]) returns table(catch_id uuid, shown bigint, hidden bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('reports') then raise exception 'admins only'; end if;
  return query select p.catch_id, count(*) filter (where p.hidden_at is null), count(*) filter (where p.hidden_at is not null)
    from public.photos p where p.catch_id = any(p_ids) group by p.catch_id;
end $$;

revoke all on function public.my_share_totals(), public.set_share_totals(boolean), public.monthly_totals(integer, integer), public.monthly_totals_optins(),
  public.my_hidden_spots(), public.admin_photo_state(uuid[]) from public, anon;
grant execute on function public.my_share_totals(), public.set_share_totals(boolean), public.monthly_totals(integer, integer), public.monthly_totals_optins(),
  public.my_hidden_spots(), public.admin_photo_state(uuid[]) to authenticated;
