# Map: "Official public spots" layer — design (v2, Oct 17, 2026)
_Designer · planning only: nothing built. Asked for by Richard after phone test session 1 (section E: finding a spot on the map is a pain)._

## What Richard asked for
1. "I'd like the official public spots to have their own layer option so it's easier to find spots."
2. "We should probably move the old boat ramps and just have it live in the new map layer."

## Today
- The ✅ official places (boat ramps, parks/piers/jetties, and places an admin made official) are only seen in **Find new water**. They are not pins on the map.
- The Layers sheet (Map › 🗂 Layers) has **🌎 Public spots** (blurred pins shared by people) and **⛵ Boat ramps** (asks FWC's live list each time you move the map).
- The app already loads official places in 35-mile squares ("cells") around where you are or where Find new water looks, keeps each square for a day, and keeps at most 10 squares on the phone. The saved list has about 2,270 ramps and 3,000 parks/piers/jetties.

## Decisions (Richard, Oct 17)
- **Everything, with filters:** ramps, piers and jetties, park bank-fishing, and places an admin added. Small buttons to show only some kinds.
- **Placement:** the first switch in the Fishing group of the Layers list.
- **Tapping a pin:** show details, Directions, Save as my spot, Start a trip here.
- **One layer for ramps:** the old ⛵ Boat ramps layer goes away. Ramps live in the new layer only.

## What changes when the old ramp layer goes (so nobody is surprised)
| | Old ⛵ Boat ramps | New layer |
|---|---|---|
| Which ramps | Every ramp FWC lists, including closed, restricted and private ones | Only ramps FWC lists as **open and for general public use** |
| Details | Lanes, fee, hours, water, status, condition, dock, amenities, phone, address | Saved: water, lanes, fee, hours, owner, type, city. The rest is fetched live from FWC when you tap a ramp, if you have signal |
| Up to date | Live every time | Saved copy refreshed daily; the "More from FWC" lines are live |
- **Closed and restricted ramps will no longer show on the map.** That fits "official public spots", but Richard should know. If he ever wants them back, a "Show closed ramps" button can be added to the Ramps filter.
- **Anyone who had ⛵ Boat ramps switched on** gets the new layer switched on the first time they open the updated app.

## How it looks and works
- **Switch:** "✅ Official public spots" with the small line "Boat ramps, piers, parks and places an admin added". Off until switched on, like the other layers.
- **Pins:** a green-and-white pin that looks different from catch pins and from the blurred 🌎 Public spots pins; a tiny symbol per kind (ramp, pier/jetty, park). Places an admin added are marked the same way, with a ⭐.
- **Zoom:** pins appear from the same zoom level the old layers used (zoom 9). Further out, the layer shows a plain line, "Zoom in to see official spots," as the others do.
- **Filter buttons** appear under the switch while it is on: Ramps · Piers & jetties · Parks · Admin-added. All start on.
- **Tapping a pin** opens a small card: name, kind, county, who the information comes from, and the line "Check before you go — reference only, not for navigation." For a ramp the card also shows lanes, fee, hours, water and owner, then a "More from FWC" section (phone, address, amenities, condition, dock) that fills in a moment later; offline or if FWC is down, it quietly stays out. If the place is inside a protected zone, the red 🚫 line shows, same as everywhere else. Buttons: **Directions** (official places are public, so the exact spot is fine), **Save as my spot**, **Start a trip here**.
- **Spots you already saved** that sit on an official place: show once, with "Saved" on the card.
- **Offline:** shows whatever squares the phone already holds.

## Build steps (small, checkable on the phone). The old ⛵ layer stays until step 6 so ramps are never missing on the map.
1. **Switch and pins** for all kinds, from zoom 9. *Check:* Layers → switch on → pins around Pompano; off → gone; zoom out → the plain "Zoom in" line.
2. **Tap a pin → card** with the saved details, source credit, check-before-you-go line and red 🚫 line. *Check:* tap a ramp, a pier and a park; the 🚫 line shows on a Keys no-fishing spot.
3. **Filter buttons.** *Check:* turn Piers off and they vanish; turn Ramps off and they vanish.
4. **"More from FWC" on ramp cards** (phone, address, amenities, condition, dock). *Check:* tap a ramp near you and the extra lines appear; in airplane mode the card still opens without them.
5. **Directions, Save as my spot, Start a trip here.** *Check:* each button does what it says; a saved one then shows "Saved."
6. **Retire the old ⛵ Boat ramps layer.** Remove its switch from the Layers sheet (and from the hidden row of buttons the sheet runs on); switch the new layer on for anyone who had it; update the tests that name it (`test103` lists `mx-ramp`). *Check:* Layers no longer lists Boat ramps; the same ramps now show under ✅ Official public spots.

**Status (Oct 18): steps 1–3 built, committed and phone-checked (v122–v124). Next: step 4.**

## Risks and things for the Engineer to check
- **Does the saved ramp id match FWC's ramp id** (`source_id` vs `RampID`)? Step 4 depends on it; if not, ask FWC's list by name and position instead.
- **Too many pins.** Zooming in is required; cap the number drawn at once and test in a busy area (Fort Lauderdale/Miami).
- **Squares kept on the phone.** The app keeps 10 squares; panning across the state must not make pins vanish or storage grow. Check `OFFICIAL_MAX_CELLS` and the refresh rules.
- **Old data.** The ramp list rests on a 2009 survey; "check before you go" stays on every card.
- **Not mixed up with people's spots.** The two layers need different looks and names ("Official" vs "Shared by people").
- **The service worker file list and the allowed web addresses** (`sw.js`, the Content-Security-Policy in `index.html`) already cover FWC's server; keep it that way when step 4 asks for one record.
- **Tests:** add a test per step; Find new water, Quick catch and the layer-sheet tests must stay green.
