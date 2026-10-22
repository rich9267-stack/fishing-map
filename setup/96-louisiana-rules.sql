-- 96: Louisiana fishing rules (US plan step 4, Gulf region, second half).
-- Source: LDWF "2026 Louisiana Recreational Fishing Regulations" handbook, UPDATED SEPTEMBER 21, 2026 (the PDF Richard downloaded from
-- wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf; saltwater table p.28, freshwater tables p.19-20). Checked 2026-10-21.
-- Not added because the handbook lists no size/bag limit for them: sheepshead, tarpon (the app says "We don't have a Louisiana rule for this fish yet").
-- Needs setup/94 first (its check allows the 'LA' code). Insert only; no delete / drop.

insert into fish_rules (species, match, regions, min_in, max_in, measure, one_over, bag, release_only, closed, open_only, note, source_url, verified_on, active) values
 ('Red drum', array['red drum','redfish'], array['LA'], 18, 27, 'total', false, '4 per person', false, null, null,
  'None over 27″ may be kept. No take or possession in federal waters. Captain and crew on a charter or head boat may not keep red drum.',
  'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true),
 ('Black drum', array['black drum'], array['LA'], 16, 27, 'total', true, '5 per person', false, null, null,
  'No more than one black drum over 27″ per person.',
  'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true),
 ('Spotted seatrout', array['seatrout','speckled trout','spotted trout'], array['LA'], 13, 20, 'total', true, '15 per person', false, null, null,
  'No more than 2 of the 15 may be over 20″. Captain and crew on a charter or head boat may not keep speckled trout.',
  'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true),
 ('Southern flounder', array['flounder'], array['LA'], null, null, 'total', false, '10 per person', false, '[["10-15","11-30"]]'::jsonb, null,
  'No size limit. No possession allowed Oct 15 – Nov 30.',
  'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true),
 ('King mackerel', array['kingfish','king mackerel'], array['LA'], 24, null, 'fork', false, '3 per person', false, null, null,
  null, 'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true),
 ('Spanish mackerel', array['spanish'], array['LA'], 12, null, 'fork', false, '15 per person', false, null, null,
  null, 'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true),
 ('Largemouth bass', array['largemouth','black bass'], array['LA'], null, null, 'total', false, '10 black bass per person (largemouth and spotted together)', false, null, null,
  'Statewide: no size limit. Many waters differ: Lower Atchafalaya Basin, Grassy Lake, Lake Palourde and Lake Verret (from Aug 1, 2026) are 12″ and 5; Saline-Larto 14″ and 8 (from Sep 20, 2026); Caddo Lake 12″ for largemouth; Sabine River below Toledo Bend dam 14″ and 8; other waters have slots. Check the water.',
  'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true),
 ('Striped bass', array['striped bass','striper','hybrid bass','white bass'], array['LA'], null, null, 'total', false, '5 per person (striped and hybrid together), no more than 2 over 30″', false, null, null,
  'No size limit. White bass are separate: 50 a day (25 on Caddo Lake, the Sabine River and Toledo Bend).',
  'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true),
 ('Crappie (sac-a-lait)', array['crappie','speckled perch','sac-a-lait','sacalait'], array['LA'], null, null, 'total', false, '50 per person (black and white together)', false, null, null,
  'Statewide: no size limit. Lower Atchafalaya Basin area 8″ and 25 (from Aug 1, 2026); Saline-Larto 10″ and 25; other waters have their own limits. Check the water.',
  'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true),
 ('Channel & blue catfish', array['channel catfish','blue catfish','catfish'], array['LA'], null, null, 'total', false, '100 per person (channel, blue and flathead together)', false, null, null,
  'Statewide minimums: blue 12″, channel 11″ (you may hold up to 25 undersized catfish). Caddo Lake, the Sabine River and Toledo Bend: no minimum, 50 per day, no more than 5 over 30″.',
  'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true),
 ('Flathead catfish', array['flathead catfish','flathead'], array['LA'], 14, null, 'total', false, '100 per person (all catfish together)', false, null, null,
  'Caddo Lake, the Sabine River and Toledo Bend: 18″ minimum and 10 per day.',
  'https://www.wlf.louisiana.gov/assets/Resources/Publications/Regulations/26LAFW.pdf', '2026-10-21', true);
