-- 95: Gulf fishing rules (US plan step 4, Gulf region): Texas now; Louisiana LATER.
-- Texas checked 2026-10-21 on TPWD's own Outdoor Annual pages (saltwater pages say "Valid Sep. 1, 2026 through Aug. 31, 2027"; links in source_url).
-- Louisiana: the LDWF site (wlf.louisiana.gov) refused our page requests (HTTP 403), so no number could be read on the state's own page.
-- NO Louisiana rows are added; the app says "We don't have a Louisiana rule for this fish yet" and links the agency. Add them when the page can be read.
-- A state rule is a normal fish_rules row whose `regions` holds the 2-letter state code. The check that allows LA / TX codes came with setup/94,
-- so this file only inserts rows (apply in the Supabase SQL Editor or as a migration; no delete / drop anywhere).

insert into fish_rules (species, match, regions, min_in, max_in, measure, one_over, bag, release_only, closed, open_only, note, source_url, verified_on, active) values
-- ---------------- Texas: saltwater ----------------
 ('Red drum', array['red drum','redfish'], array['TX'], 20, 28, 'total', false, '3 per person', false, null, null,
  'One red drum over 28″ may be kept with a Red Drum Tag (a second with a Bonus tag), in addition to the daily bag. Possession limit is double the daily bag.',
  'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/saltwater-fishing/bag-length-limits/drum-bag-length-limits', '2026-10-21', true),
 ('Black drum', array['black drum'], array['TX'], 14, 30, 'total', false, '5 per person', false, null, null,
  'No more than one black drum over 52″ per person per day (it counts toward the bag).',
  'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/saltwater-fishing/bag-length-limits/drum-bag-length-limits', '2026-10-21', true),
 ('Spotted seatrout', array['seatrout','speckled trout','spotted trout'], array['TX'], 15, 20, 'total', false, '3 per person', false, null, null,
  'One trout over 28″ may be kept with a Spotted Seatrout Tag (a second with a Bonus tag). Possession limit is 6.',
  'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/saltwater-fishing/bag-length-limits/seatrout-bag-length-limits', '2026-10-21', true),
 ('Flounder', array['flounder'], array['TX'], 15, null, 'total', false, '5 per person', false, '[["11-01","12-14"]]'::jsonb, null,
  'Closed Nov 1 – Dec 14 (bag limit 0). Possession limit equals the daily bag.',
  'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/saltwater-fishing/bag-length-limits/flounder-bag-length-limits', '2026-10-21', true),
 ('Sheepshead', array['sheepshead'], array['TX'], 15, null, 'total', false, '5 per person', false, null, null,
  null, 'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/saltwater-fishing/bag-length-limits/sheepshead-bag-length-limits', '2026-10-21', true),
 ('Tarpon', array['tarpon'], array['TX'], 85, null, 'total', false, '1 per person', false, null, null,
  'Only a tarpon 85″ or longer may be kept, so almost every tarpon is released.',
  'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/saltwater-fishing/bag-length-limits/tarpon-bag-length-limits', '2026-10-21', true),
 ('King mackerel', array['kingfish','king mackerel'], array['TX'], 27, null, 'total', false, '3 per person', false, null, null,
  null, 'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/saltwater-fishing/bag-length-limits/mackerel-bag-length-limits', '2026-10-21', true),
-- ---------------- Texas: freshwater (statewide; many lakes differ) ----------------
 ('Largemouth bass', array['largemouth','black bass'], array['TX'], 14, null, 'total', false, '5 black bass per person (largemouth, smallmouth, Alabama, Guadalupe and spotted together)', false, null, null,
  'Special rules apply on certain lakes: check the lake page on tpwd.texas.gov. Spotted, Guadalupe and Alabama bass have no minimum.',
  'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/freshwater-fishing/bag-length-limits', '2026-10-21', true),
 ('Striped bass', array['striped bass','striper','hybrid bass'], array['TX'], 18, null, 'total', false, '5 per person (striped and hybrid together)', false, null, null,
  'Special rules apply on certain lakes (Lake Texoma has its own possession rule).',
  'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/freshwater-fishing/bag-length-limits', '2026-10-21', true),
 ('Crappie', array['crappie','speckled perch'], array['TX'], 10, null, 'total', false, '25 per person (white and black together)', false, null, null,
  'Special rules apply on certain lakes (Lake Texoma allows more).',
  'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/freshwater-fishing/bag-length-limits', '2026-10-21', true),
 ('Channel & blue catfish', array['channel catfish','blue catfish','catfish'], array['TX'], null, null, 'total', false, '25 per person (channel and blue together), only 10 of them 20″ or longer', false, null, null,
  'No minimum size. Special rules apply on certain lakes.',
  'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/freshwater-fishing/bag-length-limits', '2026-10-21', true),
 ('Flathead catfish', array['flathead catfish','flathead'], array['TX'], 18, null, 'total', false, '5 per person', false, null, null,
  'Special rules apply on certain lakes.',
  'https://tpwd.texas.gov/regulations/outdoor-annual/fishing/freshwater-fishing/bag-length-limits', '2026-10-21', true);
