-- 18: Contests (V4.6). Official tournaments (admin only) + friend competitions (invite-only).
-- Applied as 3 Supabase migrations: tournaments_tables, tournaments_write_fns (+ tournaments_fix_is_friend), tournaments_scoring_fns.
-- NOTE: the tables part below is a faithful re-statement of tournaments_tables; the functions are exactly what is live.

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(), created_at timestamptz default now(),
  created_by uuid default auth.uid(), kind text not null check (kind in ('official','friends')),
  title text not null check (char_length(title) between 3 and 60), description text check (char_length(description) <= 300),
  starts_at timestamptz not null, ends_at timestamptz not null,
  boards text[] not null check (cardinality(boards) between 1 and 4 and boards <@ array['length','weight','fish','species']),
  species text check (char_length(species) <= 40), require_photo boolean not null default false, require_length boolean not null default false,
  geo_lat double precision, geo_lng double precision, geo_radius_mi double precision check (geo_radius_mi between 0.1 and 100),
  geo_label text check (char_length(geo_label) <= 60), cancelled_at timestamptz,
  check (ends_at > starts_at and ends_at <= starts_at + interval '45 days'),
  check ((geo_lat is null) = (geo_lng is null) and (geo_lat is null) = (geo_radius_mi is null)),
  check (kind <> 'official' or (require_photo and require_length))
);
create table if not exists tournament_members (
  tournament_id uuid references tournaments(id) on delete cascade, user_id uuid not null,
  status text not null check (status in ('invited','joined','left')), invited_by uuid,
  created_at timestamptz default now(), joined_at timestamptz, primary key (tournament_id, user_id)
);
create table if not exists catch_geo (
  catch_id uuid primary key references catches(id) on delete cascade, lat double precision not null, lng double precision not null,
  accuracy_m real, captured_at timestamptz not null default now()
);
-- helpers is_tournament_member(tid), can_see_tournament(tid); RLS: see tournaments / see tournament members / see own geo / add own geo.
-- Clients may only SELECT tournaments + tournament_members and SELECT/INSERT catch_geo; every other write goes through the functions below.

-- ===== functions (live versions) =====
-- create_tournament(kind,title,desc,starts,ends,boards,species,photo,length,lat,lng,radius,label,invites[]) -> id
--   official only for admin (forces photo+length); start may be <=1h in the past; creator auto-joined; invitees must be friends.
-- join_tournament(id)  official: any member while open; friends: only if invited
-- leave_tournament(id) / cancel_tournament(id) (creator or admin) / invite_to_tournament(id, user) (creator, friends kind)
-- tournament_catch_flags(id)  INTERNAL (not granted): each joined member's catches in the window + ok/reason
--     rules: official => catch visibility public; species filter; require_length; require_photo; geo => catch_geo present,
--     accuracy <=150 m, stamp within 30 min of caught_at, haversine <= radius
-- tournament_standings(id) -> user_id, board, value, species, caught_at, catch_id   (length=max, weight=max non-estimated, fish=sum, species=distinct)
-- tournament_my_catches(id) -> my catches with ok/reason
-- Full function bodies: see Supabase migrations list (names above) or pg_get_functiondef.
