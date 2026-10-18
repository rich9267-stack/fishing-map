-- Admin controls, step 5: bring-back (undo) for removed things + safer bans.
-- * A ban now needs a written reason (at least 5 letters); the reason goes in the admin log.
-- * restore_content(): bring back a removed catch or comment (needs the 'reports' box).
-- * restore_host_page(): reopen a page an admin closed (needs the 'pages' box); it goes back to the status it had.
-- * removed_items(): the list for the Admin page's "Removed" section: things an admin removed in the last N days
--   (catches, comments, spots, pages) that are still removed. Each kind only shows to admins with the matching box.
-- * the log now also records: content_restored, spot_restored, and "(was approved)" on closed pages.
-- No new table (the weekly backup needs nothing - database-change-rule.md).

drop function if exists public.ban_user(uuid);
create or replace function public.ban_user(p_user uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_power('ban') then raise exception 'admins only'; end if;
  p_reason := trim(coalesce(p_reason, ''));
  if length(p_reason) < 5 then raise exception 'Write a reason for the ban (at least 5 letters)'; end if;
  perform set_config('app.ban_reason', left(p_reason, 150), true);
  update public.members set status = 'blocked' where is_admin = false and lower(email) = (select lower(email) from auth.users where id = p_user);
  perform set_config('app.ban_reason', '', true);
end $$;
revoke all on function public.ban_user(uuid, text) from public, anon;
grant execute on function public.ban_user(uuid, text) to authenticated;

create or replace function private.audit_members() returns trigger
language plpgsql security definer set search_path = public as $$
declare why text := nullif(coalesce(current_setting('app.ban_reason', true), ''), '');
begin
  if tg_op = 'INSERT' then
    perform private.log_admin('invite_added', 'member', new.email, new.status);
  elsif tg_op = 'DELETE' then
    perform private.log_admin('removed_from_list', 'member', old.email, old.status);
  else
    if new.status is distinct from old.status then
      perform private.log_admin(
        case new.status when 'approved' then 'access_approved' when 'declined' then 'access_declined'
                        when 'blocked' then 'banned' else 'status_changed' end,
        'member', new.email, old.status || ' -> ' || new.status || coalesce(' · reason: ' || why, ''));
    end if;
    if new.is_admin is distinct from old.is_admin then
      perform private.log_admin(case when new.is_admin then 'admin_made' else 'admin_removed' end, 'member', new.email,
                                array_to_string(new.powers, ', '));
    elsif new.powers is distinct from old.powers then
      perform private.log_admin('admin_boxes_changed', 'member', new.email, array_to_string(new.powers, ', '));
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- log removals AND bring-backs of catches and comments done by someone other than the author
create or replace function private.audit_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(new); by_other boolean;
begin
  by_other := coalesce(j ->> 'created_by', j ->> 'user_id', j ->> 'author') is distinct from auth.uid()::text;
  if old.deleted_at is null and new.deleted_at is not null and by_other then
    perform private.log_admin('content_removed', tg_argv[0], new.id::text, null);
  elsif old.deleted_at is not null and new.deleted_at is null and by_other then
    perform private.log_admin('content_restored', tg_argv[0], new.id::text, null);
  end if;
  return new;
end $$;

create or replace function private.audit_spots() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.deleted_at is null and new.deleted_at is not null and new.created_by is distinct from auth.uid() then
    perform private.log_admin('spot_deleted', 'spot', new.id::text, new.name);
  elsif old.deleted_at is not null and new.deleted_at is null and new.created_by is distinct from auth.uid() then
    perform private.log_admin('spot_restored', 'spot', new.id::text, new.name);
  end if;
  return new;
end $$;

create or replace function private.audit_host_pages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform private.log_admin('page_removed', 'host_page', old.id::text, old.name);
  elsif new.status is distinct from old.status and new.owner is distinct from auth.uid() then
    perform private.log_admin('page_' || new.status, 'host_page', new.id::text, new.name || ' (was ' || old.status || ')');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create or replace function public.restore_content(p_type text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_power('reports') then raise exception 'admins only'; end if;
  if p_type = 'catch' then update public.catches set deleted_at = null where id = p_id and deleted_at is not null;
  elsif p_type = 'comment' then update public.catch_comments set deleted_at = null where id = p_id and deleted_at is not null;
  else raise exception 'unsupported type'; end if;
end $$;
revoke all on function public.restore_content(text, uuid) from public, anon;
grant execute on function public.restore_content(text, uuid) to authenticated;

create or replace function public.restore_host_page(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare prev text;
begin
  if not public.has_power('pages') then raise exception 'admins only'; end if;
  if not exists (select 1 from public.host_pages where id = p_id and status = 'closed') then raise exception 'That page is not closed'; end if;
  select substring(detail from '\(was (pending|approved|declined)\)') into prev from public.admin_log
    where action = 'page_closed' and target_id = p_id::text order by at desc limit 1;
  update public.host_pages set status = coalesce(prev, 'pending') where id = p_id;
end $$;
revoke all on function public.restore_host_page(uuid) from public, anon;
grant execute on function public.restore_host_page(uuid) to authenticated;

create or replace function public.removed_items(p_days int default 30) returns table (kind text, id uuid, label text, who text, removed_at timestamptz, removed_by text)
language sql stable security definer set search_path = public as $$
  with l as (
    select distinct on (action, target_id) action, target_id, at, actor_email
    from public.admin_log
    where action in ('content_removed', 'spot_deleted', 'page_closed') and at > now() - make_interval(days => least(greatest(p_days, 1), 365))
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
  select 'spot', s.id, s.name, (select name from nm where nm.id = s.created_by), l.at, l.actor_email
    from l join public.spots s on s.id::text = l.target_id and s.deleted_at is not null
    where l.action = 'spot_deleted' and public.has_power('delete_spot')
  union all
  select 'page', h.id, h.name, (select name from nm where nm.id = h.owner), l.at, l.actor_email
    from l join public.host_pages h on h.id::text = l.target_id and h.status = 'closed'
    where l.action = 'page_closed' and public.has_power('pages')
  order by 5 desc
$$;
revoke all on function public.removed_items(int) from public, anon;
grant execute on function public.removed_items(int) to authenticated;
