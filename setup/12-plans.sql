-- V4 step 4: "Who's going?" trip plans. Visibility follows the spot (private spots stay private).
create table if not exists public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author text,
  plan_at timestamptz not null,
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index if not exists trip_plans_when_idx on public.trip_plans (plan_at);
create table if not exists public.trip_plan_rsvps (
  plan_id uuid not null references public.trip_plans(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);
alter table public.trip_plans enable row level security;
alter table public.trip_plan_rsvps enable row level security;

create policy "members read plans" on public.trip_plans for select
  using (is_member() and exists (select 1 from public.spots s where s.id = spot_id));
create policy "members add plans" on public.trip_plans for insert
  with check (is_member() and created_by = auth.uid() and exists (select 1 from public.spots s where s.id = spot_id));
create policy "owners edit plans" on public.trip_plans for update
  using (is_member() and created_by = auth.uid()) with check (is_member() and created_by = auth.uid());

create policy "members read rsvps" on public.trip_plan_rsvps for select
  using (is_member() and exists (select 1 from public.trip_plans p where p.id = plan_id));
create policy "members join plans" on public.trip_plan_rsvps for insert
  with check (is_member() and user_id = auth.uid() and exists (select 1 from public.trip_plans p where p.id = plan_id));
create policy "members leave plans" on public.trip_plan_rsvps for delete
  using (user_id = auth.uid());
