-- Admin controls, step 2: the admin log.
-- Every owner/admin action is written to public.admin_log by database triggers (so the app can't skip it).
-- Only people with the 'read_log' power can read it. Nobody can add, edit or delete lines from the app.
-- Never stores coordinates or message text: only who, what, which item, and a short label (a name or a status).
-- New table 'admin_log' (normal table: the weekly backup picks it up by itself - database-change-rule.md).
-- Actions done in the SQL Editor are not signed-in users, so they are not logged.

create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid not null,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  detail text
);
create index if not exists admin_log_at_idx on public.admin_log (at desc);

alter table public.admin_log enable row level security;
drop policy if exists "read admin log" on public.admin_log;
create policy "read admin log" on public.admin_log for select using (public.has_power('read_log'));
revoke all on public.admin_log from anon, authenticated;
grant select on public.admin_log to authenticated;

-- Lines can't be changed or removed by signed-in users, even if a policy is added by mistake later.
create or replace function private.admin_log_lock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'authenticated' then raise exception 'The admin log cannot be changed'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists admin_log_lock on public.admin_log;
create trigger admin_log_lock before update or delete on public.admin_log
  for each row execute function private.admin_log_lock();

-- write one line (only when the signed-in user is an admin/owner)
create or replace function private.log_admin(p_action text, p_type text, p_target text, p_detail text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin() then return; end if;
  insert into public.admin_log (actor, actor_email, action, target_type, target_id, detail)
  values (auth.uid(), lower(coalesce(auth.jwt() ->> 'email', '')), p_action, p_type, p_target, left(p_detail, 200));
end $$;
revoke all on function private.log_admin(text, text, text, text) from public, anon, authenticated;

-- ===== one trigger function per kind of table =====

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
      perform private.log_admin(case when new.is_admin then 'admin_made' else 'admin_removed' end, 'member', new.email, null);
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create or replace function private.audit_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform private.log_admin('report_' || new.status, 'report', new.id::text, new.target_type);
  end if;
  return new;
end $$;

-- catches and comments removed by an admin (not by their own author)
create or replace function private.audit_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(new);
begin
  if old.deleted_at is null and new.deleted_at is not null
     and coalesce(j ->> 'created_by', j ->> 'user_id', j ->> 'author') is distinct from auth.uid()::text then
    perform private.log_admin('content_removed', tg_argv[0], new.id::text, null);
  end if;
  return new;
end $$;

create or replace function private.audit_spots() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.deleted_at is null and new.deleted_at is not null and new.created_by is distinct from auth.uid() then
    perform private.log_admin('spot_deleted', 'spot', new.id::text, new.name);
  end if;
  return new;
end $$;

create or replace function private.audit_official() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.source <> 'admin' then return new; end if;
  if tg_op = 'INSERT' then
    perform private.log_admin('official_place_made', 'official_spot', new.id::text, new.name || ' (' || new.kind || ')');
  elsif new.active is distinct from old.active or new.name is distinct from old.name or new.kind is distinct from old.kind then
    perform private.log_admin(case when new.active then 'official_place_changed' else 'official_place_removed' end,
                              'official_spot', new.id::text, new.name || ' (' || new.kind || ')');
  end if;
  return new;
end $$;

create or replace function private.audit_host_pages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform private.log_admin('page_removed', 'host_page', old.id::text, old.name);
  elsif new.status is distinct from old.status and new.owner is distinct from auth.uid() then
    perform private.log_admin('page_' || new.status, 'host_page', new.id::text, new.name);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create or replace function private.audit_page_renames() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.requested_by is distinct from auth.uid() then
    perform private.log_admin('rename_' || new.status, 'host_page', new.page_id::text, new.old_name || ' -> ' || new.new_name);
  end if;
  return new;
end $$;

create or replace function private.audit_host_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is distinct from auth.uid() then
    perform private.log_admin('business_allowance_set', 'member', new.user_id::text, new.business_allowed::text);
  end if;
  return new;
end $$;

create or replace function private.audit_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.log_admin(case when tg_op = 'INSERT' then 'rule_added' else 'rule_changed' end, 'fish_rule', new.id::text, new.species);
  return new;
end $$;

create or replace function private.audit_problems() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform private.log_admin('problem_' || new.status, 'problem_report', new.id::text, null);
  end if;
  return new;
end $$;

create or replace function private.audit_flagged() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.decision is distinct from old.decision and new.decision is not null then
    perform private.log_admin('flagged_' || new.decision, 'auto_hidden', new.id::text, new.target_type);
  end if;
  return new;
end $$;

create or replace function private.audit_tournaments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.kind = 'official' and new.host_page_id is null then
      perform private.log_admin('tournament_created', 'tournament', new.id::text, new.title);
    end if;
  elsif old.cancelled_at is null and new.cancelled_at is not null and new.created_by is distinct from auth.uid() then
    perform private.log_admin('tournament_cancelled', 'tournament', new.id::text, new.title);
  end if;
  return new;
end $$;

create or replace function private.audit_series() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.kind = 'official' and new.host_page_id is null then
      perform private.log_admin('series_created', 'tournament_series', new.id::text, new.title);
    end if;
  elsif old.stopped_at is null and new.stopped_at is not null and new.created_by is distinct from auth.uid() then
    perform private.log_admin('series_stopped', 'tournament_series', new.id::text, new.title);
  end if;
  return new;
end $$;

-- ===== attach them =====
drop trigger if exists audit_members on public.members;
create trigger audit_members after insert or update or delete on public.members for each row execute function private.audit_members();
drop trigger if exists audit_reports on public.reports;
create trigger audit_reports after update on public.reports for each row execute function private.audit_reports();
drop trigger if exists audit_content on public.catches;
create trigger audit_content after update on public.catches for each row execute function private.audit_content('catch');
drop trigger if exists audit_content on public.catch_comments;
create trigger audit_content after update on public.catch_comments for each row execute function private.audit_content('comment');
drop trigger if exists audit_spots on public.spots;
create trigger audit_spots after update on public.spots for each row execute function private.audit_spots();
drop trigger if exists audit_official on public.official_spots;
create trigger audit_official after insert or update on public.official_spots for each row execute function private.audit_official();
drop trigger if exists audit_host_pages on public.host_pages;
create trigger audit_host_pages after update or delete on public.host_pages for each row execute function private.audit_host_pages();
drop trigger if exists audit_page_renames on public.host_page_renames;
create trigger audit_page_renames after update on public.host_page_renames for each row execute function private.audit_page_renames();
drop trigger if exists audit_host_limits on public.host_limits;
create trigger audit_host_limits after insert or update on public.host_limits for each row execute function private.audit_host_limits();
drop trigger if exists audit_rules on public.fish_rules;
create trigger audit_rules after insert or update on public.fish_rules for each row execute function private.audit_rules();
drop trigger if exists audit_problems on public.problem_reports;
create trigger audit_problems after update on public.problem_reports for each row execute function private.audit_problems();
drop trigger if exists audit_flagged on public.auto_hidden;
create trigger audit_flagged after update on public.auto_hidden for each row execute function private.audit_flagged();
drop trigger if exists audit_tournaments on public.tournaments;
create trigger audit_tournaments after insert or update on public.tournaments for each row execute function private.audit_tournaments();
drop trigger if exists audit_series on public.tournament_series;
create trigger audit_series after insert or update on public.tournament_series for each row execute function private.audit_series();
