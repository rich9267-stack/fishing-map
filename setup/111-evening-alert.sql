-- 111: 🌅 Evening "tomorrow looks good" alert (v213, idea from plans/competitor-bite-audit.md). Off until a person ticks it in Settings → Phone alerts.
-- notif_prefs: evening (on/off), eve_time (default 7:00 pm, their own clock), eve_last_date (sent / checked today).
-- evening_due() / evening_mark(): like morning_due / morning_mark (setup/22). The morning-bites edge function's 10-minute cron run handles both.
-- enqueue_notification: new kind 'evening' follows the evening tick box (everything else unchanged; quiet hours apply).
-- No new table.
alter table public.notif_prefs add column if not exists evening boolean not null default false;
alter table public.notif_prefs add column if not exists eve_time time not null default '19:00';
alter table public.notif_prefs add column if not exists eve_last_date date;

create or replace function public.evening_due()
returns table(user_id uuid, tz text, local_date date)
language sql security definer set search_path = public as $$
  with p as (
    select n.user_id, coalesce(n.tz,'America/New_York') tz, n.eve_time, n.eve_last_date,
           (now() at time zone coalesce(n.tz,'America/New_York')) lt
    from notif_prefs n
    where n.evening
      and exists (select 1 from push_subscriptions s where s.user_id = n.user_id)
  )
  select p.user_id, p.tz, p.lt::date
  from p
  where p.eve_last_date is distinct from p.lt::date
    and p.lt::time >= p.eve_time and p.lt::time < p.eve_time + interval '2 hours'
$$;

create or replace function public.evening_mark(p_user uuid, p_date date)
returns void language sql security definer set search_path = public as $$
  update notif_prefs set eve_last_date = p_date where user_id = p_user
$$;

revoke all on function public.evening_due(), public.evening_mark(uuid, date) from public, anon, authenticated;

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
        when 'evening' then coalesce(pr.evening, false)
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

-- (second migration 'evening_alert_kind') the notifications list only allowed certain kinds; 'evening' added to it
alter table public.notifications drop constraint if exists notifications_kind_check2;
alter table public.notifications add constraint notifications_kind_check3 check (kind = any (array['social','contests','trips','conditions','evening','test','safety','weather','weather_urgent','weekly','red_tide']));
