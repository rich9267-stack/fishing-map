-- 36: fishing groups / teams (step 2 of the profile + groups work). Invite-only, made of friends.
-- Everything goes through functions (no direct writes). "Leaving"/"removing" are statuses, never deletes.
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 40),
  description text check (description is null or char_length(description) <= 200),
  accent text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),
  avatar_path text,
  deleted_at timestamptz
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'invited' check (status in ('invited', 'joined', 'declined', 'left', 'removed')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000)
);
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.team_messages enable row level security;

create or replace function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_member() and exists (
    select 1 from public.group_members m join public.groups g on g.id = m.group_id
    where m.group_id = gid and m.user_id = auth.uid() and m.status = 'joined' and g.deleted_at is null);
$$;

create policy "see my groups" on public.groups for select using (
  public.is_member() and deleted_at is null and (public.is_group_member(id)
    or exists (select 1 from public.group_members m where m.group_id = groups.id and m.user_id = auth.uid() and m.status = 'invited')));
create policy "see group members" on public.group_members for select using (
  public.is_member() and (user_id = auth.uid() or public.is_group_member(group_id)));
create policy "read team chat" on public.team_messages for select using (public.is_group_member(group_id) and not public.is_blocked(sender));
create policy "write team chat" on public.team_messages for insert with check (sender = auth.uid() and public.is_group_member(group_id));
create policy "delete own team message" on public.team_messages for delete using (sender = auth.uid());

