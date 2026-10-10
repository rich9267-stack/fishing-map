-- 33: (migration `trip_cancel_cancels_contest`) Cancelling a planned trip cancels any still-open contest made for it
-- (tournaments.plan_id = the trip): trigger trip_cancel_contest on trip_plans (cancelled_at set) -> tournaments.cancelled_at = now(),
-- and a push "Contest cancelled" to the joined members (except whoever cancelled). Finished contests keep their results.
-- Spot photos vs catch photos need no database change: photos.catch_id null = photo of the spot, not null = photo of a catch.
create or replace function public.trg_trip_cancel_contest() returns trigger language plpgsql security definer set search_path = public as $$
declare t record; m record;
begin
  if new.cancelled_at is null or old.cancelled_at is not null then return new; end if;
  for t in select id, title from tournaments where plan_id = new.id and cancelled_at is null and ends_at > now() loop
    update tournaments set cancelled_at = now() where id = t.id;
    for m in select user_id from tournament_members where tournament_id = t.id and status = 'joined' and user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) loop
      perform enqueue_notification(m.user_id, 'contests', '🏁 Contest cancelled: ' || t.title, 'The trip it was made for was cancelled, so the contest is off.', '?go=contest&id=' || t.id, 'tcx:' || t.id || ':' || m.user_id);
    end loop;
  end loop;
  return new;
exception when others then return new;
end $$;
create or replace trigger trip_cancel_contest after update of cancelled_at on public.trip_plans for each row execute function public.trg_trip_cancel_contest();

-- (migration `deleted_catch_photos_hidden`) can_see_catch_id: a soft-deleted catch is visible only to its owner (needed for Undo), so its photos
-- vanish for everyone else the moment it is deleted. The app then removes the owner's photo rows + stored files after the 8 s Undo window
-- (purgePhotosOfCatches) and sweeps leftovers at start-up (sweepDeletedCatchPhotos). Tested with pretend users: friend sees 1 -> 0, owner still 1.
