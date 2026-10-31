-- 124: Planned trips follow their real status — trip-lifecycle step 3 (v255, migration `trip_status_step3`).
-- Plan: Project doc claude/trip-lifecycle-plan.md. No new table (backup rule: nothing to change).
-- trip_plans.started_at = when the first linked ▶ Start trip began. trip_plans.ended_at = when the last linked Start trip ended
-- (cleared again while anyone linked is still fishing). Kept up to date by a trigger on sessions, so it works even when
-- the people on a trip aren't friends with each other (they can't see each other's Start trips).
alter table public.trip_plans add column if not exists started_at timestamptz;

create or replace function public.trg_trip_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid; running int; anyn int; first_start timestamptz; last_end timestamptz;
begin
  foreach pid in array array_remove(array[
      case when tg_op <> 'DELETE' then new.plan_id end,
      case when tg_op <> 'INSERT' then old.plan_id end], null) loop
    select count(*) filter (where s.ended_at is null and s.started_at > now() - interval '12 hours'),
           count(*), min(s.started_at), max(s.ended_at)
      into running, anyn, first_start, last_end
      from sessions s where s.plan_id = pid and s.deleted_at is null;
    if anyn = 0 then
      update trip_plans set started_at = null where id = pid and started_at is not null;
    elsif running > 0 then
      update trip_plans set started_at = first_start, ended_at = null where id = pid;
    else
      update trip_plans set started_at = first_start, ended_at = greatest(coalesce(last_end, now()), created_at) where id = pid;
    end if;
  end loop;
  return null;
end $$;
revoke all on function public.trg_trip_status() from public, anon, authenticated;

create trigger trip_status after insert or update of plan_id, started_at, ended_at, deleted_at or delete on public.sessions
  for each row execute function public.trg_trip_status();

-- app_start: load trips that haven't ended (up to a day after their start), instead of "until 3 hours after the start".
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
    'trip_plans', coalesce((select jsonb_agg(to_jsonb(x) order by x.plan_at asc) from (select * from trip_plans where cancelled_at is null and ended_at is null and plan_at >= since order by plan_at asc limit 100) x), '[]'),
    'trip_plan_rsvps', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from trip_plan_rsvps limit 3000) x), '[]'),
    'rules_ver', (select md5(coalesce(string_agg(md5(to_jsonb(f)::text), ',' order by f.id), '')) from fish_rules f where f.active)
  );
end $function$;
