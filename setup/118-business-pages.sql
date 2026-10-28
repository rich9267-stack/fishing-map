-- 118: 🏪 Business pages, the full product (Oct 28, 2026). Builds on host pages (setup/56, 58, 74).
-- Clubs get the same pieces where they make sense (pin, Fishing near here, posts, report); hours/phone/website/services/photos
-- are shown for businesses only by the app, but the database doesn't care about the kind for those.
--   1. Details: hours, address, phone, website, a map pin (lat/lng), services & prices (text only, nobody pays in the app), up to 4 photos.
--   2. Verified ✔ (admin, after calling the shop's listed number) and Paused (admin: page stays visible but can't post or alert).
--   3. Report a page (members) + the admin's list of reports.
--   4. Posts: fishing reports / what's in stock / news. Max 3 a day per page; an optional phone alert to followers only,
--      max 1 a day, and only for verified pages. NO deals / discounts (Richard, Oct 28: that's for paid ads later).
--   5. Owner stats: follower numbers and posts only. No page views (the privacy page promises no visit tracking).
--   6. Claim an official place (ramp, pier, park): the owner asks, the admin approves, the place card says "Run by <page>".
--   7. Booking requests (charters/guides) and reviews: built, but SWITCHED OFF until the lawyer review
--      (private.business_extras_on() returns false; switching on = a later setup file that makes it return true).
-- New tables (normal user data, the weekly backup picks them up by itself — plans/database-change-rule.md):
--   host_page_reports, host_page_posts, host_page_claims, host_page_bookings, host_page_reviews.
-- Written with create / alter / grant only, so the Supabase connector can apply it.

-- ===== 1. details =====
alter table public.host_pages add column if not exists hours text check (hours is null or char_length(hours) <= 200);
alter table public.host_pages add column if not exists address text check (address is null or char_length(address) <= 120);
alter table public.host_pages add column if not exists phone text check (phone is null or char_length(phone) <= 30);
alter table public.host_pages add column if not exists website text check (website is null or (char_length(website) <= 120 and website ~* '^https?://[^\s]+$'));
alter table public.host_pages add column if not exists lat double precision check (lat is null or lat between -90 and 90);
alter table public.host_pages add column if not exists lng double precision check (lng is null or lng between -180 and 180);
alter table public.host_pages add column if not exists services jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array' and jsonb_array_length(services) <= 12);
alter table public.host_pages add column if not exists photos text[] not null default '{}' check (cardinality(photos) <= 4);
alter table public.host_pages add column if not exists verified_at timestamptz;
alter table public.host_pages add column if not exists verified_by uuid references auth.users(id) on delete set null;
alter table public.host_pages add column if not exists paused_at timestamptz;
alter table public.host_pages add column if not exists claim_spot bigint references public.official_spots(id) on delete set null;
create unique index if not exists host_pages_claim_spot_key on public.host_pages (claim_spot) where claim_spot is not null and status = 'approved';

-- The switch for booking requests + reviews. OFF until the lawyer review.
create or replace function private.business_extras_on() returns boolean language sql immutable as $$ select false $$;

-- Owner saves the business details. Empty text = cleared. Pin: both numbers or neither.
-- p_services: [{"name": "Half-day charter", "price": "$450"}, ...] (max 12; name 1-60 letters, price up to 30).
create or replace function public.update_host_page_details(p_id uuid, p_hours text, p_address text, p_phone text, p_website text,
  p_lat double precision, p_lng double precision, p_services jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare clean jsonb := '[]'::jsonb; it jsonb; nm text; pr text; web text := nullif(btrim(coalesce(p_website, '')), '');
begin
  if not exists (select 1 from public.host_pages where id = p_id and owner = auth.uid() and status in ('pending', 'approved')) then
    raise exception 'That isn''t your page.'; end if;
  if (p_lat is null) <> (p_lng is null) then raise exception 'The map pin needs both numbers.'; end if;
  if p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180) then raise exception 'That map pin is off the map.'; end if;
  if web is not null and web !~* '^https?://' then web := 'https://' || web; end if;
  if web is not null and (char_length(web) > 120 or web !~* '^https?://[^\s]+$') then raise exception 'That website address doesn''t look right.'; end if;
  if p_services is not null and jsonb_typeof(p_services) = 'array' then
    if jsonb_array_length(p_services) > 12 then raise exception 'Up to 12 services.'; end if;
    for it in select * from jsonb_array_elements(p_services) loop
      nm := left(btrim(coalesce(it ->> 'name', '')), 60); pr := left(btrim(coalesce(it ->> 'price', '')), 30);
      if nm <> '' then clean := clean || jsonb_build_array(jsonb_build_object('name', nm, 'price', nullif(pr, ''))); end if;
    end loop;
  end if;
  update public.host_pages set
    hours = nullif(left(btrim(coalesce(p_hours, '')), 200), ''),
    address = nullif(left(btrim(coalesce(p_address, '')), 120), ''),
    phone = nullif(left(btrim(coalesce(p_phone, '')), 30), ''),
    website = web, lat = p_lat, lng = p_lng, services = clean
  where id = p_id;
end $$;

-- Owner sets the page's photos (paths inside the page's own folder of the host-avatars bucket; max 4).
create or replace function public.update_host_page_photos(p_id uuid, p_paths text[]) returns void
language plpgsql security definer set search_path = public as $$
declare x text;
begin
  if not exists (select 1 from public.host_pages where id = p_id and owner = auth.uid() and status in ('pending', 'approved')) then
    raise exception 'That isn''t your page.'; end if;
  if cardinality(coalesce(p_paths, '{}')) > 4 then raise exception 'Up to 4 photos.'; end if;
  foreach x in array coalesce(p_paths, '{}') loop
    if x not like p_id::text || '/%' then raise exception 'bad picture'; end if;
  end loop;
  update public.host_pages set photos = coalesce(p_paths, '{}') where id = p_id;
