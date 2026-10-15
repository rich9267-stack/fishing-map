-- 68: public spots at a known public place (official boat ramp / park / pier) snap to that place's exact position.
-- Before: every spot a stranger could see was blurred 100-400 m, so "Directions" sent people to the wrong place even for a public pier.
-- Now: if a stranger's view of a spot is NOT exact (not yours, not a friend's, not shared with you) and an active official place
--   lies within ~152 m (500 ft), they get that OFFICIAL place's coordinates (public knowledge) instead of the blurred pin.
--   The member's own exact pin, notes, getting_there and access_notes stay hidden. is_exact = true then (it is an exact, public place).
-- Same columns as before, so create-or-replace is enough. UNDO: re-run the function body from setup/52-spot-shares.sql.
create or replace function public.spots_visible_fn()
 returns table(id uuid, created_at timestamp with time zone, name text, spot_type text, water_type text, notes text, added_by text, public_access text, parking text, getting_there text, access_notes text, lat double precision, lng double precision, created_by uuid, is_private boolean, tide_offset_min smallint, faces_deg smallint, visibility text, hide_exact_from_friends boolean, is_exact boolean)
 language sql stable security definer set search_path to 'public'
as $function$
  select s.id, s.created_at, s.name, s.spot_type, s.water_type,
    case when e.exact then s.notes end, s.added_by, s.public_access, s.parking,
    case when e.exact then s.getting_there end, case when e.exact then s.access_notes end,
    case when e.exact then s.lat when o.olat is not null then o.olat else b.blat end,
    case when e.exact then s.lng when o.olat is not null then o.olng else b.blng end,
    s.created_by, s.is_private, s.tide_offset_min, s.faces_deg, s.visibility, s.hide_exact_from_friends,
    (e.exact or o.olat is not null)
  from public.spots s
  cross join lateral (select public.spot_shared_with_me(s.id) as shared) sh
  cross join lateral (select (s.created_by = auth.uid() or sh.shared or (s.visibility <> 'private' and not s.hide_exact_from_friends and public.is_friend(s.created_by))) as exact) e
  left join lateral (
    select p.lat as olat, p.lng as olng from public.official_spots p
    where not e.exact and s.lat is not null and s.lng is not null and p.active
      and p.lat between s.lat - 0.0014 and s.lat + 0.0014
      and p.lng between s.lng - 0.0016 and s.lng + 0.0016
      and sqrt(power((p.lat - s.lat) * 111320.0, 2) + power((p.lng - s.lng) * 111320.0 * cos(radians(s.lat)), 2)) <= 152
    order by power(p.lat - s.lat, 2) + power((p.lng - s.lng) * cos(radians(s.lat)), 2)
    limit 1
  ) o on true
  left join lateral public.blur_point(s.id, s.lat, s.lng) b on (not e.exact and o.olat is null and s.lat is not null)
  where s.deleted_at is null and public.is_member() and (s.created_by = auth.uid() or sh.shared or (s.visibility <> 'private' and public.is_friend(s.created_by)) or (s.visibility = 'public' and not public.is_blocked(s.created_by)));
$function$;
