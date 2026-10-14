-- 54: 🗑 Delete my account (Oct 14, Fishbrain audit item 5).
-- Richard pastes this whole file into the Supabase SQL Editor and presses Run (the connector refuses deletes).
-- Two functions the app calls:
--   delete_my_account_preview()  → how many spots / catches / photos / messages / friends you have (shown on the "are you sure" screen)
--   delete_my_account('DELETE')  → removes everything that's yours, then the sign-in account itself
-- Photo FILES are removed by the app first (Supabase blocks deleting storage files from SQL); this removes the rows.
-- Admins can't delete themselves here (it would wipe official tournaments and leave nobody to approve people).
-- A spot of yours where a friend logged catches / trips / photos / plans is NOT deleted (that would delete their catches):
-- it's handed to the friend who used it most, with the same privacy. Your own catches there are still deleted.

create or replace function public.delete_my_account_preview() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'spots',    (select count(*) from public.spots    where created_by = auth.uid() and deleted_at is null),
    'catches',  (select count(*) from public.catches  where created_by = auth.uid()),
    'photos',   (select count(*) from public.photos   where created_by = auth.uid()),
    'messages', (select count(*) from public.messages where sender = auth.uid() or recipient = auth.uid()),
    'friends',  (select count(*) from public.friendships where (user_a = auth.uid() or user_b = auth.uid()) and status = 'accepted'),
    'groups',   (select count(*) from public.groups   where created_by = auth.uid()),
    'admin',    public.is_admin());
$$;

create or replace function public.delete_my_account(p_confirm text) returns jsonb
language plpgsql volatile security definer set search_path = public, private as $$
declare
  u uuid := auth.uid();
  my_email text;
  s record; heir uuid;
  handed int := 0; rm record;
begin
  if u is null then raise exception 'Sign in first.'; end if;
  if p_confirm is distinct from 'DELETE' then raise exception 'Not confirmed.'; end if;
  if public.is_admin() then raise exception 'Admins can''t delete their account from the app.'; end if;
  select lower(email) into my_email from auth.users where id = u;

  -- Races: cancel open races I host (refunds everyone else), then drop my race entries/results (they point at my catches)
  for rm in select id from public.race_rooms where host = u and status = 'open' loop
    perform private._race_room_cancel(rm.id);
  end loop;
  delete from public.race_entries where user_id = u;
  delete from public.race_results where user_id = u;

  -- My spots that friends used: hand them to the friend who used it most (keeps their catches safe)
  for s in select id from public.spots where created_by = u loop
    select x.who into heir from (
      select created_by who from public.catches    where spot_id = s.id and created_by is not null and created_by <> u
      union all select created_by from public.sessions   where spot_id = s.id and created_by is not null and created_by <> u
      union all select created_by from public.photos     where spot_id = s.id and created_by <> u
      union all select created_by from public.trip_plans where spot_id = s.id and created_by <> u
    ) x group by x.who order by count(*) desc limit 1;
    if heir is not null then
      update public.spots set created_by = heir, added_by = null where id = s.id;
      update public.spot_shares set revoked_at = now() where spot_id = s.id and revoked_at is null;
      handed := handed + 1;
    end if;
  end loop;

  -- Loose links from other people's things to mine
  update public.tournaments set plan_id = null where plan_id in (select id from public.trip_plans where created_by = u) and created_by <> u;
  update public.catches set session_id = null where session_id in (select id from public.sessions where created_by = u) and created_by is distinct from u;
  update public.members set invited_by = null where invited_by = u;
  update public.problem_reports set who = null, user_id = null where user_id = u;

  -- My things (comments/reactions on my catches go with them)
  delete from public.photos     where created_by = u;
  delete from public.catches    where created_by = u;
  delete from public.sessions   where created_by = u;
  delete from public.trip_plans where created_by = u;
  delete from public.spots      where created_by = u;
  -- Tables with no link to the sign-in account
  delete from public.float_plans        where user_id = u;
  delete from public.notif_prefs        where user_id = u;
  delete from public.notifications      where user_id = u;
  delete from public.push_subscriptions where user_id = u;
  delete from public.group_messages     where sender = u;
  delete from public.tournament_series  where created_by = u;
  -- Member row (by email), then the sign-in account: everything else (profile, friendships, messages, coins, tank,
  -- licenses, groups I made, tackle, follows, blocks, reports…) goes with it automatically.
  delete from public.members where email = my_email;
  delete from auth.users where id = u;
  return jsonb_build_object('ok', true, 'spots_handed_over', handed);
end $$;

revoke all on function public.delete_my_account(text) from public, anon;
revoke all on function public.delete_my_account_preview() from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
grant execute on function public.delete_my_account_preview() to authenticated;

-- Check (should show 2 rows): select proname from pg_proc where proname like 'delete_my_account%';
