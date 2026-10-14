-- 48: 🏁 Race classes + Open race (Richard, Oct 13).
-- Class from race time (race_time(), setup/47; lower = faster):  ⚡ S < 0.95 · A < 1.30 · B < 1.70 · 🐢 C ≥ 1.70
--   (typical sizes: S = tunny, crevalle, king, mahi, wahoo, permit, tarpon, amberjack, barracuda, Spanish, peacock;
--    C = flounder, whiting, tilapia, channel catfish, bluegill, crappie, walking catfish, pinfish, bullheads, hardhead, sailfin, hoplo).
--   A big fish of a kind can move up a class. Same thresholds in js/16-fish-race.js (RACE_CLASSES).
-- run_race(p_catch, p_mode):
--   'class' (default): every opponent is in YOUR class; inside it, still close to your speed (friends 0.92–1.25×, wild 0.94–1.2×
--           of your race time, else the closest in your class). 10 coins per win.
--   'open': any fish. Friends race their FASTEST shared fish; wild fish are any kind at 50–110% of a big adult. 20 coins per win.
--   Both share the limit of 3 paid wins and 50 races per New York day.
-- run_race(p_catch) (setup/46–47) now just calls run_race(p_catch, 'class').

create function public.race_class(t float8) returns text
language sql immutable as $$
  select case when t < 0.95 then 'S' when t < 1.30 then 'A' when t < 1.70 then 'B' else 'C' end
$$;
grant execute on function public.race_class(float8) to authenticated;

alter table public.race_results add column mode text not null default 'class';
alter table public.race_results add column class text;

