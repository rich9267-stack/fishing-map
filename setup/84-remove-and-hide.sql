-- Admin controls, step 7: remove a reported photo or message, and hide a public spot.
-- No new table (only new columns), so the weekly backup needs nothing.
--  * messages.deleted_at   : a reported chat message can be removed (soft, so it can be brought back). Needs the Reports box AND an existing report about that message.
--  * photos.hidden_at      : a catch's photo(s) can be hidden without removing the catch. Needs the Reports box AND a report about that catch.
--  * spots.hidden_at       : a public spot can be hidden from everybody except its owner. Needs the "Hide public spots" box and a typed reason (5+ letters).
--                            The owner gets a phone alert that can't be switched off (kind 'safety'). Hide is reversible (unhide_spot).
-- Only these functions can change the hidden columns (guard trigger + the app.admin_rpc flag, like set_admin).

alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.photos add column if not exists hidden_at timestamptz;
alter table public.spots add column if not exists hidden_at timestamptz;
alter table public.spots add column if not exists hidden_by uuid;

-- ---- messages: removed ones disappear for both people
drop policy if exists "see own messages" on public.messages;
create policy "see own messages" on public.messages for select
  using (deleted_at is null and ((auth.uid() = sender) or (auth.uid() = recipient))
         and not public.is_blocked(case when sender = auth.uid() then recipient else sender end));

-- ---- photos: hidden ones are seen only by the person who took them
drop policy if exists "members see photos" on public.photos;
create policy "members see photos" on public.photos for select
  using (public.is_member() and (created_by = auth.uid() or (hidden_at is null and (
    (catch_id is not null and public.can_see_catch_id(catch_id)) or (catch_id is null and public.can_see_spot(spot_id))))));

-- ---- spots: hidden ones are seen only by the owner
drop policy if exists "members read spots" on public.spots;
create policy "members read spots" on public.spots for select
  using (public.is_member() and (created_by = auth.uid()
    or (hidden_at is null and visibility <> 'private' and not hide_exact_from_friends and public.is_friend(created_by))));

