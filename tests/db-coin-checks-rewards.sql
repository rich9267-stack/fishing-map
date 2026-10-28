-- db-coin-checks-rewards.sql : catch-reward + collection checks against the REAL database (Oct 28 2026).
-- Covers claim_coins() for catches (2 coins per photographed catch, +1 measured, 40 first-of-a-species, 25 personal best,
-- 50-a-day catch cap, 3-bests-a-day cap, no pay without a photo / blurred / deleted / older than 7 days / paid twice)
-- and claim_collection() (needs 5+ species, each with a photographed catch of your own, 150 coins + 2 gems once per group).
-- Tournament prizes are checked in db-tournament-cup-checks.sql; races, fees, shop and tanks in db-coin-checks.sql.
--
-- SAFE TO RUN: it builds 5 fake players inside ONE step and ends by raising an error ON PURPOSE, so the database cancels the
-- whole step. Nothing is saved: no fake accounts, no catches, no coins. The last check proves real balances never change.
-- HOW TO RUN: paste the whole file in the Supabase SQL Editor (or run it through the connector) and press Run.
-- A red "error" that starts with   REWARD_TEST_REPORT: N checks run, N passed.   is the GOOD result.
-- Any line under it that starts with FAIL says what went wrong.
-- RERUN after any change to claim_coins, claim_collection, _coin_grant or the reward numbers. If a reward changes on purpose,
-- update the expected numbers in the matching check. Last run Oct 28 2026: 33 of 33 passed, real coin totals unchanged (622 / 68 rows). Not part of tests/run-all.sh (that suite does not touch the database).

do $do$
declare
  ix int; sp uuid; st text; wt text; cid uuid; k int;
  base timestamptz := (((now() at time zone 'America/New_York')::date - 1)::timestamp + interval '12 hours') at time zone 'America/New_York';
  b0 int; g0 int; n int; res jsonb; msg text; ok1 boolean;
  real0 bigint; real0n bigint; real1 bigint; real1n bigint;
  rep text; nrun int; npass int;
