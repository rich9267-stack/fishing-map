-- 123: Planned trips that end at the right time — step 1 (v253, migration `trip_lifecycle_step1`).
-- Plan: Project doc claude/trip-lifecycle-plan.md. No new table (backup rule: nothing to change).
-- trip_plans gets: back_by (roughly when people will be back), ended_at (when the trip ended), boat (🚤 boat trip).
-- sessions (▶ Start trip) gets plan_id: which planned trip it is part of. Start trip was already saved when it starts.
alter table public.trip_plans add column if not exists back_by timestamptz;
alter table public.trip_plans add column if not exists ended_at timestamptz;
alter table public.trip_plans add column if not exists boat boolean not null default false;
alter table public.trip_plans add constraint trip_plans_back_by_check check (back_by is null or back_by > plan_at);
alter table public.trip_plans add constraint trip_plans_ended_at_check check (ended_at is null or ended_at >= created_at);

-- If a planned trip goes away (its planner deletes their account), the Start trips just lose the link.
alter table public.sessions add column if not exists plan_id uuid references public.trip_plans(id) on delete set null;
create index if not exists sessions_plan_idx on public.sessions (plan_id) where plan_id is not null;

-- You can only link your Start trip to a planned trip you are allowed to see.
alter policy "members add sessions" on public.sessions
  with check (public.is_member() and created_by = auth.uid() and public.can_see_spot(spot_id)
    and (plan_id is null or exists (select 1 from public.trip_plans p where p.id = plan_id)));
alter policy "owners edit sessions" on public.sessions
  with check (public.is_member() and created_by = auth.uid()
    and (plan_id is null or exists (select 1 from public.trip_plans p where p.id = plan_id)));
