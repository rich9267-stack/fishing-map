-- 28: weekly summary alert (migrations `weekly_summary`, `weekly_text_trim_fix`; tests/test56.js)
-- notif_prefs.weekly (default true); notifications.kind now also allows 'weekly'; enqueue_notification maps 'weekly' to that pref.
-- weekly_text(user) builds the message (fish, species, trips, biggest fish + spot; admins also get "N keeper rules need a re-check"),
-- weekly_preview() lets a member see their own text, send_weekly_summaries() runs from pg_cron job `weekly-summary` (*/10):
-- for each user with a push subscription whose LOCAL time (notif_prefs.tz) is Sunday 18:xx it enqueues one alert per ISO week
-- (dedupe key weekly:<user>:<IYYY-IW>); nothing is sent for a week with no catches and no trips. Tapping opens ?go=insights.
-- Full function bodies live in the migrations (see Supabase); this file is the summary.
alter table public.notif_prefs add column if not exists weekly boolean not null default true;
-- select cron.schedule('weekly-summary', '*/10 * * * *', 'select public.send_weekly_summaries()');
