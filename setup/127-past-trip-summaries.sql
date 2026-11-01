-- 127: Past trips summaries — trip-lifecycle step 6 (v258, migration `past_trip_summaries_step6`).
-- Plan: Project doc claude/trip-lifecycle-plan.md. No new table (backup rule: nothing to change).
-- One call for the whole Past trips list: for each planned trip, how many fish / catches and which spots they were at,
-- counted with exactly the trip review's rules (public.trip_review: only people on the trip get anything back, private catches
-- stay private, blocked people are left out). SECURITY INVOKER, so trip_review runs as the person asking.
create or replace function public.past_trip_summaries(p_ids uuid[])
returns table(plan_id uuid, fish bigint, catches bigint, spot_ids uuid[])
language sql stable set search_path = public as $$
  select pid, coalesce(sum(r.how_many), 0), count(r.catch_id), coalesce(array_agg(distinct r.spot_id) filter (where r.spot_id is not null), '{}')
  from unnest(p_ids[1:60]) as pid
  left join lateral public.trip_review(pid) r on true
  group by pid
$$;
revoke all on function public.past_trip_summaries(uuid[]) from public, anon;
grant execute on function public.past_trip_summaries(uuid[]) to authenticated;