create or replace function public.create_group(p_name text, p_desc text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if not public.is_member() then raise exception 'sign in first'; end if;
  if (select count(*) from public.groups where created_by = auth.uid() and deleted_at is null) >= 5 then
    raise exception 'You can run up to 5 groups.'; end if;
  insert into public.groups (name, description, created_by) values (btrim(p_name), nullif(btrim(coalesce(p_desc, '')), ''), auth.uid()) returning id into gid;
  insert into public.group_members (group_id, user_id, role, status, invited_by) values (gid, auth.uid(), 'owner', 'joined', auth.uid());
  return gid;
end $$;

create or replace function public.invite_to_group(p_gid uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g record; cur record; n int;
begin
  if not public.is_group_member(p_gid) then raise exception 'only members can invite'; end if;
  select * into g from public.groups where id = p_gid;
  if p_user = auth.uid() then raise exception 'you are already in'; end if;
  if not public.is_friend(p_user) then raise exception 'You can only invite your friends.'; end if;
  if public.is_blocked(p_user) then raise exception 'You can''t invite that person.'; end if;
  select count(*) into n from public.group_members where group_id = p_gid and status in ('joined', 'invited');
  if n >= 25 then raise exception 'A group can have up to 25 people.'; end if;
  select * into cur from public.group_members where group_id = p_gid and user_id = p_user;
  if found then
    if cur.status in ('joined', 'invited') then return; end if;
    if cur.status = 'removed' and g.created_by <> auth.uid() then raise exception 'Only the group owner can invite someone who was removed.'; end if;
    update public.group_members set status = 'invited', invited_by = auth.uid(), updated_at = now() where group_id = p_gid and user_id = p_user;
  else
    insert into public.group_members (group_id, user_id, role, status, invited_by) values (p_gid, p_user, 'member', 'invited', auth.uid());
  end if;
  perform public.enqueue_notification(p_user, 'social', '👥 Group invite', public.push_name(auth.uid()) || ' invited you to ' || g.name,
    '?go=group&scope=team&id=' || p_gid, 'gi:' || p_gid || ':' || p_user || ':' || extract(epoch from now())::bigint);
end $$;

create or replace function public.respond_group(p_gid uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.group_members set status = case when p_accept then 'joined' else 'declined' end, updated_at = now()
    where group_id = p_gid and user_id = auth.uid() and status = 'invited';
  if not found then raise exception 'no invitation found'; end if;
end $$;

create or replace function public.leave_group(p_gid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.group_members set status = 'left', updated_at = now() where group_id = p_gid and user_id = auth.uid() and status = 'joined' and role <> 'owner';
  if not found then raise exception 'The owner can''t leave — delete the group instead.'; end if;
end $$;

create or replace function public.remove_from_group(p_gid uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.groups where id = p_gid and created_by = auth.uid() and deleted_at is null) then raise exception 'only the owner can remove people'; end if;
  if p_user = auth.uid() then raise exception 'you are the owner'; end if;
  update public.group_members set status = 'removed', updated_at = now() where group_id = p_gid and user_id = p_user and status in ('joined', 'invited');
end $$;

create or replace function public.update_group(p_gid uuid, p_name text, p_desc text, p_accent text, p_avatar text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.groups set name = btrim(p_name), description = nullif(btrim(coalesce(p_desc, '')), ''), accent = p_accent, avatar_path = p_avatar
    where id = p_gid and created_by = auth.uid() and deleted_at is null;
  if not found then raise exception 'only the owner can edit the group'; end if;
end $$;

create or replace function public.delete_group(p_gid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.groups set deleted_at = now() where id = p_gid and created_by = auth.uid() and deleted_at is null;
  if not found then raise exception 'only the owner can delete the group'; end if;
end $$;

-- Team leaderboard: totals per member for catches that are not private (private catches never count)
create or replace function public.group_board(p_gid uuid, p_since timestamptz default null)
returns table(user_id uuid, fish bigint, catches bigint, longest numeric, species bigint, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id,
    coalesce(sum(coalesce(c.how_many, 1)), 0)::bigint, count(c.id)::bigint, max(c.length_in)::numeric,
    count(distinct lower(btrim(c.species))) filter (where c.species is not null and btrim(c.species) <> '')::bigint, max(c.caught_at)
  from public.group_members m
  left join public.catches c on c.created_by = m.user_id and c.deleted_at is null and c.visibility <> 'private'
       and (p_since is null or c.caught_at >= p_since)
  where public.is_group_member(p_gid) and m.group_id = p_gid and m.status = 'joined'
  group by m.user_id
  order by 2 desc, 4 desc nulls last;
$$;

-- Team chat alerts
create or replace function public.trg_push_team() returns trigger
language plpgsql security definer set search_path = public as $$
declare ttl text; u uuid;
begin
  select name into ttl from public.groups where id = new.group_id;
  for u in select user_id from public.group_members where group_id = new.group_id and status = 'joined' loop
    if u <> new.sender and not public.is_blocked(u) then
      perform public.enqueue_notification(u, 'social', '💬 ' || coalesce(ttl, 'Group'), public.push_name(new.sender) || ': ' || new.body,
        '?go=group&scope=team&id=' || new.group_id, 'tm:' || new.id || ':' || u);
    end if;
  end loop;
  return new;
end $$;
create or replace trigger push_team after insert on public.team_messages for each row execute function public.trg_push_team();

revoke all on function public.create_group(text, text), public.invite_to_group(uuid, uuid), public.respond_group(uuid, boolean), public.leave_group(uuid),
  public.remove_from_group(uuid, uuid), public.update_group(uuid, text, text, text, text), public.delete_group(uuid), public.group_board(uuid, timestamptz) from public, anon;
grant execute on function public.create_group(text, text), public.invite_to_group(uuid, uuid), public.respond_group(uuid, boolean), public.leave_group(uuid),
  public.remove_from_group(uuid, uuid), public.update_group(uuid, text, text, text, text), public.delete_group(uuid), public.group_board(uuid, timestamptz) to authenticated;

-- Group pictures: private bucket, one folder per group; the owner uploads, members view
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('group-avatars', 'group-avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;
create policy "owner uploads group picture" on storage.objects for insert with check (
  bucket_id = 'group-avatars' and exists (select 1 from public.groups g where g.id::text = (storage.foldername(name))[1] and g.created_by = auth.uid()));
create policy "members view group picture" on storage.objects for select using (
  bucket_id = 'group-avatars' and public.is_group_member(((storage.foldername(name))[1])::uuid));
create policy "owner deletes group picture" on storage.objects for delete using (
  bucket_id = 'group-avatars' and exists (select 1 from public.groups g where g.id::text = (storage.foldername(name))[1] and g.created_by = auth.uid()));
