-- Social foundation, part 1 (schema + helpers; no behaviour change for the current group).
-- Private / Friends / Public on every spot and catch; friendships; profiles; blurred public pins.

-- Access list: status (for the later "request access + approval" flow) and "crew" (original circle: auto-friends)
alter table public.members add column if not exists status text not null default 'approved' check (status in ('approved','pending','blocked'));
alter table public.members add column if not exists crew boolean not null default true;

-- Visibility
alter table public.spots add column if not exists visibility text not null default 'friends' check (visibility in ('private','friends','public'));
alter table public.spots add column if not exists hide_exact_from_friends boolean not null default false;
update public.spots set visibility = 'private' where is_private and visibility <> 'private';
alter table public.catches add column if not exists visibility text not null default 'friends' check (visibility in ('private','friends','public'));
update public.catches c set visibility = 'private' from public.spots s where s.id = c.spot_id and s.is_private and c.visibility <> 'private';

-- Keep the old is_private flag and the new visibility in step (old cached app versions only know is_private)
create or replace function public.spots_sync_visibility() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.is_private then new.visibility := 'private'; end if;
  else
    if new.is_private is distinct from old.is_private and new.visibility is not distinct from old.visibility then
      new.visibility := case when new.is_private then 'private' else 'friends' end;
    end if;
  end if;
  new.is_private := (new.visibility = 'private');
  return new;
end $$;
create or replace trigger spots_sync_visibility before insert or update on public.spots for each row execute function public.spots_sync_visibility();

-- Photos never keep GPS (a public viewer could read it)
create or replace function public.photos_no_gps() returns trigger language plpgsql as $$
begin new.lat := null; new.lng := null; return new; end $$;
create or replace trigger photos_no_gps before insert or update on public.photos for each row execute function public.photos_no_gps();
update public.photos set lat = null, lng = null where lat is not null or lng is not null;

-- Profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  bio text check (bio is null or char_length(bio) <= 300),
  home_area text check (home_area is null or char_length(home_area) <= 60),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_handle_key on public.profiles (lower(handle));
alter table public.profiles enable row level security;

-- Friendships: one row per pair (user_a < user_b)
create table if not exists public.friendships (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  requested_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b))
);
alter table public.friendships enable row level security;

-- Secret used to blur public pins (generated here, never stored in the repo, no API access)
create table if not exists public.app_secrets (k text primary key, v text not null);
alter table public.app_secrets enable row level security;
insert into public.app_secrets (k, v) values ('blur_salt', gen_random_uuid()::text || gen_random_uuid()::text) on conflict (k) do nothing;

-- Helpers (SECURITY DEFINER so they can look across rows the viewer may not read directly)
create or replace function public.is_friend(u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships f where f.status = 'accepted'
    and f.user_a = least(auth.uid(), u) and f.user_b = greatest(auth.uid(), u) and auth.uid() <> u);
$$;
create or replace function public.can_see_spot(sid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_member() and exists (select 1 from public.spots s where s.id = sid and (
    s.created_by = auth.uid() or (s.visibility <> 'private' and public.is_friend(s.created_by)) or s.visibility = 'public'));
$$;
create or replace function public.can_see_catch_id(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_member() and exists (select 1 from public.catches c where c.id = cid and (
    c.created_by = auth.uid() or (c.visibility in ('friends','public') and public.is_friend(c.created_by)) or c.visibility = 'public'));
$$;
-- Blurred position (deterministic, 100–400 m ≈ up to 1/4 mile) — only used inside the spots_visible view
create or replace function public.blur_point(sid uuid, p_lat double precision, p_lng double precision)
returns table (blat double precision, blng double precision) language plpgsql stable security definer set search_path = public as $$
declare h text; a double precision; r double precision; salt text;
begin
  select v into salt from public.app_secrets where k = 'blur_salt';
  h := md5(salt || sid::text);
  a := (('x' || substr(h, 1, 8))::bit(32)::bigint)::double precision / 4294967296.0 * 2 * pi();
  r := 100 + 300 * ((('x' || substr(h, 9, 8))::bit(32)::bigint)::double precision / 4294967296.0);
  blat := p_lat + (r * cos(a)) / 111320.0;
  blng := p_lng + (r * sin(a)) / (111320.0 * cos(radians(p_lat)));
  return next;
end $$;
revoke all on function public.blur_point(uuid, double precision, double precision) from public, anon, authenticated;

-- Profile creation (called by the app after sign-in). The original circle become friends automatically.
create or replace function public.make_handle(base text) returns text language plpgsql stable as $$
declare b text := lower(regexp_replace(coalesce(base, ''), '[^a-zA-Z0-9]', '', 'g')); h text; n int := 0;
begin
  if char_length(b) < 3 then b := 'angler' || b; end if;
  b := left(b, 16); h := b;
  while exists (select 1 from public.profiles where lower(handle) = h) loop n := n + 1; h := b || n::text; end loop;
  return h;
end $$;
create or replace function public.ensure_profile() returns public.profiles language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.members; p public.profiles; o record;
begin
  if me is null then return null; end if;
  select * into m from public.members where email = lower(coalesce(auth.jwt() ->> 'email', ''));
  if m.email is null or m.status <> 'approved' then return null; end if;
  select * into p from public.profiles where user_id = me;
  if p.user_id is null then
    insert into public.profiles (user_id, handle, display_name)
    values (me, public.make_handle(coalesce(m.display_name, split_part(m.email, '@', 1))), coalesce(nullif(btrim(m.display_name), ''), split_part(m.email, '@', 1)))
    returning * into p;
  end if;
  if m.crew then
    for o in select pr.user_id from public.profiles pr join auth.users u on u.id = pr.user_id
             join public.members mm on mm.email = lower(u.email) where mm.crew and mm.status = 'approved' and pr.user_id <> me loop
      insert into public.friendships (user_a, user_b, status, requested_by) values (least(me, o.user_id), greatest(me, o.user_id), 'accepted', me)
      on conflict (user_a, user_b) do update set status = 'accepted';
    end loop;
  end if;
  return p;
end $$;
grant execute on function public.ensure_profile() to authenticated;

-- Profiles for everyone already here (and friendships among the original circle)
do $$
declare r record; me uuid; o record;
begin
  for r in select u.id, m.email, m.display_name from public.members m join auth.users u on lower(u.email) = m.email where m.status = 'approved' loop
    if not exists (select 1 from public.profiles where user_id = r.id) then
      insert into public.profiles (user_id, handle, display_name)
      values (r.id, public.make_handle(coalesce(r.display_name, split_part(r.email, '@', 1))), coalesce(nullif(btrim(r.display_name), ''), split_part(r.email, '@', 1)));
    end if;
  end loop;
  for r in select u.id from public.members m join auth.users u on lower(u.email) = m.email where m.crew and m.status = 'approved' loop
    for o in select u.id from public.members m join auth.users u on lower(u.email) = m.email where m.crew and m.status = 'approved' and u.id > r.id loop
      insert into public.friendships (user_a, user_b, status, requested_by) values (r.id, o.id, 'accepted', r.id) on conflict do nothing;
    end loop;
  end loop;
end $$;
