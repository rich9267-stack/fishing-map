-- 71: official boat ramps for the rest of Florida (sprint #4 step 2). No table changes: the table from setup/39 is reused, same method as setup/60.
-- Loaded Oct 15 2026 by the database itself with pg_net (the workspace can't reach these sites). Re-running is safe (on conflict do nothing).
--   Source : FWC Boat Ramp Inventory, https://gis.myfwc.com/mapping/rest/services/Open_Data/FWC_Florida_Boat_Ramp_Inventory/MapServer/4/query
--   Filter : Status='Open for Business' AND AccessType LIKE '%for General Public Use' (same as setup/60) AND Latitude > 28.6
--            (everything south of 28.6 N was loaded by setup/60 and the South Florida load)
--   Counts : statewide with that filter 2,414; north of 28.6 = 1,301 (all returned in one request, under the 2,000 limit)
--   Result : 1,296 new rows (3 duplicate ids in the feed + a few already loaded were skipped). fwc-ramp rows 973 -> 2,269; table 1.3 MB; database still 21 MB.
--   Freshwater: 866 of the 1,301 are freshwater ramps (water_type 'freshwater'); the rest stay null and the app guesses from the nearest tide station.
--   Data age: FWC's ramp list rests on a 2009 survey, so the app keeps the "check before you go" wording for official ramps.
--   UNDO (Richard runs it in the SQL Editor if ever needed; the connector blocks deletes):
--     delete from public.official_spots where source = 'fwc-ramp' and created_at >= '2026-10-15 23:00-04' and lat > 28.6;

-- 1) Ask the service (timeout 90 s):
select net.http_get(
  url := 'https://gis.myfwc.com/mapping/rest/services/Open_Data/FWC_Florida_Boat_Ramp_Inventory/MapServer/4/query',
  params := jsonb_build_object(
    'where', $w$Status='Open for Business' AND AccessType LIKE '%for General Public Use' AND Latitude > 28.6$w$,
    'outFields', 'RampID,RampName,RampType,PrimaryAdminEntity,isFeeRequired,Hours,TotalLanes,City,County,Latitude,Longitude,WaterType,WaterBodyName',
    'returnGeometry', 'false', 'orderByFields', 'RampID', 'resultRecordCount', '2000', 'f', 'json'),
  timeout_milliseconds := 90000) as request_id;

-- 2) Turn the saved answer into rows (replace 2031 with the request_id from step 1):
with feats as (
  select f->'attributes' as a from jsonb_array_elements((select content::jsonb->'features' from net._http_response where id = 2031)) f
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
