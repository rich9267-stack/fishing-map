-- 59: Home waters (UX/Gulf expansion step 1a). Each person's own home fishing area, kept private (only the owner can read or change it).
-- The public text on a profile page stays in profiles.home_area; this table holds the map point the app uses to tell "home" from "away".
-- Applied as Supabase migration `home_waters`.
create table if not exists public.home_waters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  updated_at timestamptz not null default now()
);
alter table public.home_waters enable row level security;
create policy "own home waters read" on public.home_waters for select using (user_id = (select auth.uid()));
create policy "own home waters insert" on public.home_waters for insert with check (user_id = (select auth.uid()));
create policy "own home waters update" on public.home_waters for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own home waters delete" on public.home_waters for delete using (user_id = (select auth.uid()));
