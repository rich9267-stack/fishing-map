-- Admin controls, step 6: warn someone.
-- An admin with the 'warn' box sends a person a plain warning (typed reason, at least 5 letters).
-- The person gets it in their Alerts list AND as a phone alert (alert kind 'safety': it can't be switched off and ignores quiet hours).
-- Every warning is kept in admin_warnings so reports can show "N warnings" and a ban can show how many warnings came first.
-- NEW TABLE admin_warnings: a normal table, so the weekly backup picks it up by itself (database-change-rule.md);
-- Sunday's message will say "New table added to the backup: admin_warnings".
-- Warnings are written only by warn_user(); nobody can edit or delete them from the app.

create table if not exists public.admin_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  issued_by uuid not null,
  reason text not null,
  report_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists admin_warnings_user_idx on public.admin_warnings (user_id);

alter table public.admin_warnings enable row level security;
drop policy if exists "admins read warnings" on public.admin_warnings;
create policy "admins read warnings" on public.admin_warnings for select
  using (public.has_power('warn') or public.has_power('ban') or public.has_power('reports'));
revoke all on public.admin_warnings from anon, authenticated;
grant select on public.admin_warnings to authenticated;

create or replace function public.warn_user(p_user uuid, p_reason text, p_report uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare w uuid; target_email text;
begin
  if not public.has_power('warn') then raise exception 'You need the "Warn" box for that'; end if;
  p_reason := trim(coalesce(p_reason, ''));
  if length(p_reason) < 5 then raise exception 'Write a reason for the warning (at least 5 letters)'; end if;
  if p_user is null or p_user = auth.uid() then raise exception 'You cannot warn yourself'; end if;
  select email into target_email from auth.users where id = p_user;
  if target_email is null then raise exception 'That person was not found'; end if;
  if exists (select 1 from public.members where lower(email) = lower(target_email) and is_admin) then
    raise exception 'Admins cannot be warned here'; end if;
  insert into public.admin_warnings (user_id, issued_by, reason, report_id)
  values (p_user, auth.uid(), left(p_reason, 150), p_report) returning id into w;
  perform public.enqueue_notification(p_user, 'safety', '⚠️ A warning from the Fishing Map team',
    left('Please follow the community rules. Reason: ' || p_reason, 160), '?go=feed', 'warn:' || w::text);
end $$;
revoke all on function public.warn_user(uuid, text, uuid) from public, anon;
grant execute on function public.warn_user(uuid, text, uuid) to authenticated;

-- log it (only when the signed-in user is an admin, like every other log line)
create or replace function private.audit_warnings() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.log_admin('person_warned', 'member', coalesce((select lower(email) from auth.users where id = new.user_id), new.user_id::text), new.reason);
  return new;
end $$;
drop trigger if exists audit_warnings on public.admin_warnings;
create trigger audit_warnings after insert on public.admin_warnings
  for each row execute function private.audit_warnings();
