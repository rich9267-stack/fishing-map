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

**Step 7 (current):** suggested spots from OpenStreetMap (Overpass API): named/public piers, boat ramps, named jetties, fishing spots, and fishing bridges in Broward that nobody has saved; private backyard docks filtered out. Cached on the phone for 7 days. One-tap add pre-fills the spot form; shown on the map as white pins.

## V2

**Step 1:** invite-only logins (email + password). Admin "Invite friends" screen; everyone edits only their own spots and catches; nothing visible when signed out. See `setup/05-logins.sql`.

**Step 2:** private spots — "🔒 Private" checkbox when adding/editing; only the owner sees the spot and its catches (enforced by the database). Dark dashed pin outline on the map.

**Step 3:** filters — water type, spot type, public access, free/any parking, no long walk, no 4x4, only my spots, private only, has catches. Applies to the list and map; remembered on each phone.

**Step 4:** photos on spots and catches — shrunk on the phone to ~300 KB, stored privately in Supabase, shown via 1-hour signed links; tap to view full screen; delete your own.

**Step 5:** 📊 Insights tab — fish counts by tide stage, pressure trend, time of day (dawn/dusk from sunrise/sunset), moon phase, solunar period, wind speed, top baits, species and spots; filter by spot, species, or only my catches.

**Step 6 (current):** 🏆 Best spots today — scores each hour of the next 12 per spot against that spot's catch history (tide stage from its station, pressure trend, time of day, solunar, moon, forecast wind), compared with how often each condition normally occurs; shows best time and the reasons. Spots with <3 fish use the group's catches.

**Photo details:** catch photos set the catch time from the photo and warn if the photo was taken somewhere else; spot photos can place a spot that has no location; the add-spot form can take its location "📷 From a photo". Time/location also saved on the photo record. Uploaded image files themselves carry no hidden details (they are re-drawn when shrunk).

**Quick catch (📸 button):** in-app camera + live GPS. Matches the nearest saved spot within ~800 ft, or creates a private "Quick spot" right there (named after a public place if one is right there). Species chips (recent first), count, bait (last used pre-filled); all conditions automatic; saves in the background so you can get back to fishing. Library and "No photo" options too.