begin
  select coalesce(sum(amount),0), count(*) into real0, real0n from public.coin_ledger;

  create temp table ck(seq serial, name text, ok boolean, detail text);
  create temp table fk(i int primary key, id uuid, email text);

  create function pg_temp.chk(p_name text, p_ok boolean, p_detail text) returns void language plpgsql as $f$ begin insert into ck(name, ok, detail) values (p_name, coalesce(p_ok,false), p_detail); end $f$;
  create function pg_temp.as_user(p_u uuid, p_email text) returns void language plpgsql as $f$ begin perform set_config('request.jwt.claims', json_build_object('sub', p_u, 'email', p_email, 'role', 'authenticated')::text, true); perform set_config('request.jwt.claim.sub', p_u::text, true); perform set_config('request.jwt.claim.email', p_email, true); end $f$;
  create function pg_temp.as_i(p_i int) returns void language plpgsql as $f$ declare v_id uuid; v_em text; begin select id, email into v_id, v_em from fk where i = p_i; perform pg_temp.as_user(v_id, v_em); end $f$;
  create function pg_temp.uid(p_i int) returns uuid language sql as $f$ select id from fk where i = p_i $f$;
  create function pg_temp.bal(p_i int) returns int language sql as $f$ select coalesce(sum(amount),0)::int from public.coin_ledger where user_id = (select id from fk where i = p_i) and currency = 'coins' $f$;
  create function pg_temp.gem(p_i int) returns int language sql as $f$ select coalesce(sum(amount),0)::int from public.coin_ledger where user_id = (select id from fk where i = p_i) and currency = 'gems' $f$;
  create function pg_temp.sumr(p_i int, p_reason text) returns int language sql as $f$ select coalesce(sum(amount),0)::int from public.coin_ledger where user_id = (select id from fk where i = p_i) and currency = 'coins' and reason = p_reason $f$;
  create function pg_temp.cntr(p_i int, p_reason text) returns int language sql as $f$ select count(*)::int from public.coin_ledger where user_id = (select id from fk where i = p_i) and currency = 'coins' and reason = p_reason $f$;
  create function pg_temp.try(p text) returns text language plpgsql as $f$ begin execute p; return null; exception when others then return sqlerrm; end $f$;
  -- one catch by fake player p_i: species, weight, length, when, photo?, extra state
  create function pg_temp.mk(p_i int, p_sp text, p_w numeric, p_len numeric, p_at timestamptz, p_photo boolean, p_state text, p_del boolean) returns uuid language plpgsql as $f$
  declare v_c uuid; v_spot uuid := (select id from public.spots where name = 'REWARD TEST SPOT'); begin
    insert into public.catches (spot_id, species, weight_lb, length_in, caught_at, created_by, visibility, review_state, deleted_at)
      values (v_spot, p_sp, p_w, p_len, p_at, pg_temp.uid(p_i), 'friends', p_state, case when p_del then now() end) returning id into v_c;
    if p_photo then insert into public.photos (spot_id, catch_id, path, created_by) values (v_spot, v_c, 'rewardtest/' || v_c || '.jpg', pg_temp.uid(p_i)); end if;
    return v_c;
  end $f$;
  create function pg_temp.claim(p_i int) returns jsonb language plpgsql as $f$ begin perform pg_temp.as_i(p_i); return public.claim_coins(); end $f$;

  -- ===== setup: 5 fake approved members and one spot =====
  for ix in 1..5 loop insert into fk(i, id, email) values (ix, gen_random_uuid(), 'reward-test-' || ix || '@example.invalid'); end loop;
  insert into auth.users (id, aud, role, email) select id, 'authenticated', 'authenticated', email from fk;
  insert into public.members (email, display_name, status) select email, 'Reward Test ' || i, 'approved' from fk;
  insert into public.profiles (user_id, handle, display_name) select id, 'rewardtest_' || i, 'Reward Test ' || i from fk;
  select spot_type, water_type into st, wt from public.spots order by created_at limit 1;
  insert into public.spots (name, spot_type, water_type, created_by) values ('REWARD TEST SPOT', coalesce(st,'pier'), coalesce(wt,'salt'), pg_temp.uid(1));
  perform pg_temp.chk('Setup: 5 fake members and a test spot', (select count(*) from fk) = 5 and exists (select 1 from public.spots where name = 'REWARD TEST SPOT'), 'ok');

  -- ===== Player 1: the basic rewards =====
  perform pg_temp.mk(1, 'snook', null, null, base, true, null, false);
  res := pg_temp.claim(1);
  perform pg_temp.chk('Catch: a photographed catch pays 2 coins and the first of a species pays 40 (42 together)', pg_temp.bal(1) = 42 and pg_temp.sumr(1,'catch') = 2 and pg_temp.sumr(1,'species') = 40, format('balance %s (catch %s, species %s)', pg_temp.bal(1), pg_temp.sumr(1,'catch'), pg_temp.sumr(1,'species')));
  perform pg_temp.chk('Catch: the answer lists what was added', jsonb_array_length(res->'added') = 2, format('%s entries', jsonb_array_length(res->'added')));
  res := pg_temp.claim(1);
  perform pg_temp.chk('Catch: claiming again pays nothing more', pg_temp.bal(1) = 42 and jsonb_array_length(res->'added') = 0, format('balance %s', pg_temp.bal(1)));
  b0 := pg_temp.bal(1);
  perform pg_temp.mk(1, 'snook', 5, 28, base + interval '1 hour', true, null, false);
  perform pg_temp.claim(1);
  perform pg_temp.chk('Catch: a measured, heavier catch of the same species pays 2 + 1 (measured) + 25 (new best), no second species bonus', pg_temp.bal(1) - b0 = 28 and pg_temp.cntr(1,'species') = 1 and pg_temp.sumr(1,'best') = 25 and pg_temp.sumr(1,'measured') = 1, format('paid %s (expected 28)', pg_temp.bal(1) - b0));
  b0 := pg_temp.bal(1);
  perform pg_temp.mk(1, 'snook', 4, null, base + interval '2 hours', true, null, false);
  perform pg_temp.claim(1);
  perform pg_temp.chk('Catch: a lighter catch of the same species pays only the 2 coins', pg_temp.bal(1) - b0 = 2, format('paid %s (expected 2)', pg_temp.bal(1) - b0));
  b0 := pg_temp.bal(1);
  perform pg_temp.mk(1, ' SNOOK ', 3, null, base + interval '3 hours', true, null, false);
  perform pg_temp.claim(1);
  perform pg_temp.chk('Catch: capital letters and spaces do not make a new species (no second 40)', pg_temp.bal(1) - b0 = 2 and pg_temp.cntr(1,'species') = 1, format('paid %s (expected 2)', pg_temp.bal(1) - b0));
  b0 := pg_temp.bal(1);
  cid := pg_temp.mk(1, 'redfish', null, null, base + interval '4 hours', false, null, false);
  perform pg_temp.claim(1);
  perform pg_temp.chk('Catch: no photo, no coins', pg_temp.bal(1) = b0, format('balance %s to %s', b0, pg_temp.bal(1)));
  perform pg_temp.as_i(1);
  insert into public.photos (spot_id, catch_id, path, created_by) values ((select id from public.spots where name = 'REWARD TEST SPOT'), cid, 'rewardtest/' || cid || '.jpg', pg_temp.uid(1));
  perform pg_temp.claim(1);
  perform pg_temp.chk('Catch: adding the photo later pays 2 + 40 on the next claim', pg_temp.bal(1) - b0 = 42, format('paid %s (expected 42)', pg_temp.bal(1) - b0));
  b0 := pg_temp.bal(1);
  perform pg_temp.mk(1, 'tarpon', null, null, base + interval '5 hours', true, 'blurred', false);
  perform pg_temp.mk(1, 'permit', null, null, base + interval '6 hours', true, null, true);
  perform pg_temp.mk(1, 'cobia', null, null, now() - interval '10 days', true, null, false);
  perform pg_temp.claim(1);
  perform pg_temp.chk('Catch: blurred, deleted and older-than-7-days catches pay nothing', pg_temp.bal(1) = b0, format('balance %s to %s', b0, pg_temp.bal(1)));
  perform pg_temp.as_i(2);
  perform pg_temp.claim(2);
  perform pg_temp.chk('Catch: another player claiming never gets your coins', pg_temp.bal(2) = 0, format('balance %s', pg_temp.bal(2)));

  -- ===== Player 2: 50 catch coins a day =====
  for k in 1..30 loop perform pg_temp.mk(2, 'snook', null, null, base + k * interval '1 minute', true, null, false); end loop;
  res := pg_temp.claim(2);
  perform pg_temp.chk('Cap: 30 photographed catches in one day pay at most 50 catch coins', pg_temp.sumr(2,'catch') = 50, format('catch coins %s (expected 50)', pg_temp.sumr(2,'catch')));
  perform pg_temp.chk('Cap: the species bonus is not part of the 50-a-day limit', pg_temp.sumr(2,'species') = 40 and pg_temp.bal(2) = 90, format('species %s, balance %s (expected 40 / 90)', pg_temp.sumr(2,'species'), pg_temp.bal(2)));
  perform pg_temp.mk(2, 'snook', null, 30, base + interval '2 hours', true, null, false);
  perform pg_temp.claim(2);
  perform pg_temp.chk('Cap: once the limit is reached a measured catch pays no catch or measured coins (its 25 is the personal-best bonus, a longer fish than the unmeasured ones)', pg_temp.sumr(2,'catch') = 50 and pg_temp.sumr(2,'measured') = 0 and pg_temp.sumr(2,'best') = 25, format('catch %s, measured %s, best %s', pg_temp.sumr(2,'catch'), pg_temp.sumr(2,'measured'), pg_temp.sumr(2,'best')));
  perform pg_temp.mk(2, 'snook', null, null, base + interval '1 day', true, null, false);
  perform pg_temp.claim(2);
  res := pg_temp.claim(2);
  perform pg_temp.chk('Cap: a catch on the next day pays again (2 more coins)', pg_temp.sumr(2,'catch') = 52, format('catch coins %s (expected 52)', pg_temp.sumr(2,'catch')));
  perform pg_temp.chk('Cap: the wallet counts only today''s catch coins (2 of 50), not yesterday''s', (res->>'today')::int = 2 and (res->>'cap')::int = 50, format('today %s cap %s', res->>'today', res->>'cap'));

  -- ===== Player 3: 3 personal-best bonuses a day =====
  perform pg_temp.mk(3, 'redfish', 1, null, base, true, null, false);
  for k in 2..5 loop perform pg_temp.mk(3, 'redfish', k, null, base + k * interval '1 minute', true, null, false); end loop;
  perform pg_temp.claim(3);
  perform pg_temp.chk('Best: only 3 personal bests a day are paid (4 happened)', pg_temp.cntr(3,'best') = 3 and pg_temp.sumr(3,'best') = 75, format('%s bests, %s coins', pg_temp.cntr(3,'best'), pg_temp.sumr(3,'best')));
  perform pg_temp.chk('Best: the other rewards still pay (5 catches = 10, first redfish = 40)', pg_temp.sumr(3,'catch') = 10 and pg_temp.sumr(3,'species') = 40 and pg_temp.bal(3) = 125, format('balance %s (expected 125)', pg_temp.bal(3)));

  -- ===== Player 4: collections =====
  perform pg_temp.mk(4, 'snook', null, null, base, true, null, false);
  perform pg_temp.mk(4, 'redfish', null, null, base + interval '1 minute', true, null, false);
  perform pg_temp.mk(4, 'tarpon', null, null, base + interval '2 minutes', true, null, false);
  perform pg_temp.mk(4, 'permit', null, null, base + interval '3 minutes', true, null, false);
  perform pg_temp.mk(4, 'cobia', null, null, base + interval '4 minutes', true, null, false);
  perform pg_temp.mk(4, 'bonefish', null, null, base + interval '5 minutes', false, null, false);
  perform pg_temp.as_i(4);
  msg := pg_temp.try($q$select public.claim_collection('inshore', '[["snook"],["redfish"],["tarpon"],["permit"]]'::jsonb)$q$);
  perform pg_temp.chk('Collection: fewer than 5 species is refused', msg like '%at least 5%' and pg_temp.cntr(4,'collection') = 0, format('message: %s', msg));
  msg := pg_temp.try($q$select public.claim_collection('no_such_group', '[["snook"],["redfish"],["tarpon"],["permit"],["cobia"]]'::jsonb)$q$);
  perform pg_temp.chk('Collection: an unknown group name is refused', msg like '%unknown collection%', format('message: %s', msg));
  msg := pg_temp.try($q$select public.claim_collection('inshore', '[["snook"],["redfish"],["tarpon"],["permit"],["bonefish"]]'::jsonb)$q$);
  perform pg_temp.chk('Collection: a species with no photographed catch is refused and pays nothing', msg like '%photographed catch%' and pg_temp.cntr(4,'collection') = 0, format('message: %s', msg));
  msg := pg_temp.try($q$select public.claim_collection('inshore', '["snook"]'::jsonb)$q$);
  perform pg_temp.chk('Collection: a badly shaped list is refused', msg is not null, format('message: %s', coalesce(msg,'(no error)')));
  b0 := pg_temp.bal(4); g0 := pg_temp.gem(4);
  res := public.claim_collection('inshore', '[["snook"],["redfish"],["tarpon"],["permit"],["cobia"]]'::jsonb);
  perform pg_temp.chk('Collection: 5 photographed species pay 150 coins and 2 gems', pg_temp.bal(4) - b0 = 150 and pg_temp.gem(4) - g0 = 2 and jsonb_array_length(res->'added') = 1, format('coins +%s, gems +%s', pg_temp.bal(4) - b0, pg_temp.gem(4) - g0));
  perform pg_temp.chk('Collection: the wallet lists the finished group', (res->'collections') ? 'inshore', format('collections %s', res->'collections'));
  b0 := pg_temp.bal(4); g0 := pg_temp.gem(4);
  res := public.claim_collection('inshore', '[["snook"],["redfish"],["tarpon"],["permit"],["cobia"]]'::jsonb);
  perform pg_temp.chk('Collection: claiming the same group again pays nothing', pg_temp.bal(4) = b0 and pg_temp.gem(4) = g0 and jsonb_array_length(res->'added') = 0, format('coins %s to %s, gems %s to %s', b0, pg_temp.bal(4), g0, pg_temp.gem(4)));
  b0 := pg_temp.bal(4);
  res := public.claim_collection('bait', '[["snook"],["redfish"],["tarpon"],["permit"],["cobia"]]'::jsonb);
  perform pg_temp.chk('Collection: a different group pays its own 150 + 2 (each group once)', pg_temp.bal(4) - b0 = 150 and (res->'collections') ? 'bait', format('coins +%s', pg_temp.bal(4) - b0));
  b0 := pg_temp.bal(4);
  res := public.claim_collection('baitother', '[["no such name","SNOOK"],["x","Redfish"],["tarpon"],["permit"],["cobia"]]'::jsonb);
  perform pg_temp.chk('Collection: any one name in a species'' list of everyday names is enough (and capital letters do not matter)', pg_temp.bal(4) - b0 = 150, format('coins +%s', pg_temp.bal(4) - b0));
  perform pg_temp.as_i(5);
  msg := pg_temp.try($q$select public.claim_collection('beach', '[["snook"],["redfish"],["tarpon"],["permit"],["cobia"]]'::jsonb)$q$);
  perform pg_temp.chk('Collection: another player''s catches cannot finish your collection', msg like '%photographed catch%' and pg_temp.cntr(5,'collection') = 0, format('message: %s', msg));

  -- ===== People who are not members =====
  perform pg_temp.as_user(gen_random_uuid(), 'reward-test-stranger@example.invalid');
  msg := pg_temp.try('select public.claim_coins()');
  perform pg_temp.chk('Safety: someone who is not an approved member cannot claim coins', msg like '%sign in first%', format('message: %s', msg));
  msg := pg_temp.try($q$select public.claim_collection('inshore', '[["snook"],["redfish"],["tarpon"],["permit"],["cobia"]]'::jsonb)$q$);
  perform pg_temp.chk('Safety: or a collection', msg like '%sign in first%', format('message: %s', msg));

  -- ===== Final accounting =====
  select count(*) into n from public.coin_ledger where user_id in (select id from fk) and reason not in ('catch','measured','species','best','collection');
  perform pg_temp.chk('Totals: coins only ever moved for the known reward reasons', n = 0, format('%s unexpected entries', n));
  select count(*) into n from (select user_id, ref, currency from public.coin_ledger where user_id in (select id from fk) group by 1,2,3 having count(*) > 1) d;
  perform pg_temp.chk('Totals: no reward was ever paid twice (one ledger line per reference)', n = 0, format('%s duplicates', n));
  select coalesce(sum(amount),0), count(*) into real1, real1n from public.coin_ledger where user_id not in (select id from fk);
  perform pg_temp.chk('Totals: real players coin history unchanged during the test', real1 = real0 and real1n = real0n, format('before %s coins / %s rows, after %s / %s', real0, real0n, real1, real1n));

  select string_agg(format('%s | %s | %s', case when ok then 'PASS' else 'FAIL' end, name, detail), E'\n' order by seq), count(*), count(*) filter (where ok) into rep, nrun, npass from ck;
  raise exception 'REWARD_TEST_REPORT: % checks run, % passed. %', nrun, npass, E'\n' || rep;
end
$do$;
