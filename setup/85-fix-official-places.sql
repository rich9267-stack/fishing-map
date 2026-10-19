-- Admin controls, step 8: fix an official place (rename, change kind, move, switch off / on, put back the original).
-- Needs the "Official places" box. No new table (two new columns on official_spots), so the weekly backup needs nothing.
-- Fixes must survive a later data reload, so:
--   * a fixed row is marked (admin_edited_at) and its first-ever values are kept in `original` (so "Put back the original" works);
--   * a reload that tries to change a fixed row (on conflict do update, or a plain update) is quietly ignored by the guard below;
--   * a fixed row can't be deleted (a reload that deletes + re-inserts would otherwise bring the old values back). To really delete one,
--     first press "Put back the original" in the app, or run:  update public.official_spots set admin_edited_at = null where id = ...;
--   * the usual loads use "on conflict (source, source_id) do nothing", which already leaves fixed rows alone.
-- Switched-off places stay in the table (active = false): nobody sees them, admins can still find and switch them on again.

alter table public.official_spots add column if not exists admin_edited_at timestamptz;
alter table public.official_spots add column if not exists original jsonb;

create or replace function private.guard_official() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.admin_edited_at is not null then raise exception 'This place was fixed by an admin; put back the original first'; end if;
    return old;
  end if;
  if old.admin_edited_at is not null and coalesce(current_setting('app.admin_rpc', true), '') <> '1' then
    new.name := old.name; new.kind := old.kind; new.lat := old.lat; new.lng := old.lng; new.water_type := old.water_type;
    new.active := old.active; new.admin_edited_at := old.admin_edited_at; new.original := old.original;
  end if;
  return new;
end $$;
drop trigger if exists guard_official on public.official_spots;
create trigger guard_official before update or delete on public.official_spots for each row execute function private.guard_official();

