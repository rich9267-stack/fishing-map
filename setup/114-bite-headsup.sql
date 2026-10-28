-- 114: ⏰ Bite-window heads-up (v229). Off until a person ticks it in Settings → Phone alerts.
-- notif_prefs: headsup (on/off), headsup_last_date (sent today = max 1 a day), headsup_checked_at (so each person is checked about once an hour).
-- headsup_due() / headsup_mark(): like evening_due / evening_mark (setup/111). The morning-bites edge function's 10-minute cron run handles it:
-- it looks at today's plan for followed ⭐ spots only and sends one alert when a strong window starts 1–2 hours from now.
-- enqueue_notification: new kind 'headsup' follows the headsup tick box (everything else unchanged; quiet hours apply). No new table.
alter table public.notif_prefs add column if not exists headsup boolean not null default false;
alter table public.notif_prefs add column if not exists headsup_last_date date;
alter table public.notif_prefs add column if not exists headsup_checked_at timestamptz;

create or replace function public.headsup_due()
returns table(user_id uuid, local_date date, now_min int)
language sql security definer set search_path = public as $$
  with p as (
    select n.user_id, n.headsup_last_date, n.headsup_checked_at,
           (now() at time zone coalesce(n.tz,'America/New_York')) lt
    from notif_prefs n
    where n.headsup
      and exists (select 1 from push_subscriptions s where s.user_id = n.user_id)
  )
  select p.user_id, p.lt::date, (extract(hour from p.lt)*60 + extract(minute from p.lt))::int
  from p
  where p.headsup_last_date is distinct from p.lt::date
    and p.lt::time >= '04:00' and p.lt::time < '19:00'
    and (p.headsup_checked_at is null or p.headsup_checked_at < now() - interval '40 minutes')
$$;

create or replace function public.headsup_mark(p_user uuid, p_date date, p_sent boolean)
returns void language sql security definer set search_path = public as $$
  update notif_prefs set headsup_checked_at = now(), headsup_last_date = case when p_sent then p_date else headsup_last_date end where user_id = p_user
$$;

revoke all on function public.headsup_due(), public.headsup_mark(uuid, date, boolean) from public, anon, authenticated;

create or replace function public.enqueue_notification(p_user uuid, p_kind text, p_title text, p_body text, p_url text, p_dedupe text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare pr notif_prefs%rowtype; ok boolean; nid uuid; sec text; lt time; quiet boolean := false; has_phone boolean;
begin
  if p_user is null then return; end if;
  select * into pr from notif_prefs where user_id = p_user;
  ok := case p_kind when 'social' then coalesce(pr.social, true) when 'contests' then coalesce(pr.contests, true)
        when 'trips' then coalesce(pr.trips, true) when 'conditions' then coalesce(pr.conditions, false)
        when 'evening' then coalesce(pr.evening, false) when 'headsup' then coalesce(pr.headsup, false)
        when 'weather' then coalesce(pr.weather, true) when 'weather_urgent' then coalesce(pr.weather, true)
        when 'weekly' then coalesce(pr.weekly, true) when 'red_tide' then coalesce(pr.red_tide, true) else true end;
  if not ok then return; end if;
  has_phone := exists (select 1 from push_subscriptions where user_id = p_user);
  if has_phone and p_kind not in ('test', 'safety', 'weather_urgent') and coalesce(pr.quiet_enabled, false) then
    begin
      lt := (now() at time zone coalesce(pr.tz, 'America/New_York'))::time;
    exception when others then
      lt := (now() at time zone 'America/New_York')::time;
    end;
    quiet := case when pr.quiet_start <= pr.quiet_end then (lt >= pr.quiet_start and lt < pr.quiet_end)
                  else (lt >= pr.quiet_start or lt < pr.quiet_end) end;
  end if;
  insert into notifications(user_id, kind, title, body, url, dedupe_key, sent_at, result)
  values (p_user, p_kind, left(p_title, 80), left(p_body, 160), p_url, p_dedupe,
          case when quiet or not has_phone then now() end,
          case when not has_phone then 'no phone' when quiet then 'quiet hours' end)
  on conflict (dedupe_key) do nothing returning id into nid;
  if nid is null or quiet or not has_phone then return; end if;
  select hook_secret into sec from push_config where id = 1;
  if sec is null then return; end if;
  perform net.http_post(url := 'https://euxcisnyansdrzzjyvsl.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', sec),
    body := jsonb_build_object('notification_id', nid));
exception when others then
  return;
end $function$;


alter table public.notifications drop constraint if exists notifications_kind_check3;
alter table public.notifications add constraint notifications_kind_check4 check (kind = any (array['social','contests','trips','conditions','evening','headsup','test','safety','weather','weather_urgent','weekly','red_tide']));
