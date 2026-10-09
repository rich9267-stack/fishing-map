-- 27: auto-hide after 3 reports + admin dashboard (migration `auto_hide_admin_stats`; tests/test53.js)
-- auto_hidden table (admin read only); trigger reports_auto_hide: when 3 different people have OPEN reports on the same
-- catch/comment, it is soft-deleted (deleted_at) and logged in auto_hidden. restore_hidden(id) (admin) un-hides it and
-- resolves its reports. admin_stats() (admin) returns counts, top species and the hidden list as json.
create table if not exists public.auto_hidden (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('catch','comment')),
  target_id uuid not null,
  hidden_at timestamptz not null default now(),
  report_count int not null default 0,
  restored_at timestamptz,
  unique (target_type, target_id));
alter table public.auto_hidden enable row level security;
revoke all on public.auto_hidden from authenticated, anon, public;
create policy "admin sees auto hidden" on public.auto_hidden for select using (public.is_admin());
grant select on public.auto_hidden to authenticated;

create or replace function public.reports_auto_hide() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.target_id is null or new.target_type not in ('catch','comment') then return new; end if;
  select count(distinct reporter) into n from public.reports
    where target_type = new.target_type and target_id = new.target_id and status = 'open';
  if n >= 3 then
    if new.target_type = 'catch' then update public.catches set deleted_at = coalesce(deleted_at, now()) where id = new.target_id;
    else update public.catch_comments set deleted_at = coalesce(deleted_at, now()) where id = new.target_id; end if;
    insert into public.auto_hidden(target_type, target_id, report_count) values (new.target_type, new.target_id, n)
      on conflict (target_type, target_id) do update set report_count = excluded.report_count where public.auto_hidden.restored_at is null;
  end if;
  return new;
end $$;
create or replace trigger reports_auto_hide_trg after insert on public.reports for each row execute function public.reports_auto_hide();
-- restore_hidden(uuid) and admin_stats(): both start with `if not public.is_admin() then raise exception 'admins only'`

-- CHANGED same day (migration `blur_for_review_instead_of_hide`): nothing is hidden automatically any more.
-- 3 different reporters => catches/catch_comments.review_state = 'blurred' (app blurs it and shows "Under review"),
-- row logged in auto_hidden, and every approved admin gets a push (kind social, url ?go=invite, dedupe review:<type>:<id>).
-- Admin decides in Invite -> Dashboard: review_flagged(id,'keep') => review_state 'cleared' (never re-blurred),
-- or 'remove' => soft delete. Both resolve the open reports. Trigger guard_review_state stops normal users changing
-- review_state. restore_hidden() is no longer callable.
alter table public.catches add column if not exists review_state text check (review_state in ('blurred','cleared'));
alter table public.catch_comments add column if not exists review_state text check (review_state in ('blurred','cleared'));
alter table public.auto_hidden add column if not exists decision text check (decision in ('kept','removed'));