create or replace function public.can_see_spot(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_member() and exists (select 1 from public.spots s where s.id = sid and s.deleted_at is null and (
    s.created_by = auth.uid() or (s.hidden_at is null and (
      (s.visibility <> 'private' and public.is_friend(s.created_by)) or (s.visibility = 'public' and not public.is_blocked(s.created_by))))));
$$;

-- spots_visible_fn: same body as before plus "not hidden unless it's yours"
do $$
declare d text;
begin
  d := pg_get_functiondef('public.spots_visible_fn()'::regprocedure);
  if position('hidden_at' in d) = 0 then
    d := replace(d, 'where s.deleted_at is null and public.is_member() and (',
                    'where s.deleted_at is null and (s.hidden_at is null or s.created_by = auth.uid()) and public.is_member() and (');
    if position('hidden_at' in d) = 0 then raise exception 'spots_visible_fn text not found'; end if;
    execute d;
  end if;
end $$;

-- ---- guard: only the admin functions below may change the hidden columns
create or replace function private.guard_hidden() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'authenticated' and coalesce(current_setting('app.admin_rpc', true), '') <> '1' then
    if tg_op = 'INSERT' and (new.hidden_at is not null) then raise exception 'Not allowed';
    elsif tg_op = 'UPDATE' and (new.hidden_at is distinct from old.hidden_at) then raise exception 'Only the team can hide or show this'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_hidden on public.spots;
create trigger guard_hidden before insert or update on public.spots for each row execute function private.guard_hidden();
drop trigger if exists guard_hidden on public.photos;
create trigger guard_hidden before insert or update on public.photos for each row execute function private.guard_hidden();

-- ---- remove / bring back a reported message (catch + comment work as before)
create or replace function public.remove_content(p_type text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_power('reports') then raise exception 'admins only'; end if;
  if p_type = 'catch' then update public.catches set deleted_at = now() where id = p_id;
  elsif p_type = 'comment' then update public.catch_comments set deleted_at = now() where id = p_id;
  elsif p_type = 'message' then
    if not exists (select 1 from public.reports where target_type = 'message' and target_id = p_id) then
      raise exception 'A chat message can only be removed when someone has reported it'; end if;
    update public.messages set deleted_at = now() where id = p_id and deleted_at is null;
  else raise exception 'unsupported type'; end if;
end $$;

create or replace function public.restore_content(p_type text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_power('reports') then raise exception 'admins only'; end if;
  if p_type = 'catch' then update public.catches set deleted_at = null where id = p_id and deleted_at is not null;
  elsif p_type = 'comment' then update public.catch_comments set deleted_at = null where id = p_id and deleted_at is not null;
  elsif p_type = 'message' then update public.messages set deleted_at = null where id = p_id and deleted_at is not null;
  else raise exception 'unsupported type'; end if;
end $$;

-- ---- hide / show the photo(s) of a reported catch (the catch itself stays)
create or replace function public.hide_catch_photos(p_catch uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.has_power('reports') then raise exception 'admins only'; end if;
  if not exists (select 1 from public.reports where target_type = 'catch' and target_id = p_catch) then
    raise exception 'A photo can only be removed when its catch has been reported'; end if;
  perform set_config('app.admin_rpc', '1', true);
  update public.photos set hidden_at = now() where catch_id = p_catch and hidden_at is null;
  get diagnostics n = row_count;
  return n;
end $$;
create or replace function public.show_catch_photos(p_catch uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.has_power('reports') then raise exception 'admins only'; end if;
  perform set_config('app.admin_rpc', '1', true);
  update public.photos set hidden_at = null where catch_id = p_catch and hidden_at is not null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---- hide / show a public spot
create or replace function public.hide_spot(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare s record;
begin
  if not public.has_power('hide_spots') then raise exception 'You need the "Hide public spots" box for that'; end if;
  p_reason := trim(coalesce(p_reason, ''));
  if length(p_reason) < 5 then raise exception 'Write a reason (at least 5 letters)'; end if;
  select id, name, created_by, visibility, hidden_at into s from public.spots where id = p_id and deleted_at is null;
  if not found then raise exception 'Spot not found'; end if;
  if s.visibility <> 'public' then raise exception 'Only public spots can be hidden'; end if;
  if s.created_by = auth.uid() then raise exception 'That is your own spot'; end if;
  if s.hidden_at is not null then raise exception 'Already hidden'; end if;
  perform set_config('app.admin_rpc', '1', true);
  perform set_config('app.hide_reason', left(p_reason, 150), true);
  update public.spots set hidden_at = now(), hidden_by = auth.uid() where id = p_id;
  perform public.enqueue_notification(s.created_by, 'safety', '📍 Your spot was hidden from others',
    left('The team hid "' || s.name || '" from other people. Only you can still see it. Reason: ' || p_reason, 160), '?go=map',
    'hide:' || p_id::text || ':' || extract(epoch from now())::bigint::text);
end $$;
create or replace function public.unhide_spot(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_power('hide_spots') then raise exception 'You need the "Hide public spots" box for that'; end if;
  if not exists (select 1 from public.spots where id = p_id and hidden_at is not null) then raise exception 'That spot is not hidden'; end if;
  perform set_config('app.admin_rpc', '1', true);
  update public.spots set hidden_at = null, hidden_by = null where id = p_id;
end $$;

revoke all on function public.hide_catch_photos(uuid), public.show_catch_photos(uuid), public.hide_spot(uuid, text), public.unhide_spot(uuid) from public, anon;
grant execute on function public.hide_catch_photos(uuid), public.show_catch_photos(uuid), public.hide_spot(uuid, text), public.unhide_spot(uuid) to authenticated;

-- ---- the log
create or replace function private.audit_spots() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.deleted_at is null and new.deleted_at is not null and new.created_by is distinct from auth.uid() then
    perform private.log_admin('spot_deleted', 'spot', new.id::text, new.name);
  elsif old.deleted_at is not null and new.deleted_at is null and new.created_by is distinct from auth.uid() then
    perform private.log_admin('spot_restored', 'spot', new.id::text, new.name);
  elsif old.hidden_at is null and new.hidden_at is not null then
    perform private.log_admin('spot_hidden', 'spot', new.id::text, new.name || ' · reason: ' || coalesce(current_setting('app.hide_reason', true), ''));
  elsif old.hidden_at is not null and new.hidden_at is null then
    perform private.log_admin('spot_unhidden', 'spot', new.id::text, new.name);
  end if;
  return new;
end $$;

create or replace function private.audit_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(new); by_other boolean;
begin
  by_other := coalesce(j ->> 'created_by', j ->> 'user_id', j ->> 'author', j ->> 'sender') is distinct from auth.uid()::text;
  if old.deleted_at is null and new.deleted_at is not null and by_other then
    perform private.log_admin('content_removed', tg_argv[0], new.id::text, null);
  elsif old.deleted_at is not null and new.deleted_at is null and by_other then
    perform private.log_admin('content_restored', tg_argv[0], new.id::text, null);
  end if;
  return new;
end $$;
drop trigger if exists audit_content on public.messages;
create trigger audit_content after update on public.messages for each row execute function private.audit_content('message');

create or replace function private.audit_photos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.hidden_at is null and new.hidden_at is not null then
    perform private.log_admin('photo_hidden', 'catch', new.catch_id::text, null);
  elsif old.hidden_at is not null and new.hidden_at is null then
    perform private.log_admin('photo_restored', 'catch', new.catch_id::text, null);
  end if;
  return new;
end $$;
drop trigger if exists audit_photos on public.photos;
create trigger audit_photos after update on public.photos for each row execute function private.audit_photos();

-- ---- Removed section: add messages, photos and hidden spots
create or replace function public.removed_items(p_days integer default 30)
returns table(kind text, id uuid, label text, who text, removed_at timestamptz, removed_by text)
language sql stable security definer set search_path = public as $$
  with l as (
    select distinct on (action, target_id) action, target_id, at, actor_email
    from public.admin_log
    where action in ('content_removed', 'spot_deleted', 'page_closed', 'photo_hidden', 'spot_hidden') and at > now() - make_interval(days => least(greatest(p_days, 1), 365))
    order by action, target_id, at desc
  ), nm as (
    select u.id, coalesce(m.display_name, u.email) as name
    from auth.users u left join public.members m on lower(m.email) = lower(u.email)
  )
  select 'catch', c.id, coalesce(c.species, 'catch') || ' catch', (select name from nm where nm.id = c.created_by), l.at, l.actor_email
    from l join public.catches c on c.id::text = l.target_id and c.deleted_at is not null
    where l.action = 'content_removed' and public.has_power('reports')
  union all
  select 'comment', c.id, left(c.body, 40), (select name from nm where nm.id = c.created_by), l.at, l.actor_email
    from l join public.catch_comments c on c.id::text = l.target_id and c.deleted_at is not null
    where l.action = 'content_removed' and public.has_power('reports')
  union all
  select 'message', m.id, 'a chat message', (select name from nm where nm.id = m.sender), l.at, l.actor_email
    from l join public.messages m on m.id::text = l.target_id and m.deleted_at is not null
    where l.action = 'content_removed' and public.has_power('reports')
  union all
  select 'photo', c.id, 'photo on ' || coalesce(c.species, 'a') || ' catch', (select name from nm where nm.id = c.created_by), l.at, l.actor_email
    from l join public.catches c on c.id::text = l.target_id and exists (select 1 from public.photos p where p.catch_id = c.id and p.hidden_at is not null)
    where l.action = 'photo_hidden' and public.has_power('reports')
  union all
  select 'spot', s.id, s.name, (select name from nm where nm.id = s.created_by), l.at, l.actor_email
    from l join public.spots s on s.id::text = l.target_id and s.deleted_at is not null
    where l.action = 'spot_deleted' and public.has_power('delete_spot')
  union all
  select 'hidden_spot', s.id, s.name, (select name from nm where nm.id = s.created_by), l.at, l.actor_email
    from l join public.spots s on s.id::text = l.target_id and s.deleted_at is null and s.hidden_at is not null
    where l.action = 'spot_hidden' and public.has_power('hide_spots')
  union all
  select 'page', h.id, h.name, (select name from nm where nm.id = h.owner), l.at, l.actor_email
    from l join public.host_pages h on h.id::text = l.target_id and h.status = 'closed'
    where l.action = 'page_closed' and public.has_power('pages')
  order by 5 desc
$$;
