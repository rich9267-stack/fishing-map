-- setup/93: better weight-from-length guesses (Oct 21 2026; data in docs/weight-data.md)
-- 1) each fish rank row gets a growth number ref_b (weight = ref_wt × (length ÷ ref_len)^ref_b; null = 3, as before),
--    and new reference weights where FishBase / standard-weight studies were solid. Same numbers as WEIGHT_REF in js/07.
-- 2) fish_rank_calc uses ref_b when it works a length out from a weighed fish.
-- 3) catches whose weight was ESTIMATED from length get the new estimate (Richard: "if current logs need to be edited I want that").
--    Weighed fish (weight_est = false with a weight) are never touched. Catches with a length but no weight, for fish the app
--    can now estimate (puffer, mojarra, porkfish, warmouth), get an estimate too, marked as estimated (≈).
alter table public.fish_rank_species add column if not exists ref_b real;
update public.fish_rank_species set ref_wt = 8.1, ref_b = 3.03 where words[1] = 'snook';   -- was 8.7 lb
update public.fish_rank_species set ref_wt = 7.6, ref_b = 3.03 where words[1] = 'redfish';   -- was 7.5 lb
update public.fish_rank_species set ref_wt = 13.6, ref_b = 2.97 where words[1] = 'crevalle';   -- was 16 lb
update public.fish_rank_species set ref_wt = 2, ref_b = 3.08 where words[1] = 'mangrove';   -- was 2.4 lb
update public.fish_rank_species set ref_wt = 6.9, ref_b = 3.05 where words[1] = 'mutton';   -- was 7.8 lb
update public.fish_rank_species set ref_wt = 1.3, ref_b = 2.76 where words[1] = 'yellowtail';   -- was 1.7 lb
update public.fish_rank_species set ref_wt = 0.83, ref_b = 2.96 where words[1] = 'lane snapper';   -- was 1 lb
update public.fish_rank_species set ref_wt = 7.2, ref_b = 3.16 where words[1] = 'red snapper';   -- was 8 lb
update public.fish_rank_species set ref_wt = 2.4, ref_b = null where words[1] = 'spanish';   -- was 2.2 lb
update public.fish_rank_species set ref_wt = 1.2, ref_b = 3.26 where words[1] = 'whiting';   -- was 0.95 lb
update public.fish_rank_species set ref_wt = 24, ref_b = 3.09 where words[1] = 'black grouper';   -- was 25 lb
update public.fish_rank_species set ref_wt = 12.7, ref_b = 2.96 where words[1] = 'gag';   -- was 12 lb
update public.fish_rank_species set ref_wt = 14.5, ref_b = 2.88 where words[1] = 'barracuda';   -- was 14.5 lb
update public.fish_rank_species set ref_wt = 15.9, ref_b = 3.09 where words[1] = 'cobia';   -- was 19 lb
update public.fish_rank_species set ref_wt = 1.24, ref_b = 2.56 where words[1] = 'ladyfish';   -- was 1.5 lb
update public.fish_rank_species set ref_wt = 11.7, ref_b = 2.93 where words[1] = 'black drum';   -- was 15 lb
update public.fish_rank_species set ref_wt = 4.4, ref_b = 3.16 where words[1] = 'largemouth';   -- was 5 lb
update public.fish_rank_species set ref_wt = 8.6, ref_b = 3.07 where words[1] = 'snakehead';   -- was 10 lb
update public.fish_rank_species set ref_wt = 0.38, ref_b = 3.11 where words[1] = 'bluegill';   -- was 0.5 lb
update public.fish_rank_species set ref_wt = 1.5, ref_b = 2.9 where words[1] = 'mullet';   -- was 1.6 lb
update public.fish_rank_species set ref_wt = 1.9, ref_b = 3.3 where words[1] = 'flounder';   -- was 1.8 lb
update public.fish_rank_species set ref_wt = 5.6, ref_b = 2.95 where words[1] = 'hogfish';   -- was 5.5 lb
update public.fish_rank_species set ref_wt = 20.4, ref_b = 2.84 where words[1] = 'amberjack';   -- was 22 lb
update public.fish_rank_species set ref_wt = 3.2, ref_b = 2.95 where words[1] = 'spadefish';   -- was 2.4 lb
update public.fish_rank_species set ref_wt = 1.2, ref_b = 3.01 where words[1] = 'blue runner';   -- was 1.3 lb
update public.fish_rank_species set ref_wt = 0.7, ref_b = 3.07 where words[1] = 'crappie';   -- was 0.8 lb
update public.fish_rank_species set ref_wt = 2.7, ref_b = 3.28 where words[1] = 'channel catfish';   -- was 3.2 lb
update public.fish_rank_species set ref_wt = 1.24, ref_b = 3.06 where words[1] = 'tilapia';   -- was 1.6 lb
update public.fish_rank_species set ref_wt = 11.5, ref_b = 3.41 where words[1] = 'blue catfish';   -- was 13 lb
update public.fish_rank_species set ref_wt = 11.7, ref_b = 3.21 where words[1] = 'flathead catfish';   -- was 12.5 lb
update public.fish_rank_species set ref_wt = 0.88, ref_b = 3.02 where words[1] = 'black bullhead';   -- was 0.8 lb
update public.fish_rank_species set ref_wt = 0.79, ref_b = 3.07 where words[1] = 'brown bullhead';   -- was 0.85 lb
update public.fish_rank_species set ref_wt = 0.67, ref_b = 2.92 where words[1] = 'yellow bullhead';   -- was 0.65 lb
update public.fish_rank_species set ref_wt = 0.46, ref_b = 2.7 where words[1] = 'walking catfish';   -- was 0.6 lb
update public.fish_rank_species set ref_wt = 0.34, ref_b = 3.02 where words[1] = 'brown hoplo';   -- was 0.3 lb
update public.fish_rank_species set ref_wt = 49, ref_b = 2.91 where words[1] = 'blacktip';   -- was 60 lb
update public.fish_rank_species set ref_wt = 5.1, ref_b = 2.86 where words[1] = 'horse-eye';   -- was 6.5 lb
update public.fish_rank_species set ref_wt = 0.63, ref_b = 3.26 where words[1] = 'lionfish';   -- was 0.8 lb
update public.fish_rank_species set ref_wt = 9.6, ref_b = 3.02 where words[1] = 'skipjack';   -- was 8 lb

