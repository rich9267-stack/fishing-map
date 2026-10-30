-- 122: ⚡ One database call when the app opens (v249, migration `app_start`). Speed + cost plan step 1 (plans/speed-and-cost-plan.md).
-- Before: each app open asked ~40 separate questions; ~24 of them are small lists that belong to the person (prefs, follows, blocks, friends,
-- licences, alerts, trip plans…). Now public.app_start() returns those lists together in one answer, and the app takes each list from it once.
-- SECURITY INVOKER on purpose: every select runs as the person, under the SAME row-level rules as the separate questions did, so nobody can
-- see more than before. Each part copies the app's own question (columns, filters, order, limit). The two helpers it calls (hall_of_fame,
-- my_hidden_spots) are the same functions the app already called.
-- rules_ver: a short fingerprint of the full content of the active fish_rules rows (any edit, by the app or a setup file, changes it). The phone keeps its copy of the rules (~354 KB) and only downloads them again
-- when the fingerprint changes (before: downloaded at every app open).
-- No new tables. No change to any rule.

create or replace function public.app_start() returns jsonb
language plpgsql security invoker stable set search_path = public as $$
declare uid uuid := auth.uid(); mail text := lower(coalesce(auth.jwt() ->> 'email', '')); since timestamptz := now() - interval '3 hours';
begin
  if uid is null then return null; end if;
  return jsonb_build_object(
    'member', (select to_jsonb(x) from (select email, display_name, is_admin, is_owner, status, terms_version from members where email = mail limit 1) x),
    'me_extras', (select to_jsonb(x) from profile_extras x where x.user_id = uid),
    'home_waters', (select to_jsonb(x) from (select name, lat, lng from home_waters where user_id = uid) x),
    'app_prefs', (select to_jsonb(x) from (select palette from app_prefs where user_id = uid) x),
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
    'trip_plans', coalesce((select jsonb_agg(to_jsonb(x) order by x.plan_at asc) from (select * from trip_plans where cancelled_at is null and plan_at >= since order by plan_at asc limit 100) x), '[]'),
    'trip_plan_rsvps', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from trip_plan_rsvps limit 3000) x), '[]'),
    'rules_ver', (select md5(coalesce(string_agg(md5(to_jsonb(f)::text), ',' order by f.id), '')) from fish_rules f where f.active)
  );
end $$;

revoke all on function public.app_start() from public, anon;
grant execute on function public.app_start() to authenticated;