end $$;

-- ===== 2. verified + paused (admin, 'pages' box) =====
create or replace function public.set_host_page_verified(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  update public.host_pages set verified_at = case when p_on then now() end, verified_by = case when p_on then auth.uid() end
  where id = p_id and status = 'approved';
  if not found then raise exception 'That page isn''t live.'; end if;
end $$;
create or replace function public.set_host_page_paused(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  update public.host_pages set paused_at = case when p_on then now() end where id = p_id and status = 'approved';
  if not found then raise exception 'That page isn''t live.'; end if;
end $$;

-- the admin log also gets verified / paused / claimed changes (same trigger as before, more lines)
create or replace function private.audit_host_pages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform private.log_admin('page_removed', 'host_page', old.id::text, old.name);
  else
    if new.status is distinct from old.status and new.owner is distinct from auth.uid() then
      perform private.log_admin('page_' || new.status, 'host_page', new.id::text, new.name || ' (was ' || old.status || ')');
    end if;
    if (new.verified_at is null) is distinct from (old.verified_at is null) then
      perform private.log_admin(case when new.verified_at is null then 'page_unverified' else 'page_verified' end, 'host_page', new.id::text, new.name);
    end if;
    if (new.paused_at is null) is distinct from (old.paused_at is null) then
      perform private.log_admin(case when new.paused_at is null then 'page_unpaused' else 'page_paused' end, 'host_page', new.id::text, new.name);
    end if;
    if new.claim_spot is distinct from old.claim_spot and new.owner is distinct from auth.uid() then
      perform private.log_admin(case when new.claim_spot is null then 'page_place_unlinked' else 'page_place_linked' end, 'host_page', new.id::text,
        new.name || coalesce(' → place ' || new.claim_spot::text, ''));
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- ===== 3. report a page =====
create table if not exists public.host_page_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_id uuid not null references public.host_pages(id) on delete cascade,
  reporter uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text not null check (reason in ('fake', 'spam', 'wrong_info', 'rude', 'other')),
  details text check (details is null or char_length(details) <= 300),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);
create unique index if not exists host_page_reports_one_open on public.host_page_reports (reporter, page_id) where status = 'open';
alter table public.host_page_reports enable row level security;
create policy "see page reports" on public.host_page_reports for select using (reporter = auth.uid() or public.has_power('pages'));

create or replace function public.report_host_page(p_page uuid, p_reason text, p_details text default null) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  if p_reason not in ('fake', 'spam', 'wrong_info', 'rude', 'other') then raise exception 'pick a reason'; end if;
  if not exists (select 1 from public.host_pages where id = p_page and status = 'approved' and owner <> me) then raise exception 'That page isn''t available.'; end if;
  if exists (select 1 from public.host_page_reports where reporter = me and page_id = p_page and status = 'open') then
    raise exception 'You already reported this page. The admin will look at it.'; end if;
  insert into public.host_page_reports (page_id, reporter, reason, details) values (p_page, me, p_reason, nullif(left(btrim(coalesce(p_details, '')), 300), ''));
end $$;

create or replace function public.host_page_reports_admin() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'created_at', r.created_at, 'page_id', r.page_id, 'page_name', h.name,
      'reason', r.reason, 'details', r.details, 'reporter_name', p.display_name, 'reporter_handle', p.handle) order by r.created_at)
    from public.host_page_reports r join public.host_pages h on h.id = r.page_id left join public.profiles p on p.user_id = r.reporter
    where r.status = 'open'), '[]'::jsonb);
