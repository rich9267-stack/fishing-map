-- 62: Red tide (Gulf expansion step 5, Oct 15). Applied as Supabase migrations `red_tide_alerts` (parts 1-3) and `red_tide_alerts_drop_old_rule` (part 4).
-- Data comes straight from FWC-FWRI (free, no key): "Karenia brevis cells per liter", sample dots from the last 8 days, refreshed daily.
--   https://gis.myfwc.com/mapping/rest/services/Projects_FWC/HAB_forDEP_Dashboard/MapServer/0   (Abundance: not present/background · very low · low · medium · high)
-- The app (js/30-red-tide.js) asks FWC directly for the map layer, the banner and Boat mode. The phone alert is the edge function
-- `red-tide-watch` (supabase/functions/red-tide-watch), run once a day by pg_cron job `red-tide-watch` (see part 5).

-- 1. a switch in Settings -> Phone alerts (default on)
alter table public.notif_prefs add column if not exists red_tide boolean not null default true;

-- 2. enqueue_notification: kind 'red_tide' follows that switch (and respects quiet hours, unlike weather_urgent / safety)
create or replace function public.enqueue_notification(p_user uuid, p_kind text, p_title text, p_body text, p_url text, p_dedupe text default null::text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare pr notif_prefs%rowtype; ok boolean; nid uuid; sec text; lt time; quiet boolean := false;
begin
  if p_user is null then return; end if;
  select * into pr from notif_prefs where user_id = p_user;
  ok := case p_kind when 'social' then coalesce(pr.social, true) when 'contests' then coalesce(pr.contests, true)
        when 'trips' then coalesce(pr.trips, true) when 'conditions' then coalesce(pr.conditions, false)
        when 'weather' then coalesce(pr.weather, true) when 'weather_urgent' then coalesce(pr.weather, true)
        when 'weekly' then coalesce(pr.weekly, true) when 'red_tide' then coalesce(pr.red_tide, true) else true end;
  if not ok then return; end if;
  if not exists (select 1 from push_subscriptions where user_id = p_user) then return; end if;
  if p_kind not in ('test', 'safety', 'weather_urgent') and coalesce(pr.quiet_enabled, false) then
    begin
      lt := (now() at time zone coalesce(pr.tz, 'America/New_York'))::time;
    exception when others then
      lt := (now() at time zone 'America/New_York')::time;
    end;
    quiet := case when pr.quiet_start <= pr.quiet_end then (lt >= pr.quiet_start and lt < pr.quiet_end)
                  else (lt >= pr.quiet_start or lt < pr.quiet_end) end;
  end if;
  insert into notifications(user_id, kind, title, body, url, dedupe_key, sent_at, result)
  values (p_user, p_kind, left(p_title, 80), left(p_body, 160), p_url, p_dedupe, case when quiet then now() end, case when quiet then 'quiet hours' end)
  on conflict (dedupe_key) do nothing returning id into nid;
  if nid is null or quiet then return; end if;
  select hook_secret into sec from push_config where id = 1;
  if sec is null then return; end if;
  perform net.http_post(url := 'https://euxcisnyansdrzzjyvsl.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', sec),
    body := jsonb_build_object('notification_id', nid));
exception when others then
  return;
end $function$;

-- 3. notifications.kind may now be 'red_tide' (new rule first ...)
alter table public.notifications add constraint notifications_kind_check2 check (kind = any (array['social','contests','trips','conditions','test','safety','weather','weather_urgent','weekly','red_tide']::text[])) not valid;
alter table public.notifications validate constraint notifications_kind_check2;
-- 4. ... then the old rule goes (separate migration)
alter table public.notifications drop constraint notifications_kind_check;

-- 5. once a day at 23:00 UTC (7 PM Eastern in summer, 6 PM in winter; FWC refreshes about 4:45 PM Eastern)
-- select cron.schedule('red-tide-watch', '0 23 * * *', $$ select net.http_post(url := 'https://euxcisnyansdrzzjyvsl.supabase.co/functions/v1/red-tide-watch', headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(select hook_secret from push_config where id=1)), body := '{}'::jsonb, timeout_milliseconds := 55000) $$);
