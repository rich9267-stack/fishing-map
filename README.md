# Fishing Map

A shared map to help pick where to fish in Pompano Beach / Broward County today: saved spots alongside current tide, wind, and weather.

**Step 1:** phone-friendly page with today's tides at Hillsboro Inlet (NOAA station 8722859).

**Step 2:** wind and weather for Pompano Beach from the National Weather Service.

**Step 3:** shared spots list saved in a Supabase database. Database setup: run `setup/01-spots.sql` once in the Supabase SQL Editor.

**Step 4:** catch log per spot, saving tide stage, barometric pressure (and trend), wind, and air temp with each catch. Pressure comes from NWS observations at Pompano Beach Airpark (KPMP), with Fort Lauderdale (KFLL) as backup.

**Step 4b:** catches logged for any date/time auto-load that moment's tide stage (NOAA), pressure + trend, wind, temp (Open-Meteo records), moon phase and solunar period (SunCalc). Moon & solunar card for today.

**Step 4c:** edit and delete catches (delete is recoverable in Supabase).

**Step 5:** map view (Leaflet + OpenStreetMap, Esri satellite toggle). Pins colored by water type; tap a pin for conditions, catches, log a catch, directions, or move pin. Add a spot by tapping the map; place spots that have no location.

**Step 6:** each spot uses its nearest NOAA tide station (20 stations, Lake Worth to Virginia Key; Broward subordinate stations included) for live tide and logged catches. Freshwater spots show the nearest active USGS water-level gauge with its 24-hour change.

**Step 6b:** edit a spot's details (list or map popup).

**Step 7:** suggested spots from OpenStreetMap (Overpass API): named/public piers, boat ramps, named jetties, fishing spots, and fishing bridges in Broward that nobody has saved; private backyard docks filtered out. Cached on the phone for 7 days. One-tap add pre-fills the spot form; shown on the map as white pins.

## V2

**Step 1:** invite-only logins (email + password). Admin "Invite friends" screen; everyone edits only their own spots and catches; nothing visible when signed out. See `setup/05-logins.sql`.

**Step 2:** private spots — "🔒 Private" checkbox when adding/editing; only the owner sees the spot and its catches (enforced by the database). Dark dashed pin outline on the map.

**Step 3:** filters — water type, spot type, public access, free/any parking, no long walk, no 4x4, only my spots, private only, has catches. Applies to the list and map; remembered on each phone.

**Step 4:** photos on spots and catches — shrunk on the phone to ~300 KB, stored privately in Supabase, shown via 1-hour signed links; tap to view full screen; delete your own.

**Step 5:** 📊 Insights tab — fish counts by tide stage, pressure trend, time of day (dawn/dusk from sunrise/sunset), moon phase, solunar period, wind speed, top baits, species and spots; filter by spot, species, or only my catches.

**Step 6:** 🏆 Best spots today — scores each hour of the next 12 per spot against that spot's catch history (tide stage from its station, pressure trend, time of day, solunar, moon, forecast wind), compared with how often each condition normally occurs; shows best time and the reasons. Spots with <3 fish use the group's catches.

**Photo details:** catch photos set the catch time from the photo and warn if the photo was taken somewhere else; spot photos can place a spot that has no location; the add-spot form can take its location "📷 From a photo". Time/location also saved on the photo record. Uploaded image files themselves carry no hidden details (they are re-drawn when shrunk).

**Quick catch (📸 button):** in-app camera + live GPS. Matches the nearest saved spot within ~800 ft, or creates a private "Quick spot" right there (named after a public place if one is right there). Species chips (recent first), count, bait (last used pre-filled); all conditions automatic; saves in the background so you can get back to fishing. Library and "No photo" options too.

**Step 7:** beyond Broward — 80+ built-in NOAA tide stations from St. Lucie Inlet to Card Sound; spots more than 5 mi from any of them look up the nearest station live from NOAA (remembered per phone). Spots more than 15 mi from Pompano get their own current wind and pressure; past-catch weather uses the spot's own location. Suggested spots follow the middle of your spots, or "◎ Near me".