end $$;
create or replace function public.resolve_host_page_report(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  update public.host_page_reports set status = 'resolved', resolved_at = now(), resolved_by = auth.uid() where id = p_id and status = 'open';
  select h.name into nm from public.host_page_reports r join public.host_pages h on h.id = r.page_id where r.id = p_id;
  perform private.log_admin('page_report_done', 'host_page_report', p_id::text, nm);
end $$;

-- ===== 4. posts =====
create table if not exists public.host_page_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_id uuid not null references public.host_pages(id) on delete cascade,
  author uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('report', 'stock', 'news')),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  alerted boolean not null default false,
  hidden_at timestamptz,
  hidden_by uuid references auth.users(id) on delete set null
);
create index if not exists host_page_posts_page_idx on public.host_page_posts (page_id, created_at desc);
alter table public.host_page_posts enable row level security;
create policy "see page posts" on public.host_page_posts for select using (public.is_member() and (
  public.has_power('pages') or exists (select 1 from public.host_pages h where h.id = page_id and (h.owner = auth.uid()
    or (h.status = 'approved' and hidden_at is null and not coalesce(public.is_blocked(h.owner), false))))));

-- Post as my page. p_alert = also send a phone alert to followers (verified pages only, 1 a day).
create or replace function public.post_host_page(p_page uuid, p_kind text, p_body text, p_alert boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h record; txt text := btrim(coalesce(p_body, '')); pid uuid; sent int := 0; lab text; r record; note text;
begin
  select * into h from public.host_pages where id = p_page;
  if not found or h.owner is distinct from me or h.status <> 'approved' then raise exception 'That isn''t your live page.'; end if;
  if h.paused_at is not null then raise exception 'The admin has paused this page, so it can''t post right now.'; end if;
  if p_kind not in ('report', 'stock', 'news') then raise exception 'pick a kind of post'; end if;
  if char_length(txt) < 1 or char_length(txt) > 500 then raise exception 'A post needs 1 to 500 letters.'; end if;
  if (select count(*) from public.host_page_posts where page_id = p_page and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Pages can post 3 times a day. Try again tomorrow.'; end if;
  insert into public.host_page_posts (page_id, author, kind, body) values (p_page, me, p_kind, txt) returning id into pid;
  if coalesce(p_alert, false) then
    if h.verified_at is null then note := 'Posted. Phone alerts are for ✔ verified pages only.';
    elsif exists (select 1 from public.host_page_posts where page_id = p_page and alerted and created_at > now() - interval '24 hours') then
      note := 'Posted. Your page already sent an alert today, so this one has no alert.';
    else
      lab := case p_kind when 'report' then '🎣 ' when 'stock' then '🦐 ' else '📣 ' end;
      for r in select f.user_id uid from public.host_follows f
               where f.page_id = p_page and f.active and f.user_id <> h.owner
                 and not exists (select 1 from public.blocks b where (b.blocker = h.owner and b.blocked = f.user_id) or (b.blocker = f.user_id and b.blocked = h.owner))
      loop
        perform public.enqueue_notification(r.uid, 'social', lab || h.name, left(txt, 140), '?go=pages&id=' || p_page, 'hp-post:' || pid || ':' || r.uid);
        sent := sent + 1;
      end loop;
      update public.host_page_posts set alerted = true where id = pid;
    end if;
  end if;
  return jsonb_build_object('id', pid, 'alerted', sent, 'note', note);
end $$;

create or replace function public.delete_host_page_post(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.host_page_posts p using public.host_pages h where p.id = p_id and h.id = p.page_id and h.owner = auth.uid();
  if not found then raise exception 'That isn''t your post.'; end if;
end $$;

create or replace function public.hide_host_page_post(p_id uuid, p_hide boolean) returns void
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  update public.host_page_posts set hidden_at = case when p_hide then now() end, hidden_by = case when p_hide then auth.uid() end where id = p_id;
  if not found then raise exception 'That post is gone.'; end if;
  select h.name into nm from public.host_page_posts p join public.host_pages h on h.id = p.page_id where p.id = p_id;
  perform private.log_admin(case when p_hide then 'page_post_hidden' else 'page_post_shown' end, 'host_page_post', p_id::text, nm);
end $$;

-- the newest 20 posts of one page (hidden ones only for the owner and admins, marked hidden)
create or replace function public.host_page_posts_list(p_page uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); h record; staff boolean := public.has_power('pages');
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  select * into h from public.host_pages where id = p_page;
  if not found or not (h.owner = me or staff or (h.status = 'approved' and not coalesce(public.is_blocked(h.owner), false))) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'created_at', p.created_at, 'kind', p.kind, 'body', p.body,
      'alerted', p.alerted, 'hidden', p.hidden_at is not null) order by p.created_at desc)
    from (select * from public.host_page_posts x where x.page_id = p_page and (x.hidden_at is null or h.owner = me or staff)
          order by x.created_at desc limit 20) p), '[]'::jsonb);
