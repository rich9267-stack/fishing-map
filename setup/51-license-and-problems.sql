-- 51: 🎫 Fishing license reminders + 🐞 Report a problem (Oct 14, Fishbrain audit items 3 and 4).
-- Only create / alter-add / create-or-replace / grant (the Supabase connector cancels destructive statements).

-- ===== 🎫 Fishing licenses: your own list (name + end date), private to you =====
create table public.fishing_licenses (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 60),
  expires_on date,                    -- null = never runs out (lifetime, or you don't need one)
  created_at timestamptz not null default now()
);
create index fishing_licenses_user on public.fishing_licenses (user_id);
create index fishing_licenses_due on public.fishing_licenses (expires_on);
alter table public.fishing_licenses enable row level security;
create policy "see own licenses" on public.fishing_licenses for select using (user_id = auth.uid() and public.is_member());
create policy "add own licenses" on public.fishing_licenses for insert with check (
  user_id = auth.uid() and public.is_member()
  and (select count(*) from public.fishing_licenses x where x.user_id = auth.uid()) < 10);
create policy "change own licenses" on public.fishing_licenses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "remove own licenses" on public.fishing_licenses for delete using (user_id = auth.uid());
grant select, insert, update, delete on public.fishing_licenses to authenticated;
grant usage on sequence public.fishing_licenses_id_seq to authenticated;

-- Daily at 9 AM New York (13:00 UTC in summer, 8 AM in winter): one alert 14 days before, one on/just after the end date.
-- The dedupe key includes the end date, so after you renew (new date) the next reminders work again. Category "trips".
create or replace function private.license_reminders() returns int
language plpgsql volatile security definer set search_path = public, private as $$
declare r record; today date := (now() at time zone 'America/New_York')::date; k int := 0; left_days int;
begin
  for r in select * from public.fishing_licenses where expires_on between today - 3 and today + 14 loop
    left_days := r.expires_on - today;
    begin
      if left_days > 0 then
        perform public.enqueue_notification(r.user_id, 'trips', '🎫 Your fishing license runs out soon',
          'Your ' || r.kind || ' ends ' || to_char(r.expires_on, 'Mon FMDD') || ' (in ' || left_days || ' day' || case when left_days = 1 then '' else 's' end || '). Renew at Go Outdoors Florida.',
          './?go=license', 'license:' || r.id || ':' || r.expires_on || ':soon');
      else
        perform public.enqueue_notification(r.user_id, 'trips', '🎫 Your fishing license has run out',
          'Your ' || r.kind || ' ended ' || to_char(r.expires_on, 'Mon FMDD') || '. Renew before your next trip, then update the date in the app.',
          './?go=license', 'license:' || r.id || ':' || r.expires_on || ':ended');
      end if;
      k := k + 1;
    exception when others then null;
    end;
  end loop;
  return k;
end $$;

-- ===== 🐞 Problem reports: anyone signed in can send one; admins see them all and get a phone alert =====
create table public.problem_reports (
  id bigserial primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  who text,
  note text not null check (char_length(note) between 1 and 2000),
  app_version text check (char_length(app_version) <= 40),
  screen text check (char_length(screen) <= 40),
  device text check (char_length(device) <= 300),
  errors jsonb check (pg_column_size(errors) < 20000),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
create index problem_reports_new on public.problem_reports (status, created_at desc);
alter table public.problem_reports enable row level security;
create policy "send a problem report" on public.problem_reports for insert with check (
  user_id = auth.uid() and public.is_member()
  and (select count(*) from public.problem_reports x where x.user_id = auth.uid() and x.created_at > now() - interval '1 day') < 10);
create policy "see own or all as admin" on public.problem_reports for select using (user_id = auth.uid() or public.is_admin());
create policy "admins mark done" on public.problem_reports for update using (public.is_admin()) with check (public.is_admin());
grant select, insert, update on public.problem_reports to authenticated;
grant usage on sequence public.problem_reports_id_seq to authenticated;

create function private.trg_problem_alert() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare a record; nm text;
begin
  select coalesce(nullif(display_name, ''), handle) into nm from public.profiles where user_id = new.user_id;
  new.who := coalesce(nm, 'Someone');
  for a in select u.id from public.members m join auth.users u on lower(u.email) = lower(m.email) where m.is_admin and m.status = 'approved' loop
    begin
      perform public.enqueue_notification(a.id, 'social', '🐞 Problem report from ' || new.who, left(new.note, 140), './?go=problems', 'problem:' || new.id || ':' || a.id);
    exception when others then null;
    end;
  end loop;
  return new;
end $$;
-- runs before insert so it can fill in "who"; the id is already set by then (bigserial default)
create trigger problem_reports_alert before insert on public.problem_reports for each row execute function private.trg_problem_alert();

-- (applied as its own migration, license_reminders_cron)
select cron.schedule('license-reminders', '0 13 * * *', 'select private.license_reminders()');
-- Applied Oct 14 as migrations license_and_problems, license_reminders_cron, license_remove_own (the delete policy + grant, applied on
-- their own in case the connector refused them — it didn't) and license_reminders_emoji (🪪 → 🎫 in the alert titles).
