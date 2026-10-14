-- 49: 🏁 Multiplayer race rooms (database side only; screens come later). Richard, Oct 13.
-- A host opens a room: a class (S/A/B/C) or 'open', an entry fee in coins (0–200) and a start time (5 min – 24 h away).
-- The host's friends can join with one of their own ranked fish of that class; each player pays the fee when joining.
-- The race runs when the 5th player joins, when the host presses start (2+ players), or at the start time (a cron job checks
-- every minute). Fewer than 2 players at the start time = cancelled and every fee refunded.
-- Pot = all fees. Split 60% / 30% / 10% to 1st / 2nd / 3rd (with 2 players: 2/3 and 1/3). Rounding leftovers go to 1st.
-- Nothing is kept by the app, so no coins are created: rooms can't be farmed. Coin moves are ledger rows:
--   race_fee (−fee, ref room:<id>:fee:<time>) · race_refund (+fee, room:<id>:refund) · race_prize (+share, room:<id>:prize).
-- A fish's stats are copied when it joins, so editing the catch afterwards changes nothing. Leaving marks the entry left_at
-- (nothing is deleted).
-- Ties are broken at random. Same race physics as run_race (two halves, ±12% luck each).
-- Helpers live in schema `private`: the app's roles have no access to it, so only these public functions (and the cron job) can
-- run a room, move coins or read someone's balance.

create schema private;

create table public.race_rooms (
  id bigserial primary key,
  host uuid not null references auth.users(id) on delete cascade,
  class text not null check (class in ('S', 'A', 'B', 'C', 'open')),
  fee int not null check (fee between 0 and 200),
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  pot int not null default 0,
  lanes jsonb
);
create index race_rooms_open on public.race_rooms (status, starts_at);

create table public.race_entries (
  id bigserial primary key,
  room_id bigint not null references public.race_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  catch_id uuid references public.catches(id) on delete set null,
  who text, species text not null, power int, tier text, speed int not null, stamina int not null, class text not null,
  fee_paid int not null default 0,
  joined_at timestamptz not null default now(),
  place int, payout int,
  left_at timestamptz             -- set when a player leaves before the start (the row stays as history)
);
create unique index race_entries_one_each on public.race_entries (room_id, user_id) where left_at is null;

alter table public.race_rooms enable row level security;
alter table public.race_entries enable row level security;
-- see a room if you host it, are in it, or are the host's friend (that is who may join)
create function public.can_see_race_room(p_room bigint) returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (select 1 from public.race_rooms r where r.id = p_room and public.is_member()
                 and (r.host = auth.uid() or public.is_friend(r.host)
                      or exists (select 1 from public.race_entries e where e.room_id = r.id and e.user_id = auth.uid())))
$$;
create policy "see race rooms" on public.race_rooms for select using (public.can_see_race_room(id));
create policy "see race entries" on public.race_entries for select using (public.can_see_race_room(room_id));
grant select on public.race_rooms, public.race_entries to authenticated;
grant execute on function public.can_see_race_room(bigint) to authenticated;

create function private._coin_balance(p_user uuid) returns int
language sql stable security definer set search_path = public, private as $$
  select coalesce(sum(amount), 0)::int from public.coin_ledger where user_id = p_user and currency = 'coins'
$$;

