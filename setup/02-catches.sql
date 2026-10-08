-- Fishing Map: the catch log (many catches per spot).
-- Already applied to the live database on Oct 8, 2026; kept here for the record.

create table if not exists public.catches (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  spot_id          uuid not null references public.spots(id) on delete cascade,
  caught_at        timestamptz not null default now(),
  species          text not null check (char_length(species) between 1 and 60),
  how_many         integer not null default 1 check (how_many between 1 and 500),
  bait             text check (char_length(bait) <= 80),
  tide_stage       text check (tide_stage in ('incoming','outgoing','high slack','low slack')),
  notes            text check (char_length(notes) <= 500),
  caught_by        text check (char_length(caught_by) <= 40),
  -- conditions captured automatically when the catch is logged
  pressure_inhg    numeric(5,2) check (pressure_inhg between 25 and 33),
  pressure_trend   text check (pressure_trend in ('rising','falling','steady')),
  wind_dir         text check (char_length(wind_dir) <= 5),
  wind_mph         integer check (wind_mph between 0 and 200),
  air_temp_f       integer check (air_temp_f between -40 and 140)
);

create index if not exists catches_spot_id_idx on public.catches (spot_id, caught_at desc);

alter table public.catches enable row level security;

create policy "link users can read catches" on public.catches for select to anon using (true);
create policy "link users can add catches"  on public.catches for insert to anon with check (true);
create policy "link users can edit catches" on public.catches for update to anon using (true) with check (true);
