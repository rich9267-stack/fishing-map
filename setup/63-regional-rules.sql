-- 63: regional fishing rules (Gulf expansion, step 6). FWC pages checked 2026-10-15. Run in the Supabase SQL Editor (see the note below).
-- fish_rules.regions = where a row applies. No tags (null) = the whole state. Tags the app understands:
--   atlantic · keys (Monroe County) · gulf · spz (Special Permit Zone: south of Cape Florida + the Keys)
--   sw (Gulf-side Southwest: Collier south of Vanderbilt Beach Rd + Monroe) · ch (Charlotte Harbor) · bigbend (Franklin to Pasco counties)
-- A species can have several rows (one per region); the app picks the row for where you are (js/10 pickRegionRow).
-- Nothing is removed except the old one-row-per-species limit. Every update has a where.
-- The connector refuses the 'drop constraint' line, so Richard pastes this whole file into the Supabase SQL Editor (Run) — AFTER the v106 app is live.

alter table fish_rules add column if not exists regions text[];
-- one row per species PER REGION now (it used to be one row per species), so swap the old one-row-per-species limit:
alter table fish_rules drop constraint if exists fish_rules_species_key;
create unique index if not exists fish_rules_species_regions_key on fish_rules (species, (coalesce(regions, '{}'::text[])));
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fish_rules_regions_ok') then
    alter table fish_rules add constraint fish_rules_regions_ok
      check (regions is null or regions <@ array['atlantic','keys','gulf','spz','sw','ch','bigbend']::text[]);
  end if;
end $$;

-- ---- existing rows were written for the Atlantic coast: tag them ----
update fish_rules set regions = array['atlantic','keys'], verified_on = '2026-10-15',
  note = coalesce(note || ' ', '') || 'Monroe County (the Keys) follows the Atlantic rules.'
  where species = 'Gag grouper' and regions is null;
update fish_rules set regions = array['atlantic','keys'], verified_on = '2026-10-15',
  note = coalesce(note || ' ', '') || 'Monroe County (the Keys) follows the Atlantic rules.'
  where species in ('Black grouper','Red grouper','Scamp') and regions is null;

update fish_rules set regions = array['atlantic'], verified_on = '2026-10-15',
  note = 'Atlantic coast, Nassau to Miami-Dade counties: 3 per person. (Gulf coast and Monroe County: 10 per person.)'
  where species = 'Bluefish';
update fish_rules set regions = array['atlantic','keys','sw'], verified_on = '2026-10-15'
  where species = 'Great barracuda';
update fish_rules set regions = array['atlantic'], verified_on = '2026-10-15'
  where species in ('Greater amberjack','Lane snapper','Gray triggerfish','Red snapper');
update fish_rules set regions = array['atlantic'], verified_on = '2026-10-15',
  note = 'Atlantic coast (not Monroe County): 2 per person. Hook and line or spear only.'
  where species = 'King mackerel';
update fish_rules set regions = array['atlantic'], verified_on = '2026-10-15',
  note = 'Atlantic: 5 per person or 30 per boat, whichever is less.'
  where species = 'Mahi (dolphinfish)';
update fish_rules set regions = array['atlantic','keys'], verified_on = '2026-10-15',
  note = 'Atlantic coast and the Keys (south of Cape Sable): open May 1 – Oct 31 only. Gulf coast: 14″, 5 per person, open all year. A dehooking tool is required.'
  where species = 'Hogfish';
update fish_rules set regions = array['atlantic'], verified_on = '2026-10-15',
  note = 'Atlantic coast: Southeast, Indian River Lagoon and Northeast regions.'
  where species = 'Snook';

-- Permit: the old row was the Special Permit Zone rule. Pompano / Broward / Palm Beach are OUTSIDE that zone (it starts south of Cape Florida).
update fish_rules set regions = array['spz'], verified_on = '2026-10-15',
  note = 'Special Permit Zone: south of Cape Florida (25°40′N), Biscayne Bay south of the Rickenbacker Causeway, and the Keys. Hook and line only in state waters.'
  where species = 'Permit';

