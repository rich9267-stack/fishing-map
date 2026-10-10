-- 31: Contests (anyone, with friends) vs Tournaments (official; admin only for now).
-- Migration `contests_vs_tournaments`.
--  * tournaments may now run up to 366 days (was 45).
--  * tournament_series now covers BOTH kinds and weekly / monthly / yearly repeats:
--      kind ('official' | 'friends'), cadence ('weekly'|'monthly'|'yearly'), invitees (friends series), require_photo, require_length.
--    last_month = start date of the last period that was created (week Monday / 1st of month / Jan 1).
--  * series_roll() generalised (official behaviour unchanged: monthly, everyone is told, photo+length required).
--    Friends series: creator joined, invitees (still friends) get an invite push each period.
--  * create_tournament_series(...) any member for 'friends' (max 3 active per person), admin only for 'official'.
--  * stop_series: admin or the series creator.  series readable by its creator (and admins).
alter table public.tournaments drop constraint tournaments_check;
alter table public.tournaments add constraint tournaments_check check (ends_at > starts_at and ends_at <= starts_at + interval '366 days');
alter table public.tournament_series add column if not exists kind text not null default 'official' check (kind in ('official','friends'));
alter table public.tournament_series add column if not exists cadence text not null default 'monthly' check (cadence in ('weekly','monthly','yearly'));
alter table public.tournament_series add column if not exists invitees uuid[] not null default '{}';
alter table public.tournament_series add column if not exists require_photo boolean not null default true;
alter table public.tournament_series add column if not exists require_length boolean not null default true;
create policy series_own_read on public.tournament_series for select using (created_by = auth.uid());

create or replace function public.series_roll() returns integer language plpgsql security definer set search_path = public as $$
declare s tournament_series%rowtype; p date; pstart timestamptz; pend timestamptz; tid uuid; prev uuid; n integer := 0; r record; was boolean;
        suffix text; ttl text; inv uuid;
begin
  for s in select * from tournament_series where active loop
    begin
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
                              geo_lat, geo_lng, geo_radius_mi, geo_label, series_id, series_month)
      values (s.created_by, s.kind, ttl, s.description, greatest(pstart, now()), pend, s.boards, s.species,
              s.kind = 'official' or s.require_photo, s.kind = 'official' or s.require_length,
              s.geo_lat, s.geo_lng, s.geo_radius_mi, s.geo_label, s.id, p)
      on conflict do nothing returning id into tid;
      if tid is null then update tournament_series set last_month = p where id = s.id; continue; end if;
      insert into tournament_members(tournament_id, user_id, status, invited_by, joined_at)
      values (tid, s.created_by, 'joined', s.created_by, now()) on conflict do nothing;
      if s.kind = 'official' then
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

create or replace function public.create_tournament_series(p_kind text, p_title text, p_desc text, p_boards text[], p_species text, p_photo boolean, p_length boolean,
  p_lat double precision, p_lng double precision, p_radius double precision, p_geo_label text, p_tz text, p_cadence text, p_months smallint[], p_invites uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid; tid uuid; me uuid := auth.uid(); z text := coalesce(nullif(p_tz, ''), 'America/New_York'); inv uuid[] := '{}'; u uuid; mo smallint[];
begin
  if me is null or not is_member() then raise exception 'not a member'; end if;
  if p_kind not in ('official','friends') then raise exception 'bad kind'; end if;
  if p_kind = 'official' and not is_admin() then raise exception 'only an admin can start a repeating tournament'; end if;
  if p_cadence not in ('weekly','monthly','yearly') then raise exception 'pick weekly, monthly or yearly'; end if;
  mo := coalesce(p_months, '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[]);
  if p_cadence = 'monthly' and (cardinality(mo) = 0 or exists (select 1 from unnest(mo) x where x < 1 or x > 12)) then raise exception 'pick at least one month'; end if;
  if p_kind = 'friends' and (select count(*) from tournament_series where created_by = me and kind = 'friends' and active) >= 3 then
    raise exception 'you already have 3 repeating contests running — stop one first';
  end if;
  begin perform now() at time zone z; exception when others then z := 'America/New_York'; end;
  if p_kind = 'friends' and p_invites is not null then
    foreach u in array p_invites loop if u <> me and is_friend(u) then inv := inv || u; end if; end loop;
  end if;
  insert into tournament_series(created_by, kind, cadence, title, description, boards, species, require_photo, require_length, geo_lat, geo_lng, geo_radius_mi, geo_label, tz, months, invitees)
  values (me, p_kind, p_cadence, btrim(p_title), nullif(p_desc, ''), p_boards, nullif(p_species, ''), coalesce(p_photo, false) or p_kind = 'official', coalesce(p_length, false) or p_kind = 'official',
          p_lat, p_lng, p_radius, nullif(p_geo_label, ''), z, (select array_agg(distinct x order by x) from unnest(mo) x), inv) returning id into sid;
  perform series_roll();
  select id into tid from tournaments where series_id = sid order by starts_at desc limit 1;
  return tid; -- null when this month isn't one of the chosen months
end $$;
grant execute on function public.create_tournament_series(text, text, text, text[], text, boolean, boolean, double precision, double precision, double precision, text, text, text, smallint[], uuid[]) to authenticated;

create or replace function public.stop_series(p_series uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or exists (select 1 from tournament_series where id = p_series and created_by = auth.uid())) then raise exception 'only the creator or an admin'; end if;
  update tournament_series set active = false, stopped_at = now() where id = p_series;
end $$;

-- (migration `series_months_creator`) set_series_months: admin OR the series creator (same body as before otherwise).
create or replace function public.set_series_months(p_series uuid, p_months smallint[]) returns void language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or exists (select 1 from tournament_series where id = p_series and created_by = auth.uid())) then raise exception 'only the creator or an admin'; end if;
  if p_months is null or cardinality(p_months) = 0 or exists (select 1 from unnest(p_months) x where x < 1 or x > 12) then raise exception 'pick at least one month'; end if;
  update tournament_series set months = (select array_agg(distinct x order by x) from unnest(p_months) x) where id = p_series;
end $$;