**Step 8:** Google sign-in (Google Auth Platform client → Supabase Google provider; links to existing accounts with the same email) and password-reset email sent through Gmail SMTP (app password) set in Supabase. Privacy page: `privacy.html`.

**V2 complete — October 8, 2026.**

## After V2

**Offline catch saving:** `sw.js` keeps a copy of the app (page + code libraries) on the phone so it opens without signal; the spots/catches list and membership are remembered per phone. Quick catches made offline (photo included) wait in the phone's storage (IndexedDB) and upload automatically when signal returns (on reconnect, when the app is reopened, or every minute while open); conditions are worked out for the catch time when they upload. Queued catches at the same new location share one new spot.

**Refreshing on the home-screen app:** pull down from the top to refresh, a ↻ Refresh button in the top bar, and an automatic refresh when returning after 15+ minutes (never while a form, camera or photo viewer is open).

## V3

**Step 1:** water temperature — per spot (saltwater/brackish), on the weather card, and saved with every catch (`water_temp_f`, `water_temp_source`). Source: nearest NOAA station with a trustworthy sensor within 20 mi (Lake Worth Pier, Virginia Key, Vaca Key, Key West; Port Everglades excluded — reads 92–98°F), otherwise the Open-Meteo marine model at the spot. Readings outside 45–93°F are discarded. New Insights chart: water temperature bands. Older catches are backfilled in the background by their owner's phone (25 per visit; NOAA station → ocean model → NOAA daily satellite record for old dates; failures retried after a week).