-- rules that stay one statewide row, but whose note needs the regional facts
update fish_rules set verified_on = '2026-10-15',
  note = 'South Florida, the Keys and the Gulf coast from Tampa Bay south: 2 per boat. Big Bend and the Panhandle allow 4 per boat. In the Indian River Lagoon redfish are catch-and-release only.'
  where species = 'Redfish (red drum)';
update fish_rules set verified_on = '2026-10-15',
  note = 'One fish over 19″ allowed per boat (per person from shore), and it counts in the bag. Big Bend allows 5 per person. North of Palm Beach County (Indian River Lagoon, Northeast) the rules differ — double-check.'
  where species = 'Spotted seatrout';

-- ---- new rows: Gulf, Keys and the other regions ----
insert into fish_rules (species, match, min_in, max_in, measure, one_over, bag, release_only, closed, open_only, note, source_url, verified_on, active, regions) values
 ('Snook', array['snook'], 28, 33, 'total', false, '1 per person · snook permit needed', false,
  '[["12-01","02-29"],["05-01","08-31"]]'::jsonb, null,
  'Gulf coast (Panhandle, Big Bend, Tampa Bay, Sarasota Bay): closed Dec 1 – end of Feb and May 1 – Aug 31. Catch-and-release is fine while closed.',
  'https://myfwc.com/fishing/saltwater/recreational/snook/', '2026-10-15', true, array['gulf']),
 ('Snook', array['snook'], 28, 33, 'total', false, '1 per person · snook permit needed', false,
  '[["12-01","02-29"],["05-01","09-30"]]'::jsonb, null,
  'Charlotte Harbor, Southwest (Naples to Everglades) and the Keys: closed Dec 1 – end of Feb and May 1 – Sept 30. Catch-and-release is fine while closed.',
  'https://myfwc.com/fishing/saltwater/recreational/snook/', '2026-10-15', true, array['ch','sw','keys']),
 ('Redfish (red drum)', array['redfish','red drum'], 18, 27, 'total', false, '1 per person, 4 per boat', false, null, null,
  'Big Bend: 4 per boat (2 per boat farther south).',
  'https://myfwc.com/fishing/saltwater/recreational/red-drum/', '2026-10-15', true, array['bigbend']),
 ('Spotted seatrout', array['seatrout','speckled trout','spotted trout'], 15, 19, 'total', true, '5 per person', false, null, null,
  'Big Bend: 5 per person, open all year. One fish over 19″ allowed per boat (per person from shore), and it counts in the bag.',
  'https://myfwc.com/fishing/saltwater/recreational/spotted-seatrout/', '2026-10-15', true, array['bigbend']),
 ('Black grouper', array['black grouper'], 24, null, 'total', false, '4 per person (4 grouper in total)', false, null, null,
  'Gulf state waters: open all year. Federal Gulf waters are closed Feb 1 – Mar 31 past 20 fathoms, and “The Edges” are closed Jan 1 – Apr 30. State Reef Fish Angler sign-up needed.',
  'https://myfwc.com/fishing/saltwater/recreational/groupers/', '2026-10-15', true, array['gulf']),
 ('Gag grouper', array['gag'], 24, null, 'total', false, '2 per person (4 grouper in total)', false, null, '[["2026-09-01","2026-09-30"]]'::jsonb,
  'Gulf: open Sept 1–30, 2026 only. Check FWC for next year''s dates. State Reef Fish Angler sign-up needed.',
  'https://myfwc.com/fishing/saltwater/recreational/groupers/', '2026-10-15', true, array['gulf']),
 ('Red grouper', array['red grouper'], 20, null, 'total', false, '2 per person (4 grouper in total)', false, null, null,
  'Gulf state waters: open all year. Federal Gulf waters are closed Feb 1 – Mar 31 past 20 fathoms, and “The Edges” are closed Jan 1 – Apr 30.',
  'https://myfwc.com/fishing/saltwater/recreational/groupers/', '2026-10-15', true, array['gulf']),
 ('Scamp', array['scamp'], 16, null, 'total', false, 'up to 4 per person (within the 4-grouper total)', false, null, null,
  'Gulf state waters: open all year.',
  'https://myfwc.com/fishing/saltwater/recreational/groupers/', '2026-10-15', true, array['gulf']),
 ('Red snapper', array['red snapper'], 16, null, 'total', false, '2 per person (within 10 snapper in total)', false, null,
  '[["2026-05-22","2026-07-31"],["2026-09-01","2026-10-04"],["2026-10-09","2026-10-22"],["2026-10-23","2026-10-25"],["2026-10-30","2026-11-01"],["2026-11-07","2026-11-08"],["2026-11-14","2026-11-15"],["2026-11-21","2026-11-22"],["2026-11-26","2026-11-29"],["2026-12-05","2026-12-06"],["2026-12-12","2026-12-13"],["2026-12-19","2026-12-20"],["2026-12-25","2026-12-27"],["2027-01-01","2027-01-04"]]'::jsonb,
  'Gulf 2026 season: May 22 – Jul 31 and Sept 1 – Oct 4 and Oct 9–22 (every day), then selected weekends and holidays through Jan 4, 2027. Fishing for them also needs the State Reef Fish Angler sign-up.',
  'https://myfwc.com/fishing/saltwater/recreational/snappers/', '2026-10-15', true, array['gulf']),
 ('Lane snapper', array['lane snapper'], 10, null, 'total', false, '20 per person (not part of the 10-snapper total)', false, null, null,
  'Gulf state waters, new rule from April 1, 2026.',
  'https://myfwc.com/fishing/saltwater/recreational/snappers/', '2026-10-15', true, array['gulf']),
 ('Hogfish', array['hogfish'], 14, null, 'fork', false, '5 per person', false, null, null,
  'Gulf coast (north of Cape Sable): open all year.',
  'https://myfwc.com/fishing/saltwater/recreational/hogfish/', '2026-10-15', true, array['gulf']),
 ('Greater amberjack', array['amberjack'], 34, null, 'fork', false, '1 per person', false, null, '[["2026-09-01","2026-10-13"]]'::jsonb,
  'Gulf: open Sept 1 – Oct 13, 2026 only (FWC sets the dates each year).',
  'https://myfwc.com/fishing/saltwater/recreational/amberjack/', '2026-10-15', true, array['gulf']),
 ('Gray triggerfish', array['triggerfish'], 15, null, 'fork', false, '1 per person', false, '[["01-01","02-29"],["06-01","07-31"]]'::jsonb, null,
  'Gulf: open Mar 1 – May 31 and Aug 1 – Dec 31.',
  'https://myfwc.com/fishing/saltwater/recreational/triggerfish/', '2026-10-15', true, array['gulf']),
 ('King mackerel', array['king mackerel','kingfish'], 24, null, 'fork', false, '3 per person', false, null, null,
  'Gulf coast and Monroe County (the Keys): 3 per person. Hook and line or spear only.',
  'https://myfwc.com/fishing/saltwater/recreational/king-mackerel/', '2026-10-15', true, array['gulf','keys']),
 ('Bluefish', array['bluefish'], 12, null, 'fork', false, '10 per person', false, null, null,
  'Gulf coast and Monroe County (the Keys): 10 per person.',
  'https://myfwc.com/fishing/saltwater/recreational/bluefish/', '2026-10-15', true, array['gulf','keys']),
 ('Mahi (dolphinfish)', array['mahi','dolphin'], null, null, 'fork', false, '10 per person or 60 per boat, whichever is less', false, null, null,
  'Gulf: no minimum size.',
  'https://myfwc.com/fishing/saltwater/recreational/dolphinfish/', '2026-10-15', true, array['gulf']),
 ('Great barracuda', array['barracuda'], null, null, 'fork', false, '2 per person or 100 lb, whichever is more', false, null, null,
  'Gulf coast north of Collier County: no size limit.',
  'https://myfwc.com/fishing/saltwater/recreational/barracuda/', '2026-10-15', true, array['gulf']),
 ('Permit', array['permit'], 11, 22, 'fork', true, '2 per person · only 1 over 22″ (it counts in the bag), 2 over-22 per boat', false, null, null,
  'Outside the Special Permit Zone: this is the rule from Palm Beach to Miami (north of Cape Florida) and on the whole Gulf coast. Hook and line only in state waters.',
  'https://myfwc.com/fishing/saltwater/recreational/permit/', '2026-10-15', true, array['atlantic','gulf']);
