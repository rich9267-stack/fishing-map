-- Social foundation, part 2: who can see what. (Policies are altered in place.)
create or replace function public.is_member() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where email = lower(coalesce(auth.jwt() ->> 'email', '')) and status = 'approved');
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where email = lower(coalesce(auth.jwt() ->> 'email', '')) and is_admin and status = 'approved');
$$;

-- The access list is only visible to admins (and each person's own row)
alter policy "members see the list" on public.members
  using (public.is_admin() or email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Spots table: exact coordinates only for the owner and for friends (unless the owner hides the exact spot from friends)
alter policy "members read spots" on public.spots
  using (public.is_member() and (created_by = auth.uid() or (visibility <> 'private' and not hide_exact_from_friends and public.is_friend(created_by))));

-- Catches
alter policy "members read catches" on public.catches
  using (public.is_member() and (created_by = auth.uid() or (visibility in ('friends','public') and public.is_friend(created_by)) or visibility = 'public'));
alter policy "members add catches" on public.catches
  with check (public.is_member() and created_by = auth.uid() and public.can_see_spot(spot_id));

-- Photos follow their catch (or their spot, for spot photos)
alter policy "members see photos" on public.photos
  using (public.is_member() and (created_by = auth.uid()
    or (catch_id is not null and public.can_see_catch_id(catch_id))
    or (catch_id is null and public.can_see_spot(spot_id))));
alter policy "members add photos" on public.photos
  with check (public.is_member() and created_by = auth.uid() and public.can_see_spot(spot_id) and split_part(path, '/', 1) = auth.uid()::text);

-- Trips and plans: yours, and friends' for spots you can see
alter policy "members read sessions" on public.sessions
  using (public.is_member() and (created_by = auth.uid() or (public.is_friend(created_by) and public.can_see_spot(spot_id))));
alter policy "members add sessions" on public.sessions
  with check (public.is_member() and created_by = auth.uid() and public.can_see_spot(spot_id));
alter policy "members read plans" on public.trip_plans
  using (public.is_member() and (created_by = auth.uid() or (public.is_friend(created_by) and public.can_see_spot(spot_id))));
alter policy "members add plans" on public.trip_plans
  with check (public.is_member() and created_by = auth.uid() and public.can_see_spot(spot_id));

-- Profiles: everyone approved can read; you edit your own
create policy "members read profiles" on public.profiles for select using (public.is_member());
create policy "edit own profile" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Friendships: you see yours; you can send a request; the other person accepts; either can remove
create policy "see own friendships" on public.friendships for select using (auth.uid() in (user_a, user_b));
create policy "send friend request" on public.friendships for insert
  with check (public.is_member() and requested_by = auth.uid() and auth.uid() in (user_a, user_b) and status = 'pending');
create policy "accept friend request" on public.friendships for update
  using (auth.uid() in (user_a, user_b) and requested_by <> auth.uid()) with check (status = 'accepted');
create policy "remove friendship" on public.friendships for delete using (auth.uid() in (user_a, user_b));

-- The spots the app reads: exact pin for you (and friends, unless hidden); a blurred pin (up to ~1/4 mile) for everyone else
create or replace view public.spots_visible as
select s.id, s.created_at, s.name, s.spot_type, s.water_type, s.notes, s.added_by, s.public_access, s.parking, s.getting_there, s.access_notes,
  case when e.exact then s.lat else b.blat end as lat,
  case when e.exact then s.lng else b.blng end as lng,
  s.created_by, s.is_private, s.tide_offset_min, s.faces_deg, s.visibility, s.hide_exact_from_friends, e.exact as is_exact
from public.spots s
cross join lateral (select (s.created_by = auth.uid() or (s.visibility <> 'private' and not s.hide_exact_from_friends and public.is_friend(s.created_by))) as exact) e
left join lateral public.blur_point(s.id, s.lat, s.lng) b on (not e.exact and s.lat is not null)
where public.is_member() and (s.created_by = auth.uid() or (s.visibility <> 'private' and public.is_friend(s.created_by)) or s.visibility = 'public');
revoke all on public.spots_visible from anon, public;
grant select on public.spots_visible to authenticated;

-- (applied as migration "social_foundation_e": the view reads through a SECURITY DEFINER function so blur_point stays unreachable)
-- create function public.spots_visible_fn() ... ; create or replace view public.spots_visible as select * from public.spots_visible_fn();
-- (applied as "social_foundation_f": a new catch with no visibility inherits its spot's level — a catch at a private spot is never exposed by default)
-- alter table public.catches alter column visibility drop default; trigger catches_default_visibility
