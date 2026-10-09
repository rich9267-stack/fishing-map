# Plan history (moved from the Project doc claude/fishing-map-plan.md, Oct 9 2026)

Finished V1–V3 sections, moved word for word.

## V3 (complete) — "where the fish are"
**Goal:** go beyond self-reported catches by adding what the water is doing (temperature, clarity), what the public is seeing (species sightings), what time of year it is (seasonal runs and closures), and better catch records (species suggestion, length, weight).

**V3 decisions (Oct 8):** include all four areas · AI fish ID must be **free only** (skip it if no acceptable free option) · length by **tap-to-measure** (no AI) · budget stays **$0**.

| Step | What | Notes |
|---|---|---|
| 1 ✅ | **Water temperature on every catch + per spot** | Done. Nearest NOAA station within 20 mi (Lake Worth Pier, Virginia Key, Vaca Key, Key West; Port Everglades excluded — its sensor reads 92–98°F), else the Open-Meteo marine model. Past catches backfilled on the owner's phone (25 per visit). Shown in Insights. |
| 2 ✅ | **Satellite map layers** | Done. 🌡 Water temp (JPL MUR daily satellite images) and 🟢 Water clarity (NOAA VIIRS gap-filled chlorophyll — no cloud holes; downloaded as numbers and drawn on the phone) as map buttons covering all of Florida. Colors stretch over the day's range. |
| 3 ✅ | **Seasons calendar** | Done. 📅 Seasons tab: 26 fish (inshore, beach & pier, offshore, freshwater) with typical runs by month, FWC season dates checked Oct 8, 2026, "Coming up" openings/closings, and the group's own catch counts. Season dates live in `SEASONS` in index.html — update when FWC changes them. |
| 4 ✅ | **Public sightings** | Done. Research-grade iNaturalist photos of game fish from the last 60 days: a "👀 Seen within 5 mi" line on each spot (matched to its water type), counts on the Seasons tab, and 👀 Sightings pins on the map. Cached 6 hours per phone. GBIF skipped (mostly the same iNaturalist records, later). |
| 5 ✅ | **Tap-to-measure length + estimated weight** | Done. Catch form has Length/Weight boxes and "📏 Measure from the photo": tap nose, tail, then both ends of a reference (ruler marks, dollar bill, card, soda can, or custom size); dots can be dragged. Leave weight blank and it's estimated from length (shown with ≈). Quick catches can be measured later via Edit. |
| 6 ✅ | **Fish ID (free only)** | Done and working (first real test spot on). Built: "🔍 Identify fish" on quick catch and the catch form → Supabase function `identify-fish` → Google Gemini free tier → up to 3 suggestions to tap. Decision (Oct 8): use Gemini free tier, accepting that Google may use the photos to improve its products; only tapped photos are sent, without location. Key saved as Supabase secret GEMINI_API_KEY. Uses gemini-3.8-flash first (older 2.x models are retired for new keys) and asks Google for current models if those fail. iNaturalist's identifier isn't open to outside apps; Cloudflare's free models were weaker. |
| 7 ✅ | **Blend into Best spot today** | Done. Water temperature is now one of the matched conditions; season (is it a good month for what's caught there) and nearby public sightings give small nudges. Each ranked spot shows a line like "🔥 Snook peak season · 👀 4 game-fish sightings nearby". |

_Research notes (Oct 8): NOAA CoastWatch ERDDAP (coastwatch.pfeg.noaa.gov) blocks normal cross-site requests, so the app uses JSONP. Its chlorophyll datasets have an altitude dimension and north-to-south latitude, and its image maker is too slow for many slices — so clarity is fetched as numbers in one request. iNaturalist and GBIF have free public APIs. Canal release/salinity data from the water management district — no easy free feed confirmed yet; revisit later. No free fish-specific ID service found; AI vision services cost pennies per photo (ruled out by the free-only decision unless a free tier works)._

## V2 (complete)
| Step | What |
|---|---|
| 1 | **Logins** — invite-only; "Invite friends" screen (admin) with "📤 Send invite"; sign in required; everyone edits/deletes only their own spots and catches |
| 2 | **Private spots** — only the owner sees the spot, its catches and photos |
| 3 | **Filters** — water type, spot type, access, parking, walk, 4x4, mine, private, has catches; list + map |
| 4 | **Photos** on spots and catches — shrunk on the phone, stored privately |
| 4b | **Photo details** — photo date/time (and location when kept) used for catch time, spot placement, "📷 From a photo" |
| 4c | **Quick catch (📸)** — in-app camera + live GPS; nearest spot within ~800 ft or a new private "Quick spot"; 🖼 Gallery · shutter · No photo |
| 5 | **Catch insights** (📊 tab) |
| 6 | **Best spot today** (🏆 card); time of day in eight equal 3-hour blocks |
| 7 | **Beyond Broward** — 80+ built-in NOAA tide stations plus live NOAA lookup anywhere else; local wind/pressure for far spots; suggestions follow your spots or "◎ Near me" |
| 8 | **Google sign-in + email** — "Continue with Google"; password-reset emails through Gmail SMTP |

## After V3 (done, Oct 8)
- **Per-spot tide timing** — "Tide timing here (minutes)" on each salt/brackish spot, or tap "It's high/low tide here now" at the turn to work it out. Shifts the spot's tide line, Best spot today and catch tide stages.
- **Canal salinity & flow (USGS)** — shown on spots within 8 mi of a USGS canal sensor (mostly Miami-Dade canals; nothing yet at the Pompano-area gates).

## After V2 (done)
- **Offline catch saving** — app opens without signal (service worker); quick catches queue on the phone (photos included) and upload automatically when signal returns; conditions worked out for the catch time.
- **Refreshing the home-screen app** — pull down to refresh, ↻ Refresh button, auto-refresh after 15+ minutes away (never mid-form).

_Decisions so far: Sign in with Apple skipped ($99/year). Invite list = `members` table; Richard (rich9267@gmail.com) is admin. "Confirm email" off (invite list controls access). Gmail SMTP fine at this scale; backup is Brevo (free). Google branding has no logo (avoids review). Best-spot scoring counts moon phase at half weight. Season counts double (Richard, Oct 8: it makes a significant difference). All 36 listed fish researched (Oct 8) for shore vs boat months, spawning moves (leave shore vs bunch up near shore) and water-temperature comfort; the ranking uses shore months, spawning and a water-temp fit. Details and sources: docs/fish-research.md in the repo. Moon/solunar calculated for Pompano._

## V1 (complete)
Tide page · wind & weather · shared spots list and form · catch log with pressure · catch conditions for any date/time with moon & solunar · edit/delete catches · map view with satellite and tap-to-place · per-spot conditions from the nearest tide station and freshwater USGS gauges · edit spot details · suggested spots from OpenStreetMap.

