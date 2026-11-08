-- 130: fill the Treasure Coast / Space Coast gap in the official layer (Stuart -> Titusville).
-- Why it was empty: earlier loads used boxes that never covered lat 27.0-28.6 N east of lng -80.95
--   (setup/39 South Florida stopped at 27.0; setup/60 Gulf box was west of -80.95; setup/71 and 72 started at 28.6).
--   St. Lucie and Indian River had 0 official places; Martin and Brevard only a few.
-- Loaded Nov 8 2026 by the database itself with pg_net, same sources, filters and rules as setup/71 (FWC ramps) and setup/72 (FL DEP FORI).
--   Box : Latitude 27.0-28.6 and Longitude > -80.95 (both lists answered in one request each, no more pages)
--   Answers: FWC 155 ramps (request 1086), FORI 106 parks/piers/jetties (request 1087). Re-running is safe (on conflict do nothing).
-- No table changes; official_spots is left out of the backup (database-change-rule.md).
-- UNDO (Richard runs it in the SQL Editor if ever needed; the connector blocks deletes):
--   delete from public.official_spots where source in ('fwc-ramp','fl-fori') and created_at >= '2026-11-08 09:50-05'
--     and lat between 27.0 and 28.6 and lng > -80.95;

-- 1) Ask the two services (timeout 90 s): same URLs and outFields as setup/71 and setup/72, with these filters:
--   FWC : Status='Open for Business' AND AccessType LIKE '%for General Public Use' AND Latitude >= 27.0 AND Latitude <= 28.6 AND Longitude > -80.95
--   FORI: (fishing fields as setup/72) AND INCLUDE_SITE='Y' AND DECIMAL_DEGREES_LAT >= 27.0 AND DECIMAL_DEGREES_LAT <= 28.6 AND DECIMAL_DEGREES_LONG > -80.95

-- 2a) FWC ramps (replace 1086 with the new request_id if re-run):
with feats as (
  select f->'attributes' as a from jsonb_array_elements((select content::jsonb->'features' from net._http_response where id = 1086)) f
), rows_ as (
  select 'fwc-ramp'::text as source, a->>'RampID' as source_id, nullif(btrim(a->>'RampName'), '') as name, 'ramp'::text as kind,
         (a->>'Latitude')::float8 as lat, (a->>'Longitude')::float8 as lng,
         case when a->>'WaterType' = 'Freshwater' then 'freshwater' end as water_type,
         upper(a->>'County') as county,
         jsonb_strip_nulls(jsonb_build_object(
           'fee', case when a->>'isFeeRequired' is not null and a->>'isFeeRequired' <> 'Unknown' then a->>'isFeeRequired' end,
           'city', a->>'City', 'type', a->>'RampType',
           'hours', case when a->>'Hours' is not null and a->>'Hours' <> 'Unknown' and length(a->>'Hours') <= 80 then a->>'Hours' end,
           'lanes', case when (a->>'TotalLanes')::numeric > 0 then (a->>'TotalLanes')::numeric::int end,
           'owner', a->>'PrimaryAdminEntity', 'water', a->>'WaterBodyName')) as details
  from feats
)
insert into public.official_spots (source, source_id, name, kind, lat, lng, water_type, county, details)
select source, source_id, name, kind, lat, lng, water_type, county, details from rows_
where name is not null and lat between 24.3 and 31.1 and lng between -87.8 and -79.8
on conflict (source, source_id) do nothing;

-- 2b) FL DEP parks/piers/jetties (replace 1087 if re-run):
with feats as (
  select f->'attributes' as a from jsonb_array_elements((select content::jsonb->'features' from net._http_response where id = 1087)) f
), r as (
  select a->>'ID' as source_id, initcap(lower(btrim(a->>'SITE_NAME'))) as name,
    case when coalesce((a->>'SALTWATER_PIERS')::numeric,0)+coalesce((a->>'FRESHWATER_PIERS')::numeric,0)+coalesce((a->>'SALTWATER_CATWALKS')::numeric,0)+coalesce((a->>'FRESHWATER_CATWALKS')::numeric,0) > 0 then 'pier'
         when coalesce((a->>'SALTWATER_JETTY_LENGTH')::numeric,0)+coalesce((a->>'FRESHWATER_JETTY_LENGTH')::numeric,0) > 0 then 'jetty' else 'park' end as kind,
    (a->>'DECIMAL_DEGREES_LAT')::float8 as lat, (a->>'DECIMAL_DEGREES_LONG')::float8 as lng,
    case when coalesce((a->>'SALTWATER_PIERS')::numeric,0)+coalesce((a->>'SALTWATER_CATWALKS')::numeric,0)+coalesce((a->>'SALTWATER_JETTY_LENGTH')::numeric,0) > 0
           and coalesce((a->>'FRESHWATER_PIERS')::numeric,0)+coalesce((a->>'FRESHWATER_CATWALKS')::numeric,0)+coalesce((a->>'FRESHWATER_JETTY_LENGTH')::numeric,0) = 0 then 'saltwater'
         when coalesce((a->>'FRESHWATER_PIERS')::numeric,0)+coalesce((a->>'FRESHWATER_CATWALKS')::numeric,0)+coalesce((a->>'FRESHWATER_JETTY_LENGTH')::numeric,0) > 0
           and coalesce((a->>'SALTWATER_PIERS')::numeric,0)+coalesce((a->>'SALTWATER_CATWALKS')::numeric,0)+coalesce((a->>'SALTWATER_JETTY_LENGTH')::numeric,0) = 0 then 'freshwater' end as water_type,
    upper(a->>'COUNTY') as county,
    not ( a->>'CATEGORY'='CLUB' or lower(a->>'SITE_NAME') ~ '(^www|http|\.com|\.net|\.org|yacht|country club|golf|museum|baseball|softball|sports complex|community center|campground|resort|condominium)' ) as active,
    jsonb_strip_nulls(jsonb_build_object('web', nullif(a->>'WEBSITE',''), 'city', a->>'LOCATION_CITY', 'owner', a->>'PRIMARY_AGENCY',
      'bank_areas', case when (a->>'BANK_FISHING_AREAS')::numeric > 0 then (a->>'BANK_FISHING_AREAS')::numeric::int end)) as details
  from feats
)
insert into public.official_spots (source, source_id, name, kind, lat, lng, water_type, county, details, active)
select 'fl-fori', source_id, name, kind, lat, lng, water_type, county, details, active from r
where name is not null and lat between 24.3 and 31.1 and lng between -87.8 and -79.8
on conflict (source, source_id) do nothing;