create function public.run_race(p_catch uuid, p_mode text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  u uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  mode text := case when p_mode = 'open' then 'open' else 'class' end;
  mine record; fr record; rk record;
  lanes jsonb := '[]'::jsonb;
  n int := 1; my_t float8; my_c text; wins_today int; races_today int; my_place int; prize int := 0; win_coins int; rid bigint;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  select count(*) into races_today from public.race_results where user_id = u and day = today;
  if races_today >= 50 then raise exception 'That''s 50 races today — the fish need a rest. Try again tomorrow.'; end if;
  win_coins := case when mode = 'open' then 20 else 10 end;

  select c.id, c.species, r.* into mine
  from public.catches c cross join lateral public.fish_rank_calc(c.species, c.length_in::numeric, c.weight_lb::numeric, c.weight_est) r
  where c.id = p_catch and c.created_by = u and c.deleted_at is null and coalesce(c.review_state, '') <> 'blurred'
    and exists (select 1 from public.photos p where p.catch_id = c.id);
  if mine.id is null then raise exception 'Pick one of your own ranked fish (it needs a photo and a size).'; end if;
  my_t := public.race_time(mine.speed, mine.stamina);
  my_c := public.race_class(my_t);
  lanes := jsonb_build_array(jsonb_build_object('kind', 'me', 'who', 'You', 'catch_id', mine.id, 'species', mine.species,
    'power', mine.power, 'tier', mine.tier, 'speed', mine.speed, 'stamina', mine.stamina, 'class', my_c));

  -- friends (random order): class race = their shared fish in your class closest to your speed; open = their fastest shared fish
  for fr in
    select f.uid, coalesce(nullif(pr.display_name, ''), pr.handle, 'A friend') as who
    from (select case when user_a = u then user_b else user_a end as uid from public.friendships
          where status = 'accepted' and (user_a = u or user_b = u)) f
    left join public.profiles pr on pr.user_id = f.uid
    where not public.is_blocked(f.uid)
    order by random()
  loop
    exit when n >= 5;
    select c.species, r.*, public.race_time(r.speed, r.stamina) as t into rk
    from public.catches c cross join lateral public.fish_rank_calc(c.species, c.length_in::numeric, c.weight_lb::numeric, c.weight_est) r
    where c.created_by = fr.uid and c.deleted_at is null and coalesce(c.review_state, '') <> 'blurred'
      and c.visibility in ('friends', 'public') and exists (select 1 from public.photos p where p.catch_id = c.id)
      and (mode = 'open' or (public.race_class(public.race_time(r.speed, r.stamina)) = my_c
                             and public.race_time(r.speed, r.stamina) / my_t between 0.92 and 1.25))
    order by case when mode = 'open' then public.race_time(r.speed, r.stamina) else abs(public.race_time(r.speed, r.stamina) / my_t - 1) end, random()
    limit 1;
    if rk.power is not null then
      lanes := lanes || jsonb_build_array(jsonb_build_object('kind', 'friend', 'who', fr.who, 'species', rk.species,
        'power', rk.power, 'tier', rk.tier, 'speed', rk.speed, 'stamina', rk.stamina, 'class', public.race_class(rk.t)));
      n := n + 1;
    end if;
  end loop;

  -- wild fish
  while n < 5 loop
    if mode = 'open' then
      select w.* into rk from (
        select initcap(s.words[1]) as species, r.*, public.race_time(r.speed, r.stamina) as t
        from (select * from public.fish_rank_species order by random() limit 1) s
        cross join lateral (select 0.5 + random() * 0.6 + 0 * s.id as k) z
        cross join lateral public.fish_rank_calc(s.words[1], round((s.big_in * z.k)::numeric, 1), null, false) r) w;
    else
      -- every kind at 3 random sizes; keep your class; prefer the fair band, else the closest
      select w.* into rk from (
        select initcap(s.words[1]) as species, r.*, public.race_time(r.speed, r.stamina) as t, public.race_time(r.speed, r.stamina) / my_t as ratio
        from public.fish_rank_species s
        cross join generate_series(1, 3) g
        cross join lateral (select 0.35 + random() * 0.95 + 0 * s.id + 0 * g as k) z
        cross join lateral public.fish_rank_calc(s.words[1], round((s.big_in * z.k)::numeric, 1), null, false) r) w
      where public.race_class(w.t) = my_c
      order by (w.ratio between 0.94 and 1.2) desc, abs(w.ratio - 1.07), random() limit 1;
      if rk.power is null then   -- nothing landed in your class this time: take the closest fish of any class
        select w.* into rk from (
          select initcap(s.words[1]) as species, r.*, public.race_time(r.speed, r.stamina) as t
          from public.fish_rank_species s
          cross join lateral (select 0.35 + random() * 0.95 + 0 * s.id as k) z
          cross join lateral public.fish_rank_calc(s.words[1], round((s.big_in * z.k)::numeric, 1), null, false) r) w
        order by abs(w.t / my_t - 1.07) limit 1;
      end if;
    end if;
    lanes := lanes || jsonb_build_array(jsonb_build_object('kind', 'wild', 'who', 'Wild', 'species', rk.species,
      'power', rk.power, 'tier', rk.tier, 'speed', rk.speed, 'stamina', rk.stamina, 'class', public.race_class(rk.t)));
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

  insert into public.race_results (user_id, catch_id, lanes, place, day, mode, class)
    values (u, mine.id, lanes, my_place, today, mode, case when mode = 'open' then null else my_c end) returning id into rid;
  if my_place = 1 then
    select count(*) into wins_today from public.coin_ledger where user_id = u and reason = 'race' and day = today;
    if wins_today < 3 and public._coin_grant(u, 'coins', win_coins, 'race', 'race:' || rid, today, mine.species) then
      prize := win_coins;
      update public.race_results set coins = win_coins where id = rid;
    end if;
  end if;

  return jsonb_build_object('id', rid, 'mode', mode, 'class', my_c, 'lanes', lanes, 'place', my_place, 'coins', prize, 'win_coins', win_coins,
    'paid_wins_today', (select count(*) from public.coin_ledger where user_id = u and reason = 'race' and day = today), 'paid_wins_cap', 3,
    'record', (select jsonb_build_object('races', count(*), 'wins', count(*) filter (where place = 1)) from public.race_results where user_id = u),
    'wallet', public.my_wallet());
end $$;
grant execute on function public.run_race(uuid, text) to authenticated;

create or replace function public.run_race(p_catch uuid) returns jsonb
language sql volatile security definer set search_path = public as $$
  select public.run_race(p_catch, 'class')
$$;
