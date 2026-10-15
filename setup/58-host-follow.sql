-- 58: 🏷 Host pages, step 3 — follow a page; page alerts go to followers only (Oct 14, 2026).
-- * host_follows: who follows which page. Nothing is written directly — only follow_host_page / unfollow_host_page.
--   Unfollowing keeps the row but switches it off (active = false), so nothing is ever removed and re-following is one tap.
-- * You can follow any approved page that isn't yours (up to 50 pages). Blocked people (either way) never get that page's alerts.
-- * Alerts for page-run tournaments (category "contests", so the usual phone-alert switch and quiet hours apply):
--     - a one-off tournament opened        -> followers
--     - a repeating tournament's new round -> followers ("want in again?" if they played last round)
--     - starting within about an hour      -> followers who haven't joined yet (people who joined already get the normal alert)
--   Admin tournaments still tell everyone; friend contests are unchanged.
-- * host_pages_list() now also returns followers (count) and following (am I following).
-- Written with create / alter / grant only, so the Supabase connector can apply it.

create table if not exists public.host_follows (
  page_id uuid not null references public.host_pages(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (page_id, user_id)
);
create index if not exists host_follows_user_idx on public.host_follows (user_id) where active;
alter table public.host_follows enable row level security;
create policy "see my follows" on public.host_follows for select using (user_id = auth.uid());
-- (no write policies: only the functions below write)

create or replace function public.follow_host_page(p_page uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h record;
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  select owner, status into h from public.host_pages where id = p_page;
  if not found or h.status <> 'approved' then raise exception 'That page isn''t available.'; end if;
  if h.owner = me then raise exception 'You run this page — you can''t follow it.'; end if;
  if exists (select 1 from public.blocks b where (b.blocker = h.owner and b.blocked = me) or (b.blocker = me and b.blocked = h.owner)) then
    raise exception 'That page isn''t available.'; end if;
  if not exists (select 1 from public.host_follows where page_id = p_page and user_id = me and active)
     and (select count(*) from public.host_follows where user_id = me and active) >= 50 then
    raise exception 'You follow 50 pages already. Unfollow one first.'; end if;
  insert into public.host_follows (page_id, user_id, active) values (p_page, me, true)
  on conflict (page_id, user_id) do update set active = true;
end $$;

create or replace function public.unfollow_host_page(p_page uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  update public.host_follows set active = false where page_id = p_page and user_id = auth.uid();
end $$;

-- Tell a page's followers something (private: only other database functions call it).
-- p_prev (optional): the previous round — followers who joined it get p_body_again instead of p_body.
create or replace function private.host_notify(p_page uuid, p_owner uuid, p_title text, p_body text, p_link text, p_key text,
  p_prev uuid default null, p_body_again text default null) returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; was boolean;
begin
  for r in
    select f.user_id uid from public.host_follows f
    where f.page_id = p_page and f.active and f.user_id <> p_owner
      and not exists (select 1 from public.blocks b where (b.blocker = p_owner and b.blocked = f.user_id) or (b.blocker = f.user_id and b.blocked = p_owner))
  loop
    was := p_prev is not null and p_body_again is not null
           and exists (select 1 from public.tournament_members x where x.tournament_id = p_prev and x.user_id = r.uid and x.status = 'joined');
    perform public.enqueue_notification(r.uid, 'contests', p_title, case when was then p_body_again else p_body end, p_link, p_key || ':' || r.uid);
    n := n + 1;
  end loop;
  return n;
end $$;

-- One tournament as a page: same as setup/57, plus "a tournament opened" to the page's followers.
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
  begin
    perform private.host_notify(p_page, me, '🏷 ' || pn || ' opened a tournament', btrim(p_title) || ' — tap to see it and join.',
      '?go=contest&id=' || tid, 'ho:' || tid);
  exception when others then null; end; -- a failed alert must never undo the tournament
  return tid;
end $$;

-- series_roll: same as setup/57, but a page-run round now tells that page's followers.
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
        begin -- page-run: only the page's followers are told (a failure here must never stop the round)
          perform private.host_notify(s.host_page_id, s.created_by, '🏷 ' || ttl || ' is on',
            'A new round from ' || s.host_page_name || ' — tap to join.', '?go=contest&id=' || tid, 'sr:' || tid,
            prev, 'New round from ' || s.host_page_name || ' — want in again? Tap to join.');
        exception when others then null; end;
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

-- push_scheduled: same as before, plus: followers of a page who haven't joined yet get "starts within the hour" for its tournaments.
create or replace function public.push_scheduled()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  -- trips: within about an hour of the start, to the planner and everyone who said "I'm in"
  for r in
    select u.uid, p.id pid, p.plan_at, coalesce(s.name, 'your spot') spot
    from trip_plans p
    left join spots s on s.id = p.spot_id
    cross join lateral (select p.created_by uid union select user_id from trip_plan_rsvps where plan_id = p.id) u
    where p.cancelled_at is null and p.plan_at > now() and p.plan_at <= now() + interval '65 minutes'
  loop
    perform enqueue_notification(r.uid, 'trips', '🎣 Trip coming up', r.spot || ' at ' || to_char(r.plan_at at time zone 'America/New_York', 'FMHH12:MI AM'), '?go=feed', 'tr:' || r.pid || ':' || r.uid);
  end loop;
  -- contests starting within about an hour
  for r in
    select t.id tid, t.title, t.starts_at, m.user_id uid from tournaments t
    join tournament_members m on m.tournament_id = t.id and m.status = 'joined'
    where t.cancelled_at is null and t.starts_at > now() and t.starts_at <= now() + interval '65 minutes'
  loop
    perform enqueue_notification(r.uid, 'contests', '🏁 ' || r.title, 'Starts at ' || to_char(r.starts_at at time zone 'America/New_York', 'FMHH12:MI AM'), '?go=contest&id=' || r.tid, 'cs:' || r.tid || ':' || r.uid);
  end loop;
  -- page tournaments starting within about an hour: followers who haven't joined yet
  for r in
    select t.id tid, t.title, t.starts_at, t.host_page_name pn, f.user_id uid from tournaments t
    join host_follows f on f.page_id = t.host_page_id and f.active
    where t.cancelled_at is null and t.host_page_id is not null and t.starts_at > now() and t.starts_at <= now() + interval '65 minutes'
      and f.user_id <> t.created_by
      and not exists (select 1 from tournament_members m where m.tournament_id = t.id and m.user_id = f.user_id and m.status = 'joined')
      and not exists (select 1 from blocks b where (b.blocker = t.created_by and b.blocked = f.user_id) or (b.blocker = f.user_id and b.blocked = t.created_by))
  loop
    perform enqueue_notification(r.uid, 'contests', '🏷 ' || r.title, r.pn || ' — starts at ' || to_char(r.starts_at at time zone 'America/New_York', 'FMHH12:MI AM') || '. Tap to join.', '?go=contest&id=' || r.tid, 'fs:' || r.tid || ':' || r.uid);
  end loop;
  -- contests that just ended
  for r in
    select t.id tid, t.title, m.user_id uid from tournaments t
    join tournament_members m on m.tournament_id = t.id and m.status = 'joined'
    where t.cancelled_at is null and t.ends_at <= now() and t.ends_at > now() - interval '30 minutes'
  loop
    perform enqueue_notification(r.uid, 'contests', '🏁 Contest ended', r.title || ' — see the final standings', '?go=contest&id=' || r.tid, 'ce:' || r.tid || ':' || r.uid);
  end loop;
end $$;

-- host_pages_list: same as setup/56, plus followers (how many) and following (am I one).
create or replace function public.host_pages_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  return jsonb_build_object(
    'business_allowed', public.business_pages_allowed(me),
    'business_used', public.business_pages_used(me),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'kind', h.kind, 'name', h.name, 'about', h.about, 'area', h.area, 'accent', h.accent, 'avatar_path', h.avatar_path,
        'status', h.status, 'owner', h.owner, 'owner_name', p.display_name, 'owner_handle', p.handle, 'is_mine', h.owner = me,
        'created_at', h.created_at,
        'followers', (select count(*)::int from public.host_follows f where f.page_id = h.id and f.active),
        'following', exists (select 1 from public.host_follows f where f.page_id = h.id and f.user_id = me and f.active)) order by h.kind, lower(h.name))
      from public.host_pages h left join public.profiles p on p.user_id = h.owner
      where (h.status = 'approved' and not coalesce(public.is_blocked(h.owner), false)) or (h.owner = me and h.status <> 'closed')), '[]'::jsonb));
end $$;

grant execute on function public.follow_host_page(uuid), public.unfollow_host_page(uuid),
  public.create_host_tournament(uuid, text, text, timestamptz, timestamptz, text[], text, double precision, double precision, double precision, text),
  public.host_pages_list() to authenticated;