create or replace function public.fish_rank_calc(sp text, len numeric, wt numeric, wt_est boolean)
 returns table(power integer, tier text, strength integer, speed integer, stamina integer, size_pct integer)
 language sql stable set search_path to 'public'
as $function$
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
                    when wt > 0 and not coalesce(wt_est, false) then (select (ref_len * power((wt / ref_wt)::float8, 1.0 / coalesce(ref_b, 3)))::float8 from rf) end as v),
  m as (select e.*, least(l.v / e.big_in::float8, 1.3) as r,
               0.15 + 0.85 * ((e.p + e.s + e.st) / 30.0 * 0.6 + e.rarity / 5.0 * 0.4) as sf from e, l where l.v > 0),
  c as (select m.*, floor(40 + 900 * power(m.r, 1.7) * m.sf + 0.5)::int as pw from m)
  select pw, case when pw >= 900 then 'Legendary' when pw >= 650 then 'Epic' when pw >= 400 then 'Rare' when pw >= 200 then 'Uncommon' else 'Common' end,
         least(100, floor(p * 10 * (0.5 + 0.6 * least(r, 1.1)) + 0.5))::int,
         least(100, floor(s * 10 * (0.5 + 0.6 * least(r, 1.1)) + 0.5))::int,
         least(100, floor(st * 10 * (0.5 + 0.6 * least(r, 1.1)) + 0.5))::int,
         floor(r * 100 + 0.5)::int
  from c;
$function$;

-- 3) re-estimate. One row per species name members have logged with a length (lower case), with the js/07 row it uses.
update public.catches c set weight_lb = round((v.w * power(c.length_in::numeric / v.l, v.b))::numeric, 2), weight_est = true
from (values ('channel catfish', 20, 2.7, 3.28),
  ('checkered puffer', 8, 0.4, 3.01),
  ('florida gar', 24, 2.5, 3),
  ('gag grouper', 30, 12.7, 2.96),
  ('king mackerel', 40, 15.7, 3),
  ('largemouth bass', 20, 4.4, 3.16),
  ('little tunny (bonito)', 28, 9, 3),
  ('mangrove snapper', 16, 2, 3.08),
  ('mayan cichlid', 10, 0.9, 3),
  ('mojarra', 8, 0.24, 2.82),
  ('mullet', 16, 1.5, 2.9),
  ('porkfish', 10, 0.6, 3),
  ('warmouth', 7, 0.27, 3.2)) v(sp, l, w, b)
where lower(c.species) = v.sp and c.length_in > 0 and c.deleted_at is null and (c.weight_est or c.weight_lb is null);

