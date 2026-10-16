-- db-coin-checks.sql : 60 coin checks against the REAL database (race fees, refunds,
-- pot split, cancelled races, solo-race caps, shop, tank saving, double-payout guard).
--
-- SAFE TO RUN: it builds 6 fake players inside ONE step and ends by raising an error ON
-- PURPOSE, so the database cancels the whole step. Nothing is saved: no fake accounts,
-- no coins, no rooms. Real balances never change (the last check proves it).
--
-- HOW TO RUN: paste the whole file in the Supabase SQL Editor (or run it through the
-- Supabase connector) and press Run. A red "error" that starts with
--   COIN_TEST_REPORT: 60 checks run, 60 passed.
-- is the GOOD result. Every line below it says PASS or FAIL with the reason.
--
-- RERUN after any change to race rooms, solo races, the shop, tank saving or coin rules.
-- If a rule changes on purpose (a fee cap, a prize split, a price), update the expected
-- numbers in the matching check below.
-- Not covered yet: catch rewards (claim_coins), collections, tournament prizes.
-- This file is NOT part of tests/run-all.sh (that suite does not touch the database).

do $do$
declare
  g uuid := gen_random_uuid();
  ix int; sp uuid; st text; wt text; cid uuid;
  r1 bigint; r2 bigint; r3 bigint; r4 bigint; r5 bigint; r6 bigint; r7 bigint; r8 bigint; r9 bigint;
  msg text; res jsonb; b0 int; b1 int; cnt int;
  tseed bigint; ta bigint; tb bigint; cnt0 bigint;
  today date := (now() at time zone 'America/New_York')::date;
  real0 bigint; real0n bigint; real1 bigint; real1n bigint;
  rep text; nrun int; npass int; allok boolean; won boolean;
  wp int; coinsrep int; gm0 int; price int; k text;
