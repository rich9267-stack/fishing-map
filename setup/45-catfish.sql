-- US anglers' catfish (Oct 13 2026), applied as migrations fish_rank_catfish_rows + fish_rank_hardhead_only.
-- Same rows, same order as the end of FISH_RANK_TABLE (js/15) and WEIGHT_REF (js/07); tests/test88.js checks they agree.
insert into public.fish_rank_species (words, big_in, rarity, p, s, st, ref_len, ref_wt) values
  (array['blue catfish', 'blue cat'], 46, 3, 9, 4, 8, 30, 13),
  (array['flathead catfish', 'flathead cat', 'shovelhead'], 45, 4, 10, 3, 8, 30, 12.5),
  (array['white catfish', 'white cat'], 20, 2, 4, 3, 5, 16, 1.8),
  (array['black bullhead'], 14, 1, 2, 2, 3, 12, 0.8),
  (array['brown bullhead'], 15, 1, 3, 2, 4, 12, 0.85),
  (array['yellow bullhead'], 13, 1, 2, 2, 3, 11, 0.65),
  (array['flat bullhead'], 10, 3, 2, 2, 2, 9, 0.35),
  (array['snail bullhead'], 10, 3, 2, 2, 2, 9, 0.35),
  (array['spotted bullhead'], 10, 4, 2, 2, 2, 9, 0.35),
  (array['headwater catfish'], 18, 5, 5, 4, 5, 15, 1.4),
  (array['walking catfish', 'clarias'], 15, 2, 3, 2, 5, 12, 0.6),
  (array['sailfin catfish', 'suckermouth', 'pleco'], 18, 1, 3, 1, 4, 16, 1.5),
  (array['brown hoplo', 'hoplo'], 9, 1, 1, 1, 3, 8, 0.3),
  (array['gafftopsail', 'gafftop'], 26, 2, 5, 4, 5, 20, 3);

-- Gafftopsail now has its own row; the hardhead row covers hardhead only.
update public.fish_rank_species set words = array['hardhead'] where words = array['hardhead', 'gafftopsail'];