end $$;

-- ===== 5. owner stats (followers + posts only; no visits are counted anywhere) =====
create or replace function public.host_page_stats(p_page uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.host_pages where id = p_page and (owner = auth.uid() or public.has_power('pages'))) then
    raise exception 'That isn''t your page.'; end if;
  return jsonb_build_object(
    'followers', (select count(*)::int from public.host_follows where page_id = p_page and active),
    'new_7', (select count(*)::int from public.host_follows where page_id = p_page and active and created_at > now() - interval '7 days'),
    'new_30', (select count(*)::int from public.host_follows where page_id = p_page and active and created_at > now() - interval '30 days'),
    'posts_30', (select count(*)::int from public.host_page_posts where page_id = p_page and created_at > now() - interval '30 days'),
    'alerts_30', (select count(*)::int from public.host_page_posts where page_id = p_page and alerted and created_at > now() - interval '30 days'));
end $$;

-- ===== 6. claim an official place =====
create table if not exists public.host_page_claims (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_id uuid not null references public.host_pages(id) on delete cascade,
  spot_id bigint not null references public.official_spots(id) on delete cascade,
  note text check (note is null or char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create unique index if not exists host_page_claims_one_waiting on public.host_page_claims (page_id) where status = 'pending';
alter table public.host_page_claims enable row level security;
create policy "see page claims" on public.host_page_claims for select using (public.has_power('pages')
  or exists (select 1 from public.host_pages h where h.id = page_id and h.owner = auth.uid()));

create or replace function public.request_host_page_claim(p_page uuid, p_spot bigint, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.host_pages where id = p_page and owner = auth.uid() and status = 'approved' and kind = 'business') then
    raise exception 'Only a live business page can link a place.'; end if;
  if not exists (select 1 from public.official_spots where id = p_spot and active) then raise exception 'That place isn''t on the map.'; end if;
  if exists (select 1 from public.host_pages where claim_spot = p_spot and status = 'approved' and id <> p_page) then
    raise exception 'Another page already runs that place.'; end if;
  if exists (select 1 from public.host_page_claims where page_id = p_page and status = 'pending') then
    raise exception 'You already asked for a place. Wait for the admin first.'; end if;
  insert into public.host_page_claims (page_id, spot_id, note) values (p_page, p_spot, nullif(left(btrim(coalesce(p_note, '')), 300), ''));
end $$;
create or replace function public.cancel_host_page_claim(p_page uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.host_pages where id = p_page and owner = auth.uid()) then raise exception 'That isn''t your page.'; end if;
  update public.host_page_claims set status = 'cancelled' where page_id = p_page and status = 'pending';
end $$;
-- owner (or admin) unlinks the place from the page
create or replace function public.unlink_host_page_place(p_page uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_power('pages') or exists (select 1 from public.host_pages where id = p_page and owner = auth.uid())) then
    raise exception 'That isn''t your page.'; end if;
  update public.host_pages set claim_spot = null where id = p_page;
end $$;
create or replace function public.review_host_page_claim(p_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  select * into c from public.host_page_claims where id = p_id and status = 'pending';
  if not found then raise exception 'That request is gone.'; end if;
  if p_approve and exists (select 1 from public.host_pages where claim_spot = c.spot_id and status = 'approved' and id <> c.page_id) then
    raise exception 'Another page already runs that place.'; end if;
  update public.host_page_claims set status = case when p_approve then 'approved' else 'declined' end, reviewed_at = now(), reviewed_by = auth.uid() where id = p_id;
  if p_approve then update public.host_pages set claim_spot = c.spot_id where id = c.page_id; end if;
  perform private.log_admin(case when p_approve then 'page_claim_approved' else 'page_claim_declined' end, 'host_page_claim', p_id::text,
    (select name from public.host_pages where id = c.page_id));
  begin
    perform public.enqueue_notification((select owner from public.host_pages where id = c.page_id), 'social',
      case when p_approve then '📍 Place linked' else 'Place not linked' end,
      case when p_approve then 'Your page now shows on its place on the map.' else 'The admin didn''t link that place to your page.' end,
      '?go=pages&id=' || c.page_id, 'hp-claim:' || p_id);
  exception when others then null;
  end;
end $$;
create or replace function public.host_page_claims_admin() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'page_id', c.page_id, 'page_name', h.name, 'page_address', h.address,
      'spot_id', s.id, 'spot_name', s.name, 'spot_kind', s.kind, 'spot_county', s.county, 'note', c.note) order by c.created_at)
    from public.host_page_claims c join public.host_pages h on h.id = c.page_id join public.official_spots s on s.id = c.spot_id
    where c.status = 'pending'), '[]'::jsonb);
