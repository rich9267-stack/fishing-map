-- 32: A contest started from a trip enters everyone going automatically (migration `trip_contest_auto_enter`).
--  * tournaments.plan_id -> the trip (null = ordinary contest).
--  * link_contest_to_plan(contest, plan): called by the app right after create_tournament when started from a trip.
--      caller must have made the contest (kind friends) and be on the trip (planner or "I'm in"); links it and enters everyone already going
--      (planner + RSVPs, not blocked either way) as 'joined' with a push.
--  * trigger trip_contest_enter (AFTER INSERT on trip_plan_rsvps): tapping "I'm in" on a trip with a live contest enters you (push: "You're in").
--  * trigger trip_contest_leave (AFTER DELETE on trip_plan_rsvps): backing out of the trip takes you out of its contest (never the creator).
alter table public.tournaments add column if not exists plan_id uuid references public.trip_plans(id) on delete set null;

create or replace function public.enter_trip_contest(p_contest uuid, p_user uuid) returns void language plpgsql security definer set search_path = public as $$
declare t tournaments%rowtype; prev text;
begin
  select * into t from tournaments where id = p_contest;
  if t.id is null or t.cancelled_at is not null or t.ends_at < now() then return; end if;
  if p_user = t.created_by then return; end if;
  if exists (select 1 from blocks b where (b.blocker = t.created_by and b.blocked = p_user) or (b.blocker = p_user and b.blocked = t.created_by)) then return; end if;
  select status into prev from tournament_members where tournament_id = p_contest and user_id = p_user;
  if prev = 'joined' then return; end if;
  insert into tournament_members(tournament_id, user_id, status, invited_by, joined_at) values (p_contest, p_user, 'joined', t.created_by, now())
  on conflict (tournament_id, user_id) do update set status = 'joined', joined_at = now();
  perform enqueue_notification(p_user, 'contests', '🎣 You''re in: ' || t.title, 'Added because you''re going on the trip. Tap for the rules.', '?go=contest&id=' || p_contest, 'tc:' || p_contest || ':' || p_user);
end $$;
revoke all on function public.enter_trip_contest(uuid, uuid) from public, anon, authenticated;

create or replace function public.link_contest_to_plan(p_contest uuid, p_plan uuid) returns integer language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t tournaments%rowtype; pl trip_plans%rowtype; u uuid; n integer := 0;
begin
  select * into t from tournaments where id = p_contest;
  if me is null or t.id is null or t.created_by <> me or t.kind <> 'friends' then raise exception 'not your contest'; end if;
  select * into pl from trip_plans where id = p_plan and cancelled_at is null;
  if pl.id is null then raise exception 'trip not found'; end if;
  if not (pl.created_by = me or exists (select 1 from trip_plan_rsvps r where r.plan_id = p_plan and r.user_id = me)) then raise exception 'you are not on that trip'; end if;
  update tournaments set plan_id = p_plan where id = p_contest;
  for u in select pl.created_by union select user_id from trip_plan_rsvps where plan_id = p_plan loop
    if u is not null and u <> me then perform enter_trip_contest(p_contest, u); n := n + 1; end if;
  end loop;
  return n;
end $$;
grant execute on function public.link_contest_to_plan(uuid, uuid) to authenticated;

create or replace function public.trg_trip_contest_enter() returns trigger language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  for c in select id from tournaments where plan_id = new.plan_id and cancelled_at is null and ends_at > now() loop
    perform enter_trip_contest(c, new.user_id);
  end loop;
  return new;
exception when others then return new;
end $$;
create or replace trigger trip_contest_enter after insert on public.trip_plan_rsvps for each row execute function public.trg_trip_contest_enter();

create or replace function public.trg_trip_contest_leave() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update tournament_members m set status = 'left' from tournaments t
   where t.plan_id = old.plan_id and m.tournament_id = t.id and m.user_id = old.user_id and m.status = 'joined' and old.user_id <> t.created_by and t.ends_at > now();
  return old;
exception when others then return old;
end $$;
create or replace trigger trip_contest_leave after delete on public.trip_plan_rsvps for each row execute function public.trg_trip_contest_leave();
-- Tested (rollback): plan with Richard + Brit going -> contest linked -> Brit 'joined'; Rico taps I'm in -> 'joined'. App calls link_contest_to_plan after create_tournament when started from a trip (not for repeating series).
