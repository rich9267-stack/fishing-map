-- Gulf coast + Keys fish and sharks (Oct 15 2026), applied as migration fish_rank_gulf_species.
-- Same rows, same order as the end of FISH_RANK_TABLE (js/15) and WEIGHT_REF (js/07); tests/test88.js and tests/test117.js check they agree.
-- columns: words, big_in (a big adult, inches), rarity 1-5, p = strength, s = speed, st = stamina (1-10), ref_len / ref_wt (a typical fish: inches, pounds)
insert into public.fish_rank_species (words, big_in, rarity, p, s, st, ref_len, ref_wt) values
  (array['bonefish'], 30, 4, 5, 10, 6, 24, 4.5),
  (array['blacktip'], 66, 3, 8, 9, 6, 60, 60),
  (array['bull shark'], 90, 4, 10, 6, 9, 72, 110),
  (array['bonnethead'], 36, 2, 4, 5, 4, 30, 7),
  (array['nurse shark'], 96, 2, 7, 2, 8, 72, 100),
  (array['lemon shark'], 96, 4, 8, 5, 8, 72, 85),
  (array['cubera'], 48, 5, 10, 6, 9, 40, 35),
  (array['blackfin tuna'], 34, 3, 6, 9, 7, 28, 12),
  (array['yellowfin tuna'], 52, 4, 9, 10, 8, 40, 40),
  (array['bar jack'], 22, 2, 4, 7, 5, 16, 2),
  (array['horse-eye', 'horse eye'], 28, 2, 7, 8, 7, 24, 6.5),
  (array['sand seatrout', 'sand trout', 'white trout'], 14, 2, 2, 4, 2, 12, 0.5),
  (array['lionfish'], 14, 2, 2, 2, 2, 12, 0.8),
  (array['shark'], 72, 3, 7, 6, 7, 60, 55);

-- Skipjack tuna: without its own row, "skipjack" matched the word "jack" and was ranked as a jack crevalle (applied as fish_rank_skipjack).
insert into public.fish_rank_species (words, big_in, rarity, p, s, st, ref_len, ref_wt) values
  (array['skipjack'], 30, 2, 6, 10, 6, 24, 8);
