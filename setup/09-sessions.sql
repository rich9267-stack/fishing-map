-- V4 step 1: fishing trips ("sessions"), applied via the Supabase connector Oct 8 2026
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id),
  spot_id uuid not null references public.spots(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  anglers smallint not null default 1 check (anglers between 1 and 20),
  fish smallint not null default 0 check (fish between 0 and 1000),
  hours jsonb,   -- conditions for each hour fished
  notes text check (char_length(notes) <= 500),
  deleted_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);
create index if not exists sessions_spot_idx on public.sessions (spot_id, started_at desc);
alter table public.sessions enable row level security;
create policy "members read sessions" on public.sessions for select to authenticated
  using (is_member() and exists (select 1 from public.spots s where s.id = sessions.spot_id));
create policy "members add sessions" on public.sessions for insert to authenticated
  with check (is_member() and created_by = auth.uid() and exists (select 1 from public.spots s where s.id = sessions.spot_id));
create policy "owners edit sessions" on public.sessions for update to authenticated
  using (is_member() and created_by = auth.uid()) with check (is_member() and created_by = auth.uid());
alter table public.catches add column if not exists session_id uuid references public.sessions(id);
