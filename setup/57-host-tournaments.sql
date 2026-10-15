-- 57: 🏷 Host pages, step 2 — run tournaments AS a page (Oct 14, 2026).
-- A page owner (approved page) creates tournaments / repeating tournaments "run by <page>". They stay kind = 'official'
-- (everyone can see and join them), but:
--   * they are marked with host_page_id (+ the page name as it was, so the label survives a removed page);
--   * they pay NO coins / gems / trophy cups and do not appear in the Hall of Fame (those stay for admin tournaments only —
--     otherwise a club could run a tournament with a friend to farm prizes);
--   * the owner is NOT auto-entered (an organiser doesn't compete unless they tap Join);
--   * no "everyone is told" alert when a repeating round opens (step 3 will tell followers only);
--   * limits per page: 5 open tournaments at once, 3 repeating series at once;
--   * when a page is closed its repeating series stop opening new rounds (a running tournament finishes).
-- Cancelling / stopping a repeat: the existing cancel_tournament / stop_series already allow the creator (= the page owner).
-- Written with create / alter / grant only, so the Supabase connector can apply it.

alter table public.tournaments add column if not exists host_page_id uuid;
alter table public.tournaments add column if not exists host_page_name text check (host_page_name is null or char_length(host_page_name) <= 40);
alter table public.tournament_series add column if not exists host_page_id uuid;
alter table public.tournament_series add column if not exists host_page_name text check (host_page_name is null or char_length(host_page_name) <= 40);
-- (no foreign key on purpose: if a page or its owner disappears, the tournament must stay marked as hosted)
create index if not exists tournaments_host_page_idx on public.tournaments (host_page_id) where host_page_id is not null;
create index if not exists tournament_series_host_page_idx on public.tournament_series (host_page_id) where host_page_id is not null;

-- One tournament as a page.
create or replace function public.create_host_tournament(p_page uuid, p_title text, p_desc text, p_starts timestamptz, p_ends timestamptz,
  p_boards text[], p_species text, p_lat double precision, p_lng double precision, p_radius double precision, p_geo_label text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); pn text; tid uuid;
begin
  if me is null or not is_member() then raise exception 'not a member'; end if;
  select name into pn from host_pages where id = p_page and owner = me and status = 'approved';
  if pn is null then raise exception 'That isn''t one of your approved pages.'; end if;
  if p_starts < now() - interval '1 hour' then raise exception 'start time is too far in the past'; end if;
  if (select count(*) from tournaments where host_page_id = p_page and cancelled_at is null and ends_at > now()) >= 5 then
    raise exception 'This page already has 5 tournaments open. Let one finish or cancel one first.'; end if;
  insert into tournaments(created_by, kind, title, description, starts_at, ends_at, boards, species, require_photo, require_length,
                          geo_lat, geo_lng, geo_radius_mi, geo_label, host_page_id, host_page_name)
  values (me, 'official', btrim(p_title), nullif(p_desc, ''), p_starts, p_ends, p_boards, nullif(p_species, ''), true, true,
          p_lat, p_lng, p_radius, nullif(p_geo_label, ''), p_page, pn)
  returning id into tid;
  return tid;
end $$;

-- A repeating tournament as a page (weekly / monthly / yearly, same as admin series).
create or replace function public.create_host_tournament_series(p_page uuid, p_title text, p_desc text, p_boards text[], p_species text,
  p_lat double precision, p_lng double precision, p_radius double precision, p_geo_label text, p_tz text, p_cadence text, p_months smallint[])
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); pn text; sid uuid; tid uuid; z text := coalesce(nullif(p_tz, ''), 'America/New_York'); mo smallint[];
begin
  if me is null or not is_member() then raise exception 'not a member'; end if;
  select name into pn from host_pages where id = p_page and owner = me and status = 'approved';
  if pn is null then raise exception 'That isn''t one of your approved pages.'; end if;
  if p_cadence not in ('weekly', 'monthly', 'yearly') then raise exception 'pick weekly, monthly or yearly'; end if;
  mo := coalesce(p_months, '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[]);
  if p_cadence = 'monthly' and (cardinality(mo) = 0 or exists (select 1 from unnest(mo) x where x < 1 or x > 12)) then raise exception 'pick at least one month'; end if;
  if (select count(*) from tournament_series where host_page_id = p_page and active) >= 3 then
    raise exception 'This page already has 3 repeating tournaments running — stop one first.'; end if;
  begin perform now() at time zone z; exception when others then z := 'America/New_York'; end;
  insert into tournament_series(created_by, kind, cadence, title, description, boards, species, require_photo, require_length,
                                geo_lat, geo_lng, geo_radius_mi, geo_label, tz, months, invitees, host_page_id, host_page_name)
  values (me, 'official', p_cadence, btrim(p_title), nullif(p_desc, ''), p_boards, nullif(p_species, ''), true, true,
          p_lat, p_lng, p_radius, nullif(p_geo_label, ''), z, (select array_agg(distinct x order by x) from unnest(mo) x), '{}', p_page, pn)
  returning id into sid;
  perform series_roll();
  select id into tid from tournaments where series_id = sid order by starts_at desc limit 1;
  return tid; -- null when this month isn't one of the chosen months
end $$;

-- series_roll: same as setup/31, plus host pages (carry the page marker onto each round; don't auto-enter the organiser;
-- no "tell everyone" alert for page-run series; skip a series whose page is no longer approved).
create or replace function public.series_roll() returns integer language plpgsql security definer set search_path = public as $$
declare s tournament_series%rowtype; p date; pstart timestamptz; pend timestamptz; tid uuid; prev uuid; n integer := 0; r record; was boolean;
        suffix text; ttl text; inv uuid;
begin
  for s in select * from tournament_series where active loop
    begin
      if s.host_page_id is not null and not exists (select 1 from host_pages h where h.id = s.host_page_id and h.status = 'approved') then continue; end if;
      p := case s.cadence when 'weekly' then date_trunc('week', now() at time zone s.tz)::date
                          when 'yearly' then date_trunc('year', now() at time zone s.tz)::date
                          else date_trunc('month', now() at time zone s.tz)::date end;
      if s.last_month is not null and s.last_month >= p then continue; end if;
      if s.cadence = 'monthly' and not (extract(month from p)::smallint = any (s.months)) then
        update tournament_series set last_month = p where id = s.id;
        continue;
      end if;
      pstart := p::timestamp at time zone s.tz;
      pend := (p + case s.cadence when 'weekly' then interval '7 days' when 'yearly' then interval '1 year' else interval '1 month' end)::timestamp at time zone s.tz;
      suffix := case s.cadence when 'weekly' then 'Week of ' || to_char(p, 'FMMon FMDD') when 'yearly' then to_char(p, 'YYYY') else to_char(p, 'FMMonth YYYY') end;
      ttl := left(s.title, 57 - length(suffix)) || ' — ' || suffix;
      select id into prev from tournaments where series_id = s.id order by starts_at desc limit 1;
      insert into tournaments(created_by, kind, title, description, starts_at, ends_at, boards, species, require_photo, require_length,
                              geo_lat, geo_lng, geo_radius_mi, geo_label, series_id, series_month, host_page_id, host_page_name)
      values (s.created_by, s.kind, ttl, s.description, greatest(pstart, now()), pend, s.boards, s.species,
              s.kind = 'official' or s.require_photo, s.kind = 'official' or s.require_length,
              s.geo_lat, s.geo_lng, s.geo_radius_mi, s.geo_label, s.id, p, s.host_page_id, s.host_page_name)
      on conflict do nothing returning id into tid;
      if tid is null then update tournament_series set last_month = p where id = s.id; continue; end if;
      if s.host_page_id is null then
        insert into tournament_members(tournament_id, user_id, status, invited_by, joined_at)
        values (tid, s.created_by, 'joined', s.created_by, now()) on conflict do nothing;
      end if;
      if s.host_page_id is not null then
        null; -- page-run: nobody is told yet (step 3: followers only)
      elsif s.kind = 'official' then
        for r in select u.id uid from members mm join auth.users u on lower(u.email) = lower(mm.email) where mm.status = 'approved' loop
          if r.uid = s.created_by then continue; end if;
          was := prev is not null and exists (select 1 from tournament_members x where x.tournament_id = prev and x.user_id = r.uid and x.status = 'joined');
          perform enqueue_notification(r.uid, 'contests', '🏆 ' || s.title || ' is on',
            case when was then 'Want in again? Tap to join.' else 'A new tournament just opened — tap to join.' end,
            '?go=contest&id=' || tid, 'sr:' || tid || ':' || r.uid);
        end loop;
      else
        foreach inv in array s.invitees loop
          if inv = s.created_by then continue; end if;
          if not exists (select 1 from friendships f where f.status = 'accepted' and f.user_a = least(s.created_by, inv) and f.user_b = greatest(s.created_by, inv))
             or exists (select 1 from blocks b where (b.blocker = s.created_by and b.blocked = inv) or (b.blocker = inv and b.blocked = s.created_by)) then continue; end if;
          insert into tournament_members(tournament_id, user_id, status, invited_by) values (tid, inv, 'invited', s.created_by) on conflict do nothing;
          was := prev is not null and exists (select 1 from tournament_members x where x.tournament_id = prev and x.user_id = inv and x.status = 'joined');
          perform enqueue_notification(inv, 'contests', '🎣 ' || s.title || ' is on',
            case when was then 'New round — want in again? Tap to join.' else 'A new contest round started — tap to join.' end,
            '?go=contest&id=' || tid, 'sr:' || tid || ':' || inv);
        end loop;
      end if;
      update tournament_series set last_month = p where id = s.id;
      n := n + 1;
    exception when others then
      continue;
    end;
  end loop;
  return n;
end $$;

-- claim_coins: same as setup/41, plus: page-run tournaments pay nothing (added line: "and tt.host_page_id is null").
create or replace function public.claim_coins() returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u uuid := auth.uid(); c record; t record; pb record; vday date; used int; give int; nbest int; sp text; ok boolean;
  launch constant timestamptz := '2026-10-11 18:00+00';
  cap constant int := 50;
  added jsonb := '[]'::jsonb;
begin
  if u is null or not public.is_member() then raise exception 'sign in first'; end if;
  for c in
    select x.* from public.catches x
    where x.created_by = u and x.deleted_at is null and x.created_at >= launch and x.caught_at >= now() - interval '7 days'
      and coalesce(x.review_state, '') <> 'blurred'
      and exists (select 1 from public.photos p where p.catch_id = x.id)
      and not exists (select 1 from public.coin_ledger l where l.user_id = u and l.ref = 'catch:' || x.id)
    order by x.caught_at, x.created_at
  loop
    vday := (c.caught_at at time zone 'America/New_York')::date;
    select coalesce(sum(amount), 0) into used from public.coin_ledger where user_id = u and currency = 'coins' and reason in ('catch','measured') and day = vday;
    give := greatest(0, least(2, cap - used));
    perform public._coin_grant(u, 'coins', give, 'catch', 'catch:' || c.id, vday, c.species);
    if give > 0 then added := added || jsonb_build_array(jsonb_build_object('reason', 'catch', 'coins', give, 'note', c.species)); end if;
    if c.length_in is not null and used + give < cap then
      if public._coin_grant(u, 'coins', 1, 'measured', 'measure:' || c.id, vday, c.species) then added := added || jsonb_build_array(jsonb_build_object('reason', 'measured', 'coins', 1, 'note', c.species)); end if;
    end if;
    sp := lower(btrim(coalesce(c.species, '')));
    if sp <> '' then
      select p.weight_lb, p.length_in into pb from public.catches p
        where p.created_by = u and p.deleted_at is null and lower(btrim(coalesce(p.species, ''))) = sp and (p.caught_at, p.created_at, p.id) < (c.caught_at, c.created_at, c.id)
        order by coalesce(p.weight_lb, 0) desc, coalesce(p.length_in, 0) desc limit 1;
      if not found then
        if public._coin_grant(u, 'coins', 40, 'species', 'species:' || sp, vday, c.species) then added := added || jsonb_build_array(jsonb_build_object('reason', 'species', 'coins', 40, 'note', c.species)); end if;
      elsif coalesce(c.weight_lb, 0) > coalesce(pb.weight_lb, 0) or (coalesce(c.weight_lb, 0) = coalesce(pb.weight_lb, 0) and coalesce(c.length_in, 0) > coalesce(pb.length_in, 0)) then
        select count(*) into nbest from public.coin_ledger where user_id = u and reason = 'best' and day = vday;
        if nbest < 3 and public._coin_grant(u, 'coins', 25, 'best', 'best:' || c.id, vday, c.species) then added := added || jsonb_build_array(jsonb_build_object('reason', 'best', 'coins', 25, 'note', c.species)); end if;
      end if;
    end if;
  end loop;
  for t in
    select tt.id, tt.title, min(q.rk) as rk from public.tournaments tt
    cross join lateral (select * from (select x.user_id, row_number() over (partition by x.board order by x.value desc, x.caught_at asc) as rk from public.tournament_standings_raw(tt.id) x) z where z.user_id = u and z.rk <= 3) q
    where tt.kind = 'official' and tt.host_page_id is null and tt.cancelled_at is null and tt.ends_at < now() and tt.ends_at >= launch
      and not exists (select 1 from public.coin_ledger l where l.user_id = u and l.ref = 'tour:' || tt.id)
    group by tt.id, tt.title
  loop
    ok := public._coin_grant(u, 'coins', case t.rk when 1 then 200 when 2 then 120 else 80 end, 'tournament', 'tour:' || t.id, null, t.title);
    perform public._coin_grant(u, 'gems', case t.rk when 1 then 3 when 2 then 2 else 1 end, 'tournament', 'tour:' || t.id, null, t.title);
    insert into public.user_items (user_id, item_key, how) values (u, case t.rk when 1 then 'trophy_gold' when 2 then 'trophy_silver' else 'trophy_bronze' end, 'won') on conflict do nothing;
    if ok then added := added || jsonb_build_array(jsonb_build_object('reason', 'tournament', 'coins', case t.rk when 1 then 200 when 2 then 120 else 80 end, 'gems', case t.rk when 1 then 3 when 2 then 2 else 1 end, 'note', t.title)); end if;
  end loop;
  return public.my_wallet() || jsonb_build_object('added', added);
end $$;

-- hall_of_fame: same as setup/26, plus: only admin tournaments (added: "and host_page_id is null").
create or replace function public.hall_of_fame()
returns table(tournament_id uuid, title text, ends_at timestamptz, series_month date, board text, rank integer, user_id uuid, value double precision, species text)
language sql stable security definer set search_path = public as $$
  select t.id, t.title, t.ends_at, t.series_month, r.board, r.rk::int, r.user_id, r.value, r.species
  from (select * from public.tournaments where kind = 'official' and host_page_id is null and cancelled_at is null and ends_at < now() order by ends_at desc limit 40) t
  cross join lateral (
    select x.*, row_number() over (partition by x.board order by x.value desc, x.caught_at asc) as rk
    from public.tournament_standings_raw(t.id) x
  ) r
  where r.rk <= 3 and public.is_member() and not coalesce(public.is_blocked(r.user_id), false)
  order by t.ends_at desc, r.board, r.rk
$$;

grant execute on function public.create_host_tournament(uuid, text, text, timestamptz, timestamptz, text[], text, double precision, double precision, double precision, text),
  public.create_host_tournament_series(uuid, text, text, text[], text, double precision, double precision, double precision, text, text, text, smallint[]) to authenticated;