**Step 2 (done):** satellite map layers — 🌡 water temperature (JPL MUR daily 1 km SST via NOAA CoastWatch ERDDAP, jplMURSST41) and 🟢 water clarity (VIIRS DINEOF gap-filled chlorophyll, nesdisVHNnoaaSNPPnoaa20NRTchlaGapfilledDaily, falling back to the science-quality nesdisVHNnoaaSNPPnoaa20chlaGapfilledDaily; these have an altitude dimension and north-to-south latitude. Clarity is downloaded once as numbers (~1,300 cells) and painted on the phone in Mercator rows, because NOAA's image maker timed out on most slices). Covers all of Florida (24.3–31N, 87.7–79.6W); temperature drawn in 0.5° strips; colors stretched over the day's 5th–95th percentile.

**Step 3 (done):** 📅 Seasons tab — hand-curated typical runs for 26 Southeast Florida fish (inshore, beach & pier, offshore, freshwater) with a 12-month strip (darker = better, striped = closed to keep), month arrows, group filter, "Coming up" openings/closings in the next 45 days, and how many of each the group has logged that month. Rules checked against FWC on Oct 8, 2026 (Southeast snook region closed Dec 15–Jan 31 and Jun 1–Aug 31, 28–32" slot; Southeast redfish 18–27", 1/person; seatrout 15–19", 3/person from Apr 2026; Atlantic black/red grouper closed Jan 1–Apr 30; gag open May 1–Aug 1; red snapper Oct 9–22, 2026). Data lives in `SEASONS` in index.html — update dates there when FWC changes them.

**Step 4 (done):** 👀 public sightings — research-grade iNaturalist observations (ray-finned fish 47178 + sharks/rays 47273) from the last 60 days, with exact (not obscured) locations, filtered to game fish by whole-word name match. One request per area (spots within 20 mi grouped; radius covers the group + 5 mi), up to 3 pages, cached on the phone 6 hours (`fm-sightings`). Shown as a line on each spot card (within 5 mi, matched to the spot's water type), a count on each Seasons row, and purple pins on the map (👀 Sightings) with photo, date, photographer and a link back to iNaturalist. GBIF skipped for now: its recent fish records are mostly the same iNaturalist observations, arriving later.

**Step 5 (done):** fish length and weight — new catch columns `length_in`, `weight_lb`, `weight_est` (setup/07). Catch form has Length/Weight boxes and "📏 Measure from the photo": tap nose, tail, then both ends of a reference (ruler marks, dollar bill 6.14″, card 3.37″, soda can 4.83″, or custom); dots can be dragged; taps are stored in photo pixels so resizing doesn't matter. Works on a newly chosen photo or, when editing, the catch's saved photo. If no weight is typed, it's estimated as ref lb × (length ÷ ref length)³ from a one-point reference per species (`WEIGHT_REF`), saved with weight_est = true and shown with "≈". Quick catches stay fast — measure later via Edit.

**Step 6 (done — working Oct 8):** 🔍 fish ID — Supabase Edge Function `identify-fish` (source in supabase/functions/identify-fish) checks the caller is a member (`is_member()`), sends one photo (re-drawn on the phone at ≤1024 px, so no EXIF/GPS) to Google Gemini's free tier (tries gemini-3.8-flash → 3.5-flash-lite, then asks Google for the current flash models — 2.x models were retired for new keys; override with secret GEMINI_MODELS) with a list of local angler names, and returns up to 3 suggestions with confidence and a visible clue. Buttons on the quick-catch review screen and the catch form; tapping a suggestion fills the species. Only runs when tapped. Needs the secret GEMINI_API_KEY (Supabase → Edge Functions → Secrets). Free-tier caveat (Google may use photos to improve products) is shown next to the button and in privacy.html. iNaturalist's identifier isn't open to outside apps; Cloudflare's free vision models were weaker.

**Step 7 (done):** Best spot today now also weighs water temperature (new `water` factor: the spot's current water temp band vs. the bands its catches came from, with a South Florida baseline) and adds two spot-wide nudges: season (average run level this month for the species caught there, ±0.25; same-water-type group catches for new spots) and public sightings (+0.1/+0.2/+0.3 for 1/3/6+ game-fish sightings within 5 mi). A second line on each ranked spot shows e.g. "🔥 Snook peak season · ⛔ closed to keep · 👀 4 game-fish sightings nearby". **V3 complete.**

**After V3 — season weight (Oct 8):** at Richard's request season counts double in Best spot today (peak +0.5, slow −0.5). Species that spawn offshore (`spawnOffshore` months: mangrove snapper Jun–Aug, mutton snapper Apr–Jun) count as slow at our shore spots during spawning, shown as "🥚 … spawning offshore — rarely inshore now"; the Seasons tab notes it too. Mangrove snapper's run strip now reflects shore fishing (good spring and fall, slow summer).

**Fish research (Oct 8):** every fish on our lists (36 in Seasons now, incl. lane snapper, ladyfish, black drum, goliath, toadfish, barracuda, permit, grunts, porgy, triggerfish, cobia, clown knifefish) has researched shore vs boat months, spawning months/where (leaves shore vs bunches up near shore), and water-temperature comfort. Seasons shows two strips (Shore / Boat) with a gold underline on spawning months and a spawning note; Best spot today uses shore months, spawning, and a water-temperature fit penalty. Species are matched to the most specific name (`seasonFor`). Details and sources: docs/fish-research.md.

**Per-spot tide timing (Oct 8):** `spots.tide_offset_min` (−300…300, setup/08). Spot form: "Tide timing here (minutes)" plus "🌊 It's high tide here now" / "🏖 It's low tide here now", which compare with the nearest station's predicted high/low (within 5 h) and fill the offset. The offset shifts the spot's tide line, Best spot today, and catch tide stages (`tideStageAt(when, station, offset)`).

**Canal salinity & flow (Oct 8):** USGS instantaneous values (salinity 00480, discharge 00060) within 8 mi of a spot are shown on the spot's conditions line (`canalFor`). USGS coverage is mostly Miami-Dade canals (C-8, Snapper Creek, Miami Canal, Black Creek…) plus Hillsboro Canal at S-6 (inland). The coastal Broward structures (G-56 Hillsboro, S-37A C-14…) are SFWMD's; its Hydro Data Service is free but needs a client ID/secret from datarequests@sfwmd.gov — to be added via a Supabase function once received.

## V4

**Step 1 (done):** fishing trips — `sessions` table (setup/09) + `catches.session_id`. "▶ Start trip" on each spot, or a one-tap "📍 You're at X — start a fishing trip here?" prompt when the app opens at a spot (only if location is already allowed; "Not now" quiets it for 4 h); also offered after a quick catch. A sticky bar shows the running trip (time, fish) with End trip. Catches logged at that spot during the trip link to it. Trips are kept on the phone and synced (works with no signal; catches wait for their trip). Forgotten trips close themselves after 12 h. On end, each hour's conditions are saved (`hours`), and Best spot today uses them as the "how often was it like this while fishing" baseline (replacing the textbook one once ≥12 hours exist), plus a catch-rate nudge (±0.4) vs the group for spots with ≥3 trips. Spot cards show trips/hours/skunks; Insights adds trips, fish per hour, % skunked.

**Step 2 (done):** 3-day spot outlook + wind per spot — `spots.faces_deg` (setup/10): "Which way does the water lie from here?" in the spot form. With it set, the spot's wind line and each outlook day read ⬅ onshore (within 50° of that direction) / ➡ offshore (130°+ away) / ↔ cross. "📅 3-day outlook" on each spot card: an hour-by-hour bar for the next 72 hours (Open-Meteo wind + pressure forecast, NOAA tide times shifted for the spot, moon/solunar) scored with the same catch history, trip baseline and season/water/sightings nudges as Best spot today (strong > 1.2, good > 0.4). Shows the top 3 "best windows"; tap an hour for its wind and reasons. Spots without enough catches show wind only. Tide predictions are now fetched 120 hours ahead.

**Step 3 (done):** catch feed — `catch_reactions` + `catch_comments` tables (setup/11). New 🎣 Feed tab: latest catches from everyone (newest first, 30 at a time) with who, species, size, spot, tide/water temp, photo (tap to enlarge), 👍 (tap again to undo) and 💬 comments (300 characters, delete your own). Who can see a catch's 👍/comments follows who can see the catch, so private spots stay private. Comments show as plain text only.

**Step 4 (done):** "Who's going?" — `trip_plans` + `trip_plan_rsvps` tables (setup/12). Upcoming plans are listed at the top of the 🎣 Feed tab (soonest first; a plan stays up until 3 h after its start). A "📅 Plan a trip" button sits at the top of every tab (above the tab bar) and asks for a public spot, day, time and an optional note; the poster is automatically "in". Friends tap ✋ I'm in (tap again to back out); the poster can cancel. Plans can't use private spots (friends couldn't see them). Plans stay visible only for spots the viewer can see.

**Step 4 follow-up:** the person who posts a plan is always shown as going (no tap needed; they get "Cancel plan" instead of "I'm in"). Every screen except the Feed shows a one-line "📅 Already planned: …" reminder under the Plan a trip button (tap it to open the Feed), and the plan form warns (and asks) before posting a second plan for the same spot on the same day.

## Social (V4.5) — Private / Friends / Public
**Decisions (Oct 8):** anyone can request an account and Richard approves · every spot and every catch is Private, Friends or Public · you always see the exact pin; friends see it too unless the poster ticks "hide the exact spot from friends"; everyone else sees a pin blurred by 100–400 m (up to ~¼ mile, always the same offset per spot, computed with a secret salt kept only in the database) · build order: foundation → friends → public feed → chat → report/block; leaderboards after.

**Step A (done) — foundation** (setup/13, 14): `spots.visibility` / `catches.visibility` (+ `spots.hide_exact_from_friends`), `friendships`, `profiles` (username, name, home waters, bio), `members.status` / `members.crew`. The existing group became friends automatically and kept seeing everything. The app reads spots through the view `spots_visible` (exact or blurred coordinates decided in the database — RLS on `spots` itself only returns exact pins to the owner and to friends who aren't hidden-from). Photos follow their catch (or spot); photo GPS is never stored (trigger); trips and plans are visible to friends for spots they can see; the member list (emails) is admin-only. Spot form: "Who can see this spot?" + the hide-from-friends tick. Catch form: "Who can see this catch?" (starts at the spot's level; a new catch from an old app version inherits its spot's level). New 🙂 Profile screen. Checked with pretend owner/friend/stranger/outsider users in the database.
