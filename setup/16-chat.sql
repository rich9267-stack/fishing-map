-- Step E: direct messages between friends (applied as migrations "chat_messages" and "chat_messages_tighten_grants")
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sender uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  read_at timestamptz
);
create index if not exists messages_pair_idx on public.messages (sender, recipient, created_at desc);
create index if not exists messages_inbox_idx on public.messages (recipient, read_at);
alter table public.messages enable row level security;
create policy "see own messages" on public.messages for select using (auth.uid() in (sender, recipient));
create policy "message a friend" on public.messages for insert
  with check (public.is_member() and sender = auth.uid() and read_at is null and public.is_friend(recipient));
create policy "delete own message" on public.messages for delete using (sender = auth.uid());
-- Only the receiver can mark a conversation read; nobody can edit message text (no update right at all)
create or replace function public.mark_read(p_other uuid) returns void
  language sql security definer set search_path = public as $$
  update public.messages set read_at = now() where recipient = auth.uid() and sender = p_other and read_at is null;
$$;
revoke all on function public.mark_read(uuid) from public, anon;
grant execute on function public.mark_read(uuid) to authenticated;
revoke all on public.messages from authenticated, anon, public;
grant select, insert, delete on public.messages to authenticated;
