-- Admin controls, step 4: admins and tick boxes.
-- members.powers = the boxes ticked for an admin (starts empty = nothing allowed). The owner always has every box.
-- has_power(p): owner = yes; admin = only if p is ticked; the 4 gated powers stay owner-only until Legal has checked the wording.
-- Every admin function and rule that said "is_admin()" now asks for the matching box instead
-- (is_admin() is still used for "is this person any kind of admin", e.g. the log writer and "admins can't delete their account").
-- New function set_admin() = the only way to make/remove an admin or change boxes (needs the 'manage_admins' box).
-- No new table: the weekly backup needs nothing (database-change-rule.md). Only Richard is an admin today, so nobody loses anything.

alter table public.members add column if not exists powers text[] not null default '{}';

-- Only set_admin() (or the SQL Editor) may change who is an admin or which boxes are ticked.
create or replace function private.guard_powers() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'authenticated' and coalesce(current_setting('app.admin_rpc', true), '') <> '1' then
    if tg_op = 'INSERT' and (new.is_admin or new.powers <> '{}') then
      raise exception 'Admins can only be made with the Admins screen';
    elsif tg_op = 'UPDATE' and (new.is_admin is distinct from old.is_admin or new.powers is distinct from old.powers) then
      raise exception 'Admins can only be changed with the Admins screen';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_powers on public.members;
create trigger guard_powers before insert or update on public.members
  for each row execute function private.guard_powers();

create or replace function public.has_power(p text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if not (p = any (public.admin_power_names())) then raise exception 'unknown power: %', p; end if;
  if public.is_owner() then return true; end if;
  if p in ('open_private_spots','review_chat','correct_coins','delete_person_data') then return false; end if;
  return exists (select 1 from public.members
    where email = lower(coalesce(auth.jwt() ->> 'email', '')) and is_admin and status = 'approved' and p = any (powers));
end $$;

-- The app reads the signed-in person's boxes with this (owner gets all 16 normal ones).
create or replace function public.my_powers() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(p order by p), '{}') from unnest(public.admin_power_names()) p
  where public.has_power(p);
$$;
revoke all on function public.my_powers() from public, anon;
grant execute on function public.my_powers() to authenticated;

-- Make or remove an admin and set the boxes. Owner can do anything except change the owner.
-- Anyone else with 'manage_admins' can only hand out boxes they hold themselves, and can't change someone who holds a box they lack.
create or replace function public.set_admin(p_email text, p_make boolean, p_powers text[] default '{}') returns void
language plpgsql security definer set search_path = public as $$
declare t public.members; clean text[]; x text; me_owner boolean := public.is_owner();
begin
  if not public.has_power('manage_admins') then raise exception 'You need the "Manage admins" box for that'; end if;
  p_email := lower(trim(coalesce(p_email, '')));
  select * into t from public.members where email = p_email;
  if not found then raise exception 'That person is not on the list'; end if;
  if t.is_owner then raise exception 'The owner account cannot be changed'; end if;
  if p_email = lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'You cannot change your own admin boxes'; end if;
  if p_make and t.status <> 'approved' then raise exception 'Only approved members can be admins'; end if;
  select coalesce(array_agg(distinct v order by v), '{}') into clean from unnest(coalesce(p_powers, '{}')) v;
  foreach x in array clean loop
    if not (x = any (public.admin_power_names())) then raise exception 'unknown box: %', x; end if;
    if x in ('open_private_spots','review_chat','correct_coins','delete_person_data') then raise exception 'That box is locked for now'; end if;
  end loop;
  if not me_owner then
    foreach x in array clean loop
      if not public.has_power(x) then raise exception 'You can only give boxes you have yourself'; end if;
    end loop;
    foreach x in array t.powers loop
      if not public.has_power(x) then raise exception 'That admin has a box you do not have, so only the owner can change them'; end if;
    end loop;
  end if;
  perform set_config('app.admin_rpc', '1', true);
  update public.members set is_admin = p_make, powers = case when p_make then clean else '{}' end where email = p_email;
  perform set_config('app.admin_rpc', '', true);
end $$;
revoke all on function public.set_admin(text, boolean, text[]) from public, anon;
grant execute on function public.set_admin(text, boolean, text[]) to authenticated;

-- log a change of boxes too
create or replace function private.audit_members() returns trigger
language plpgsql security definer set search_path = public as $$
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
        'member', new.email, old.status || ' -> ' || new.status);
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

-- ===== every admin function / rule now asks for its own box =====
do $$
declare
  fmap jsonb := '{
    "admin_official_set":"official_places","admin_official_unset":"official_places",
    "admin_stats":"dashboard","ban_user":"ban",
    "cancel_tournament":"tournaments","create_series":"tournaments","create_series_v1":"tournaments","create_tournament":"tournaments",
    "create_tournament_series":"tournaments","stop_series":"tournaments","set_series_months":"tournaments","set_team_mode":"tournaments",
    "close_host_page":"pages","host_page_renames_admin":"pages","host_pages_admin":"pages","review_host_page":"pages",
    "review_host_page_rename":"pages","set_business_allowance":"pages",
    "delete_spot":"delete_spot","restore_spot":"delete_spot",
    "remove_content":"reports","resolve_report":"reports","restore_hidden":"reports","review_flagged":"reports",
    "review_access":"people"}';
  pmap jsonb := '{
    "auto_hidden|admin sees auto hidden":"public.has_power(''reports'')",
    "fish_rules|fish_rules_add":"public.has_power(''rules'')",
    "fish_rules|fish_rules_edit":"public.has_power(''rules'')",
    "host_limits|admin sees limits":"public.has_power(''pages'')",
    "host_page_renames|see own rename requests":"public.has_power(''pages'')",
    "host_pages|see host pages":"public.has_power(''pages'')",
    "members|admins add members":"public.has_power(''invite'')",
    "members|admins remove members":"public.has_power(''remove_from_list'')",
    "members|members see the list":"(public.has_power(''people'') or public.has_power(''invite'') or public.has_power(''remove_from_list'') or public.has_power(''manage_admins''))",
    "problem_reports|admins mark done":"public.has_power(''problems'')",
    "problem_reports|see own or all as admin":"public.has_power(''problems'')",
    "reports|see reports":"public.has_power(''reports'')",
    "tournament_series|series_admin_read":"public.has_power(''tournaments'')"}';
  r record; d text; k text; q text; w text; sql text;
begin
  for r in select p.oid, p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace
           where s.nspname = 'public' and p.prokind = 'f' and fmap ? p.proname loop
    d := pg_get_functiondef(r.oid);
    if d like '%is_admin()%' then
      execute replace(d, 'is_admin()', 'has_power(''' || (fmap ->> r.proname) || ''')');
    end if;
  end loop;
  for r in select * from pg_policies where schemaname = 'public' loop
    k := r.tablename || '|' || r.policyname;
    if pmap ? k then
      q := replace(coalesce(r.qual, ''), 'is_admin()', pmap ->> k);
      w := replace(coalesce(r.with_check, ''), 'is_admin()', pmap ->> k);
      sql := format('alter policy %I on public.%I', r.policyname, r.tablename);
      if r.qual is not null then sql := sql || ' using (' || q || ')'; end if;
      if r.with_check is not null then sql := sql || ' with check (' || w || ')'; end if;
      execute sql;
    end if;
  end loop;
end $$;
