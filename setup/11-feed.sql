-- V4 step 3: catch feed — 👍 reactions and short comments on catches.
-- Who can see them follows who can see the catch (private spots stay private).
create table if not exists public.catch_reactions (
  catch_id uuid not null references public.catches(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (catch_id, user_id)
);
create table if not exists public.catch_comments (
  id uuid primary key default gen_random_uuid(),
  catch_id uuid not null references public.catches(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author text,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists catch_comments_catch_idx on public.catch_comments (catch_id, created_at);
alter table public.catch_reactions enable row level security;
alter table public.catch_comments enable row level security;

create policy "members read reactions" on public.catch_reactions for select
  using (is_member() and exists (select 1 from public.catches c where c.id = catch_id));
create policy "members react" on public.catch_reactions for insert
  with check (is_member() and user_id = auth.uid() and exists (select 1 from public.catches c where c.id = catch_id));
create policy "members unreact" on public.catch_reactions for delete
  using (user_id = auth.uid());

create policy "members read comments" on public.catch_comments for select
  using (is_member() and exists (select 1 from public.catches c where c.id = catch_id));
create policy "members comment" on public.catch_comments for insert
  with check (is_member() and created_by = auth.uid() and exists (select 1 from public.catches c where c.id = catch_id));
create policy "authors edit comments" on public.catch_comments for update
  using (is_member() and created_by = auth.uid()) with check (is_member() and created_by = auth.uid());