-- one of YOUR ranked fish, checked against the room's class; returns the copy that goes into race_entries
create function private._race_fish(p_user uuid, p_catch uuid, p_class text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare f record; c text;
begin
  select c2.id, c2.species, r.* into f
  from public.catches c2 cross join lateral public.fish_rank_calc(c2.species, c2.length_in::numeric, c2.weight_lb::numeric, c2.weight_est) r
  where c2.id = p_catch and c2.created_by = p_user and c2.deleted_at is null and coalesce(c2.review_state, '') <> 'blurred'
    and exists (select 1 from public.photos p where p.catch_id = c2.id);
  if f.id is null then raise exception 'Pick one of your own ranked fish (it needs a photo and a size).'; end if;
  c := public.race_class(public.race_time(f.speed, f.stamina));
  if p_class <> 'open' and c <> p_class then raise exception 'That fish is class %, but this race is class %.', c, p_class; end if;
  return jsonb_build_object('catch_id', f.id, 'species', f.species, 'power', f.power, 'tier', f.tier, 'speed', f.speed, 'stamina', f.stamina, 'class', c);
end $$;

-- run a full room (internal): places, pot split, payouts
create function private._race_room_run(p_room bigint) returns void
language plpgsql volatile security definer set search_path = public, private as $$
declare rm record; n int; v_pot int; w numeric[]; paid int := 0; ent record; amt int;
begin
  select * into rm from public.race_rooms where id = p_room for update;
  if rm.status <> 'open' then return; end if;
  select count(*), coalesce(sum(fee_paid), 0) into n, v_pot from public.race_entries where room_id = p_room and left_at is null;
  if n < 2 then perform private._race_room_cancel(p_room); return; end if;
  -- race every entry; place by total time, random tie-break
  with t as (
    select e.user_id,
      50.0 / ((40 + e.speed) * (0.88 + 0.24 * random())) as t1,
      50.0 / ((40 + e.speed) * (0.55 + 0.45 * e.stamina / 100.0) * (0.88 + 0.24 * random())) as t2,
      random() as tie
    from public.race_entries e where e.room_id = p_room and e.left_at is null),
  p as (select *, row_number() over (order by t1 + t2, tie) as pl from t)
  update public.race_entries e set place = p.pl from p where e.room_id = p_room and e.user_id = p.user_id and e.left_at is null;
  -- payouts: 60/30/10 of the pot (2 players: 2/3 and 1/3), leftovers to 1st
  w := case when n = 2 then array[2, 1]::numeric[] else array[6, 3, 1]::numeric[] end;
  for ent in select * from public.race_entries where room_id = p_room and left_at is null and place <= array_length(w, 1) order by place desc loop
    amt := case when ent.place = 1 then v_pot - paid else floor(v_pot * w[ent.place] / (select sum(x) from unnest(w) x))::int end;
    paid := paid + amt;
    update public.race_entries set payout = amt where id = ent.id;
    if amt > 0 then perform public._coin_grant(ent.user_id, 'coins', amt, 'race_prize', 'room:' || p_room || ':prize', null, 'place ' || ent.place); end if;
  end loop;
  update public.race_entries set payout = 0 where room_id = p_room and left_at is null and payout is null;
  update public.race_rooms set status = 'done', finished_at = now(), pot = v_pot,
    lanes = (select jsonb_agg(jsonb_build_object('lane', rn, 'who', x.who, 'user_id', x.user_id, 'species', x.species, 'power', x.power, 'tier', x.tier,
                    'speed', x.speed, 'stamina', x.stamina, 'class', x.class, 'place', x.place, 'payout', x.payout) order by rn)
             from (select y.*, row_number() over (order by random()) rn from public.race_entries y where y.room_id = p_room and y.left_at is null) x)
  where id = p_room;
end $$;

create function private._race_room_cancel(p_room bigint) returns void
language plpgsql volatile security definer set search_path = public, private as $$
declare ent record;
begin
  update public.race_rooms set status = 'cancelled', finished_at = now() where id = p_room and status = 'open';
  if not found then return; end if;
  for ent in select * from public.race_entries where room_id = p_room and left_at is null and fee_paid > 0 loop
    perform public._coin_grant(ent.user_id, 'coins', ent.fee_paid, 'race_refund', 'room:' || p_room || ':refund', null, 'race cancelled');
  end loop;
end $$;

-- join (internal + used by create): pays the fee, copies the fish; runs the race when the room is full (5)
create function private._race_room_enter(p_room bigint, p_user uuid, p_catch uuid) returns void
language plpgsql volatile security definer set search_path = public, private as $$
declare rm record; f jsonb; nm text;
begin
  perform pg_advisory_xact_lock(hashtext('race-coins:' || p_user::text));   -- one join at a time per person
  select * into rm from public.race_rooms where id = p_room for update;
  if rm.id is null or rm.status <> 'open' then raise exception 'This race is no longer open.'; end if;
  if rm.starts_at <= now() then raise exception 'This race has already started.'; end if;
  if exists (select 1 from public.race_entries where room_id = p_room and user_id = p_user and left_at is null) then raise exception 'You''re already in this race.'; end if;
  if (select count(*) from public.race_entries where room_id = p_room and left_at is null) >= 5 then raise exception 'This race is full.'; end if;
  if private._coin_balance(p_user) < rm.fee then raise exception 'You need % coins to enter (you have %).', rm.fee, private._coin_balance(p_user); end if;
  f := private._race_fish(p_user, p_catch, rm.class);
  select coalesce(nullif(display_name, ''), handle, 'A player') into nm from public.profiles where user_id = p_user;
  insert into public.race_entries (room_id, user_id, catch_id, who, species, power, tier, speed, stamina, class, fee_paid)
    values (p_room, p_user, (f->>'catch_id')::uuid, coalesce(nm, 'A player'), f->>'species', (f->>'power')::int, f->>'tier',
            (f->>'speed')::int, (f->>'stamina')::int, f->>'class', rm.fee);
  if rm.fee > 0 and not public._coin_grant(p_user, 'coins', -rm.fee, 'race_fee', 'room:' || p_room || ':fee:' || extract(epoch from clock_timestamp()), null, 'race entry') then
    raise exception 'Entry fee could not be taken.';
  end if;
  if (select count(*) from public.race_entries where room_id = p_room and left_at is null) >= 5 then perform private._race_room_run(p_room); end if;
end $$;

-- ===== what the app calls =====
create function public.race_room_create(p_class text, p_fee int, p_catch uuid, p_minutes int) returns jsonb
language plpgsql volatile security definer set search_path = public, private as $$
declare u uuid := auth.uid(); rid bigint;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  if p_class not in ('S', 'A', 'B', 'C', 'open') then raise exception 'Pick a class (S, A, B, C) or open.'; end if;
  if p_fee is null or p_fee < 0 or p_fee > 200 then raise exception 'The entry fee must be 0 to 200 coins.'; end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 1440 then raise exception 'Start the race 5 minutes to 24 hours from now.'; end if;
  if (select count(*) from public.race_rooms where host = u and status = 'open') >= 3 then raise exception 'You already have 3 open races. Start or cancel one first.'; end if;
  insert into public.race_rooms (host, class, fee, starts_at) values (u, p_class, p_fee, now() + make_interval(mins => p_minutes)) returning id into rid;
  perform private._race_room_enter(rid, u, p_catch);
  return public.race_room_get(rid);
end $$;

create function public.race_room_join(p_room bigint, p_catch uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, private as $$
declare u uuid := auth.uid(); h uuid;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  select host into h from public.race_rooms where id = p_room;
  if h is null then raise exception 'That race doesn''t exist.'; end if;
  if h <> u and not public.is_friend(h) then raise exception 'Only the host''s friends can join this race.'; end if;
  if public.is_blocked(h) then raise exception 'You can''t join this race.'; end if;
  perform private._race_room_enter(p_room, u, p_catch);
  return public.race_room_get(p_room);
end $$;

create function public.race_room_leave(p_room bigint) returns jsonb
language plpgsql volatile security definer set search_path = public, private as $$
declare u uuid := auth.uid(); rm record; ent record;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  select * into rm from public.race_rooms where id = p_room for update;
  if rm.id is null or rm.status <> 'open' then raise exception 'This race is no longer open.'; end if;
  if rm.host = u then raise exception 'You''re the host — cancel the race instead.'; end if;
  select * into ent from public.race_entries where room_id = p_room and user_id = u and left_at is null;
  if ent.user_id is null then raise exception 'You''re not in this race.'; end if;
  update public.race_entries set left_at = now() where id = ent.id;
  -- a refund row per leave (the ref carries the time, since you may join and leave the same room again)
  if ent.fee_paid > 0 then perform public._coin_grant(u, 'coins', ent.fee_paid, 'race_refund', 'room:' || p_room || ':left:' || extract(epoch from clock_timestamp()), null, 'left a race'); end if;
  return public.race_room_get(p_room);
end $$;

create function public.race_room_start(p_room bigint) returns jsonb
language plpgsql volatile security definer set search_path = public, private as $$
declare u uuid := auth.uid(); rm record;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  select * into rm from public.race_rooms where id = p_room;
  if rm.id is null or rm.host <> u then raise exception 'Only the host can start this race.'; end if;
  if rm.status <> 'open' then raise exception 'This race is no longer open.'; end if;
  if (select count(*) from public.race_entries where room_id = p_room and left_at is null) < 2 then raise exception 'You need at least 2 fish to start.'; end if;
  perform private._race_room_run(p_room);
  return public.race_room_get(p_room);
end $$;

create function public.race_room_cancel(p_room bigint) returns jsonb
language plpgsql volatile security definer set search_path = public, private as $$
declare u uuid := auth.uid();
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  if not exists (select 1 from public.race_rooms where id = p_room and host = u) then raise exception 'Only the host can cancel this race.'; end if;
  perform private._race_room_cancel(p_room);
  return public.race_room_get(p_room);
end $$;

-- a room with its players (only for people who may see it)
create function public.race_room_get(p_room bigint) returns jsonb
language sql stable security definer set search_path = public, private as $$
  select case when public.can_see_race_room(p_room) then (
    select jsonb_build_object('id', r.id, 'host', r.host, 'class', r.class, 'fee', r.fee, 'status', r.status, 'starts_at', r.starts_at,
      'finished_at', r.finished_at, 'pot', case when r.status = 'done' then r.pot else (select coalesce(sum(fee_paid), 0) from public.race_entries where room_id = r.id and left_at is null) end,
      'lanes', r.lanes,
      'players', (select coalesce(jsonb_agg(jsonb_build_object('user_id', e.user_id, 'who', e.who, 'species', e.species, 'power', e.power, 'tier', e.tier,
                    'speed', e.speed, 'stamina', e.stamina, 'class', e.class, 'place', e.place, 'payout', e.payout) order by e.joined_at), '[]'::jsonb)
                  from public.race_entries e where e.room_id = r.id and e.left_at is null),
      'wallet', public.my_wallet())
    from public.race_rooms r where r.id = p_room) end
$$;

-- every minute: run (or cancel) rooms whose start time has come
create function private.race_rooms_tick() returns int
language plpgsql volatile security definer set search_path = public, private as $$
declare r record; k int := 0;
begin
  for r in select id from public.race_rooms where status = 'open' and starts_at <= now() order by starts_at limit 50 loop
    perform private._race_room_run(r.id); k := k + 1;
  end loop;
  return k;
end $$;

grant execute on function public.race_room_create(text, int, uuid, int), public.race_room_join(bigint, uuid), public.race_room_leave(bigint),
  public.race_room_start(bigint), public.race_room_cancel(bigint), public.race_room_get(bigint) to authenticated;

-- (applied as its own migration, race_rooms_cron)
select cron.schedule('race-rooms-tick', '* * * * *', 'select private.race_rooms_tick()');