end $$;
-- the place card asks: does a page run this place?
create or replace function public.host_page_for_spot(p_spot bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', h.id, 'name', h.name, 'verified', h.verified_at is not null)
  from public.host_pages h
  where public.is_member() and h.claim_spot = p_spot and h.status = 'approved' and not coalesce(public.is_blocked(h.owner), false)
  limit 1;
$$;

-- ===== 7. booking requests + reviews (switched OFF until the lawyer review) =====
create table if not exists public.host_page_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_id uuid not null references public.host_pages(id) on delete cascade,
  member uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_date date not null,
  party int not null check (party between 1 and 20),
  note text check (note is null or char_length(note) <= 300),
  status text not null default 'new' check (status in ('new', 'yes', 'no', 'cancelled')),
  reply text check (reply is null or char_length(reply) <= 300),
  replied_at timestamptz
);
create index if not exists host_page_bookings_page_idx on public.host_page_bookings (page_id, created_at desc);
alter table public.host_page_bookings enable row level security;
create policy "see bookings" on public.host_page_bookings for select using (member = auth.uid()
  or exists (select 1 from public.host_pages h where h.id = page_id and h.owner = auth.uid()));

create table if not exists public.host_page_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_id uuid not null references public.host_pages(id) on delete cascade,
  author uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  body text check (body is null or char_length(body) <= 300),
  status text not null default 'pending' check (status in ('pending', 'shown', 'declined')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (page_id, author)
);
alter table public.host_page_reviews enable row level security;
create policy "see reviews" on public.host_page_reviews for select using (author = auth.uid() or public.has_power('pages')
  or (status = 'shown' and public.is_member()));

