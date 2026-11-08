-- 129: Atlantic Trail entrance onto the ✅ Official public spots layer (parked-ideas: "Richard to mark his parks").
-- Data source: Richard's own 🌎 Public spot "Atlantic Trail Entrance to Conservation Greenway"
--   (spots.id 5089756b-79df-4b27-8605-251b4a16fe20, 26.22932, -80.299, freshwater).
--   Not in FL DEP FORI or FWC ramps (nothing official within ~1.7 km), so it is added exactly like
--   public.admin_official_set(spot, 'park') does (setup/69) — same as Harbor's Edge, NE 16th St Park, etc.
--   Run directly because the SQL connector is not signed in as an admin.
-- No table changes; official_spots is left out of the backup (database-change-rule.md).
-- UNDO: update public.official_spots set active = false
--         where source = 'admin' and source_id = '5089756b-79df-4b27-8605-251b4a16fe20';
insert into public.official_spots (source, source_id, name, kind, lat, lng, water_type, county, details, active)
select 'admin', s.id::text, left(trim(s.name), 120), 'park', s.lat, s.lng,
       case when s.water_type in ('saltwater','freshwater') then s.water_type end, null,
       jsonb_build_object('added_by', 'admin'), true
from public.spots s
where s.id = '5089756b-79df-4b27-8605-251b4a16fe20' and s.deleted_at is null and s.visibility = 'public'
  and s.lat is not null and s.lng is not null
on conflict (source, source_id) do update
  set name = excluded.name, kind = excluded.kind, lat = excluded.lat, lng = excluded.lng,
      water_type = excluded.water_type, active = true
returning id, name, kind, lat, lng, water_type, active;
