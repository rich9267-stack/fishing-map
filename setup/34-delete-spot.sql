-- 34: let a spot's owner (or an admin) delete a spot — e.g. ones made by accident while testing — with Undo.
-- It is a "soft" delete (spots.deleted_at), like catches: the spot, its catches and its trips disappear everywhere,
-- and restore_spot() brings them all back. Refused when anybody else has a live catch, photo or trip plan there.
alter table public.spots add column if not exists deleted_at timestamptz;

create or replace function public.spots_visible_fn()
 returns table(id uuid, created_at timestamp with time zone, name text, spot_type text, water_type text, notes text, added_by text, public_access text, parking text, getting_there text, access_notes text, lat double precision, lng double precision, created_by uuid, is_private boolean, tide_offset_min smallint, faces_deg smallint, visibility text, hide_exact_from_friends boolean, is_exact boolean)
 language sql stable security definer set search_path to 'public' as $function$
  select s.id, s.created_at, s.name, s.spot_type, s.water_type,
    case when e.exact then s.notes end, s.added_by, s.public_access, s.parking,
    case when e.exact then s.getting_there end, case when e.exact then s.access_notes end,
    case when e.exact then s.lat else b.blat end,
    case when e.exact then s.lng else b.blng end,
    s.created_by, s.is_private, s.tide_offset_min, s.faces_deg, s.visibility, s.hide_exact_from_friends, e.exact
  from public.spots s
  cross join lateral (select (s.created_by = auth.uid() or (s.visibility <> 'private' and not s.hide_exact_from_friends and public.is_friend(s.created_by))) as exact) e
  left join lateral public.blur_point(s.id, s.lat, s.lng) b on (not e.exact and s.lat is not null)
  where s.deleted_at is null and public.is_member() and (s.created_by = auth.uid() or (s.visibility <> 'private' and public.is_friend(s.created_by)) or (s.visibility = 'public' and not public.is_blocked(s.created_by)));
$function$;

create or replace function public.can_see_spot(sid uuid) returns boolean
 language sql stable security definer set search_path to 'public' as $function$
  select public.is_member() and exists (select 1 from public.spots s where s.id = sid and s.deleted_at is null and (
    s.created_by = auth.uid() or (s.visibility <> 'private' and public.is_friend(s.created_by)) or (s.visibility = 'public' and not public.is_blocked(s.created_by))));
$function$;

create or replace function public.weather_targets()
 returns table(user_id uuid, lat double precision, lng double precision)
 language sql security definer set search_path to 'public' as $function$
  select u.user_id,
         coalesce(fp.last_lat, n.cond_lat, c.lat) lat, coalesce(fp.last_lng, n.cond_lng, c.lng) lng
  from (select distinct user_id from push_subscriptions) u
  left join notif_prefs n on n.user_id = u.user_id
  left join lateral (select avg(s.lat) lat, avg(s.lng) lng from spots s where s.created_by = u.user_id and s.deleted_at is null and s.lat is not null and s.lng is not null) c on true
  left join lateral (select f.last_lat, f.last_lng from float_plans f where f.user_id = u.user_id and f.status in ('active', 'alerted') and f.last_lat is not null order by f.last_at desc limit 1) fp on true
  where coalesce(n.weather, true) and coalesce(fp.last_lat, n.cond_lat, c.lat) is not null
$function$;

create or replace function public.delete_spot(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s record; me uuid := auth.uid(); ts timestamptz := now();
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  select id, created_by into s from public.spots where id = p_id and deleted_at is null;
  if not found then raise exception 'spot not found'; end if;
  if s.created_by <> me and not public.is_admin() then raise exception 'only the person who added a spot can delete it'; end if;
  if exists (select 1 from public.catches where spot_id = p_id and deleted_at is null and created_by <> s.created_by) then
    raise exception 'Other people have logged catches at this spot, so it can''t be deleted. (You can move or rename it instead.)'; end if;
  if exists (select 1 from public.photos where spot_id = p_id and created_by <> s.created_by) then
    raise exception 'Other people have added photos at this spot, so it can''t be deleted.'; end if;
  if exists (select 1 from public.trip_plans where spot_id = p_id and created_by <> s.created_by) then
    raise exception 'Other people have trip plans at this spot, so it can''t be deleted.'; end if;
  update public.catches set deleted_at = ts where spot_id = p_id and deleted_at is null;
  update public.sessions set deleted_at = ts where spot_id = p_id and deleted_at is null;
  update public.spots set deleted_at = ts where id = p_id;
end $$;

create or replace function public.restore_spot(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s record; me uuid := auth.uid();
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  select id, created_by, deleted_at into s from public.spots where id = p_id and deleted_at is not null;
  if not found then raise exception 'spot not found'; end if;
  if s.created_by <> me and not public.is_admin() then raise exception 'only the person who added a spot can restore it'; end if;
  update public.catches set deleted_at = null where spot_id = p_id and deleted_at = s.deleted_at;
  update public.sessions set deleted_at = null where spot_id = p_id and deleted_at = s.deleted_at;
  update public.spots set deleted_at = null where id = p_id;
end $$;
revoke all on function public.delete_spot(uuid), public.restore_spot(uuid) from public, anon;
grant execute on function public.delete_spot(uuid), public.restore_spot(uuid) to authenticated;
