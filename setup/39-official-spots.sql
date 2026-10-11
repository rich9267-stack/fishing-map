-- 39: official public spots (public boat ramps + parks/piers where fishing is allowed), shared by everyone.
-- Quick catch names a new spot after the nearest one (within ~400 ft).
-- Data loaded once (Oct 2026) from the database itself via pg_net, South Florida box lat 25.1-27.0, lng -80.95 to -79.95:
--   source 'fwc-ramp': FWC Florida Boat Ramp Inventory (open, general public use)  ~210 ramps
--   source 'fl-fori' : FL DEP Florida Outdoor Recreation Inventory, sites with piers/catwalks/jetties/bank fishing  ~136 (non-fishing places set active=false)
create table if not exists public.official_spots (
  id bigserial primary key,
  source text not null,
  source_id text not null,
  name text not null,
  kind text not null check (kind in ('ramp','park','pier','jetty','bridge','dock')),
  lat double precision not null,
  lng double precision not null,
  water_type text,
  county text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  active boolean not null default true,
  unique (source, source_id)
);
create index if not exists official_spots_geo on public.official_spots (lat, lng);
alter table public.official_spots enable row level security;
create policy "members read official spots" on public.official_spots for select using (public.is_member() and active);
create table if not exists public.official_import_jobs (
  request_id bigint primary key, source text not null, label text, created_at timestamptz not null default now()
);
alter table public.official_import_jobs enable row level security;
