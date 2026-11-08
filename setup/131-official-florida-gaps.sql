-- 131: last Florida gaps in the ✅ Official public spots layer, found by a full ID-by-ID check (Nov 8 2026).
-- Check: asked both services for their WHOLE statewide lists (same filters as setup/71 and setup/72, paged by 1000)
--   FWC Boat Ramp Inventory : 2,414 open public ramps -> 2,411 already in official_spots, 3 missing (new to FWC's list since Oct 15)
--   FL DEP FORI             : 1,035 fishing sites     ->   935 already in, 100 not in:
--       97 have NO map location in FORI (private RV resorts, fish camps, country clubs) - can't be pinned, left out on purpose
--        1 never loaded: Dry Tortugas National Park (setup/39's Keys box stopped east of it)
--        2 had a typo in FORI (longitude written without the minus sign, which puts them in China) - loaded with the sign fixed
-- Rows are written out as plain values (no saved web answers needed), same rules as setup/71 and setup/72. Re-running is safe.
-- Not changed: 51 older rows (48 FORI, 3 FWC) are no longer in today's lists; left as they are (admins can hide them via Fix official places).
-- No table changes; official_spots is left out of the backup (database-change-rule.md).
-- UNDO (Richard runs it in the SQL Editor if ever needed; the connector blocks deletes):
--   delete from public.official_spots where (source='fwc-ramp' and source_id in ('CI00066KO','CI44405SX','DU00773CH'))
--     or (source='fl-fori' and source_id in ('200009','36035','36395'));

insert into public.official_spots (source, source_id, name, kind, lat, lng, water_type, county, details) values
 ('fwc-ramp','CI00066KO','Lake Henderson Public Boat Ramp on State Road 44','ramp',28.83354329,-82.31737508,'freshwater','CITRUS',
  '{"fee":"No","city":"INVERNESS","type":"Stand Alone Ramp","hours":"24 Hours","lanes":2,"owner":"Citrus County","water":"Tsala Apopka Chain of Lakes - Lake Henderson"}'),
 ('fwc-ramp','CI44405SX','North Apopka Avenue Public Boat Ramp (No Parking)','ramp',28.84382603,-82.33026145,'freshwater','CITRUS',
  '{"fee":"No","city":"INVERNESS","type":"Stand Alone Ramp","hours":"Sunrise to Sunset","lanes":1,"owner":"City of Inverness","water":"Tsala Apopka Chain of Lakes - Lake Henderson"}'),
 ('fwc-ramp','DU00773CH','McCue Park and Boat Ramp','ramp',30.29019997,-81.41986328,null,'DUVAL',
  '{"fee":"No","city":"JACKSONVILLE BEACH","type":"Stand Alone Ramp","hours":"24 hours","lanes":4,"owner":"City of Jacksonville","water":"Atlantic ICW (Duval County)"}'),
 ('fl-fori','200009','Dry Tortugas National Park','pier',24.628554393,-82.873077402,'saltwater','MONROE',
  '{"web":"https://www.nps.gov/drto/index.htm","owner":"NATIONAL PARK SERVICE"}'),
 ('fl-fori','36035','Lake Fairview Park','pier',28.59844889,-81.41447389,'freshwater','ORANGE',
  '{"city":"ORLANDO","owner":"ORLANDO"}'),
 ('fl-fori','36395','O.L. Peacock Sr Park','park',27.248458333,-80.4092,null,'ST LUCIE',
  '{"city":"PORT ST. LUCIE","owner":"PORT ST LUCIE","bank_areas":1}')
on conflict (source, source_id) do nothing;