-- find places (including switched-off ones) by name and/or near a point
create or replace function public.admin_official_find(p_q text default null, p_lat double precision default null, p_lng double precision default null)
returns table(id bigint, source text, name text, kind text, lat double precision, lng double precision, water_type text, county text, active boolean, edited boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('official_places') then raise exception 'You need the "Official places" box for that'; end if;
  p_q := trim(coalesce(p_q, ''));
  if p_q = '' and (p_lat is null or p_lng is null) then raise exception 'Type a name or use the map position'; end if;
  return query
    select o.id, o.source, o.name, o.kind, o.lat, o.lng, o.water_type, o.county, o.active, o.admin_edited_at is not null
    from public.official_spots o
    where (p_q = '' or o.name ilike '%' || replace(replace(p_q, '%', ''), '_', '') || '%')
      and (p_q <> '' or (o.lat between p_lat - 0.1 and p_lat + 0.1 and o.lng between p_lng - 0.12 and p_lng + 0.12))
    order by case when p_lat is null then 0 else power(o.lat - p_lat, 2) + power((o.lng - p_lng) * 0.9, 2) end, o.name
    limit 30;
end $$;

-- fix one place
create or replace function public.admin_official_edit(p_id bigint, p_name text, p_kind text, p_lat double precision, p_lng double precision, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare o public.official_spots%rowtype;
begin
  if not public.has_power('official_places') then raise exception 'You need the "Official places" box for that'; end if;
  p_name := trim(coalesce(p_name, ''));
  if length(p_name) < 2 or length(p_name) > 120 then raise exception 'The name must be 2 to 120 letters'; end if;
  if p_kind not in ('ramp','park','pier','jetty','bridge','dock') then raise exception 'Unknown kind of place'; end if;
  if p_lat is null or p_lng is null or p_lat not between 24.3 and 31.1 or p_lng not between -87.7 and -79.8 then
    raise exception 'That position is not in Florida'; end if;
  select * into o from public.official_spots where id = p_id;
  if not found then raise exception 'Place not found'; end if;
  perform set_config('app.admin_rpc', '1', true);
  update public.official_spots set name = p_name, kind = p_kind, lat = p_lat, lng = p_lng, active = coalesce(p_active, true),
    original = coalesce(o.original, jsonb_build_object('name', o.name, 'kind', o.kind, 'lat', o.lat, 'lng', o.lng, 'active', o.active)),
    admin_edited_at = now()
  where id = p_id;
end $$;

-- put the first-ever values back and let reloads treat it as normal again
create or replace function public.admin_official_revert(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare o public.official_spots%rowtype;
begin
  if not public.has_power('official_places') then raise exception 'You need the "Official places" box for that'; end if;
  select * into o from public.official_spots where id = p_id and admin_edited_at is not null;
  if not found then raise exception 'That place has not been fixed'; end if;
  perform set_config('app.admin_rpc', '1', true);
  update public.official_spots set name = o.original ->> 'name', kind = o.original ->> 'kind',
    lat = (o.original ->> 'lat')::double precision, lng = (o.original ->> 'lng')::double precision,
    active = (o.original ->> 'active')::boolean, admin_edited_at = null, original = null
  where id = p_id;
end $$;

revoke all on function public.admin_official_find(text, double precision, double precision), public.admin_official_edit(bigint, text, text, double precision, double precision, boolean),
  public.admin_official_revert(bigint) from public, anon;
grant execute on function public.admin_official_find(text, double precision, double precision), public.admin_official_edit(bigint, text, text, double precision, double precision, boolean),
  public.admin_official_revert(bigint) to authenticated;

-- the older "make a spot official" buttons now use the Official places box and may change a fixed row
create or replace function public.admin_official_set(p_spot uuid, p_kind text) returns bigint
language plpgsql security definer set search_path = public as $$
declare s public.spots%rowtype; v_id bigint;
begin
  if not public.has_power('official_places') then raise exception 'Only an admin can make official spots'; end if;
  if p_kind not in ('ramp','park','pier','jetty','bridge','dock') then raise exception 'Unknown kind of place'; end if;
  select * into s from public.spots where id = p_spot and deleted_at is null;
  if not found then raise exception 'Spot not found'; end if;
  if s.visibility <> 'public' then raise exception 'Only Public spots can be made official'; end if;
  if s.lat is null or s.lng is null then raise exception 'This spot has no position'; end if;
  perform set_config('app.admin_rpc', '1', true);
  insert into public.official_spots (source, source_id, name, kind, lat, lng, water_type, county, details, active)
  values ('admin', s.id::text, left(trim(s.name), 120), p_kind, s.lat, s.lng,
          case when s.water_type in ('saltwater','freshwater') then s.water_type end, null,
          jsonb_build_object('added_by', 'admin'), true)
  on conflict (source, source_id) do update
    set name = excluded.name, kind = excluded.kind, lat = excluded.lat, lng = excluded.lng,
        water_type = excluded.water_type, active = true
  returning id into v_id;
  return v_id;
end $$;
create or replace function public.admin_official_unset(p_spot uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_power('official_places') then raise exception 'Only an admin can change official spots'; end if;
  perform set_config('app.admin_rpc', '1', true);
  update public.official_spots set active = false where source = 'admin' and source_id = p_spot::text;
end $$;

-- the log: now also for fixes to state-list places
create or replace function private.audit_official() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.admin_edited_at is distinct from old.admin_edited_at then
    perform private.log_admin(case when new.admin_edited_at is null then 'official_place_reverted' else 'official_place_fixed' end,
      'official_spot', new.id::text,
      new.name || ' (' || new.kind || ')' || case when new.active then '' else ' · switched off' end
      || case when new.lat is distinct from old.lat or new.lng is distinct from old.lng then ' · moved' else '' end);
    return new;
  end if;
  if new.source <> 'admin' then return new; end if;
  if tg_op = 'INSERT' then
    perform private.log_admin('official_place_made', 'official_spot', new.id::text, new.name || ' (' || new.kind || ')');
  elsif new.active is distinct from old.active or new.name is distinct from old.name or new.kind is distinct from old.kind then
    perform private.log_admin(case when new.active then 'official_place_changed' else 'official_place_removed' end,
                              'official_spot', new.id::text, new.name || ' (' || new.kind || ')');
  end if;
  return new;
end $$;
