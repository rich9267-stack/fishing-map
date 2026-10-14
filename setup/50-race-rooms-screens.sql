-- 50: 🏁 What the multiplayer race screens need (Oct 13).
-- 1. Room races save each fish's two half-times (t1, t2) so the app can play the race back like a solo race.
-- 2. race_rooms_list(): your friends' open rooms + your own rooms from the last 3 days, newest first, with the host's name.
--    race_room_get() also returns host_name and whether you are in the room.
-- 3. Phone alerts (category "contests", respects each person's settings and quiet hours, one alert per event via dedupe keys):
--    friend opened a race (host's friends) · someone joined your race (host) · starts in ~5 min (players, from the 1-minute cron)
--    · results with your place and payout (players) · cancelled, fee returned (players). Links open ?go=race&room=<id>.
-- Only create / alter-add / create-or-replace (the Supabase connector cancels destructive statements).

alter table public.race_entries add column t1 numeric;
alter table public.race_entries add column t2 numeric;
alter table public.race_rooms add column soon_sent boolean not null default false;

create function private._race_alert(p_user uuid, p_title text, p_body text, p_room bigint, p_key text) returns void
language plpgsql volatile security definer set search_path = public, private as $$
begin
  perform public.enqueue_notification(p_user, 'contests', p_title, p_body, './?go=race&room=' || p_room, 'race:' || p_room || ':' || p_key || ':' || p_user);
exception when others then null;   -- an alert problem must never stop a race
end $$;

create function private._race_label(p_class text) returns text
language sql immutable as $$
  select case when p_class = 'open' then 'Open' else 'Class ' || p_class end
$$;

create or replace function private._race_room_run(p_room bigint) returns void
language plpgsql volatile security definer set search_path = public, private as $$
declare rm record; n int; v_pot int; w numeric[]; paid int := 0; ent record; amt int;
begin
  select * into rm from public.race_rooms where id = p_room for update;
  if rm.status <> 'open' then return; end if;
  select count(*), coalesce(sum(fee_paid), 0) into n, v_pot from public.race_entries where room_id = p_room and left_at is null;
  if n < 2 then perform private._race_room_cancel(p_room); return; end if;
  with t as (
    select e.id,
      50.0 / ((40 + e.speed) * (0.88 + 0.24 * random())) as t1,
      50.0 / ((40 + e.speed) * (0.55 + 0.45 * e.stamina / 100.0) * (0.88 + 0.24 * random())) as t2,
      random() as tie
    from public.race_entries e where e.room_id = p_room and e.left_at is null),
  p as (select *, row_number() over (order by t1 + t2, tie) as pl from t)
  update public.race_entries e set place = p.pl, t1 = round(p.t1::numeric, 4), t2 = round(p.t2::numeric, 4) from p where e.id = p.id;
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
                    'speed', x.speed, 'stamina', x.stamina, 'class', x.class, 'place', x.place, 'payout', x.payout,
                    't1', x.t1, 't2', x.t2, 'total', x.t1 + x.t2) order by rn)
             from (select y.*, row_number() over (order by random()) rn from public.race_entries y where y.room_id = p_room and y.left_at is null) x)
  where id = p_room;
  for ent in select * from public.race_entries where room_id = p_room and left_at is null loop
    perform private._race_alert(ent.user_id,
      case when ent.place = 1 then '🏆 You won the ' || private._race_label(rm.class) || ' race!' else '🏁 Race over: you came ' || ent.place || case ent.place when 2 then 'nd' when 3 then 'rd' else 'th' end end,
      case when ent.payout > 0 then 'Your ' || ent.species || ' won ' || ent.payout || ' coins. Tap to watch the race.' else 'Tap to watch the race.' end,
      p_room, 'done');
  end loop;
end $$;

create or replace function private._race_room_cancel(p_room bigint) returns void
language plpgsql volatile security definer set search_path = public, private as $$
declare ent record;
begin
  update public.race_rooms set status = 'cancelled', finished_at = now() where id = p_room and status = 'open';
  if not found then return; end if;
  for ent in select * from public.race_entries where room_id = p_room and left_at is null loop
    if ent.fee_paid > 0 then
      perform public._coin_grant(ent.user_id, 'coins', ent.fee_paid, 'race_refund', 'room:' || p_room || ':refund', null, 'race cancelled');
    end if;
    perform private._race_alert(ent.user_id, '🏁 Race cancelled',
      case when ent.fee_paid > 0 then 'Not enough fish showed up. Your ' || ent.fee_paid || ' coins are back.' else 'Not enough fish showed up.' end, p_room, 'cancel');
  end loop;
end $$;

-- join: same as before, plus an alert to the host
create or replace function private._race_room_enter(p_room bigint, p_user uuid, p_catch uuid) returns void
language plpgsql volatile security definer set search_path = public, private as $$
declare rm record; f jsonb; nm text; cnt int;
begin
  perform pg_advisory_xact_lock(hashtext('race-coins:' || p_user::text));
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
  select count(*) into cnt from public.race_entries where room_id = p_room and left_at is null;
  if p_user <> rm.host then
    perform private._race_alert(rm.host, '🏁 ' || coalesce(nm, 'A friend') || ' joined your race',
      coalesce(nm, 'A friend') || ' entered a ' || (f->>'species') || '. ' || cnt || ' of 5 fish so far.', p_room, 'join:' || p_user || ':' || extract(epoch from clock_timestamp())::bigint);
  end if;
  if cnt >= 5 then perform private._race_room_run(p_room); end if;
