# Plan: the map for the whole continental US (approved Oct 21, 2026 — nothing built yet)

**Goal:** someone fishing in Georgia, Ohio or Oregon gets a useful app, not a Florida app in the wrong place.
**Limits (unchanged):** budget $0 (free public data only) · stays invite-only until the lawyer review (~late Nov 2026) ·
no coins/payments · privacy and terms wording untouched. **This changes the Project plan** ("Area: All of Florida"):
Richard updates `claude/fishing-map-plan.md` when he approves.

## What already works anywhere in the US
- Map, pins, catches, trips, friends, groups, chat, games, tanks, measuring, records.
- Weather (National Weather Service / Open-Meteo) and tides (NOAA: the app asks for the nearest station when it's far from the Florida list).
- OpenStreetMap suggestions ("Find new water") and the NOAA chart layer on the coasts.

## What is Florida-only today (where it lives)
| Piece | File | Florida-only because |
|---|---|---|
| Fishing rules (size, bag, season) | js/10, js/31, `fish_rules` table | FWC rules; regions = Atlantic / Keys / Gulf / SPZ |
| Fish seasons + spawn notes | js/05 `SEASONS`, docs/fish-research.md | researched for SE Florida |
| Fishing licence help | js/17 | FWC link |
| Official spots (ramps, parks, piers) | js/37, `official_spots` (setup/39, 60, 71, 72) | FWC + FL DEP lists |
| Public lakes, fish attractors | js/22 | FWC map servers |
| Depth lines | js/23 | FWC contours |
| Red tide | js/30 | FWC samples (Gulf/Florida) |
| No-fishing zones | js/33, `protected_zones` (setup/65) | only Florida rows of NOAA's *national* list were loaded |
| Satellite water temp / clarity | js/09 `SAT_BOX` | box drawn around Florida |
| Fish weight guesses | js/07 | Florida fish only (US data now collected: docs/weight-data.md) |
| Fish ID hints, species pages, "📍 not in S. Florida" | js/09, js/18, js/13 | Florida regions |
| Guess the fish photos, bingo fish | js/52 | iNaturalist place = Florida; SEASONS |
| Words on screen | many | "South Florida", "check FWC" |

## Steps (smallest and most useful first; each one = one session, tests ALL OK, Richard checks on his phone)

**Step 1 — Know which state a spot is in. ✅ built v155 (js/53 stateOf; offshore = nearest state within 200 km; Canada/Mexico/Bahamas/Cuba = null).** Add a small built-in outline of the 48 states (US Census "cartographic boundary"
file, public domain, simplified to ~100 KB, kept on the phone). `stateOf(lat, lng)` → "GA". Nothing visible changes yet.
*Everything after this depends on it.*

**Step 2 — Honest everywhere ("We don't have Georgia rules yet"). ✅ built v156 (js/54 STATE_AGENCIES; js/31 regionInfo uses stateOf).** Outside Florida: the rules box, keeper check and
licence card say "We don't have <State> rules yet" with a button to that state's fish & wildlife agency and its licence
page (one researched table of 48 agencies). "Check FWC" wording changes to "check <agency>". "South Florida" wording
becomes "your area". Satellite water temp box widened to the US coasts. *No wrong Florida rule is ever shown in another state.*

**Step 3 — Weight guesses for US fish. ✅ mostly built early (v154, Oct 21); left: "yellowtail" by state.** Build docs/weight-data.md section D (adds b per fish + ~50 US fish, fixes name
clashes like "trout" and "yellowtail" using the state from step 1).

**Step 4 — US fish list, then seasons + rules together, one region at a time.** **Mid-Atlantic ✅ built v160 (setup/98).** **Gulf: Texas ✅ built v158 (setup/95; Louisiana setup/96 from the LDWF handbook).** **Southeast ✅ built v157 (js/55 SEASONS_SE, setup/94 rows for GA/AL/SC/NC/MS; pattern for the next regions: add a cards array + a states list in seasonList(), insert rows with `regions={XX}`).** Add the US fish (bass, walleye, pike, trout, salmon, stripers, fluke…)
to the species list, Fish ID hints and fish drawings' fallback. Seasons by 8 broad regions (Northeast, Mid-Atlantic,
Southeast, Gulf, Great Lakes/Midwest, Plains/South-Central, Mountain West, Pacific) — Researcher work, one region per session.
  Each region session also adds that region's states' rules (step 6 work), so a region is "done" only when its seasons AND rules are in.
  Region order (Richard: no preference, all members are in Florida): nearest first — Southeast (GA, AL, SC, NC, MS) → Gulf (LA, TX) →
  Mid-Atlantic → Northeast → Great Lakes/Midwest → Plains/South-Central → Mountain West → Pacific.

**Step 5 — Spots everywhere.** Load the rest of NOAA's national no-fishing zones (same table, same code).
Official boat ramps / piers outside Florida: start with OpenStreetMap (already free, asked only for the part of the map on
screen, so the database doesn't grow) and add state lists one state at a time where a state publishes one.
*Watch the free database size (500 MB) — loading every state's list into Supabase could fill it.*

**Step 6 — Rules state by state (done inside step 4, region by region).** The existing regions system takes a state tag ("GA"), so each state is a data job, not new
code: research → `fish_rules` rows with `verified_on` → Richard spot-checks 5 fish. Start with the states members fish in
(likely Georgia, Alabama, the Carolinas). Every rule still says "guide only — confirm with <agency>", shows its "checked on" date, and links the state's own rules page.
**Richard (Oct 21): build rules together with the expansion, not after the lawyer review; the double-check disclaimer is the protection.**
No change to terms.html / privacy.html wording; the lawyer review later looks at it as planned.

**Step 7 — The extras.** Guess the fish uses US photos (iNaturalist place = United States) with a "near you" bias; bingo uses
the region's seasons; lake depth / public lakes for the few states with free map servers; red tide stays Florida/Gulf.

## Risks
- **Wrong rules** (step 6) — the main legal risk; keep "guide only" and dates on every rule.
- **Research size** — 48 states × rules × seasons is a lot; do states only as members need them.
- **Free limits** — Supabase 500 MB database, 1 GB photo storage; keep big lists on the map servers, not in our database.
- **Fish name clashes** — see docs/weight-data.md section C; tested in step 3.

## Decisions (Richard, Oct 21)
1. Yes: the Project plan's area becomes "continental US, Florida first" (Richard updates `claude/fishing-map-plan.md`).
2. No state order preferred (all members are in Florida) → nearest regions first (see step 4).
3. Rules are built together with the expansion, with a clear "double-check your state's rules" disclaimer; not held for the lawyer review.
