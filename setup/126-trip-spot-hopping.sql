-- 126: Spot hopping for trip contests + trip review — trip-lifecycle step 5 (v257, migration `trip_spot_hopping_step5`).
-- Plan: Project doc claude/trip-lifecycle-plan.md. No new table (backup rule: nothing to change).
-- A catch now counts for a planned trip (its contest and its 📖 review) when ANY of these is true:
--   * the trip is a 🚤 boat trip (trip_plans.boat) — any catch by people on it during the trip, anywhere;
--   * the catch was logged during a ▶ Start trip linked to this trip (catches.session_id → sessions.plan_id), anywhere;
--   * the old shore rule: at the trip spot or within 1 mile of it (by catch spot or catch GPS).
-- Everything else in both functions is unchanged (copied from the live definitions on Oct 31).

CREATE OR REPLACE FUNCTION public.tournament_catch_flags(p_id uuid)
 RETURNS TABLE(catch_id uuid, user_id uuid, caught_at timestamp with time zone, species text, how_many integer, length_in real, weight_lb real, weight_est boolean, ok boolean, reason text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.id, c.created_by, c.caught_at, c.species, coalesce(c.how_many,1), c.length_in, c.weight_lb, c.weight_est,
    (r.reason is null), r.reason
  from tournaments t
  join tournament_members m on m.tournament_id = t.id and m.status = 'joined'
  join catches c on c.created_by = m.user_id and c.deleted_at is null
       and c.caught_at >= t.starts_at and c.caught_at <= t.ends_at
  left join catch_geo g on g.catch_id = c.id
  left join spots cs on cs.id = c.spot_id
  cross join lateral (select case
    when t.kind = 'official' and c.visibility <> 'public' then 'Catch must be set to Public'
    when t.plan_id is not null and not exists (
        select 1 from trip_plans p join spots ps on ps.id = p.spot_id
        where p.id = t.plan_id and (p.boat or c.spot_id = p.spot_id
          or (c.session_id is not null and exists (select 1 from sessions x where x.id = c.session_id and x.plan_id = p.id))
          or (ps.lat is not null and cs.lat is not null and public.hav_mi(ps.lat, ps.lng, cs.lat, cs.lng) <= 1)
          or (ps.lat is not null and g.lat is not null and public.hav_mi(ps.lat, ps.lng, g.lat, g.lng) <= 1))) then 'Not at the trip spot (within 1 mile)'
    when t.species is not null and lower(coalesce(c.species,'')) <> lower(t.species) then 'Wrong species'
    when t.require_length and coalesce(c.length_in,0) <= 0 then 'Needs a measured length'
    when t.require_photo and not exists (select 1 from photos p where p.catch_id = c.id) then 'Needs a photo'
    when t.geo_lat is not null and g.catch_id is null then 'No GPS check saved (log it live at the spot)'
    when t.geo_lat is not null and coalesce(g.accuracy_m,9999) > 150 then 'GPS too imprecise'
    when t.geo_lat is not null and abs(extract(epoch from (g.captured_at - c.caught_at))) > 1800 then 'Logged too long after the catch'
    when t.geo_lat is not null and 3959 * 2 * asin(least(1, sqrt(
        power(sin(radians(g.lat - t.geo_lat)/2),2) +
        cos(radians(t.geo_lat)) * cos(radians(g.lat)) * power(sin(radians(g.lng - t.geo_lng)/2),2)
      ))) > t.geo_radius_mi then 'Outside the contest area'
    else null end as reason) r
  where t.id = p_id
$function$;

-- 📖 Trip review: same three ways to count. The time window also stretches to the trip's back-by time when that is later than
-- 12 hours after the start (overnight trips), and a catch from a linked Start trip counts whenever it was logged.
CREATE OR REPLACE FUNCTION public.trip_review(p_plan uuid)
 RETURNS TABLE(catch_id uuid, user_id uuid, caught_at timestamp with time zone, species text, how_many integer, length_in real, weight_lb real, weight_est boolean, spot_id uuid, lat double precision, lng double precision, accuracy_m real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with p as (select * from trip_plans where id = p_plan and cancelled_at is null),
  ps as (select created_by as uid from p union select r.user_id from trip_plan_rsvps r where r.plan_id = p_plan),
  ps_spot as (select s.lat, s.lng from spots s join p on s.id = p.spot_id)
  select c.id, c.created_by, c.caught_at, c.species, coalesce(c.how_many, 1), c.length_in, c.weight_lb, c.weight_est, c.spot_id,
         coalesce(g.lat, pg.lat), coalesce(g.lng, pg.lng), g.accuracy_m
  from p
  join catches c on c.created_by in (select uid from ps) and c.deleted_at is null
  left join spots cs on cs.id = c.spot_id
  left join catch_geo g on g.catch_id = c.id
  left join catch_photo_geo pg on pg.catch_id = c.id
  cross join lateral (select (c.session_id is not null and exists (select 1 from sessions x where x.id = c.session_id and x.plan_id = p.id)) as linked) lk
  where public.is_member() and exists (select 1 from ps where uid = auth.uid())
    and (c.visibility <> 'private' or c.created_by = auth.uid())
    and not public.is_blocked(c.created_by)
    and (lk.linked or (c.caught_at >= p.plan_at - interval '1 hour'
                       and c.caught_at <= greatest(p.plan_at + interval '12 hours', coalesce(p.back_by, p.plan_at))))
    and (lk.linked or p.boat or c.spot_id = p.spot_id
         or exists (select 1 from ps_spot x where cs.lat is not null and public.hav_mi(x.lat, x.lng, cs.lat, cs.lng) <= 1)
         or exists (select 1 from ps_spot x where coalesce(g.lat, pg.lat) is not null and public.hav_mi(x.lat, x.lng, coalesce(g.lat, pg.lat), coalesce(g.lng, pg.lng)) <= 1))
  order by c.caught_at
$function$;
