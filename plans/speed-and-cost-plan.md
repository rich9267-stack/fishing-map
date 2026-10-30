# Speed + cost plan (Oct 30, v248)
_Goal (Richard): the app opens faster and asks the server as little as possible, to stay on the free plans as the app grows._

## What we measured (Supabase logs, last 24 h, Oct 30)
- **~2,900 requests to Supabase a day.** About half come from our own timed jobs (alerts every 10 min), not from phones. ~25 app opens a day.
- **Each app open asks the database ~35 separate questions** (spots, prefs, follows, tutorials, sessions, rules, sightings, blocks, tackle, licences, shares, reports, hall of fame, …), each ~100–300 ms.
- **Data sent out (the free-plan limit that matters, 5 GB/month): ~4 MB a day**, of which **~3 MB was profile pictures**, downloaded again on every screen (one picture 21 times in a day). Catch photos were already kept on the phone (v172).
- **App code:** 73 script files, 1.85 MB (+144 KB styles), all loaded at start. Kept on the phone after the first visit, so the network is not the slow part; reading and starting 1.85 MB of code is.
- **data/zones-rules.json is 5.8 MB** and loads at every sign-in. v247 made every app update download it again (fixed in v248).
- Edge function calls (~300 a day) and database timed jobs are far below the free limits (500,000 calls a month).

## Done in v248
1. **Profile, group and business pictures are kept on the phone** like catch photos (sw.js, emptied on sign-out). Expected: most of the ~3 MB/day of picture downloads go away.
2. **Our data lists (ramps, rules zones, Learn cards) are kept on the phone and only downloaded again when the file really changed** (bump.sh writes a fingerprint per file into sw.js). Before: re-checked in the background on every open, and v247 re-downloaded all of them after every update.

## Next steps, best value first (each is one small version; Richard picks)
1. ✅ **Built v249 (setup/122, test231): ~40 calls → ~16; the 354 KB rules list kept on the phone by fingerprint.** ~~One database call at app open instead of ~35~~ (a single `app_start()` database function returning the small lists together). Biggest speed gain on slow phone signal; fewer requests. Needs a setup/NN file + careful tests (each list keeps its own privacy rules). Medium.
2. **Load rarely used code only when it is opened**: admin (js/38–47, ~10 files), games (51–52), Learn (62), tank (14, 72), fish ID (07, 56–57), business pages (71). About a third of the code. The app starts faster; nothing changes for the person. Medium (each opener needs a "load then show").
3. **Split the 5.8 MB rules-zones file by state** and load only the states near the map (like ramp lists). Faster first sign-in, less phone memory. Small–medium (tools/make-rules-zones.js already builds it).
4. **Remember signed picture links for their hour** (today each screen asks for a new link: ~150 small requests a day). Small.
5. **Pin the outside code libraries to exact versions** (supabase-js@2 and exifr@7 are open-ended, so they are re-checked each open). Small.
6. Leave as is for now: timed alert jobs (well inside free limits), race-room tick every minute (inside the database, no data sent out).

## How we check
- Supabase → Logs (or ask Claude): requests a day and bytes sent for profile pictures, compared with the Oct 30 numbers above.
- Phone: the app should feel the same; after one update it should not re-download Learn lists or the rules file.