create or replace function public.request_host_page_booking(p_page uuid, p_date date, p_party int, p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h record; bid uuid;
begin
  if not private.business_extras_on() then raise exception 'Booking requests are coming soon.'; end if;
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  select * into h from public.host_pages where id = p_page;
  if not found or h.status <> 'approved' or h.kind <> 'business' or h.paused_at is not null then raise exception 'That page isn''t taking requests.'; end if;
  if h.owner = me then raise exception 'That''s your own page.'; end if;
  if exists (select 1 from public.blocks b where (b.blocker = h.owner and b.blocked = me) or (b.blocker = me and b.blocked = h.owner)) then
    raise exception 'That page isn''t taking requests.'; end if;
  if p_date is null or p_date < current_date or p_date > current_date + 365 then raise exception 'Pick a day in the next year.'; end if;
  if p_party is null or p_party not between 1 and 20 then raise exception 'Party size is 1 to 20.'; end if;
  if (select count(*) from public.host_page_bookings where member = me and status = 'new') >= 3 then
    raise exception 'You have 3 requests waiting already.'; end if;
  insert into public.host_page_bookings (page_id, member, trip_date, party, note)
  values (p_page, me, p_date, p_party, nullif(left(btrim(coalesce(p_note, '')), 300), '')) returning id into bid;
  begin
    perform public.enqueue_notification(h.owner, 'social', '📅 New booking request', 'For ' || to_char(p_date, 'Mon DD') || ', ' || p_party || ' people. Tap to answer.',
      '?go=pages&id=' || p_page, 'hp-book:' || bid);
  exception when others then null;
  end;
  return bid;
end $$;
create or replace function public.answer_host_page_booking(p_id uuid, p_yes boolean, p_reply text default null) returns void
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  if not private.business_extras_on() then raise exception 'Booking requests are coming soon.'; end if;
  select k.*, h.name page_name into b from public.host_page_bookings k join public.host_pages h on h.id = k.page_id
  where k.id = p_id and h.owner = auth.uid() and k.status = 'new';
  if not found then raise exception 'That request is gone.'; end if;
  update public.host_page_bookings set status = case when p_yes then 'yes' else 'no' end, reply = nullif(left(btrim(coalesce(p_reply, '')), 300), ''), replied_at = now()
  where id = p_id;
  begin
    perform public.enqueue_notification(b.member, 'social', case when p_yes then '✅ ' else '' end || b.page_name || ' answered',
      coalesce(nullif(left(btrim(coalesce(p_reply, '')), 140), ''), case when p_yes then 'They can take your trip.' else 'They can''t take that trip.' end),
      '?go=pages&id=' || b.page_id, 'hp-book-ans:' || p_id);
  exception when others then null;
  end;
end $$;
create or replace function public.cancel_host_page_booking(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.host_page_bookings set status = 'cancelled' where id = p_id and member = auth.uid() and status = 'new';
  if not found then raise exception 'That request is gone.'; end if;
end $$;
-- the owner's list (new first) or, for anyone else, my own requests to this page
create or replace function public.host_page_bookings_list(p_page uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); mine boolean;
begin
  if not private.business_extras_on() then return '[]'::jsonb; end if;
  mine := exists (select 1 from public.host_pages where id = p_page and owner = me);
  return coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'created_at', k.created_at, 'trip_date', k.trip_date, 'party', k.party, 'note', k.note,
      'status', k.status, 'reply', k.reply, 'member_name', case when mine then p.display_name end, 'member_handle', case when mine then p.handle end)
      order by (k.status = 'new') desc, k.trip_date)
    from public.host_page_bookings k left join public.profiles p on p.user_id = k.member
    where k.page_id = p_page and (mine or k.member = me) and k.status <> 'cancelled'
      and (k.status = 'new' or k.trip_date >= current_date - 30)), '[]'::jsonb);
end $$;

