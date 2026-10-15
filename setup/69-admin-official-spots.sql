-- 69: admins can turn one of the app's PUBLIC spots into an official spot (a real park / pier / ramp the state lists missed).
-- The official row gets source 'admin' and source_id = the spot's id, at the spot's exact position, so:
--   * Quick catch names new spots after it, Find new water shows it as ✅ Official,
--   * strangers see that spot (and other public spots within 500 ft) at its real place with Directions (setup/68).
-- Only public spots can be made official (a friends/private spot would otherwise leak its location). Admin only.
-- Removing sets active = false (the row stays, so making it official again just switches it back on).
-- UNDO: drop function public.admin_official_set(uuid, text); drop function public.admin_official_unset(uuid);
--       then hide the rows with: update public.official_spots set active = false where source = 'admin';

create or replace function public.admin_official_set(p_spot uuid, p_kind text)
 returns bigint language plpgsql security definer set search_path to 'public'
as $$
declare s public.spots%rowtype; v_id bigint;
begin
  if not public.is_admin() then raise exception 'Only an admin can make official spots'; end if;
  if p_kind not in ('ramp','park','pier','jetty','bridge','dock') then raise exception 'Unknown kind of place'; end if;
  select * into s from public.spots where id = p_spot and deleted_at is null;
  if not found then raise exception 'Spot not found'; end if;
  if s.visibility <> 'public' then raise exception 'Only Public spots can be made official'; end if;
  if s.lat is null or s.lng is null then raise exception 'This spot has no position'; end if;
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

create or replace function public.admin_official_unset(p_spot uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can change official spots'; end if;
  update public.official_spots set active = false where source = 'admin' and source_id = p_spot::text;
end $$;

-- (no revoke: the connector cancels it; both functions refuse anyone who is not an admin anyway)
grant execute on function public.admin_official_set(uuid, text) to authenticated;
grant execute on function public.admin_official_unset(uuid) to authenticated;
