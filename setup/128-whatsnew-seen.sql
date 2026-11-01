-- 128: ✨ What's New is remembered on your account (Oct 31, v259). wn_seen = the newest What's New id this person has been shown,
-- so a new phone or a cleared browser doesn't show the whole list again. Kept in each person's own private app_prefs row
-- (only they can read or change it, policies from setup/70). app_start returns it next to palette. Nothing removed.

alter table public.app_prefs add column if not exists wn_seen text;

-- app_start: same as the live copy (setup/124), only the app_prefs line now also returns wn_seen.
CREATE OR REPLACE FUNCTION public.app_start()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); mail text := lower(coalesce(auth.jwt() ->> 'email', '')); since timestamptz := now() - interval '24 hours';
begin
  if uid is null then return null; end if;
  return jsonb_build_object(
    'member', (select to_jsonb(x) from (select email, display_name, is_admin, is_owner, status, terms_version from members where email = mail limit 1) x),
    'me_extras', (select to_jsonb(x) from profile_extras x where x.user_id = uid),
    'home_waters', (select to_jsonb(x) from (select name, lat, lng from home_waters where user_id = uid) x),
    'app_prefs', (select to_jsonb(x) from (select palette, wn_seen from app_prefs where user_id = uid) x),
    'tutorials', coalesce((select jsonb_agg(jsonb_build_object('screen_key', screen_key)) from tutorials_seen where user_id = uid), '[]'),
    'unread', (select count(*) from messages where recipient = uid and read_at is null),
    'blocks', coalesce((select jsonb_agg(jsonb_build_object('blocked', blocked)) from blocks), '[]'),
    'follows', coalesce((select jsonb_agg(jsonb_build_object('spot_id', spot_id)) from spot_follows), '[]'),
    'notif_welcomed', (select to_jsonb(x) from (select welcomed_at from notif_prefs where user_id = uid) x),
    'hidden_spots', coalesce((select jsonb_agg(h) from public.my_hidden_spots() h), '[]'),
    'licenses', coalesce((select jsonb_agg(to_jsonb(x) order by x.expires_on asc nulls last) from (select id, kind, expires_on from fishing_licenses) x), '[]'),
    'shares', coalesce((select jsonb_agg(to_jsonb(x)) from (select id, spot_id, owner, friend, created_at, revoked_at from spot_shares where revoked_at is null) x), '[]'),
    'picks', coalesce((select jsonb_agg(to_jsonb(x)) from (select key, status, name, kind, label, trust, lat, lng, updated_at from suggestion_picks where user_id = uid limit 1000) x), '[]'),
    'friendships', coalesce((select jsonb_agg(to_jsonb(x)) from friendships x), '[]'),
    'friends_accepted', coalesce((select jsonb_agg(jsonb_build_object('user_a', user_a, 'user_b', user_b)) from friendships where status = 'accepted'), '[]'),
    'float_plans', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from float_plans x where x.status in ('active', 'alerted')), '[]'),
    'tackle', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from tackle x where x.deleted_at is null), '[]'),
    'tournaments', coalesce((select jsonb_agg(to_jsonb(x) order by x.starts_at asc) from tournaments x), '[]'),
    'tournament_members', coalesce((select jsonb_agg(to_jsonb(x)) from tournament_members x), '[]'),
    'hall_of_fame', coalesce((select jsonb_agg(to_jsonb(h)) from public.hall_of_fame() h), '[]'),
    'notifications', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from notifications where cleared_at is null order by created_at desc limit 50) x), '[]'),
    'trip_plans', coalesce((select jsonb_agg(to_jsonb(x) order by x.plan_at asc) from (select * from trip_plans where cancelled_at is null and ended_at is null and plan_at >= since order by plan_at asc limit 100) x), '[]'),
    'trip_plan_rsvps', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from trip_plan_rsvps limit 3000) x), '[]'),
    'rules_ver', (select md5(coalesce(string_agg(md5(to_jsonb(f)::text), ',' order by f.id), '')) from fish_rules f where f.active)
  );
end $function$;
