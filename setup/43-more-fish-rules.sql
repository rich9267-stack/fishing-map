-- 43: size rules for four more fish (FWC pages, checked 2026-10-13). Applied as Supabase migration `more_fish_rules`.
-- Tripletail: FWC page doesn't say how length is measured; total length assumed — the note tells people to confirm.
insert into fish_rules (species, match, min_in, max_in, measure, one_over, bag, release_only, closed, open_only, note, source_url, verified_on, active) values
 ('Tripletail', array['tripletail'], 18, null, 'total', false, '2 per person', false, null, null,
  'Hook and line only; no multiple-hook rigs with natural bait. The FWC page does not say how length is measured — confirm.',
  'https://myfwc.com/fishing/saltwater/recreational/tripletail/', '2026-10-13', true),
 ('Flounder', array['flounder'], 14, null, 'total', false, '5 per person', false, '[["10-15","11-30"]]'::jsonb, null,
  'Closed Oct 15 – Nov 30 each year.',
  'https://myfwc.com/fishing/saltwater/recreational/flounder/', '2026-10-13', true),
 ('Hogfish', array['hogfish'], 16, null, 'fork', false, '1 per person', false, null, '[["05-01","10-31"]]'::jsonb,
  'Atlantic: open May 1 – Oct 31 only. (Gulf waters differ: 14", 5 per person, open all year.)',
  'https://myfwc.com/fishing/saltwater/recreational/hogfish/', '2026-10-13', true),
 ('Greater amberjack', array['amberjack'], 28, null, 'fork', false, '1 per person', false, '[["04-01","04-30"]]'::jsonb, null,
  'Atlantic: closed in April.',
  'https://myfwc.com/fishing/saltwater/recreational/amberjack/', '2026-10-13', true);
