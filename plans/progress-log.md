# Fishing Map — Progress Log
_Keep this to about a page. Every version's details: docs/build_history.md. Plans: plans/README-start-here.md._

## Current goal
After the US expansion (done v173): make the national map trustworthy and useful before going public — fix what the outside-Florida phone check found, then nationwide data (ramps, stations, time zones) and a 📚 Learn page.

## Done (summary)
- Oct 8–19 — Florida app built and polished: catches, spots, map layers, official FWC/FDEP places, tides/weather, alerts, tanks, races, tournaments, host pages, admin controls, security, draft terms + privacy, weekly backup (Sundays 8:47 AM on Richard's computer).
- Oct 20–21 — v150–v154: tanks, 🎮 Games (5 games + streak), better weight guesses.
- Oct 21–22 — v155–v173: continental US plan finished. Every state + DC has Seasons cards and rules (all setup files applied; checked in the database Oct 22), national no-fishing zones, OpenStreetMap ramps/piers outside Florida, games use the region's fish, NOAA dashed 🚫 outlines, lake depth (10 states) + public fishing water (11 states). Also v159–v171 Fish ID training steps 1–4 (training waits for the lawyer), v172 photos use less data.
- Oct 22 — Richard's partial phone check outside Florida (see Next up 1 and 2 for what it found).
- Oct 28 — Richard phone-checked v238 (business pages): passed.
- Oct 27 — Richard phone-checked v218 (new look on other people's profile pages): looks right.
- Oct 27 — Richard phone-checked Next up 1–5 (v174–v193): all passed. Trip check (6) passed too, but a trip with a friend hit frustrations (details pending).
- Oct 22 — No-fishing warning in Home / Find new water / Plan a trip: already built (v118); it reads the national zone list since v169, so nothing to build.

## Decisions
- Oct 22 — **Outside Florida, OpenStreetMap places must follow the Florida rule: only open, general-public places.** No backyard / house docks or private ramps (Richard found some).
- Oct 22 — **Tide + water-temperature stations: built-in lists for every coastal state** (not the live "nearest station" lookup) — less data per phone.
- Oct 22 — **Time zones checked across the whole country**, not just the Panhandle.
- Oct 22 — **Official ramp lists: go nationwide now** (all states that publish one), not one state at a time — the app goes public nationwide.
- Oct 22 — **New 📚 Learn page wanted** (Richard): rules for any state (not just where you are), fish info, state/local info, rigs, bait, lures, knots. Designer plans it before anything is built.
- Oct 22 — **Learn page decisions (Richard):** start with Rules for any state; lives in ⋯ More or a Home card (pick when building); knot/rig pictures from free licensed sources (credit kept, packet line); fish cards long (range, habits, tips too). Design note still to write.
- Oct 22 — Lawyer packet lines for national features are batched until the national maps work is done (running list kept by Claude).
- Earlier decisions (Oct 15–18: wording, tutorials, backups, admin controls, credits, UTC tide times, depth "enough for now") are recorded in docs/build_history.md and plans/admin-controls-plan.md; none reopened.

## Next up
1. **Engineer: private docks in Official public spots outside Florida.** Make js/58 (OpenStreetMap ramps/piers) as strict as Florida: only places that are clearly public; when unsure, leave it out. Done when: Richard's private dock no longer shows, Florida unchanged, test ALL OK. **Built v174 (test186); waiting for Richard's phone check.**
2. **Richard: finish the outside-Florida phone checklist** (the rest of it) and list anything else that looked off.
3. **Engineer: time zones across the country.** Weather and the water-temperature backup still ask for Eastern time (js/02 `America/New_York`); games use the New York day on purpose. Check every place a time is shown for a spot in Central, Mountain, Pacific and Arizona (no daylight saving). **Built v175 (test187); waiting for Richard's phone check.**
4. ~~Researcher → Engineer: nationwide official ramp lists + NOAA station lists~~ **Built v176 (test188); waiting for Richard's phone check.** 38 states have agency ramp lists (js/61; PA, MS, CO added v216); IL, KS, OK, ND, SD, AZ, NV, WY, CA, DC stay on OpenStreetMap (looked again Oct 26: no usable free list). 1,864 tide + 145 water-temperature stations built in (js/60).
5. ~~Designer: 📚 Learn page~~ **Built v177–v192 (tests 190–198); waiting for Richard's phone checks.** v179 Learn page + state picker + Rules tile; v180–v183 Fish cards (official sources, source link + checked date); v181 Knots; v182 Rigs; v184 Bait & lures; v185 State info; v186 search across Learn + cross-links; v187 "General advice" blocks fill gaps (labelled, not official); v188–v190 fish list grown to 86 (saltwater batches 1–2, freshwater batch 3; 13 cards are general advice only); v191 quality pass (31 dead agency links replaced, 3 more fish = 89, test198 data check); v192 small text fixes. v193 Mojarra card (fish list 90; general advice only, no official page found). Still open: knots/rigs text is our own general advice (label says so); knot/rig pictures; red hind, coney, graysby, whitebone / saucereye porgy have no official page found; AZ, NE, NY, RI agency links could not be checked by script; state-by-state local tips.
6. **Trips (v194–v195, test199; waiting for Richard's phone check).** Community → Trips → My past trips now lists your own finished ▶ Start trip trips (before they were saved as sessions, so the list was empty); tap one to review your catches. The solo trip review shows a time and length line, a note that catches are GPS-stamped, and a map with the spot plus a dot per stamped catch; trips with no catches show their start/end times.

7. **ON HOLD (Richard, Oct 27: stay with free Gemini for now; Claude API is separate pay-as-you-go money, not his subscription).** Fish ID through Claude instead of Gemini (Gemini is slow and weak). Plan written: plans/fishid-claude-plan.md. Waits for Richard: Anthropic account + a few dollars credit + spend limit + key saved as `ANTHROPIC_API_KEY` in Supabase. Then Engineer swaps the function (only supabase/functions/identify-fish + a photo shrink in js/07).

8. **Log a sighting (Richard, Oct 27) — BUILT v223 (setup/113, test212); admin 👀 Sightings tab with Hide / Show again BUILT v239 (setup/119, test223). Waiting for Richard's phone check.** Record a fish/animal you saw but did not catch (tarpon rolling, manatee, bait school, shark…), photo optional, with spot + time. **Where:** a "Log a sighting" button next to every "Log a catch" (Quick catch + spots, wherever logging a catch is). **What it shows:** no map pins (would clutter); it is extra data for the existing "sightings" lines on spots / Home / Best spots (today iNaturalist only), described the same way. **Privacy:** private / friends / public like catches; no blurring needed because no pins. **Coins:** 1 coin for a 🌎 Public sighting with a photo. **Anti-farming (decided Oct 27): max 10 sighting coins a day per member + photo checks** (what the checks are = settle when building, e.g. no duplicate photo, photo must be new/taken that day, same checks catches use). Still to settle when building: (setup/NN with coin_ledger line, earned only; follow plans/database-change-rule.md); lawyer-packet line (new member data + photos). Designer step small: screen layout only.

9. **🐟 Baitfish fish collection (Richard, Oct 27).** A new fish collection for baitfish (e.g. pilchards/sardines, threadfin herring, mullet, pinfish, ballyhoo, greenbacks, cigar minnows, shrimp-free list to settle). Needs: names in the species list + Learn fish cards, a collection group (collections pay 150 coins + 💎 2 once per group, setup/41 `claim_collection`), tank art. Designer lists the species first. **Oct 27: now THREE collections (saltwater baitfish, freshwater baitfish, shrimp/crabs/other bait); Designer lists done, see plans/bait-collections-plan.md; **A (saltwater) BUILT v230 (setup/115, test217), not committed, waiting for phone check. B (freshwater, all 8 required) BUILT v231 (setup/116, test218), not committed. C (shrimp/crabs/other) BUILT v232 (setup/117, test219), not committed. All three bait collections are built; item 10 BUILT: v233 (crab/shrimp/squid shapes + 10 missing fish colours, test220, committed) and v234 (shark, gar, ray, puffer, eel shapes + speckle and tail-spot marks, test221, not committed). Tank artist work still on hold.**
10. **Better and more fish models for 🐠 Tanks and My fish (Richard, Oct 27).** More species drawn in the tank/My fish views and nicer art for the ones that exist (the tank artist work is on hold until Richard says go, see CLAUDE.md). Start with a list: which fish look wrong or are missing (baitfish collection feeds this).

11. **PART 1 BUILT v227 (test215, js/67 `spotScoreAt`, spot card line + Plan a trip), waiting for phone check. PART 2 BUILT v229 (setup/114 applied, tests/evening-score.test.mjs): ⏰ heads-up, followed spots only, 1–2 h ahead, max 1 a day, Settings tick box. Edge function morning-bites deployed (version 6); waiting for Richard's phone check.** Fishing quality score on every spot + in Plan a trip, and bite-window notifications (Richard, Oct 27).** Show the 0–10 score (Home already has "Fishing right now", js/67, and the 📆 Good days calendar, js/69) on each saved spot card, and for the chosen day/time when planning a trip (next to Suggested spots). Add a phone alert for good bite windows (the morning/evening alerts exist: morning-bites function, setup/111; this adds "your spot has a strong window at X"). Designer: where it sits, what the alert says, how often.
12. **BUILT v224 (test213), waiting for phone check.** **"Best spots today" opens underneath like saved spots do (Richard, Oct 27).** Tapping a Best spots row expands that spot's card right below it (same as My spots), instead of going somewhere else.
13. **BUILT v224 (test213), waiting for phone check (country level later).** **Saved spots grouped by state (then country if the app grows beyond the USA), collapsible (Richard, Oct 27).** A group header per state (Florida, Georgia…) that folds/unfolds so he can look at only Florida; remember which are open; counts on each header; country level later. Small, js/08 spot list.
14. **BUILT v226 (test214), waiting for phone check.** **Profile pictures in the feed instead of the first-letter circle (Richard, Oct 27).** Feed posts, trip cards, comments and circles show the person's picture when they have one (fall back to the initial). Check privacy: only pictures the viewer is already allowed to see.

## Later
- Kansas reservoir depth maps (one map per reservoir; few anglers there yet). Wisconsin / Connecticut / Tennessee depth: no free source found.
- Refresh the 2009 FWC ramp list and the park/pier/station lists now and then.
- Photo files in the backup; second backup copy off this computer.
- ~~Extra coin tests~~ done Oct 28: tests/db-coin-checks-rewards.sql (33 checks; tournament prizes were already in db-tournament-cup-checks.sql). Rerun after any change to claim_coins or claim_collection.
- Older parked ideas: plans/parked-ideas.md.

## Risks
- Lawyer/accountant review postponed to ~late Nov 2026; stay invite-only until then.
- Free limits: Supabase egress (fixed in v172 — watch the usage page), 500 MB database, 1 GB photos. Keep national lists on outside map servers or on the phone, not in our database, where possible.
- Wrong rules = main legal risk; every rule keeps "guide only — confirm with <agency>" and its checked date.
- Weekly backup only runs if the computer is on and the Claude app is open Sunday morning.
- Two Claude sessions in the same folder can sweep each other's files into a commit.
