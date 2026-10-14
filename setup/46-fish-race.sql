-- 46: 🏁 Fish race — a straight 5-lane race. The DATABASE runs it, so a win (and its coins) can't be faked by editing the app.
-- Lanes: your fish (one of your own ranked catches) + up to 4 friends' best ranked fish (random friends; only catches they share
-- with friends or the public) + "wild" computer fish near your fish's size when there aren't enough friends.
-- Race: two halves of 50. First half pace = 20 + Speed. Second half pace = (20 + Speed) × (0.55 + 0.45 × Stamina/100), so
-- Stamina decides who holds on late. Each half has a ±8% luck roll. Lowest total time wins.
-- Prize (Richard, Oct 13): 10 coins for a 1st place, paid for up to 3 wins per New York day. Max 50 races a day.
-- Written with create/insert/grant only (the Supabase connector cancels drop/revoke/truncate).

create table public.race_results (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  catch_id uuid references public.catches(id) on delete set null,
  lanes jsonb not null,       -- [{lane, kind me|friend|wild, who, species, power, tier, speed, stamina, t1, t2, total, place}]
  place int not null,
  coins int not null default 0,
  day date not null,          -- New York day
  created_at timestamptz not null default now()
);
create index race_results_user on public.race_results (user_id, created_at desc);
alter table public.race_results enable row level security;
create policy "see own races" on public.race_results for select using (user_id = auth.uid());
grant select on public.race_results to authenticated;

create function public.run_race(p_catch uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  u uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  mine record; fr record; sp record; rk record;
  lanes jsonb := '[]'::jsonb;
  n int := 1; my_r float8; wins_today int; races_today int; my_place int; prize int := 0; rid bigint;
  len float8;
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
  my_r := greatest(mine.size_pct / 100.0, 0.35);
  lanes := lanes || jsonb_build_array(jsonb_build_object('kind', 'me', 'who', 'You', 'catch_id', mine.id, 'species', mine.species,
    'power', mine.power, 'tier', mine.tier, 'speed', mine.speed, 'stamina', mine.stamina));

  -- up to 4 random friends, each with their best fish they share with friends or the public
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
    order by r.power desc limit 1;
    if rk.power is not null then
      lanes := lanes || jsonb_build_array(jsonb_build_object('kind', 'friend', 'who', fr.who, 'species', rk.species,
        'power', rk.power, 'tier', rk.tier, 'speed', rk.speed, 'stamina', rk.stamina));
      n := n + 1;
    end if;
  end loop;

  -- fill the empty lanes with wild fish about your fish's size (80–115% as big for their kind)
  while n < 5 loop
    select * into sp from public.fish_rank_species order by random() limit 1;
    len := sp.big_in * least(1.3, greatest(0.3, my_r * (0.8 + 0.35 * random())));
    select * into rk from public.fish_rank_calc(sp.words[1], round(len::numeric, 1), null, false);
    lanes := lanes || jsonb_build_array(jsonb_build_object('kind', 'wild', 'who', 'Wild', 'species', initcap(sp.words[1]),
      'power', rk.power, 'tier', rk.tier, 'speed', rk.speed, 'stamina', rk.stamina));
    n := n + 1;
  end loop;

  -- shuffle lanes, then race: each lane gets its two half-times
  select jsonb_agg(x.v || jsonb_build_object('lane', x.i)) into lanes
  from (select v, row_number() over (order by random()) as i from jsonb_array_elements(lanes) v) x;
  select jsonb_agg(v || jsonb_build_object('t1', round(t1v::numeric, 3), 't2', round(t2v::numeric, 3), 'total', round((t1v + t2v)::numeric, 3)) order by (v->>'lane')::int)
  into lanes
  from (select v,
          50.0 / ((20 + (v->>'speed')::float8) * (0.92 + 0.16 * random())) as t1v,
          50.0 / ((20 + (v->>'speed')::float8) * (0.55 + 0.45 * (v->>'stamina')::float8 / 100) * (0.92 + 0.16 * random())) as t2v
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
grant execute on function public.run_race(uuid) to authenticated;
