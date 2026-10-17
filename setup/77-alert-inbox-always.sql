-- 77: 🔔 Alert fix, step 2 (Oct 17, 2026, from phone test session 1, section D).
-- Problem: enqueue_notification quit before saving anything when the person had no phone registered, so people
-- without a phone (the test account) never got an Alerts-list entry.
-- New rule:
--   * alert type switched OFF by the person  -> nothing saved, no ping (unchanged: that is their choice)
--   * no phone registered                    -> the Alerts-list row IS saved (marked result 'no phone'); no ping
--   * quiet hours                            -> row saved, no ping (unchanged)
--   * otherwise                              -> row saved and pinged (unchanged)
-- Only create-or-replace (no removals). Applied as Supabase migration `alert_inbox_always`.

create or replace function public.enqueue_notification(p_user uuid, p_kind text, p_title text, p_body text, p_url text, p_dedupe text default null::text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare pr notif_prefs%rowtype; ok boolean; nid uuid; sec text; lt time; quiet boolean := false; has_phone boolean;
begin
  if p_user is null then return; end if;
  select * into pr from notif_prefs where user_id = p_user;
  ok := case p_kind when 'social' then coalesce(pr.social, true) when 'contests' then coalesce(pr.contests, true)
        when 'trips' then coalesce(pr.trips, true) when 'conditions' then coalesce(pr.conditions, false)
        when 'weather' then coalesce(pr.weather, true) when 'weather_urgent' then coalesce(pr.weather, true)
        when 'weekly' then coalesce(pr.weekly, true) when 'red_tide' then coalesce(pr.red_tide, true) else true end;
  if not ok then return; end if;                       -- switched off by the person: not saved
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
  if nid is null or quiet or not has_phone then return; end if;   -- saved; ping only with a phone and outside quiet hours
  select hook_secret into sec from push_config where id = 1;
  if sec is null then return; end if;
  perform net.http_post(url := 'https://euxcisnyansdrzzjyvsl.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', sec),
    body := jsonb_build_object('notification_id', nid));
exception when others then
  return;
end $function$;