end $$;

-- create: same as before, plus an alert to the host's friends
create or replace function public.race_room_create(p_class text, p_fee int, p_catch uuid, p_minutes int) returns jsonb
language plpgsql volatile security definer set search_path = public, private as $$
declare u uuid := auth.uid(); rid bigint; nm text; fr record;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  if p_class not in ('S', 'A', 'B', 'C', 'open') then raise exception 'Pick a class (S, A, B, C) or open.'; end if;
  if p_fee is null or p_fee < 0 or p_fee > 200 then raise exception 'The entry fee must be 0 to 200 coins.'; end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 1440 then raise exception 'Start the race 5 minutes to 24 hours from now.'; end if;
  if (select count(*) from public.race_rooms where host = u and status = 'open') >= 3 then raise exception 'You already have 3 open races. Start or cancel one first.'; end if;
  insert into public.race_rooms (host, class, fee, starts_at) values (u, p_class, p_fee, now() + make_interval(mins => p_minutes)) returning id into rid;
  perform private._race_room_enter(rid, u, p_catch);
  select coalesce(nullif(display_name, ''), handle, 'A friend') into nm from public.profiles where user_id = u;
  for fr in select case when user_a = u then user_b else user_a end as uid from public.friendships where status = 'accepted' and (user_a = u or user_b = u) loop
    if not public.is_blocked(fr.uid) then
      perform private._race_alert(fr.uid, '🏁 ' || coalesce(nm, 'A friend') || ' opened a race',
        private._race_label(p_class) || case when p_fee > 0 then ' · ' || p_fee || ' coins to enter' else ' · free' end || '. Starts in ' ||
        case when p_minutes < 60 then p_minutes || ' min' when p_minutes % 60 = 0 then (p_minutes / 60) || ' h' else round(p_minutes / 60.0, 1) || ' h' end || '. Tap to join.', rid, 'open');
    end if;
  end loop;
  return public.race_room_get(rid);
end $$;

-- the 1-minute cron: also warn players ~5 minutes before the start
create or replace function private.race_rooms_tick() returns int
language plpgsql volatile security definer set search_path = public, private as $$
declare r record; ent record; k int := 0;
begin
  for r in select id, class from public.race_rooms where status = 'open' and not soon_sent and starts_at > now() and starts_at <= now() + interval '5 minutes' loop
    update public.race_rooms set soon_sent = true where id = r.id;
    for ent in select * from public.race_entries where room_id = r.id and left_at is null loop
      perform private._race_alert(ent.user_id, '🏁 Your race starts in 5 minutes', 'The ' || private._race_label(r.class) || ' race with your ' || ent.species || ' is about to start.', r.id, 'soon');
    end loop;
  end loop;
  for r in select id from public.race_rooms where status = 'open' and starts_at <= now() order by starts_at limit 50 loop
    perform private._race_room_run(r.id); k := k + 1;
  end loop;
  return k;
end $$;

create or replace function public.race_room_get(p_room bigint) returns jsonb
language sql stable security definer set search_path = public, private as $$
  select case when public.can_see_race_room(p_room) then (
    select jsonb_build_object('id', r.id, 'host', r.host,
      'host_name', (select coalesce(nullif(display_name, ''), handle, 'A friend') from public.profiles where user_id = r.host),
      'class', r.class, 'fee', r.fee, 'status', r.status, 'starts_at', r.starts_at,
      'finished_at', r.finished_at, 'pot', case when r.status = 'done' then r.pot else (select coalesce(sum(fee_paid), 0) from public.race_entries where room_id = r.id and left_at is null) end,
      'lanes', r.lanes,
      'mine', exists (select 1 from public.race_entries e where e.room_id = r.id and e.user_id = auth.uid() and e.left_at is null),
      'players', (select coalesce(jsonb_agg(jsonb_build_object('user_id', e.user_id, 'who', e.who, 'species', e.species, 'power', e.power, 'tier', e.tier,
                    'speed', e.speed, 'stamina', e.stamina, 'class', e.class, 'place', e.place, 'payout', e.payout) order by e.joined_at), '[]'::jsonb)
                  from public.race_entries e where e.room_id = r.id and e.left_at is null),
      'wallet', public.my_wallet())
    from public.race_rooms r where r.id = p_room) end
$$;

-- the rooms list: friends' open rooms, and your own rooms (host or player) from the last 3 days
create function public.race_rooms_list() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select jsonb_build_object('rooms', coalesce((
    select jsonb_agg(public.race_room_get(r.id) - 'wallet' order by (r.status = 'open') desc, case when r.status = 'open' then r.starts_at end, r.finished_at desc)
    from public.race_rooms r
    where public.can_see_race_room(r.id)
      and (r.status = 'open'
           or (coalesce(r.finished_at, r.created_at) > now() - interval '3 days'
               and (r.host = auth.uid() or exists (select 1 from public.race_entries e where e.room_id = r.id and e.user_id = auth.uid() and e.left_at is null))))
  ), '[]'::jsonb), 'wallet', public.my_wallet())
$$;
grant execute on function public.race_rooms_list() to authenticated;