-- Reviews: one per member per page; every review waits for the admin before anyone else sees it.
create or replace function public.review_host_page_write(p_page uuid, p_stars int, p_body text default null) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); h record;
begin
  if not private.business_extras_on() then raise exception 'Reviews are coming soon.'; end if;
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  select * into h from public.host_pages where id = p_page;
  if not found or h.status <> 'approved' or h.kind <> 'business' then raise exception 'That page isn''t available.'; end if;
  if h.owner = me then raise exception 'You can''t review your own page.'; end if;
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'Pick 1 to 5 stars.'; end if;
  insert into public.host_page_reviews (page_id, author, stars, body) values (p_page, me, p_stars, nullif(left(btrim(coalesce(p_body, '')), 300), ''))
  on conflict (page_id, author) do update set stars = excluded.stars, body = excluded.body, status = 'pending', created_at = now(), reviewed_at = null, reviewed_by = null;
end $$;
create or replace function public.host_page_reviews_list(p_page uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not private.business_extras_on() or me is null or not public.is_member() then return jsonb_build_object('n', 0, 'avg', null, 'reviews', '[]'::jsonb, 'mine', null); end if;
  return jsonb_build_object(
    'n', (select count(*)::int from public.host_page_reviews where page_id = p_page and status = 'shown'),
    'avg', (select round(avg(stars)::numeric, 1) from public.host_page_reviews where page_id = p_page and status = 'shown'),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'stars', r.stars, 'body', r.body, 'created_at', r.created_at,
        'author', r.author, 'author_name', p.display_name) order by r.created_at desc)
      from (select * from public.host_page_reviews x where x.page_id = p_page and x.status = 'shown' and not coalesce(public.is_blocked(x.author), false)
            order by x.created_at desc limit 30) r left join public.profiles p on p.user_id = r.author), '[]'::jsonb),
    'mine', (select jsonb_build_object('stars', stars, 'body', body, 'status', status) from public.host_page_reviews where page_id = p_page and author = me));
end $$;
create or replace function public.host_page_reviews_admin() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'page_name', h.name, 'stars', r.stars, 'body', r.body, 'author_name', p.display_name) order by r.created_at)
    from public.host_page_reviews r join public.host_pages h on h.id = r.page_id left join public.profiles p on p.user_id = r.author
    where r.status = 'pending'), '[]'::jsonb);
end $$;
create or replace function public.decide_host_page_review(p_id uuid, p_show boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  update public.host_page_reviews set status = case when p_show then 'shown' else 'declined' end, reviewed_at = now(), reviewed_by = auth.uid() where id = p_id;
  if not found then raise exception 'That review is gone.'; end if;
  perform private.log_admin(case when p_show then 'page_review_shown' else 'page_review_declined' end, 'host_page_review', p_id::text, null);
end $$;

-- ===== the lists the screens use, now with the new pieces =====
create or replace function public.host_pages_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or not public.is_member() then raise exception 'sign in first'; end if;
  return jsonb_build_object(
    'business_allowed', public.business_pages_allowed(me),
    'business_used', public.business_pages_used(me),
    'extras_on', private.business_extras_on(),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'kind', h.kind, 'name', h.name, 'about', h.about, 'area', h.area, 'accent', h.accent, 'avatar_path', h.avatar_path,
        'status', h.status, 'owner', h.owner, 'owner_name', p.display_name, 'owner_handle', p.handle, 'is_mine', h.owner = me,
        'created_at', h.created_at,
        'hours', h.hours, 'address', h.address, 'phone', h.phone, 'website', h.website, 'lat', h.lat, 'lng', h.lng,
        'services', h.services, 'photos', h.photos, 'verified', h.verified_at is not null, 'paused', h.paused_at is not null,
        'place', (select jsonb_build_object('id', s.id, 'name', s.name, 'kind', s.kind) from public.official_spots s where s.id = h.claim_spot),
        'claim_waiting', case when h.owner = me then (select jsonb_build_object('spot_id', c.spot_id, 'name', s.name) from public.host_page_claims c
          join public.official_spots s on s.id = c.spot_id where c.page_id = h.id and c.status = 'pending' limit 1) end,
        'followers', (select count(*)::int from public.host_follows f where f.page_id = h.id and f.active),
        'following', exists (select 1 from public.host_follows f where f.page_id = h.id and f.user_id = me and f.active)) order by h.kind, lower(h.name))
      from public.host_pages h left join public.profiles p on p.user_id = h.owner
      where (h.status = 'approved' and not coalesce(public.is_blocked(h.owner), false)) or (h.owner = me and h.status <> 'closed')), '[]'::jsonb));
