-- Step F: blocks + reports (applied as migrations moderation_blocks, moderation_block_rules, moderation_reports,
-- moderation_is_friend_respects_blocks). Note: when applied through the Supabase safety check, a DELETE inside a
-- function is refused, so block_user only records the block; the app then removes the friendship row itself.

create table if not exists public.blocks (
  blocker uuid not null default auth.uid() references auth.users(id) on delete cascade,
  blocked uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked), check (blocker <> blocked));
alter table public.blocks enable row level security;
create policy "see my blocks" on public.blocks for select using (blocker = auth.uid());
create policy "unblock" on public.blocks for delete using (blocker = auth.uid());
revoke all on public.blocks from authenticated, anon, public;
grant select, delete on public.blocks to authenticated;

create or replace function public.is_blocked(u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks b where (b.blocker = auth.uid() and b.blocked = u) or (b.blocker = u and b.blocked = auth.uid())); $$;
create or replace function public.block_user(p_user uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_member() then raise exception 'not allowed'; end if;
  if p_user = auth.uid() then raise exception 'you cannot block yourself'; end if;
  insert into public.blocks(blocker, blocked) values (auth.uid(), p_user) on conflict do nothing;
end $$;
revoke all on function public.is_blocked(uuid) from public, anon; grant execute on function public.is_blocked(uuid) to authenticated;
revoke all on function public.block_user(uuid) from public, anon; grant execute on function public.block_user(uuid) to authenticated;

-- A blocked pair is never "friends" (even if the friendship row still exists)
create or replace function public.is_friend(u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships f where f.status = 'accepted'
    and f.user_a = least(auth.uid(), u) and f.user_b = greatest(auth.uid(), u) and auth.uid() <> u)
    and not exists (select 1 from public.blocks b where (b.blocker = auth.uid() and b.blocked = u) or (b.blocker = u and b.blocked = auth.uid())); $$;

-- Public paths also respect blocks: catches policy, can_see_catch_id, can_see_spot, spots_visible_fn (public branch:
--   `s.visibility = 'public' and not public.is_blocked(s.created_by)`), comments, messages (see + send), friend requests.
alter policy "members read catches" on public.catches
  using (public.is_member() and (created_by = auth.uid() or (visibility in ('friends','public') and public.is_friend(created_by)) or (visibility = 'public' and not public.is_blocked(created_by))));
alter policy "members read comments" on public.catch_comments
  using (public.is_member() and not public.is_blocked(created_by) and exists (select 1 from public.catches c where c.id = catch_comments.catch_id));
alter policy "see own messages" on public.messages
  using (auth.uid() in (sender, recipient) and not public.is_blocked(case when sender = auth.uid() then recipient else sender end));
alter policy "message a friend" on public.messages
  with check (public.is_member() and sender = auth.uid() and read_at is null and public.is_friend(recipient) and not public.is_blocked(recipient));
alter policy "send friend request" on public.friendships
  with check (public.is_member() and requested_by = auth.uid() and auth.uid() in (user_a, user_b) and status = 'pending'
    and not public.is_blocked(case when user_a = auth.uid() then user_b else user_a end));
-- (can_see_catch_id, can_see_spot and spots_visible_fn were re-created with `and not public.is_blocked(<owner>)` on their public branch)

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reporter uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_user uuid references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('catch','comment','message','profile','spot')),
  target_id uuid,
  reason text not null check (reason in ('spam','harassment','inappropriate','private_info','other')),
  details text check (char_length(details) <= 300),
  snippet text check (char_length(snippet) <= 200),
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_at timestamptz);
create unique index if not exists reports_one_open on public.reports (reporter, target_type, coalesce(target_id, target_user)) where status = 'open';
alter table public.reports enable row level security;
create policy "file a report" on public.reports for insert with check (public.is_member() and reporter = auth.uid() and status = 'open');
create policy "see reports" on public.reports for select using (reporter = auth.uid() or public.is_admin());
revoke all on public.reports from authenticated, anon, public;
grant select, insert on public.reports to authenticated;
-- Admin-only functions: resolve_report(uuid), remove_content('catch'|'comment', uuid) (soft delete), ban_user(uuid)
-- (sets members.status = 'blocked' for a non-admin). Each starts with: if not public.is_admin() then raise exception 'admins only'.