begin
  select coalesce(sum(amount),0), count(*) into real0, real0n from public.coin_ledger;

  create temp table ck(n serial, name text, ok boolean, detail text);
  create temp table fk(i int primary key, id uuid, email text, catch uuid);

  create function pg_temp.chk(p_name text, p_ok boolean, p_detail text) returns void language plpgsql as $f$ begin insert into ck(name, ok, detail) values (p_name, coalesce(p_ok,false), p_detail); end $f$;
  create function pg_temp.as_user(p_u uuid, p_email text) returns void language plpgsql as $f$ begin perform set_config('request.jwt.claims', json_build_object('sub', p_u, 'email', p_email, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', p_u::text, true); perform set_config('request.jwt.claim.email', p_email, true); end $f$;
  create function pg_temp.as_i(p_i int) returns void language plpgsql as $f$ declare v_id uuid; v_em text; begin select id, email into v_id, v_em from fk where i = p_i; perform pg_temp.as_user(v_id, v_em); end $f$;
  create function pg_temp.uid(p_i int) returns uuid language sql as $f$ select id from fk where i = p_i $f$;
  create function pg_temp.cat(p_i int) returns uuid language sql as $f$ select catch from fk where i = p_i $f$;
  create function pg_temp.bal(p_u uuid) returns int language sql as $f$ select coalesce(sum(amount),0)::int from public.coin_ledger where user_id = p_u and currency = 'coins' $f$;
  create function pg_temp.gem(p_u uuid) returns int language sql as $f$ select coalesce(sum(amount),0)::int from public.coin_ledger where user_id = p_u and currency = 'gems' $f$;
  create function pg_temp.bi(p_i int) returns int language sql as $f$ select pg_temp.bal(id) from fk where i = p_i $f$;
  create function pg_temp.gi(p_i int) returns int language sql as $f$ select pg_temp.gem(id) from fk where i = p_i $f$;
  create function pg_temp.ftotal() returns bigint language sql as $f$ select coalesce(sum(amount),0) from public.coin_ledger where currency = 'coins' and user_id in (select id from fk) $f$;
  create function pg_temp.try(p text) returns text language plpgsql as $f$ begin execute p; return null; exception when others then return sqlerrm; end $f$;
  create function pg_temp.pay(p_room bigint) returns int[] language sql as $f$ select array_agg(coalesce(payout,0) order by place) from public.race_entries where room_id = p_room and left_at is null $f$;
  create function pg_temp.rstat(p_room bigint) returns text language sql as $f$ select status from public.race_rooms where id = p_room $f$;
  create function pg_temp.fledger() returns bigint language sql as $f$ select count(*) from public.coin_ledger where user_id in (select id from fk) $f$;

  -- ===== setup: 6 fake players =====
  for ix in 1..6 loop
    insert into fk(i, id, email) values (ix, gen_random_uuid(), 'coin-test-' || ix || '@example.invalid');
  end loop;
  insert into auth.users (id, aud, role, email) select id, 'authenticated', 'authenticated', email from fk;
  insert into public.members (email, display_name, status) select email, 'Coin Test ' || i, 'approved' from fk;
  insert into public.profiles (user_id, handle, display_name) select id, 'cointest_' || i, 'Coin Test ' || i from fk;
  insert into public.friendships (user_a, user_b, status, requested_by)
    select least((select id from fk where i = 1), id), greatest((select id from fk where i = 1), id), 'accepted', (select id from fk where i = 1) from fk where i > 1;
  select spot_type, water_type into st, wt from public.spots order by created_at limit 1;
  insert into public.spots (name, spot_type, water_type, created_by) values ('COIN TEST SPOT', coalesce(st,'pier'), coalesce(wt,'salt'), pg_temp.uid(1)) returning id into sp;
  for ix in 1..6 loop
    perform pg_temp.as_i(ix);
    insert into public.catches (spot_id, species, length_in, created_by, visibility) values (sp, 'snook', 28, pg_temp.uid(ix), 'friends') returning id into cid;
    insert into public.photos (spot_id, catch_id, path, created_by) values (sp, cid, 'cointest/' || cid || '.jpg', pg_temp.uid(ix));
    update fk set catch = cid where fk.i = ix;
  end loop;
  for ix in 1..5 loop perform public._coin_grant(pg_temp.uid(ix), 'coins', 300, 'test_seed', 'test:seed:' || ix, null, 'seed'); end loop;
  perform public._coin_grant(pg_temp.uid(6), 'coins', 20, 'test_seed', 'test:seed:6', null, 'seed');
  tseed := pg_temp.ftotal();
  perform pg_temp.chk('Setup: 6 fake players, 5 with 300 coins and 1 with 20', tseed = 1520 and (select count(*) from fk where catch is not null) = 6, format('fake coin total %s (expected 1520)', tseed));

  -- ===== Race fees (room 1: host + 2 friends, fee 50) =====
  perform pg_temp.as_i(1); perform public.race_room_create('open', 50, pg_temp.cat(1), 60);
  select max(id) into r1 from public.race_rooms where host = pg_temp.uid(1);
  perform pg_temp.as_i(2); perform public.race_room_join(r1, pg_temp.cat(2));
  perform pg_temp.as_i(3); perform public.race_room_join(r1, pg_temp.cat(3));
  perform pg_temp.chk('Fees: host and 2 friends each pay 50 on joining', pg_temp.bi(1)=250 and pg_temp.bi(2)=250 and pg_temp.bi(3)=250, format('balances %s/%s/%s (expected 250 each)', pg_temp.bi(1), pg_temp.bi(2), pg_temp.bi(3)));
  select count(*), coalesce(sum(amount),0) into cnt, b0 from public.coin_ledger where reason = 'race_fee' and ref like 'room:' || r1 || ':fee:%';
  perform pg_temp.chk('Fees: coin history shows 3 fee entries of -50', cnt = 3 and b0 = -150, format('%s entries totalling %s', cnt, b0));
  perform pg_temp.as_i(6);
  msg := pg_temp.try(format('select public.race_room_join(%s,%L)', r1, pg_temp.cat(6)));
  perform pg_temp.chk('Fees: a player with 20 coins cannot join a 50-coin race', msg like '%need 50 coins%' and pg_temp.bi(6) = 20 and not exists (select 1 from public.race_entries where room_id = r1 and user_id = pg_temp.uid(6)), format('message: %s; balance %s', msg, pg_temp.bi(6)));
  perform pg_temp.as_i(4);
  msg := pg_temp.try(format('select public.race_room_join(%s,%L)', r1, pg_temp.cat(1)));
  perform pg_temp.chk('Fees: cannot enter with someone else''s fish, and nothing is charged', msg like '%one of your own%' and pg_temp.bi(4) = 300, format('message: %s; balance %s', msg, pg_temp.bi(4)));
  perform pg_temp.as_i(2);
  msg := pg_temp.try(format('select public.race_room_join(%s,%L)', r1, pg_temp.cat(2)));
  perform pg_temp.chk('Fees: joining twice is refused and charges nothing extra', msg like '%already in%' and pg_temp.bi(2) = 250, format('message: %s; balance %s', msg, pg_temp.bi(2)));

  -- ===== Refunds on leaving =====
  perform pg_temp.as_i(3); perform public.race_room_leave(r1);
  perform pg_temp.chk('Refund: leaving gives the 50-coin fee back', pg_temp.bi(3) = 300 and exists (select 1 from public.race_entries where room_id = r1 and user_id = pg_temp.uid(3) and left_at is not null), format('balance %s (expected 300)', pg_temp.bi(3)));
  msg := pg_temp.try(format('select public.race_room_leave(%s)', r1));
  perform pg_temp.chk('Refund: leaving a second time refunds nothing more', msg like '%not in this race%' and pg_temp.bi(3) = 300, format('message: %s; balance %s', msg, pg_temp.bi(3)));
  perform pg_temp.as_i(1);
  msg := pg_temp.try(format('select public.race_room_leave(%s)', r1));
  perform pg_temp.chk('Refund: the host cannot leave (must cancel) and is not refunded', msg like '%host%' and pg_temp.bi(1) = 250, format('message: %s; balance %s', msg, pg_temp.bi(1)));
  perform pg_temp.as_i(3); perform public.race_room_join(r1, pg_temp.cat(3));
  perform pg_temp.chk('Refund: re-joining after leaving charges the fee again', pg_temp.bi(3) = 250, format('balance %s (expected 250)', pg_temp.bi(3)));

  -- ===== Pot split, 3 players (pot 150) =====
  tb := pg_temp.ftotal();
  perform pg_temp.as_i(1); perform public.race_room_start(r1);
  ta := pg_temp.ftotal();
  perform pg_temp.chk('Pot split, 3 players: 60/30/10 of 150 = 90/45/15', pg_temp.rstat(r1) = 'done' and pg_temp.pay(r1) = array[90,45,15], format('status %s; payouts by place %s', pg_temp.rstat(r1), pg_temp.pay(r1)));
  perform pg_temp.chk('Pot split, 3 players: paid out exactly what was paid in', ta - tb = 150 and ta = tseed and (select pot from public.race_rooms where id = r1) = 150, format('paid out %s; fake coin total %s (expected %s)', ta - tb, ta, tseed));

  -- ===== 2 players (fee 30, pot 60) =====
  perform pg_temp.as_i(1); perform public.race_room_create('open', 30, pg_temp.cat(1), 60);
  select max(id) into r2 from public.race_rooms where host = pg_temp.uid(1);
  perform pg_temp.as_i(2); perform public.race_room_join(r2, pg_temp.cat(2));
  perform pg_temp.as_i(1); perform public.race_room_start(r2);
  perform pg_temp.chk('Pot split, 2 players: two thirds / one third of 60 = 40/20', pg_temp.rstat(r2) = 'done' and pg_temp.pay(r2) = array[40,20], format('payouts %s', pg_temp.pay(r2)));
  perform pg_temp.chk('Pot split, 2 players: no coins created or lost', pg_temp.ftotal() = tseed, format('fake coin total %s (expected %s)', pg_temp.ftotal(), tseed));

  -- ===== 5 players, auto-runs on 5th join (fee 50, pot 250) =====
  perform pg_temp.as_i(1); perform public.race_room_create('open', 50, pg_temp.cat(1), 60);
  select max(id) into r3 from public.race_rooms where host = pg_temp.uid(1);
  for ix in 2..4 loop perform pg_temp.as_i(ix); perform public.race_room_join(r3, pg_temp.cat(ix)); end loop;
  perform pg_temp.chk('Race rooms: stays open with 4 of 5 fish, 200 coins held', pg_temp.rstat(r3) = 'open' and pg_temp.ftotal() = tseed - 200, format('status %s; fake total %s (expected %s)', pg_temp.rstat(r3), pg_temp.ftotal(), tseed - 200));
  perform pg_temp.as_i(5); perform public.race_room_join(r3, pg_temp.cat(5));
  perform pg_temp.chk('Pot split, 5 players: runs on the 5th join, pays 150/75/25/0/0 of 250', pg_temp.rstat(r3) = 'done' and pg_temp.pay(r3) = array[150,75,25,0,0], format('status %s; payouts %s', pg_temp.rstat(r3), pg_temp.pay(r3)));
  perform pg_temp.chk('Pot split, 5 players: no coins created or lost', pg_temp.ftotal() = tseed, format('fake coin total %s (expected %s)', pg_temp.ftotal(), tseed));

  -- ===== 4 players, pot that does not divide evenly (fee 33, pot 132) =====
  perform pg_temp.as_i(1); perform public.race_room_create('open', 33, pg_temp.cat(1), 60);
  select max(id) into r4 from public.race_rooms where host = pg_temp.uid(1);
  for ix in 2..4 loop perform pg_temp.as_i(ix); perform public.race_room_join(r4, pg_temp.cat(ix)); end loop;
  perform pg_temp.as_i(1); perform public.race_room_start(r4);
  perform pg_temp.chk('Pot split, uneven pot 132: leftover coin goes to 1st = 80/39/13/0', pg_temp.pay(r4) = array[80,39,13,0], format('payouts %s', pg_temp.pay(r4)));
  perform pg_temp.chk('Pot split, uneven pot: no coins created or lost', pg_temp.ftotal() = tseed, format('fake coin total %s (expected %s)', pg_temp.ftotal(), tseed));

  -- ===== Free race (fee 0) =====
  cnt0 := pg_temp.fledger();
  perform pg_temp.as_i(1); perform public.race_room_create('open', 0, pg_temp.cat(1), 60);
  select max(id) into r5 from public.race_rooms where host = pg_temp.uid(1);
  perform pg_temp.as_i(2); perform public.race_room_join(r5, pg_temp.cat(2));
  perform pg_temp.as_i(1); perform public.race_room_start(r5);
  perform pg_temp.chk('Free race: runs, pays nothing, writes no coin entries', pg_temp.rstat(r5) = 'done' and pg_temp.fledger() = cnt0 and pg_temp.ftotal() = tseed, format('status %s; new coin entries %s', pg_temp.rstat(r5), pg_temp.fledger() - cnt0));

  -- ===== Cancelled race: host cancels (fee 40, 3 players) =====
  perform pg_temp.as_i(1); perform public.race_room_create('open', 40, pg_temp.cat(1), 60);
  select max(id) into r6 from public.race_rooms where host = pg_temp.uid(1);
  perform pg_temp.as_i(2); perform public.race_room_join(r6, pg_temp.cat(2));
  perform pg_temp.as_i(3); perform public.race_room_join(r6, pg_temp.cat(3));
  perform pg_temp.as_i(2);
  msg := pg_temp.try(format('select public.race_room_cancel(%s)', r6));
  perform pg_temp.chk('Cancel: only the host can cancel, nothing refunded to others', msg like '%Only the host%' and pg_temp.rstat(r6) = 'open' and pg_temp.ftotal() = tseed - 120, format('message: %s; status %s', msg, pg_temp.rstat(r6)));
  perform pg_temp.as_i(1); perform public.race_room_cancel(r6);
  select count(*) into cnt from public.coin_ledger where reason = 'race_refund' and ref = 'room:' || r6 || ':refund';
  perform pg_temp.chk('Cancel: host cancels, all 3 players get their 40 back exactly once', pg_temp.rstat(r6) = 'cancelled' and cnt = 3 and pg_temp.ftotal() = tseed, format('status %s; refund entries %s; fake total %s (expected %s)', pg_temp.rstat(r6), cnt, pg_temp.ftotal(), tseed));
  perform public.race_room_cancel(r6);
  select count(*) into cnt from public.coin_ledger where reason = 'race_refund' and ref = 'room:' || r6 || ':refund';
  perform pg_temp.chk('Cancel: cancelling again does not refund twice', cnt = 3 and pg_temp.ftotal() = tseed, format('refund entries %s; fake total %s', cnt, pg_temp.ftotal()));

  -- ===== Cancelled race: start time reached with only 1 fish =====
  perform pg_temp.as_i(1); perform public.race_room_create('open', 40, pg_temp.cat(1), 60);
  select max(id) into r7 from public.race_rooms where host = pg_temp.uid(1);
  update public.race_rooms set starts_at = now() - interval '1 minute' where id = r7;
  perform private.race_rooms_tick();
  perform pg_temp.chk('Cancel: at start time with 1 fish the race is cancelled and refunded', pg_temp.rstat(r7) = 'cancelled' and pg_temp.ftotal() = tseed, format('status %s; fake total %s (expected %s)', pg_temp.rstat(r7), pg_temp.ftotal(), tseed));

  -- ===== Start time reached with 2 fish runs automatically (fee 25, pot 50) =====
  perform pg_temp.as_i(1); perform public.race_room_create('open', 25, pg_temp.cat(1), 60);
  select max(id) into r8 from public.race_rooms where host = pg_temp.uid(1);
  perform pg_temp.as_i(2); perform public.race_room_join(r8, pg_temp.cat(2));
  update public.race_rooms set starts_at = now() - interval '1 minute' where id = r8;
  perform private.race_rooms_tick();
  perform pg_temp.chk('Timer: at start time with 2 fish the race runs and pays 34/16 of 50', pg_temp.rstat(r8) = 'done' and pg_temp.pay(r8) = array[34,16] and pg_temp.ftotal() = tseed, format('status %s; payouts %s; fake total %s', pg_temp.rstat(r8), pg_temp.pay(r8), pg_temp.ftotal()));

  -- ===== Host presses Start with only 1 fish =====
  perform pg_temp.as_i(1); perform public.race_room_create('open', 20, pg_temp.cat(1), 60);
  select max(id) into r9 from public.race_rooms where host = pg_temp.uid(1);
  msg := pg_temp.try(format('select public.race_room_start(%s)', r9));
  perform pg_temp.chk('Start: refused with only 1 fish, fee stays held', msg like '%at least 2%' and pg_temp.rstat(r9) = 'open', format('message: %s; status %s', msg, pg_temp.rstat(r9)));
  perform public.race_room_cancel(r9);
  perform pg_temp.chk('Start: cancelling that room returns the fee', pg_temp.ftotal() = tseed, format('fake total %s (expected %s)', pg_temp.ftotal(), tseed));

  -- ===== Finished rooms cannot pay or refund again =====
  cnt0 := pg_temp.fledger();
  perform pg_temp.as_i(1);
  msg := pg_temp.try(format('select public.race_room_start(%s)', r1));
  perform private._race_room_run(r1);
  perform private._race_room_cancel(r1);
  perform private._race_room_run(r3);
  perform pg_temp.chk('Finished race: start / run / cancel again changes no coins', msg like '%no longer open%' and pg_temp.fledger() = cnt0 and pg_temp.rstat(r1) = 'done' and pg_temp.ftotal() = tseed, format('message: %s; new coin entries %s; status %s', msg, pg_temp.fledger() - cnt0, pg_temp.rstat(r1)));
  perform pg_temp.as_i(3);
  msg := pg_temp.try(format('select public.race_room_leave(%s)', r1));
  perform pg_temp.chk('Finished race: leaving it refunds nothing', msg like '%no longer open%' and pg_temp.fledger() = cnt0, format('message: %s', msg));

  -- ===== Bad fees and atomic failure =====
  perform pg_temp.as_i(1);
  msg := pg_temp.try(format('select public.race_room_create(%L,%s,%L,%s)', 'open', 201, pg_temp.cat(1), 60));
  perform pg_temp.chk('Fees: an entry fee over 200 is refused', msg like '%0 to 200%' and pg_temp.fledger() = cnt0, format('message: %s', msg));
  perform pg_temp.as_i(6);
  msg := pg_temp.try(format('select public.race_room_create(%L,%s,%L,%s)', 'open', 50, pg_temp.cat(6), 60));
  perform pg_temp.chk('Fees: opening a 50-coin race with 20 coins fails and leaves no room behind', msg like '%need 50 coins%' and not exists (select 1 from public.race_rooms where host = pg_temp.uid(6)) and pg_temp.bi(6) = 20, format('message: %s; balance %s', msg, pg_temp.bi(6)));

  -- ===== Solo races: every race pays exactly what it reports =====
  perform pg_temp.as_i(4);
  allok := true; wp := 0; cnt := 0;
  for ix in 1..30 loop
    b0 := pg_temp.bi(4);
    res := public.run_race(pg_temp.cat(4), case when ix % 2 = 0 then 'open' else 'class' end);
    b1 := pg_temp.bi(4);
    coinsrep := (res->>'coins')::int;
    if b1 - b0 <> coinsrep then allok := false; end if;
    if (res->>'place')::int <> 1 and coinsrep <> 0 then allok := false; end if;
    if coinsrep > 0 and coinsrep <> (case when res->>'mode' = 'open' then 20 else 10 end) then allok := false; end if;
    if (res->>'place')::int = 1 then wp := wp + 1; end if;
    if coinsrep > 0 then cnt := cnt + 1; end if;
  end loop;
  perform pg_temp.chk('Solo races: 30 races, each paid exactly what it showed (10 class / 20 open, only for wins)', allok, format('%s wins, %s paid', wp, cnt));
  perform pg_temp.chk('Solo races: paid wins never exceed 3 in one day', cnt = least(wp, 3) and cnt <= 3, format('%s wins, %s paid (expected %s)', wp, cnt, least(wp, 3)));

  -- ===== Solo races: 4th win of the day pays nothing =====
  insert into public.coin_ledger (user_id, currency, amount, reason, ref, day, note) select pg_temp.uid(5), 'coins', 0, 'race', 'test:wins:' || g2, today, 'test' from generate_series(1,3) g2;
  perform pg_temp.as_i(5);
  allok := true; won := false;
  for ix in 1..40 loop
    b0 := pg_temp.bi(5);
    res := public.run_race(pg_temp.cat(5), 'open');
    b1 := pg_temp.bi(5);
    if (res->>'place')::int = 1 then won := true; allok := ((res->>'coins')::int = 0 and b1 = b0); exit; end if;
    if b1 <> b0 then allok := false; exit; end if;
  end loop;
  perform pg_temp.chk('Solo races: a win after 3 paid wins in a day pays 0 coins', won and allok, case when won then 'a 4th win happened and was checked' else 'no win in 40 races, rerun needed' end);

  -- ===== Solo races: 50 per day, then new day =====
  insert into public.race_results (user_id, catch_id, lanes, place, coins, day, mode) select pg_temp.uid(3), pg_temp.cat(3), '[]'::jsonb, 5, 0, today, 'open' from generate_series(1,49);
  perform pg_temp.as_i(3);
  msg := pg_temp.try(format('select public.run_race(%L,%L)', pg_temp.cat(3), 'open'));
  perform pg_temp.chk('Solo cap: the 50th race of the day is allowed', msg is null and (select count(*) from public.race_results where user_id = pg_temp.uid(3) and day = today) = 50, format('message: %s', coalesce(msg, 'none')));
  b0 := pg_temp.bi(3);
  msg := pg_temp.try(format('select public.run_race(%L,%L)', pg_temp.cat(3), 'open'));
  perform pg_temp.chk('Solo cap: the 51st race is refused and pays nothing', msg like '%50 races today%' and pg_temp.bi(3) = b0 and (select count(*) from public.race_results where user_id = pg_temp.uid(3) and day = today) = 50, format('message: %s', msg));
  update public.race_results set day = today - 1 where user_id = pg_temp.uid(3);
  msg := pg_temp.try(format('select public.run_race(%L,%L)', pg_temp.cat(3), 'open'));
  perform pg_temp.chk('Solo cap: a new day starts the count again', msg is null and (select count(*) from public.race_results where user_id = pg_temp.uid(3) and day = today) = 1, format('message: %s', coalesce(msg, 'none')));

  -- ===== Shop =====
  perform public._coin_grant(pg_temp.uid(5), 'coins', 1000, 'test_seed', 'test:seed:shop', null, 'seed');
  perform pg_temp.as_i(5);
  b0 := pg_temp.bi(5); gm0 := pg_temp.gi(5);
  select coins into price from public.shop_items where key = 'wood_small';
  perform public.buy_item('wood_small');
  perform pg_temp.chk('Shop: buying Small driftwood takes exactly its price', pg_temp.bi(5) = b0 - price and pg_temp.gi(5) = gm0 and exists (select 1 from public.user_items where user_id = pg_temp.uid(5) and item_key = 'wood_small') and exists (select 1 from public.coin_ledger where user_id = pg_temp.uid(5) and ref = 'buy:wood_small' and amount = -price), format('price %s; balance %s to %s', price, b0, pg_temp.bi(5)));
  b0 := pg_temp.bi(5);
  msg := pg_temp.try('select public.buy_item(''wood_small'')');
  perform pg_temp.chk('Shop: buying the same item twice is refused and costs nothing', msg like '%already own%' and pg_temp.bi(5) = b0 and (select count(*) from public.coin_ledger where user_id = pg_temp.uid(5) and ref = 'buy:wood_small') = 1, format('message: %s', msg));
  allok := true;
  foreach k in array array['rock_small','shell_scallop','coral_brain','plant_grass','plant_leafy','gravel_blue'] loop
    select coins into price from public.shop_items where key = k;
    b0 := pg_temp.bi(5);
    perform public.buy_item(k);
    if pg_temp.bi(5) <> b0 - price then allok := false; end if;
  end loop;
  perform pg_temp.chk('Shop: 6 more purchases each cost exactly the listed price', allok and (select count(*) from public.user_items where user_id = pg_temp.uid(5)) = 7, format('items owned %s', (select count(*) from public.user_items where user_id = pg_temp.uid(5))));
  perform pg_temp.as_i(6);
  b0 := pg_temp.bi(6);
  msg := pg_temp.try('select public.buy_item(''wood_big'')');
  perform pg_temp.chk('Shop: not enough coins (20 vs 180) is refused and costs nothing', msg like '%Not enough coins%' and pg_temp.bi(6) = b0 and not exists (select 1 from public.user_items where user_id = pg_temp.uid(6)), format('message: %s', msg));
  perform pg_temp.as_i(5);
  b0 := pg_temp.bi(5);
  msg := pg_temp.try('select public.buy_item(''diver'')');
  perform pg_temp.chk('Shop: gem-only item with 0 gems is refused, coins untouched', msg like '%Not enough gems%' and pg_temp.bi(5) = b0 and not exists (select 1 from public.user_items where user_id = pg_temp.uid(5) and item_key = 'diver'), format('message: %s', msg));
  perform public._coin_grant(pg_temp.uid(5), 'gems', 10, 'test_seed', 'test:seed:gems', null, 'seed');
  gm0 := pg_temp.gi(5);
  perform public.buy_item('diver');
  perform pg_temp.chk('Shop: gem-only item takes 8 gems and no coins', pg_temp.gi(5) = gm0 - 8 and pg_temp.bi(5) = b0 and exists (select 1 from public.user_items where user_id = pg_temp.uid(5) and item_key = 'diver'), format('gems %s to %s; coins %s to %s', gm0, pg_temp.gi(5), b0, pg_temp.bi(5)));
  b0 := pg_temp.bi(5);
  msg := pg_temp.try('select public.buy_item(''trophy_gold'')');
  perform pg_temp.chk('Shop: trophy cups cannot be bought', msg like '%tournament%' and pg_temp.bi(5) = b0, format('message: %s', msg));
  msg := pg_temp.try('select public.buy_item(''no_such_item'')');
  perform pg_temp.chk('Shop: unknown item is refused', msg like '%not in the shop%' and pg_temp.bi(5) = b0, format('message: %s', msg));
  perform pg_temp.as_user(g, 'coin-test-stranger@example.invalid');
  msg := pg_temp.try('select public.buy_item(''wood_small'')');
  perform pg_temp.chk('Shop: someone who is not an approved member cannot buy', msg like '%sign in first%' and not exists (select 1 from public.coin_ledger where user_id = g), format('message: %s', msg));

  -- ===== Tank saving only with owned items =====
  perform pg_temp.as_i(5);
  b0 := pg_temp.bi(5);
  perform public.save_tank_setup('salt', 'gravel_blue', jsonb_build_array(jsonb_build_object('key','wood_small','x',20,'layer','back'), jsonb_build_object('key','rock_small','x',60,'layer','front')));
  perform pg_temp.chk('Tank: saving a setup with owned items works', exists (select 1 from public.tank_setups where user_id = pg_temp.uid(5) and tank = 'salt' and gravel = 'gravel_blue' and jsonb_array_length(placed) = 2), 'saved 2 pieces + blue gravel');
  msg := pg_temp.try('select public.save_tank_setup(''salt'', null, ''[{"key":"rock_arch","x":10,"layer":"back"}]''::jsonb)');
  perform pg_temp.chk('Tank: an item you do not own is refused', msg like '%do not own that piece%', format('message: %s', msg));
  msg := pg_temp.try('select public.save_tank_setup(''salt'', ''gravel_pink'', ''[]''::jsonb)');
  perform pg_temp.chk('Tank: gravel you do not own is refused', msg like '%do not own that gravel%', format('message: %s', msg));
  msg := pg_temp.try('select public.save_tank_setup(''salt'', null, ''[{"key":"plant_leafy","x":10,"layer":"back"}]''::jsonb)');
  perform pg_temp.chk('Tank: a fresh-water plant in the salt tank is refused', msg like '%does not go in this tank%', format('message: %s', msg));
  msg := pg_temp.try(format('select public.save_tank_setup(%L, null, %L::jsonb)', 'salt', (select jsonb_agg(jsonb_build_object('key','wood_small','x',10,'layer','back'))::text from generate_series(1,11))));
  perform pg_temp.chk('Tank: more than 10 pieces is refused', msg like '%Up to 10%', format('message: %s', msg));
  msg := pg_temp.try('select public.save_tank_setup(''salt'', null, ''[{"key":"wood_small","x":10,"layer":"back"},{"key":"wood_small","x":50,"layer":"back"}]''::jsonb)');
  perform pg_temp.chk('Tank: the same piece twice is refused', msg like '%placed once%', format('message: %s', msg));
  perform pg_temp.as_i(6);
  msg := pg_temp.try('select public.save_tank_setup(''salt'', null, ''[{"key":"wood_small","x":10,"layer":"back"}]''::jsonb)');
  perform pg_temp.chk('Tank: a player cannot use another player''s items', msg like '%do not own that piece%', format('message: %s', msg));
  perform pg_temp.chk('Tank: saving and refused saves never change coins', pg_temp.bi(5) = b0, format('coins %s to %s', b0, pg_temp.bi(5)));

  -- ===== Double payout protection =====
  b0 := pg_temp.bi(1);
  allok := public._coin_grant(pg_temp.uid(1), 'coins', 5, 'test_seed', 'test:dupe', null, 'dupe');
  won := public._coin_grant(pg_temp.uid(1), 'coins', 5, 'test_seed', 'test:dupe', null, 'dupe');
  perform pg_temp.chk('Safety: the same payout reference can only pay once', allok and not won and pg_temp.bi(1) = b0 + 5, format('first %s, second %s, balance %s to %s', allok, won, b0, pg_temp.bi(1)));

  -- ===== Final accounting =====
  select count(*) into cnt from public.race_rooms where host in (select id from fk) and status = 'open';
  perform pg_temp.chk('Totals: no test race room left open', cnt = 0, format('%s open', cnt));
  select coalesce(sum(amount),0) into ta from public.coin_ledger where user_id in (select id from fk) and currency = 'coins' and reason in ('race_fee','race_refund','race_prize');
  perform pg_temp.chk('Totals: across all test races, fees in = prizes + refunds out (net 0)', ta = 0, format('net %s', ta));
  select count(*) into cnt from public.coin_ledger where user_id in (select id from fk) and reason not in ('test_seed','race_fee','race_refund','race_prize','race','purchase');
  perform pg_temp.chk('Totals: coins only ever moved for the known reasons', cnt = 0, format('%s unexpected entries', cnt));
  select count(*) into cnt from fk where pg_temp.bi(i) < 0 or pg_temp.gi(i) < 0;
  perform pg_temp.chk('Totals: no player ever ended with negative coins or gems', cnt = 0, format('%s players negative', cnt));
  select coalesce(sum(amount),0), count(*) into real1, real1n from public.coin_ledger where user_id not in (select id from fk);
  perform pg_temp.chk('Totals: real players coin history unchanged during the test', real1 = real0 and real1n = real0n, format('before %s coins / %s rows, after %s / %s', real0, real0n, real1, real1n));

  select string_agg(format('%s | %s | %s', case when ok then 'PASS' else 'FAIL' end, name, detail), E'\n' order by n), count(*), count(*) filter (where ok) into rep, nrun, npass from ck;
  raise exception 'COIN_TEST_REPORT: % checks run, % passed. %', nrun, npass, E'\n' || rep;
end
$do$;
