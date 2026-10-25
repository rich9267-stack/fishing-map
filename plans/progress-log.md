# Fishing Map — Progress Log
_Keep this to about a page. Every version's details: docs/build_history.md. Plans: plans/README-start-here.md._

## Current goal
After the US expansion (done v173): make the national map trustworthy and useful before going public — fix what the outside-Florida phone check found, then nationwide data (ramps, stations, time zones) and a 📚 Learn page.

## Done (summary)
- Oct 8–19 — Florida app built and polished: catches, spots, map layers, official FWC/FDEP places, tides/weather, alerts, tanks, races, tournaments, host pages, admin controls, security, draft terms + privacy, weekly backup (Sundays 8:47 AM on Richard's computer).
- Oct 20–21 — v150–v154: tanks, 🎮 Games (5 games + streak), better weight guesses.
- Oct 21–22 — v155–v173: continental US plan finished. Every state + DC has Seasons cards and rules (all setup files applied; checked in the database Oct 22), national no-fishing zones, OpenStreetMap ramps/piers outside Florida, games use the region's fish, NOAA dashed 🚫 outlines, lake depth (10 states) + public fishing water (11 states). Also v159–v171 Fish ID training steps 1–4 (training waits for the lawyer), v172 photos use less data.
- Oct 22 — Richard's partial phone check outside Florida (see Next up 1 and 2 for what it found).
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
4. ~~Researcher → Engineer: nationwide official ramp lists + NOAA station lists~~ **Built v176 (test188); waiting for Richard's phone check.** 35 states have agency ramp lists (js/61); PA (server down), IL, CO, KS, OK, ND, SD, MS, AZ, NV, WY, CA, DC stay on OpenStreetMap — look again for those later. 1,864 tide + 145 water-temperature stations built in (js/60).
5. ~~Designer: 📚 Learn page~~ **Built v177–v192 (tests 190–198); waiting for Richard's phone checks.** v179 Learn page + state picker + Rules tile; v180–v183 Fish cards (official sources, source link + checked date); v181 Knots; v182 Rigs; v184 Bait & lures; v185 State info; v186 search across Learn + cross-links; v187 "General advice" blocks fill gaps (labelled, not official); v188–v190 fish list grown to 86 (saltwater batches 1–2, freshwater batch 3; 13 cards are general advice only); v191 quality pass (31 dead agency links replaced, 3 more fish = 89, test198 data check); v192 small text fixes. v193 Mojarra card (fish list 90; general advice only, no official page found). Still open: knots/rigs text is our own general advice (label says so); knot/rig pictures; red hind, coney, graysby, whitebone / saucereye porgy have no official page found; AZ, NE, NY, RI agency links could not be checked by script; state-by-state local tips.
6. **Trips (v194–v195, test199; waiting for Richard's phone check).** Community → Trips → My past trips now lists your own finished ▶ Start trip trips (before they were saved as sessions, so the list was empty); tap one to review your catches. The solo trip review shows a time and length line, a note that catches are GPS-stamped, and a map with the spot plus a dot per stamped catch; trips with no catches show their start/end times.

## Later
- Kansas reservoir depth maps (one map per reservoir; few anglers there yet). Wisconsin / Connecticut / Tennessee depth: no free source found.
- Refresh the 2009 FWC ramp list and the park/pier/station lists now and then.
- Photo files in the backup; second backup copy off this computer.
- Extra coin tests (catch rewards, collections, tournament prizes).
- Older parked ideas: plans/parked-ideas.md.

## Risks
- Lawyer/accountant review postponed to ~late Nov 2026; stay invite-only until then.
- Free limits: Supabase egress (fixed in v172 — watch the usage page), 500 MB database, 1 GB photos. Keep national lists on outside map servers or on the phone, not in our database, where possible.
- Wrong rules = main legal risk; every rule keeps "guide only — confirm with <agency>" and its checked date.
- Weekly backup only runs if the computer is on and the Claude app is open Sunday morning.
- Two Claude sessions in the same folder can sweep each other's files into a commit.
