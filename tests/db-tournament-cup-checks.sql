-- db-tournament-cup-checks.sql : tournament prize + trophy cup checks against the REAL database (sprint #6 step 4, Oct 16 2026).
-- Covers claim_coins() for finished OFFICIAL tournaments: coins + gems + gold / silver / bronze cup for 1st / 2nd / 3rd,
-- "best placing on any board counts", no double pay, nothing for 4th place, page-run tournaments, cancelled tournaments and
-- tournaments that ended before launch, and that a won cup can be placed in a tank (and an un-won one can't).
--
-- SAFE TO RUN: it builds 9 fake players inside ONE step and ends by raising an error ON PURPOSE, so the database cancels the
-- whole step. Nothing is saved: no fake accounts, no tournaments, no coins, no cups.
-- HOW TO RUN: paste the whole file in the Supabase SQL Editor (or run it through the connector) and press Run.
-- A red "error" that starts with   TOURNAMENT_CUP_REPORT: N checks run, N passed.   is the GOOD result.
-- Any line under it that starts with FAIL says what went wrong.
-- RERUN after any change to claim_coins, the tournament standings, the shop items or save_tank_setup.

do $do$
declare
  u uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  i int; sp uuid; st text; wt text; cid uuid; t1 uuid; t2 uuid; t3 uuid; t4 uuid; t5 uuid; hp uuid;
  res jsonb; msg text; rep text := ''; nrun int := 0; npass int := 0; c0 int; g0 int; n0 int;
  inwin timestamptz := now() - interval '2 days';
begin
  create function pg_temp.as_u(p_i int, p_u uuid) returns void language plpgsql as $f$ begin
    perform set_config('request.jwt.claims', json_build_object('sub', p_u, 'email', 'tp-' || p_i || '@example.invalid', 'role', 'authenticated')::text, true); end $f$;
  create function pg_temp.tc(p_u uuid) returns int language sql as $f$ select coalesce(sum(amount), 0)::int from public.coin_ledger where user_id = p_u and reason = 'tournament' and currency = 'coins' $f$;
  create function pg_temp.tg(p_u uuid) returns int language sql as $f$ select coalesce(sum(amount), 0)::int from public.coin_ledger where user_id = p_u and reason = 'tournament' and currency = 'gems' $f$;
  create function pg_temp.cups(p_u uuid) returns text language sql as $f$ select coalesce(string_agg(item_key, ',' order by item_key), '') from public.user_items where user_id = p_u and item_key like 'trophy_%' $f$;

  for i in 1..9 loop
    insert into auth.users (id, aud, role, email) values (u[i], 'authenticated', 'authenticated', 'tp-' || i || '@example.invalid');
    insert into public.members (email, display_name, status) values ('tp-' || i || '@example.invalid', 'TP Test ' || i, 'approved');
    insert into public.profiles (user_id, handle, display_name) values (u[i], 'tptest_' || i, 'TP Test ' || i);
  end loop;
  select spot_type, water_type into st, wt from public.spots order by created_at limit 1;
  insert into public.spots (name, spot_type, water_type, created_by) values ('TP TEST SPOT', coalesce(st, 'pier'), coalesce(wt, 'salt'), u[1]) returning id into sp;

  -- tournament 1: official, one board (longest fish). Players 1-4 caught 40 / 35 / 30 / 25 inches.
  insert into public.tournaments (created_by, kind, title, starts_at, ends_at, boards, require_photo, require_length)
    values (u[1], 'official', 'TP Longest Fish', now() - interval '4 days', now() - interval '1 day', array['length'], true, true) returning id into t1;
  for i in 1..4 loop
    insert into public.tournament_members (tournament_id, user_id, status, joined_at) values (t1, u[i], 'joined', now() - interval '4 days');
    insert into public.catches (spot_id, species, length_in, created_by, visibility, caught_at) values (sp, 'snook', 45 - 5 * i, u[i], 'public', inwin) returning id into cid;
    insert into public.photos (spot_id, catch_id, path, created_by) values (sp, cid, 'tptest/' || cid || '.jpg', u[i]);
  end loop;

  -- tournament 2: official, TWO boards. Player 5 has the longest fish (50"), player 6 caught the most fish (5 at 45"). Both should get gold.
  insert into public.tournaments (created_by, kind, title, starts_at, ends_at, boards, require_photo, require_length)
    values (u[1], 'official', 'TP Two Boards', now() - interval '4 days', now() - interval '1 day', array['length', 'fish'], true, true) returning id into t2;
  insert into public.tournament_members (tournament_id, user_id, status, joined_at) values (t2, u[5], 'joined', now() - interval '4 days'), (t2, u[6], 'joined', now() - interval '4 days');
  insert into public.catches (spot_id, species, length_in, how_many, created_by, visibility, caught_at) values (sp, 'tarpon', 50, 1, u[5], 'public', inwin) returning id into cid;
  insert into public.photos (spot_id, catch_id, path, created_by) values (sp, cid, 'tptest/' || cid || '.jpg', u[5]);
  insert into public.catches (spot_id, species, length_in, how_many, created_by, visibility, caught_at) values (sp, 'redfish', 45, 5, u[6], 'public', inwin) returning id into cid;
  insert into public.photos (spot_id, catch_id, path, created_by) values (sp, cid, 'tptest/' || cid || '.jpg', u[6]);

  -- tournament 3: run by a club page (pays nothing). Player 7 is the only entrant.
  insert into public.host_pages (owner, kind, name, status) values (u[1], 'club', 'TP Club Page', 'approved') returning id into hp;
  insert into public.tournaments (created_by, kind, title, starts_at, ends_at, boards, require_photo, require_length, host_page_id, host_page_name)
    values (u[1], 'official', 'TP Page Contest', now() - interval '4 days', now() - interval '1 day', array['length'], true, true, hp, 'TP Club Page') returning id into t3;
  insert into public.tournament_members (tournament_id, user_id, status, joined_at) values (t3, u[7], 'joined', now() - interval '4 days');
  insert into public.catches (spot_id, species, length_in, created_by, visibility, caught_at) values (sp, 'snook', 33, u[7], 'public', inwin) returning id into cid;
  insert into public.photos (spot_id, catch_id, path, created_by) values (sp, cid, 'tptest/' || cid || '.jpg', u[7]);

  -- tournament 4: cancelled. Player 8 is the only entrant.
  insert into public.tournaments (created_by, kind, title, starts_at, ends_at, boards, require_photo, require_length, cancelled_at)
    values (u[1], 'official', 'TP Cancelled', now() - interval '4 days', now() - interval '1 day', array['length'], true, true, now() - interval '3 days') returning id into t4;
  insert into public.tournament_members (tournament_id, user_id, status, joined_at) values (t4, u[8], 'joined', now() - interval '4 days');
  insert into public.catches (spot_id, species, length_in, created_by, visibility, caught_at) values (sp, 'snook', 36, u[8], 'public', inwin) returning id into cid;
  insert into public.photos (spot_id, catch_id, path, created_by) values (sp, cid, 'tptest/' || cid || '.jpg', u[8]);

  -- tournament 5: ended BEFORE launch (Oct 11 2026 18:00 UTC). Player 9 is the only entrant.
  insert into public.tournaments (created_by, kind, title, starts_at, ends_at, boards, require_photo, require_length)
    values (u[1], 'official', 'TP Before Launch', timestamptz '2026-10-08 12:00+00', timestamptz '2026-10-10 12:00+00', array['length'], true, true) returning id into t5;
  insert into public.tournament_members (tournament_id, user_id, status, joined_at) values (t5, u[9], 'joined', timestamptz '2026-10-08 12:00+00');
  insert into public.catches (spot_id, species, length_in, created_by, visibility, caught_at) values (sp, 'snook', 38, u[9], 'public', timestamptz '2026-10-09 12:00+00') returning id into cid;
  insert into public.photos (spot_id, catch_id, path, created_by) values (sp, cid, 'tptest/' || cid || '.jpg', u[9]);

  -- ===== first place =====
  perform pg_temp.as_u(1, u[1]);
  res := public.claim_coins();
  nrun := nrun + 1; if pg_temp.tc(u[1]) = 200 and pg_temp.tg(u[1]) = 3 then npass := npass + 1; else rep := rep || E'\nFAIL 1st place gets 200 coins + 3 gems: ' || pg_temp.tc(u[1]) || ' / ' || pg_temp.tg(u[1]); end if;
  nrun := nrun + 1; if pg_temp.cups(u[1]) = 'trophy_gold' then npass := npass + 1; else rep := rep || E'\nFAIL 1st place gets the gold cup: ' || pg_temp.cups(u[1]); end if;
  nrun := nrun + 1; if exists (select 1 from public.user_items where user_id = u[1] and item_key = 'trophy_gold' and how = 'won') then npass := npass + 1; else rep := rep || E'\nFAIL the cup is marked as won, not bought'; end if;
  nrun := nrun + 1; if exists (select 1 from jsonb_array_elements(res -> 'added') a where a ->> 'reason' = 'tournament' and (a ->> 'coins')::int = 200 and (a ->> 'gems')::int = 3 and a ->> 'note' = 'TP Longest Fish') then npass := npass + 1; else rep := rep || E'\nFAIL the claim answer lists the tournament win: ' || (res -> 'added')::text; end if;
  -- no double pay
  select coalesce(sum(amount), 0) into c0 from public.coin_ledger where user_id = u[1] and currency = 'coins';
  res := public.claim_coins();
  nrun := nrun + 1; if pg_temp.tc(u[1]) = 200 and pg_temp.tg(u[1]) = 3 and pg_temp.cups(u[1]) = 'trophy_gold' and (select count(*) from public.user_items where user_id = u[1] and item_key like 'trophy_%') = 1
    and not exists (select 1 from jsonb_array_elements(res -> 'added') a where a ->> 'reason' = 'tournament') then npass := npass + 1; else rep := rep || E'\nFAIL a second claim pays nothing more and adds no second cup'; end if;
  nrun := nrun + 1; if (select coalesce(sum(amount), 0) from public.coin_ledger where user_id = u[1] and currency = 'coins') = c0 then npass := npass + 1; else rep := rep || E'\nFAIL coin balance unchanged by the second claim'; end if;

  -- ===== second, third, fourth place =====
  perform pg_temp.as_u(2, u[2]); perform public.claim_coins();
  nrun := nrun + 1; if pg_temp.tc(u[2]) = 120 and pg_temp.tg(u[2]) = 2 and pg_temp.cups(u[2]) = 'trophy_silver' then npass := npass + 1; else rep := rep || E'\nFAIL 2nd place: 120 coins, 2 gems, silver cup: ' || pg_temp.tc(u[2]) || '/' || pg_temp.tg(u[2]) || '/' || pg_temp.cups(u[2]); end if;
  perform pg_temp.as_u(3, u[3]); perform public.claim_coins();
  nrun := nrun + 1; if pg_temp.tc(u[3]) = 80 and pg_temp.tg(u[3]) = 1 and pg_temp.cups(u[3]) = 'trophy_bronze' then npass := npass + 1; else rep := rep || E'\nFAIL 3rd place: 80 coins, 1 gem, bronze cup: ' || pg_temp.tc(u[3]) || '/' || pg_temp.tg(u[3]) || '/' || pg_temp.cups(u[3]); end if;
  perform pg_temp.as_u(4, u[4]); perform public.claim_coins();
  nrun := nrun + 1; if pg_temp.tc(u[4]) = 0 and pg_temp.tg(u[4]) = 0 and pg_temp.cups(u[4]) = '' then npass := npass + 1; else rep := rep || E'\nFAIL 4th place gets nothing: ' || pg_temp.tc(u[4]) || '/' || pg_temp.tg(u[4]) || '/' || pg_temp.cups(u[4]); end if;

  -- ===== best placing on any board counts =====
  perform pg_temp.as_u(5, u[5]); perform public.claim_coins();
  perform pg_temp.as_u(6, u[6]); perform public.claim_coins();
  nrun := nrun + 1; if pg_temp.tc(u[5]) = 200 and pg_temp.cups(u[5]) = 'trophy_gold' then npass := npass + 1; else rep := rep || E'\nFAIL longest-fish winner gets gold: ' || pg_temp.tc(u[5]) || '/' || pg_temp.cups(u[5]); end if;
  nrun := nrun + 1; if pg_temp.tc(u[6]) = 200 and pg_temp.tg(u[6]) = 3 and pg_temp.cups(u[6]) = 'trophy_gold' then npass := npass + 1; else rep := rep || E'\nFAIL most-fish winner (2nd on length) gets gold, paid once: ' || pg_temp.tc(u[6]) || '/' || pg_temp.tg(u[6]) || '/' || pg_temp.cups(u[6]); end if;

  -- ===== tournaments that pay nothing =====
  perform pg_temp.as_u(7, u[7]); perform public.claim_coins();
  nrun := nrun + 1; if pg_temp.tc(u[7]) = 0 and pg_temp.tg(u[7]) = 0 and pg_temp.cups(u[7]) = '' then npass := npass + 1; else rep := rep || E'\nFAIL a club-page tournament pays no coins, gems or cup: ' || pg_temp.tc(u[7]) || '/' || pg_temp.cups(u[7]); end if;
  perform pg_temp.as_u(8, u[8]); perform public.claim_coins();
  nrun := nrun + 1; if pg_temp.tc(u[8]) = 0 and pg_temp.cups(u[8]) = '' then npass := npass + 1; else rep := rep || E'\nFAIL a cancelled tournament pays nothing'; end if;
  perform pg_temp.as_u(9, u[9]); perform public.claim_coins();
  nrun := nrun + 1; if pg_temp.tc(u[9]) = 0 and pg_temp.cups(u[9]) = '' then npass := npass + 1; else rep := rep || E'\nFAIL a tournament that ended before launch pays nothing'; end if;

  -- ===== cups can be placed in a tank, but only if won =====
  perform pg_temp.as_u(1, u[1]);
  begin perform public.save_tank_setup('salt', null, '[{"key":"trophy_gold","x":50,"layer":"front"}]'::jsonb); msg := null; exception when others then msg := sqlerrm; end;
  nrun := nrun + 1; if msg is null and (select placed::text from public.tank_setups where user_id = u[1] and tank = 'salt') like '%trophy_gold%' then npass := npass + 1; else rep := rep || E'\nFAIL the winner can place the gold cup: ' || coalesce(msg, 'no error but not saved'); end if;
  perform pg_temp.as_u(2, u[2]);
  begin perform public.save_tank_setup('salt', null, '[{"key":"trophy_gold","x":50,"layer":"front"}]'::jsonb); msg := null; exception when others then msg := sqlerrm; end;
  nrun := nrun + 1; if msg like '%do not own%' then npass := npass + 1; else rep := rep || E'\nFAIL a cup you did not win can not be placed: ' || coalesce(msg, 'no error'); end if;
  perform pg_temp.as_u(1, u[1]);
  begin perform public.buy_item('trophy_gold'); msg := null; exception when others then msg := sqlerrm; end;
  nrun := nrun + 1; if msg is not null then npass := npass + 1; else rep := rep || E'\nFAIL cups can not be bought'; end if;
  perform pg_temp.as_u(4, u[4]);
  begin perform public.buy_item('trophy_silver'); msg := null; exception when others then msg := sqlerrm; end;
  nrun := nrun + 1; if msg is not null and pg_temp.cups(u[4]) = '' then npass := npass + 1; else rep := rep || E'\nFAIL cups can not be bought (player 4)'; end if;

  raise exception 'TOURNAMENT_CUP_REPORT: % checks run, % passed.%', nrun, npass, rep;
end
$do$;
