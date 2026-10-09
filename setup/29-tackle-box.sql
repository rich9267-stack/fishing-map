-- 29: tackle box (migration `tackle_box`; tests/test57.js). Private per person: RLS lets a member read/add/edit only their own rows;
-- delete = soft delete (deleted_at). kind: bait|lure|rod|line|other. Stats in the app are worked out on the phone by matching
-- the item name against the "Bait / lure" text of your own catches.
create table if not exists public.tackle (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default 'other' check (kind in ('bait','lure','rod','line','other')),
  notes text check (char_length(notes) <= 200),
  deleted_at timestamptz);
create index if not exists tackle_owner on public.tackle (created_by) where deleted_at is null;
alter table public.tackle enable row level security;
revoke all on public.tackle from authenticated, anon, public;
grant select, insert, update on public.tackle to authenticated;
create policy "own tackle read" on public.tackle for select using (public.is_member() and created_by = auth.uid());
create policy "own tackle add" on public.tackle for insert with check (public.is_member() and created_by = auth.uid());
create policy "own tackle edit" on public.tackle for update using (public.is_member() and created_by = auth.uid()) with check (created_by = auth.uid());
