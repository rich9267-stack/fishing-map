-- 47: 🏁 Fish race, "fair match" (Richard, Oct 13). Replaces run_race from setup/46.
-- Speed comes mostly from the KIND of fish, so in a pure speed race catfish/bullheads never win (simulated 0–2%).
-- Now every opponent is near YOUR fish's race speed:
--   race time with no luck = 50/(40+Speed) + 50/((40+Speed) × (0.55 + 0.45 × Stamina/100))   (lower = faster)
--   friends: each (random order) races their shared ranked fish whose race time is closest to yours, if within 0.92–1.25× yours (no more than ~8% faster)
--   wild fish: random kind and size with a race time 0.94–1.2× yours
--   luck: ±12% on each half. Simulated: most fish win about 1 race in 3; the slowest kinds about 1 in 6.
-- Prize unchanged: 10 coins per win, paid for up to 3 wins per New York day; max 50 races a day.

create function public.race_time(spd numeric, sta numeric) returns float8
language sql immutable as $$
  select 50.0 / (40 + spd::float8) + 50.0 / ((40 + spd::float8) * (0.55 + 0.45 * sta::float8 / 100))
$$;
grant execute on function public.race_time(numeric, numeric) to authenticated;

create or replace function public.run_race(p_catch uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  u uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  mine record; fr record; rk record;
  lanes jsonb := '[]'::jsonb;
  n int := 1; my_t float8; wins_today int; races_today int; my_place int; prize int := 0; rid bigint;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  select count(*) into races_today from public.race_results where user_id = u and day = today;
  if races_today >= 50 then raise exception 'That''s 50 races today — the fish need a rest. Try again tomorrow.'; end if;

  -- your fish: your own photographed, ranked catch
  select c.id, c.species, r.* into mine
  from public.catches c cross join lateral public.fish_rank_calc(c.species, c.length_in::numeric, c.weight_lb::numeric, c.weight_est) r
  where c.id = p_catch and c.created_by = u and c.deleted_at is null and coalesce(c.review_state, '') <> 'blurred'
    and exists (select 1 from public.photos p where p.catch_id = c.id);
  if mine.id is null then raise exception 'Pick one of your own ranked fish (it needs a photo and a size).'; end if;
  my_t := public.race_time(mine.speed, mine.stamina);
  lanes := jsonb_build_array(jsonb_build_object('kind', 'me', 'who', 'You', 'catch_id', mine.id, 'species', mine.species,
    'power', mine.power, 'tier', mine.tier, 'speed', mine.speed, 'stamina', mine.stamina));

  -- friends: the fish of theirs (shared with friends or public) closest to your fish's race speed
  for fr in
    select f.uid, coalesce(nullif(pr.display_name, ''), pr.handle, 'A friend') as who
    from (select case when user_a = u then user_b else user_a end as uid from public.friendships
          where status = 'accepted' and (user_a = u or user_b = u)) f
    left join public.profiles pr on pr.user_id = f.uid
    where not public.is_blocked(f.uid)
    order by random()
  loop
    exit when n >= 5;
    select c.species, r.* into rk
    from public.catches c cross join lateral public.fish_rank_calc(c.species, c.length_in::numeric, c.weight_lb::numeric, c.weight_est) r
    where c.created_by = fr.uid and c.deleted_at is null and coalesce(c.review_state, '') <> 'blurred'
      and c.visibility in ('friends', 'public') and exists (select 1 from public.photos p where p.catch_id = c.id)
      and public.race_time(r.speed, r.stamina) / my_t between 0.92 and 1.25
    order by abs(public.race_time(r.speed, r.stamina) / my_t - 1), random() limit 1;
    if rk.power is not null then
      lanes := lanes || jsonb_build_array(jsonb_build_object('kind', 'friend', 'who', fr.who, 'species', rk.species,
        'power', rk.power, 'tier', rk.tier, 'speed', rk.speed, 'stamina', rk.stamina));
      n := n + 1;
    end if;
  end loop;

  -- wild fish: a random kind and size whose race time is 0.94–1.2× yours (closest one if nothing lands in that band)
  while n < 5 loop
    select w.* into rk from (
      select initcap(s.words[1]) as species, r.*, public.race_time(r.speed, r.stamina) / my_t as ratio
      from (select * from public.fish_rank_species order by random() limit 40) s
      cross join lateral (select 0.3 + random() * 1.0 + 0 * s.id as k) z   -- "0 * s.id" makes it roll a new size for every row
      cross join lateral public.fish_rank_calc(s.words[1], round((s.big_in * z.k)::numeric, 1), null, false) r) w
    order by (w.ratio between 0.94 and 1.2) desc, abs(w.ratio - 1.07), random() limit 1;
    lanes := lanes || jsonb_build_array(jsonb_build_object('kind', 'wild', 'who', 'Wild', 'species', rk.species,
      'power', rk.power, 'tier', rk.tier, 'speed', rk.speed, 'stamina', rk.stamina));
    n := n + 1;
  end loop;

  -- shuffle lanes, race (two halves with ±12% luck each), place
  select jsonb_agg(x.v || jsonb_build_object('lane', x.i)) into lanes
  from (select v, row_number() over (order by random()) as i from jsonb_array_elements(lanes) v) x;
  select jsonb_agg(v || jsonb_build_object('t1', round(t1v::numeric, 3), 't2', round(t2v::numeric, 3), 'total', round((t1v + t2v)::numeric, 3)) order by (v->>'lane')::int)
  into lanes
  from (select v,
          50.0 / ((40 + (v->>'speed')::float8) * (0.88 + 0.24 * random())) as t1v,
          50.0 / ((40 + (v->>'speed')::float8) * (0.55 + 0.45 * (v->>'stamina')::float8 / 100) * (0.88 + 0.24 * random())) as t2v
        from jsonb_array_elements(lanes) v) z;
  select jsonb_agg(v || jsonb_build_object('place', pl) order by (v->>'lane')::int) into lanes
  from (select v, rank() over (order by (v->>'total')::float8) as pl from jsonb_array_elements(lanes) v) z;
  select (v->>'place')::int into my_place from jsonb_array_elements(lanes) v where v->>'kind' = 'me';

  insert into public.race_results (user_id, catch_id, lanes, place, day) values (u, mine.id, lanes, my_place, today) returning id into rid;
  if my_place = 1 then
    select count(*) into wins_today from public.coin_ledger where user_id = u and reason = 'race' and day = today;
    if wins_today < 3 and public._coin_grant(u, 'coins', 10, 'race', 'race:' || rid, today, mine.species) then
      prize := 10;
      update public.race_results set coins = 10 where id = rid;
    end if;
  end if;

  return jsonb_build_object('id', rid, 'lanes', lanes, 'place', my_place, 'coins', prize,
    'paid_wins_today', (select count(*) from public.coin_ledger where user_id = u and reason = 'race' and day = today), 'paid_wins_cap', 3,
    'record', (select jsonb_build_object('races', count(*), 'wins', count(*) filter (where place = 1)) from public.race_results where user_id = u),
    'wallet', public.my_wallet());
end $$;
