-- 125: "Still out?" at a planned trip's back-by time — trip-lifecycle step 4 (v256, migrations `still_out_step4` + `still_out_cron`).
-- Plan: Project doc claude/trip-lifecycle-plan.md. No new table (backup rule: nothing to change).
-- The planner picks roughly when they'll be back (trip_plans.back_by; the app sends it, default 4 h) and can tick 🚤 boat.
-- At back by, if nobody on the trip has a linked ▶ Start trip running, everyone going gets a phone alert "Still out?"
-- (their 🗓 Trips alert setting decides). Anyone going can answer: +1 hour (moves back_by) or Done (ends the trip).
-- ▶ Start trip needs nothing here: a linked Start trip turns the trip on through trg_trip_status (setup/124).

-- Anyone going (planner or "I'm in") can answer for the whole trip.
create or replace function public.trip_still_out(p_plan uuid, p_answer text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pl trip_plans%rowtype; uid uuid := auth.uid();
begin
  if uid is null or not public.is_member() then raise exception 'not allowed'; end if;
  if p_answer not in ('more', 'done') then raise exception 'unknown answer'; end if;
  select * into pl from trip_plans where id = p_plan;
  if not found or pl.cancelled_at is not null then raise exception 'trip not found'; end if;
  if pl.created_by <> uid and not exists (select 1 from trip_plan_rsvps r where r.plan_id = p_plan and r.user_id = uid) then
    raise exception 'only people going can answer';
  end if;
  if p_answer = 'more' then
    update trip_plans set back_by = greatest(coalesce(back_by, plan_at + interval '4 hours'), now()) + interval '1 hour', ended_at = null
      where id = p_plan returning * into pl;
  else
    update trip_plans set ended_at = greatest(now(), created_at) where id = p_plan returning * into pl;
  end if;
  return to_jsonb(pl);
end $$;
revoke all on function public.trip_still_out(uuid, text) from public, anon;
grant execute on function public.trip_still_out(uuid, text) to authenticated;

-- Every 5 minutes: trips whose back-by time passed in the last 2 hours, not ended, nobody on a linked Start trip.
-- One alert per person per back-by time (the dedupe key), so +1 hour brings a fresh one an hour later.
create or replace function private.trip_still_out_alerts() returns void
language plpgsql security definer set search_path = public, private as $$
declare p record; u uuid; due timestamptz;
begin
  for p in
    select t.*, s.name as spot_name from trip_plans t join spots s on s.id = t.spot_id
    where t.cancelled_at is null and t.ended_at is null
      and coalesce(t.back_by, t.plan_at + interval '4 hours') <= now()
      and coalesce(t.back_by, t.plan_at + interval '4 hours') > now() - interval '2 hours'
      and not exists (select 1 from sessions x where x.plan_id = t.id and x.deleted_at is null and x.ended_at is null and x.started_at > now() - interval '12 hours')
  loop
    due := coalesce(p.back_by, p.plan_at + interval '4 hours');
    for u in select p.created_by union select r.user_id from trip_plan_rsvps r where r.plan_id = p.id loop
      begin
        perform public.enqueue_notification(u, 'trips', '🎣 Still out?',
          'Your trip at ' || coalesce(p.spot_name, 'the spot') || ' was due back. Tap: ▶ Start trip, +1 hour or Done.',
          './?go=stillout&id=' || p.id, 'stillout:' || p.id || ':' || extract(epoch from due)::bigint || ':' || u);
      exception when others then null;
      end;
    end loop;
  end loop;
end $$;
revoke all on function private.trip_still_out_alerts() from public, anon, authenticated;

-- (applied as its own migration, still_out_cron)
select cron.schedule('trip-still-out', '*/5 * * * *', 'select private.trip_still_out_alerts()');
