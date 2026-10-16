-- 72: official parks, piers and jetties for the rest of Florida (sprint #4 step 3). No table changes: the table from setup/39 is reused, same method as setup/60.
-- Loaded Oct 15 2026 by the database itself with pg_net (the workspace can't reach these sites). Re-running is safe (on conflict do nothing).
--   Source : FL DEP Outdoor Recreation Inventory (FORI), https://ags.dep.state.fl.us/arcgis/rest/services/OpenData/PARKS_FORI/MapServer/0/query
--   Filter : same fishing fields as setup/60 (bank fishing, saltwater/freshwater piers, catwalks, jetty length > 0) AND INCLUDE_SITE='Y' AND DECIMAL_DEGREES_LAT > 28.6
--            (everything south of 28.6 N was loaded by setup/60 and the South Florida load)
--   Counts : 432 sites north of 28.6 N, all in one request (the server answers slowly: wait about a minute before reading the answer)
--   Result : 432 new rows = 428 active (233 parks, 189 piers, 6 jetties) + 4 switched off (campgrounds / resort, same rule as setup/60).
--            fl-fori rows 452 -> 884 (853 active); table 1.5 MB; database still 21 MB.
--   Same rules as setup/60: kind 'pier' when any pier/catwalk > 0, 'jetty' when only a jetty length > 0, else 'park';
--            water_type only when the pier/jetty fields name just one of salt / fresh; names tidied from ALL CAPS to Title Case;
--            active = false for CATEGORY 'CLUB' or names with: web address, yacht, country club, golf, museum, baseball, softball,
--            sports complex, community center, campground, resort, condominium.
--   UNDO (Richard runs it in the SQL Editor if ever needed; the connector blocks deletes):
--     delete from public.official_spots where source = 'fl-fori' and created_at >= '2026-10-15 23:30-04' and lat > 28.6;

-- 1) Ask the service (timeout 90 s):
select net.http_get(
  url := 'https://ags.dep.state.fl.us/arcgis/rest/services/OpenData/PARKS_FORI/MapServer/0/query',
  params := jsonb_build_object(
    'where', $w$(BANK_FISHING_AREAS>0 OR SALTWATER_PIERS>0 OR FRESHWATER_PIERS>0 OR SALTWATER_CATWALKS>0 OR FRESHWATER_CATWALKS>0 OR SALTWATER_JETTY_LENGTH>0 OR FRESHWATER_JETTY_LENGTH>0) AND INCLUDE_SITE='Y' AND DECIMAL_DEGREES_LAT > 28.6$w$,
    'outFields', 'ID,SITE_NAME,COUNTY,LOCATION_CITY,PRIMARY_AGENCY,WEBSITE,DECIMAL_DEGREES_LAT,DECIMAL_DEGREES_LONG,BANK_FISHING_AREAS,SALTWATER_PIERS,FRESHWATER_PIERS,SALTWATER_CATWALKS,FRESHWATER_CATWALKS,SALTWATER_JETTY_LENGTH,FRESHWATER_JETTY_LENGTH,CATEGORY',
    'returnGeometry', 'false', 'orderByFields', 'ID', 'resultRecordCount', '1000', 'f', 'json'),
  timeout_milliseconds := 90000) as request_id;

-- 2) Turn the saved answer into rows (replace 2035 with the request_id from step 1):
with feats as (
  select f->'attributes' as a from jsonb_array_elements((select content::jsonb->'features' from net._http_response where id = 2035)) f
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
