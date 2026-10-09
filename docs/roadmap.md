# Roadmap — planned features (all $0: free public data + existing Supabase/GitHub)

Order = suggested build order. Each item is small enough to ship + test on its own.

## A. Safety on the water
1. **Severe-weather alerts** — NWS alerts for your location (thunderstorm/lightning, small-craft advisory, rip current, tornado/waterspout). Banner on the Map and in Boat mode; optional phone push (dedupe per alert).
2. **"Heading out / I'm back" check-in (float plan)** — pick spot, expected-back time, 1–2 buddies. Boat mode sends a position ping every few minutes when online. If you're not back by time + grace, buddies get a push with your last position. One-tap "I'm back".
3. **Boat mode extras** — next tide, sunset countdown, mark "man overboard" waypoint, optional drift/anchor alarm.

## B. Smarter fishing help
4. **Follow ⭐ spots** — morning bite alerts for followed spots + nearby (builds on morning-bites).
5. **Keeper checker** — at logging: "Keeper ✓ / Under slot — release" for common species from an admin-editable FWC rules table (min/max/slot, bag, season, "verified <date>"). Always says "check FWC".
6. **Insights** — bait/lure performance, per-spot tide graph, best-hour heat map.

## C. Social & competition
7. **Hall of Fame** — winners of each monthly/official contest, trophies on profiles.
8. **Share card** — catch photo + species/size/spot-area as one image for the phone's share sheet (respects privacy).
9. **Alerts inbox** — in-app list of everything pushed to you (missed buzzes).
10. **Year in review + badges.**

## D. App polish (QOL)
11. Spot search/sort, edit/undo catch, export my data (CSV), offline map-area download, auto-hide after N reports, admin dashboard.

## E. Measure tool rework
Goal: feel like the iPhone Measure app. Limit: a web page cannot use the iPhone's AR/LiDAR (Safari doesn't expose ARKit), so true "walk the phone along it" measuring is impossible here. What we can do:
- **Live camera view** (no photo step): point at the fish next to a reference (bill/card/ruler), lines and the length update live as you drag the ends.
- **Reference auto-lock**: pick the reference once; it stays calibrated while you move the end markers.
- **Magnifier loupe + fine nudge** when dragging, pinch-zoom, "hold phone flat above the fish" level indicator (uses tilt sensor).
- **Freeze & save**: snap the frame, keep the overlay on the photo.
- **Type it in** shortcut for numbers read from the native Measure app (length field already accepts it).