-- UNDO (run in the SQL Editor):
-- update public.fish_rank_species set ref_wt = 8.7, ref_b = null where words[1] = 'snook';
-- update public.fish_rank_species set ref_wt = 7.5, ref_b = null where words[1] = 'redfish';
-- update public.fish_rank_species set ref_wt = 16, ref_b = null where words[1] = 'crevalle';
-- update public.fish_rank_species set ref_wt = 2.4, ref_b = null where words[1] = 'mangrove';
-- update public.fish_rank_species set ref_wt = 7.8, ref_b = null where words[1] = 'mutton';
-- update public.fish_rank_species set ref_wt = 1.7, ref_b = null where words[1] = 'yellowtail';
-- update public.fish_rank_species set ref_wt = 1, ref_b = null where words[1] = 'lane snapper';
-- update public.fish_rank_species set ref_wt = 8, ref_b = null where words[1] = 'red snapper';
-- update public.fish_rank_species set ref_wt = 2.2, ref_b = null where words[1] = 'spanish';
-- update public.fish_rank_species set ref_wt = 0.95, ref_b = null where words[1] = 'whiting';
-- update public.fish_rank_species set ref_wt = 25, ref_b = null where words[1] = 'black grouper';
-- update public.fish_rank_species set ref_wt = 12, ref_b = null where words[1] = 'gag';
-- update public.fish_rank_species set ref_wt = 14.5, ref_b = null where words[1] = 'barracuda';
-- update public.fish_rank_species set ref_wt = 19, ref_b = null where words[1] = 'cobia';
-- update public.fish_rank_species set ref_wt = 1.5, ref_b = null where words[1] = 'ladyfish';
-- update public.fish_rank_species set ref_wt = 15, ref_b = null where words[1] = 'black drum';
-- update public.fish_rank_species set ref_wt = 5, ref_b = null where words[1] = 'largemouth';
-- update public.fish_rank_species set ref_wt = 10, ref_b = null where words[1] = 'snakehead';
-- update public.fish_rank_species set ref_wt = 0.5, ref_b = null where words[1] = 'bluegill';
-- update public.fish_rank_species set ref_wt = 1.6, ref_b = null where words[1] = 'mullet';
-- update public.fish_rank_species set ref_wt = 1.8, ref_b = null where words[1] = 'flounder';
-- update public.fish_rank_species set ref_wt = 5.5, ref_b = null where words[1] = 'hogfish';
-- update public.fish_rank_species set ref_wt = 22, ref_b = null where words[1] = 'amberjack';
-- update public.fish_rank_species set ref_wt = 2.4, ref_b = null where words[1] = 'spadefish';
-- update public.fish_rank_species set ref_wt = 1.3, ref_b = null where words[1] = 'blue runner';
-- update public.fish_rank_species set ref_wt = 0.8, ref_b = null where words[1] = 'crappie';
-- update public.fish_rank_species set ref_wt = 3.2, ref_b = null where words[1] = 'channel catfish';
-- update public.fish_rank_species set ref_wt = 1.6, ref_b = null where words[1] = 'tilapia';
-- update public.fish_rank_species set ref_wt = 13, ref_b = null where words[1] = 'blue catfish';
-- update public.fish_rank_species set ref_wt = 12.5, ref_b = null where words[1] = 'flathead catfish';
-- update public.fish_rank_species set ref_wt = 0.8, ref_b = null where words[1] = 'black bullhead';
-- update public.fish_rank_species set ref_wt = 0.85, ref_b = null where words[1] = 'brown bullhead';
-- update public.fish_rank_species set ref_wt = 0.65, ref_b = null where words[1] = 'yellow bullhead';
-- update public.fish_rank_species set ref_wt = 0.6, ref_b = null where words[1] = 'walking catfish';
-- update public.fish_rank_species set ref_wt = 0.3, ref_b = null where words[1] = 'brown hoplo';
-- update public.fish_rank_species set ref_wt = 60, ref_b = null where words[1] = 'blacktip';
-- update public.fish_rank_species set ref_wt = 6.5, ref_b = null where words[1] = 'horse-eye';
-- update public.fish_rank_species set ref_wt = 0.8, ref_b = null where words[1] = 'lionfish';
-- update public.fish_rank_species set ref_wt = 8, ref_b = null where words[1] = 'skipjack';
-- alter function: restore setup/44's "1.0 / 3" in fish_rank_calc.
-- update public.catches c set weight_lb = round((v.w * power(c.length_in::numeric / v.l, v.b))::numeric, 2) from (values ('channel catfish', 20, 3.2, 3), ('florida gar', 24, 2.5, 3), ('gag grouper', 30, 12, 3), ('king mackerel', 40, 15.7, 3), ('largemouth bass', 20, 5, 3), ('little tunny (bonito)', 28, 9, 3), ('mangrove snapper', 16, 2.4, 3), ('mayan cichlid', 10, 0.9, 3), ('mullet', 16, 1.6, 3)) v(sp, l, w, b)
--   where lower(c.species) = v.sp and c.weight_est and c.deleted_at is null;
-- update public.catches set weight_lb = null, weight_est = false where weight_est and deleted_at is null and lower(species) in ('checkered puffer', 'mojarra', 'porkfish', 'warmouth');
