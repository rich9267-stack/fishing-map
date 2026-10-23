# 📚 Learn page — design note (Designer, Oct 22)
_Plan only. Nothing built. Decisions by Richard: start with Rules; entry B or C; pictures from free licensed sources; long fish cards._

## What it is
A phone-friendly library of small cards: rules for any state, fish info, state/local info, rigs, bait & lures, knots. Opens from the Home screen, has a state picker (default = where you are, but any state works), and every card is one or two taps away.

## Why
On a dock with one hand free you want the answer in two taps. Rules for *any* state also helps people planning a trip before they get there.

## Where it lives (decision: C, with a small B later)
The app's bottom tabs are already 7 and the ⋯ More menu belongs to the map (map tools only), so Learn gets a **📚 Learn card on Home** (always visible, one tap) plus a "📚 Learn more" link inside Seasons and fish cards. Nothing new in the tab bar.

## Rules (how it works)
1. **Shell.** Tapping the Home card opens a full page "📚 Learn" with a search box, a state picker (all 48 + DC, default = the "area now" state, a 📍 Here button) and six tiles: Rules · Fish · Rigs · Bait & lures · Knots · State info. Back button returns to where you were.
2. **Rules tile (step 1).** Shows the chosen state's rules using the data we already have (Seasons cards + regional rules + agency name/links from js/54, no-fishing zone note). Same wording as today: "Guide only — confirm with <agency>" and the checked date. No new rules are written; if a state has none, say so plainly.
3. **Fish tile.** List of the fish we know (js/05, js/18), search by name. A fish card (long version) shows: photo, size and bag limit **for the chosen state** (pulled from the rules data, never typed in by hand), season, range, habits, best time/tide, best baits, best rigs, 3–5 tips, look-alikes, handling/release tips. Links to its rigs and baits.
4. **Rigs / Bait & lures / Knots tiles.** Each item is a card: what it is, when to use it, 3–6 numbered steps, one picture or diagram. Cards cross-link (a fish card → its rig → the knot used).
5. **State info tile.** Agency name, license link, regulations link, ramp-list link, local tips for that state (short).
6. **Pictures.** Free, properly licensed (Wikimedia Commons, NOAA, state agencies, public domain). Each picture keeps its credit line on the card. If no good free picture exists, use clear text steps.
7. **Offline.** Content is plain files kept with the app (like data/ramps) and saved on the phone by sw.js. No database changes, no new tables, no coins.
8. **Limits come only from the rules data.** Tips ("best bait") are general and marked as tips, never as rules.

## Numbers
| Item | Start value | |
|---|---|---|
| Starter knots | 8 (Palomar, improved clinch, uni, loop knot, Albright, double uni, nail knot, blood knot) | tune later |
| Starter rigs | 8 (Carolina, Texas, drop-shot, Florida/fish-finder, pompano, knocker, free-line live bait, popping cork) | tune later |
| Bait & lure cards | ~20 | tune later |
| Fish cards | the fish already in the app | tune later |
| Picture size | ≤ 60 KB each, loaded only when a card is opened | tune later |
| Files | one JSON per section (`data/learn/rules…`, `fish`, `rigs`, `bait`, `knots`, `state-info/<ST>.json`) | |

## Screens
```
Home                          📚 Learn
┌────────────────────┐        [ Search…                ]
│ … tides, weather   │        [ State: Florida ▾ ] [📍Here]
│ ┌────────────────┐ │        ┌────────┐ ┌────────┐
│ │📚 Learn        │ │        │📜 Rules│ │🐟 Fish │
│ │Rules, fish,    │ │        ├────────┤ ├────────┤
│ │rigs, knots →   │ │        │🪝 Rigs │ │🎣 Bait │
│ └────────────────┘ │        ├────────┤ ├────────┤
└────────────────────┘        │🪢 Knots│ │📍State │
                              └────────┘ └────────┘
```

## Build order (each step checkable on the phone; new `js/NN-learn*.js`, tests, version bump each time)
1. Shell + Home card + state picker + **Rules for any state** (reuse existing data). _Check: pick Texas while in Florida, see Texas rules and agency link._
2. Fish list + long fish cards (limits pulled from the rules for the chosen state).
3. Knots (8, with licensed diagrams).
4. Rigs (8).
5. Bait & lures.
6. State info tiles (agency links first, local tips added state by state).
7. Search across everything, 📍 Here shortcuts, cross-links between cards.

## Done when
Richard, on his phone, can open 📚 Learn from Home, choose any state, read that state's rules with the agency and checked date, and (after later steps) open a fish, see its limit for that state, and follow a link to a rig and a knot — all working offline and without any new database table.

## Not included (Later list)
- Community tips or user-written cards (needs moderation).
- Video.
- Quizzes / "knot trainer" games.
- Saltwater vs freshwater personalized suggestions.
- Anything in the database.

## Risks (for the lawyer packet — add when built)
- Pictures and text from outside sources: licenses and credit lines.
- "Tips" wording must not read as legal advice; limits only from the rules data.
- Long fish cards: facts need a source (agency or NOAA) per card.

## Flags for the Engineer / Writer
- Writer should draft the card texts (plain English, short steps); Researcher finds the free pictures and checks licenses before the Engineer builds steps 3–5.
- Step 1 needs no new content, so the Engineer can start it right away.
