-- 110: weekly challenges (v212, idea from plans/competitor-bite-audit.md). No new table: rewards are coin_ledger lines (setup/41).
-- Richard's rules (Oct 26, 2026): each challenge done pays coins; finishing ALL of the week's challenges before the week ends pays gems.
--   Week = Monday 00:00 to Sunday 23:59, New York time. Same 3 challenges for everyone, picked by rotation (one from each list below).
--   Only your own photographed catches count (same as catch coins: not deleted, not blurred), caught in the week AND logged before it ended.
--   Trips count when ▶ Start trip ran 30 minutes or more and ended in the week.
--   Pays once per challenge per week (ref chal:<week>:<key>) and once per full week (ref chalweek:<week>, 💎 2).
--   Late claims: opening the app next week still pays last week's finished challenges (progress only counts what was logged in time).
create or replace function public._challenge_items(p_user uuid, p_ws date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  t0 timestamptz := p_ws::timestamp at time zone 'America/New_York';
  t1 timestamptz := (p_ws + 7)::timestamp at time zone 'America/New_York';
  n int := (p_ws - date '2026-01-05') / 7;
  a jsonb := '[["fish3","Catch 3 fish",3,30],["fish5","Catch 5 fish",5,40]]';
  b jsonb := '[["kinds2","Catch 2 different kinds of fish",2,30],["measure","Measure a fish (add its length)",1,20],["kinds3","Catch 3 different kinds of fish",3,40]]';
  c jsonb := '[["spots2","Fish at 2 different spots",2,30],["trip","Finish a trip with Start trip (30 minutes or more)",1,25]]';
  pick jsonb; it jsonb; out jsonb := '[]'; prog int; fish int; kinds int; meas int; spts int; trips int;
begin
  select coalesce(sum(coalesce(x.how_many, 1)), 0), count(distinct nullif(lower(btrim(coalesce(x.species, ''))), '')),
         count(*) filter (where x.length_in is not null), count(distinct x.spot_id)
    into fish, kinds, meas, spts
    from public.catches x
    where x.created_by = p_user and x.deleted_at is null and coalesce(x.review_state, '') <> 'blurred'
      and x.caught_at >= t0 and x.caught_at < t1 and x.created_at < t1
      and exists (select 1 from public.photos p where p.catch_id = x.id);
  select count(*) into trips from public.sessions s
    where s.created_by = p_user and s.deleted_at is null and s.ended_at >= t0 and s.ended_at < t1 and s.ended_at - s.started_at >= interval '30 minutes';
  pick := jsonb_build_array(a -> (n % 2), b -> (n % 3), c -> ((n / 2) % 2));
  for it in select * from jsonb_array_elements(pick) loop
    prog := case it ->> 0 when 'fish3' then fish when 'fish5' then fish when 'kinds2' then kinds when 'kinds3' then kinds
                          when 'measure' then meas when 'spots2' then spts when 'trip' then trips else 0 end;
    out := out || jsonb_build_array(jsonb_build_object('key', it ->> 0, 'title', it ->> 1, 'goal', (it ->> 2)::int,
      'progress', least(prog, (it ->> 2)::int), 'done', prog >= (it ->> 2)::int, 'coins', (it ->> 3)::int));
  end loop;
  return out;
end $$;
revoke all on function public._challenge_items(uuid, date) from public, anon, authenticated;

-- Pay what is finished (this week and last week), then return this week's challenges, the wallet and what was just paid. Safe to call any time.
create or replace function public.claim_challenges() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u uuid := auth.uid();
  ws date := (date_trunc('week', now() at time zone 'America/New_York'))::date;
  w date; items jsonb; it jsonb; wk text; added jsonb := '[]'; cur jsonb;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  foreach w in array array[ws - 7, ws] loop
    items := public._challenge_items(u, w); wk := to_char(w, 'YYYY-MM-DD');
    if w = ws then cur := items; end if;
    for it in select * from jsonb_array_elements(items) loop
      if (it ->> 'done')::boolean and public._coin_grant(u, 'coins', (it ->> 'coins')::int, 'challenge', 'chal:' || wk || ':' || (it ->> 'key'), w, it ->> 'title') then
        added := added || jsonb_build_array(jsonb_build_object('reason', 'challenge', 'coins', (it ->> 'coins')::int, 'note', it ->> 'title'));
      end if;
    end loop;
    if not exists (select 1 from jsonb_array_elements(items) e where not (e ->> 'done')::boolean)
       and public._coin_grant(u, 'gems', 2, 'challenge_week', 'chalweek:' || wk, w, 'Week of ' || wk) then
      added := added || jsonb_build_array(jsonb_build_object('reason', 'challenge_week', 'gems', 2, 'note', 'Week of ' || wk));
    end if;
  end loop;
  return jsonb_build_object(
    'week', to_char(ws, 'YYYY-MM-DD'),
    'ends_at', (ws + 7)::timestamp at time zone 'America/New_York',
    'items', cur, 'week_gems', 2,
    'weeks_done', (select count(*) from public.coin_ledger where user_id = u and currency = 'gems' and reason = 'challenge_week'),
    'wallet', public.my_wallet(),
    'added', added);
end $$;
revoke all on function public.claim_challenges() from public, anon;
grant execute on function public.claim_challenges() to authenticated;
