-- Fish rank rules live in the database so Power cannot be faked by editing the app.
-- Same formula as js/15-fish-rank.js (tests/test88.js checks the two agree over 3,042 species/size combinations).
-- Rank needs a photo and a size; capped at 130% of a big adult; blurred-for-review catches get none.
-- Applied Oct 13 2026 as three migrations (fish_rank_1_table, fish_rank_2_function, fish_rank_3_view), written with only
-- create/insert/grant: the Supabase connector cancelled versions containing truncate / drop / revoke (its "destructive" check).
-- Who can see what: signed-out visitors are refused (is_member() can't even run for them); members get ranks only for catches
-- they may already see (the view uses the viewer's own rules on catches and photos). Checked with pretend users, see build_history.

-- Part 1: the species table (one row per FISH_RANK_TABLE entry, plus the weight reference from WEIGHT_REF in js/07)
create table public.fish_rank_species (
  id serial primary key,
  words text[] not null,          -- name fragments, matched inside the species text (longest match wins)
  big_in numeric not null,        -- length of a big adult, inches
  rarity int not null check (rarity between 1 and 5),
  p int not null check (p between 1 and 10),   -- strength
  s int not null check (s between 1 and 10),   -- speed
  st int not null check (st between 1 and 10), -- stamina
  ref_len numeric not null,       -- typical length/weight pair, used to turn a real weight into a length
  ref_wt numeric not null
);
alter table public.fish_rank_species enable row level security;
create policy "members read fish rank rules" on public.fish_rank_species for select using (public.is_member());

insert into public.fish_rank_species (words, big_in, rarity, p, s, st, ref_len, ref_wt) values
  (array['snook'], 34, 3, 7, 7, 6, 30, 8.7),
  (array['tarpon'], 72, 5, 10, 8, 10, 60, 85),
  (array['redfish', 'red drum'], 33, 3, 6, 5, 7, 27, 7.5),
  (array['seatrout', 'speckled trout', 'trout'], 24, 2, 4, 5, 4, 20, 3),
  (array['crevalle', 'jack'], 36, 3, 8, 9, 9, 30, 16),
  (array['mangrove', 'gray snapper'], 20, 2, 5, 5, 5, 16, 2.4),
  (array['mutton'], 30, 4, 7, 6, 6, 24, 7.8),
  (array['yellowtail'], 20, 3, 4, 7, 5, 16, 1.7),
  (array['lane snapper'], 14, 1, 2, 4, 3, 12, 1),
  (array['red snapper'], 30, 4, 7, 5, 7, 24, 8),
  (array['pompano'], 18, 3, 4, 8, 5, 15, 2.1),
  (array['permit'], 36, 5, 8, 9, 8, 30, 20),
  (array['spanish'], 24, 2, 4, 9, 4, 20, 2.2),
  (array['bluefish'], 24, 2, 5, 7, 5, 20, 2.7),
  (array['sheepshead'], 22, 2, 5, 3, 6, 16, 3.2),
  (array['whiting', 'kingcroaker'], 16, 1, 2, 3, 3, 14, 0.95),
  (array['kingfish', 'king mackerel'], 48, 4, 8, 10, 6, 40, 15.7),
  (array['mahi', 'dolphin'], 48, 4, 7, 10, 6, 40, 19.6),
  (array['wahoo'], 66, 5, 8, 10, 6, 60, 48),
  (array['black grouper'], 48, 5, 9, 3, 9, 36, 25),
  (array['red grouper'], 30, 3, 7, 3, 8, 24, 7),
  (array['gag'], 38, 4, 8, 3, 8, 30, 12),
  (array['goliath'], 72, 5, 10, 3, 10, 60, 120),
  (array['barracuda'], 52, 4, 8, 9, 6, 40, 14.5),
  (array['cobia'], 50, 5, 9, 6, 9, 40, 19),
  (array['ladyfish'], 22, 1, 2, 8, 3, 20, 1.5),
  (array['black drum'], 40, 3, 8, 3, 8, 30, 15),
  (array['largemouth'], 24, 3, 6, 5, 6, 20, 5),
  (array['peacock'], 24, 4, 6, 8, 6, 18, 4),
  (array['snakehead'], 36, 4, 7, 5, 8, 30, 10),
  (array['bluegill', 'panfish', 'shellcracker'], 11, 1, 1, 3, 2, 8, 0.5),
  (array['mayan', 'cichlid'], 13, 2, 3, 4, 3, 10, 0.9),
  (array['mullet'], 20, 1, 2, 6, 3, 16, 1.6),
  (array['tripletail'], 30, 4, 5, 3, 5, 24, 7),
  (array['flounder'], 24, 3, 4, 3, 4, 16, 1.8),
  (array['hogfish'], 26, 4, 5, 4, 5, 20, 5.5),
  (array['amberjack'], 50, 5, 10, 8, 10, 36, 22),
  (array['spadefish'], 20, 2, 4, 4, 5, 14, 2.4),
  (array['blue runner', 'hardtail'], 20, 1, 3, 7, 4, 14, 1.3),
  (array['little tunny', 'bonito', 'false albacore'], 32, 3, 6, 10, 7, 28, 9),
  (array['pinfish'], 9, 1, 1, 3, 1, 6, 0.1),
  (array['hardhead', 'gafftopsail'], 20, 1, 3, 2, 3, 12, 0.9),
  (array['crappie', 'speckled perch'], 15, 1, 2, 3, 2, 11, 0.8),
  (array['channel catfish'], 32, 2, 5, 2, 6, 20, 3.2),
  (array['florida gar', 'longnose gar', 'spotted gar'], 40, 3, 5, 4, 5, 24, 2.5),
  (array['oscar'], 14, 2, 3, 4, 3, 10, 1.1),
  (array['tilapia'], 16, 1, 2, 3, 3, 12, 1.6);

grant select on public.fish_rank_species to authenticated;

-- Part 2: the calculator. Runs with the caller's rights: only members can read fish_rank_species, so anyone else gets no rank.
create function public.fish_rank_calc(sp text, len numeric, wt numeric, wt_est boolean)
returns table (power int, tier text, strength int, speed int, stamina int, size_pct int)
language sql stable set search_path = public as $$
  with s as (select lower(coalesce(sp, '')) as t),
  e as (   -- the species row: longest matching word wins
    select f.* from public.fish_rank_species f, s
    where exists (select 1 from unnest(f.words) w where position(w in s.t) > 0)
    order by (select max(length(w)) from unnest(f.words) w where position(w in s.t) > 0) desc, f.id limit 1),
  rf as (  -- the weight reference row: the group with the longest name word first (same order the app uses)
    select f.* from public.fish_rank_species f, s
    where exists (select 1 from unnest(f.words) w where position(w in s.t) > 0)
    order by (select max(length(w)) from unnest(f.words) w) desc, f.id limit 1),
  l as (select case when len > 0 then len::float8
                    when wt > 0 and not coalesce(wt_est, false) then (select (ref_len * power((wt / ref_wt)::float8, 1.0 / 3))::float8 from rf) end as v),
  m as (select e.*, least(l.v / e.big_in::float8, 1.3) as r,
               0.15 + 0.85 * ((e.p + e.s + e.st) / 30.0 * 0.6 + e.rarity / 5.0 * 0.4) as sf from e, l where l.v > 0),
  c as (select m.*, floor(40 + 900 * power(m.r, 1.7) * m.sf + 0.5)::int as pw from m)
  select pw, case when pw >= 900 then 'Legendary' when pw >= 650 then 'Epic' when pw >= 400 then 'Rare' when pw >= 200 then 'Uncommon' else 'Common' end,
         least(100, floor(p * 10 * (0.5 + 0.6 * least(r, 1.1)) + 0.5))::int,
         least(100, floor(s * 10 * (0.5 + 0.6 * least(r, 1.1)) + 0.5))::int,
         least(100, floor(st * 10 * (0.5 + 0.6 * least(r, 1.1)) + 0.5))::int,
         floor(r * 100 + 0.5)::int
  from c;
$$;
grant execute on function public.fish_rank_calc(text, numeric, numeric, boolean) to authenticated;

-- Part 3: one row per ranked catch — photographed, not blurred for review, species and size known.
-- security_invoker: the viewer's own catch/photo privacy rules apply, so you only see ranks of catches you may see.
-- (length_in / weight_lb are stored as "real", so they're converted to numeric for the calculator.)
create view public.catch_ranks with (security_invoker = true) as
select c.id as catch_id, c.created_by, c.spot_id, c.species, c.caught_at, c.length_in, c.weight_lb, c.weight_est,
       r.power, r.tier, r.strength, r.speed, r.stamina, r.size_pct
from public.catches c
cross join lateral public.fish_rank_calc(c.species, c.length_in::numeric, c.weight_lb::numeric, c.weight_est) r
where c.deleted_at is null and coalesce(c.review_state, '') <> 'blurred'
  and exists (select 1 from public.photos p where p.catch_id = c.id);
grant select on public.catch_ranks to authenticated;
