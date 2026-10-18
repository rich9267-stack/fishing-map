# Parked ideas (updated 2026-10-15 — not forgotten)

The organization / QOL plan (docs/ux_cleanup_plan.md) is finished: bottom bar, Home strip, Settings page, file split, polish pass, dark-mode check. Also done since: official public spots, measuring-screen fix, tournament teams, tank simulator steps 1–8 (touch/moods, coins/gems, shop + customize, sound), artist brief drafted, screen-reader pass (main map; trip-review map pin labels v95; tank screens v96 — committed), Host pages (v97–v99), Gulf + Keys expansion (v100–v108), security before sharing with strangers (v109–v110: popup fix, Content-Security-Policy, Fish ID 30/day, public places snap, privacy page, CAPTCHA enabled and tested by Richard), v111 admin-made official places, v112 free color palettes, v113 Fish ID knows the Gulf/Keys fish + catfish kinds and which part of Florida the spot is in.

## In progress
- **⭐ Admin-made official places (v111, Oct 15)** — Edit spot → "⭐ Official place (admin only)" box: pick Park / Pier / Jetty / Boat ramp / Bridge / Dock → Make official. Public spots only. Richard to mark his parks (Harbor's Edge, NE 16th St Park, Officer Scott A. Winter Memorial, Sgt. Chris Reyka Memorial, Hillsboro Inlet, Everglades Holiday Park Canal, Sebastian Bridge, Atlantic Trail entrance…); not the parking lot; Alsdorf and Colohatchee ramps are already official.
- **🛡 Security leftovers (Richard, checklist in repo docs/security.md):** confirm "Confirm email" is ON · password rules + redirect URLs · 2-step sign-in on Supabase/GitHub/Google · GitHub secret scanning · run setup/67 (lock-down of signed-out access; has UNDO) in the SQL Editor. **Decided Oct 15: no per-person caps on comments, reports or photos.**

## Waiting on something
- **Tank step 9 (artist pictures)** — brief is a doc in Richard's artifacts ("Fishing Map — Tank Artist Brief"). Plan: each candidate artist draws one trial fish (the snook), Richard picks one, then test batch (sheepshead, barracuda, chest, plant, gravel), then rounds. Richard fills in budget, payment, rights and contact before sending. Rough cost estimate (Claude's, not a quote): $3,000–8,500 for everything; Richard wants to keep the unique look of every fish (no shared base shapes).

## Still on the list, no order
- **Host pages leftovers** — owner can't rename a page after asking (admin only); should page tournaments ever pay prizes / Hall of Fame (e.g. verified businesses)?
- **No-fishing zone warnings elsewhere** — the red protected-zone warning isn't yet shown in Find new water, Plan a trip or Home.
- **Official spots beyond the Keys + Gulf coast** — refresh the data now and then; OSM piers not loaded.
- **Gems for badges** — needs the badge rules moved to the server. Friend contests pay nothing (too easy to farm).
- **Tank mood thresholds** are guesses — tune after Richard plays.
- **Real-phone testing (Richard):** tanks (swimming, schools, chases, full screen, hand feeding, shop, customize, chest, sound), measuring screen, official-spot naming in Quick catch, the map keyboard/screen-reader changes, light and dark mode; Me → Clubs & businesses; Hosting as + creating a tournament as a page; Follow / Unfollow a page; everything still loads with the security policy — sign in, map + tiles + satellite, tides/weather, a photo upload, Fish ID, 🔍 auto-find in the measuring screen (OpenCV), red tide layer, depth lines, public sightings, phone alerts; tell Claude anything that looks off.
- **Fish-tracking data source** — bring in later (Richard's idea).
- **SFWMD canal gate data** — only if the client ID/secret arrives from datarequests@sfwmd.gov (Richard saves secrets in Supabase himself, never in chat).
- **Dark-mode on real content** — the scan used fake data; re-check with real catches, photos and groups.
- **Race tuning (fish-rank-plan step 6/7)** — class lines, win rates, prizes, fees and daily caps are guesses; tune after Richard plays; consider a per-species size cap against cheating.
