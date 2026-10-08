-- Fishing Map: the shared "spots" table.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.spots (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  name           text not null check (char_length(name) between 1 and 80),
  spot_type      text not null check (spot_type in ('dock','bridge','inlet','pier','jetty','seawall','ramp')),
  water_type     text not null check (water_type in ('saltwater','brackish','freshwater')),
  notes          text check (char_length(notes) <= 1000),
  added_by       text check (char_length(added_by) <= 40),
  public_access  text not null default 'unsure' check (public_access in ('yes','no','unsure')),
  parking        text check (parking in ('free lot','paid','street','none')),
  getting_there  text check (getting_there in ('walk-up','short walk','long walk on sand/gravel','needs 4x4')),
  access_notes   text check (char_length(access_notes) <= 500),
  lat            double precision check (lat between -90 and 90),
  lng            double precision check (lng between -180 and 180)
);

-- Anyone with the website link can see, add, and edit spots.
-- Deleting is NOT allowed from the website (protects against accidents);
-- delete spots from the Supabase dashboard instead.
alter table public.spots enable row level security;

drop policy if exists "link users can read spots" on public.spots;
drop policy if exists "link users can add spots" on public.spots;
drop policy if exists "link users can edit spots" on public.spots;

create policy "link users can read spots" on public.spots for select to anon using (true);
create policy "link users can add spots"  on public.spots for insert to anon with check (true);
create policy "link users can edit spots" on public.spots for update to anon using (true) with check (true);