end $$;

create or replace function public.host_pages_admin() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', h.id, 'kind', h.kind, 'name', h.name, 'about', h.about, 'area', h.area, 'status', h.status, 'note', h.request_note,
      'created_at', h.created_at, 'owner', h.owner, 'owner_name', p.display_name, 'owner_handle', p.handle,
      'phone', h.phone, 'address', h.address, 'website', h.website,
      'verified', h.verified_at is not null, 'paused', h.paused_at is not null,
      'open_reports', (select count(*)::int from public.host_page_reports r where r.page_id = h.id and r.status = 'open'),
      'business_allowed', public.business_pages_allowed(h.owner), 'business_used', public.business_pages_used(h.owner))
      order by (h.status = 'pending') desc, h.created_at desc)
    from public.host_pages h left join public.profiles p on p.user_id = h.owner
    where h.status in ('pending', 'approved')), '[]'::jsonb);
end $$;

-- ===== who may call what =====
revoke all on function private.business_extras_on() from public, anon, authenticated;
revoke all on function
  public.update_host_page_details(uuid, text, text, text, text, double precision, double precision, jsonb), public.update_host_page_photos(uuid, text[]),
  public.set_host_page_verified(uuid, boolean), public.set_host_page_paused(uuid, boolean),
  public.report_host_page(uuid, text, text), public.host_page_reports_admin(), public.resolve_host_page_report(uuid),
  public.post_host_page(uuid, text, text, boolean), public.delete_host_page_post(uuid), public.hide_host_page_post(uuid, boolean), public.host_page_posts_list(uuid),
  public.host_page_stats(uuid),
  public.request_host_page_claim(uuid, bigint, text), public.cancel_host_page_claim(uuid), public.unlink_host_page_place(uuid),
  public.review_host_page_claim(uuid, boolean), public.host_page_claims_admin(), public.host_page_for_spot(bigint),
  public.request_host_page_booking(uuid, date, int, text), public.answer_host_page_booking(uuid, boolean, text), public.cancel_host_page_booking(uuid),
  public.host_page_bookings_list(uuid),
  public.review_host_page_write(uuid, int, text), public.host_page_reviews_list(uuid), public.host_page_reviews_admin(), public.decide_host_page_review(uuid, boolean),
  public.host_pages_list(), public.host_pages_admin()
  from public, anon;
grant execute on function
  public.update_host_page_details(uuid, text, text, text, text, double precision, double precision, jsonb), public.update_host_page_photos(uuid, text[]),
  public.set_host_page_verified(uuid, boolean), public.set_host_page_paused(uuid, boolean),
  public.report_host_page(uuid, text, text), public.host_page_reports_admin(), public.resolve_host_page_report(uuid),
  public.post_host_page(uuid, text, text, boolean), public.delete_host_page_post(uuid), public.hide_host_page_post(uuid, boolean), public.host_page_posts_list(uuid),
  public.host_page_stats(uuid),
  public.request_host_page_claim(uuid, bigint, text), public.cancel_host_page_claim(uuid), public.unlink_host_page_place(uuid),
  public.review_host_page_claim(uuid, boolean), public.host_page_claims_admin(), public.host_page_for_spot(bigint),
  public.request_host_page_booking(uuid, date, int, text), public.answer_host_page_booking(uuid, boolean, text), public.cancel_host_page_booking(uuid),
  public.host_page_bookings_list(uuid),
  public.review_host_page_write(uuid, int, text), public.host_page_reviews_list(uuid), public.host_page_reviews_admin(), public.decide_host_page_review(uuid, boolean),
  public.host_pages_list(), public.host_pages_admin()
  to authenticated;
-- (the new tables have no insert / update / delete rules: only the functions above write to them)
