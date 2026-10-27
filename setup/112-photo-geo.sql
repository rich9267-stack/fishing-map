-- 112: Photo places for the trip map (migration `photo_geo`).
-- catch_photo_geo: where a gallery photo says it was taken. Used ONLY by the trip review map (never by contests or verified catches,
--   which keep using catch_geo = live GPS). Same rules as catch_geo: owner can add/see their own; trip_review shows it to people on the trip.
-- trip_review(p_plan): same as setup/20 but lat/lng/accuracy fall back to catch_photo_geo when there is no live stamp.
create table if not exists public.catch_photo_geo (
  catch_id uuid primary key references public.catches(id) on delete cascade,
  lat double precision not null, lng double precision not null,
  created_at timestamptz not null default now()
);
alter table public.catch_photo_geo enable row level security;
create policy "add own photo geo" on public.catch_photo_geo for insert to authenticated
  with check (public.is_member() and exists (select 1 from public.catches c where c.id = catch_photo_geo.catch_id and c.created_by = auth.uid()));
create policy "see own photo geo" on public.catch_photo_geo for select to authenticated
  using (exists (select 1 from public.catches c where c.id = catch_photo_geo.catch_id and c.created_by = auth.uid()));
revoke all on public.catch_photo_geo from anon, public;
grant select, insert on public.catch_photo_geo to authenticated;

create or replace function public.trip_review(p_plan uuid)
 returns table(catch_id uuid, user_id uuid, caught_at timestamptz, species text, how_many integer, length_in real, weight_lb real, weight_est boolean, spot_id uuid, lat double precision, lng double precision, accuracy_m real)
 language sql stable security definer set search_path to 'public' as $function$
  with p as (select * from trip_plans where id = p_plan and cancelled_at is null),
  ps as (select created_by as uid from p union select r.user_id from trip_plan_rsvps r where r.plan_id = p_plan),
  ps_spot as (select s.lat, s.lng from spots s join p on s.id = p.spot_id)
  select c.id, c.created_by, c.caught_at, c.species, coalesce(c.how_many, 1), c.length_in, c.weight_lb, c.weight_est, c.spot_id,
         coalesce(g.lat, pg.lat), coalesce(g.lng, pg.lng), g.accuracy_m
  from p
  join catches c on c.created_by in (select uid from ps) and c.deleted_at is null
       and c.caught_at >= p.plan_at - interval '1 hour' and c.caught_at <= p.plan_at + interval '12 hours'
  left join spots cs on cs.id = c.spot_id
  left join catch_geo g on g.catch_id = c.id
  left join catch_photo_geo pg on pg.catch_id = c.id
  where public.is_member() and exists (select 1 from ps where uid = auth.uid())
    and (c.visibility <> 'private' or c.created_by = auth.uid())
    and not public.is_blocked(c.created_by)
    and (c.spot_id = p.spot_id
         or exists (select 1 from ps_spot x where cs.lat is not null and public.hav_mi(x.lat, x.lng, cs.lat, cs.lng) <= 1)
         or exists (select 1 from ps_spot x where coalesce(g.lat, pg.lat) is not null and public.hav_mi(x.lat, x.lng, coalesce(g.lat, pg.lat), coalesce(g.lng, pg.lng)) <= 1))
  order by c.caught_at
$function$;
