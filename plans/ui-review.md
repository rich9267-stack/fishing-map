# UI review — Richard's six items (go-public plan, task 9)
Designer + Tester, Oct 20 2026. No code changed. Richard picks one option per item; Engineer builds one screen at a time.
Sizes: **small** = an hour or two, one file · **medium** = half a day to a day · **large** = several days.
Rule kept: Play and Tackle box are polish only — no new game systems, no new coin rules, no new database tables.

---

## 1. Home feels cluttered past 5 spots
**What's there now:** weather strip → 3 quick buttons → "Best spots today" (every spot, ranked) → "Your spots" where each spot is a tall card (name, type, conditions, sightings, "king" fish, up to 8 chips, notes, Edit, 3-day outlook…). With 6+ spots the page gets very long and the spots show twice.

**A. Short spot rows, tap to open (recommended) — medium**
Each spot is one line: icon, name, one small fact (distance or last catch). Tap opens the full card (everything that's there today). *Why:* you scan your list in one glance; details are one tap away.
```
┌ Your spots          ⚙  + Add ┐
│ 🔍 Search…           A–Z ▾   │
│ 🔵 Hillsboro jetty   2.1 mi ›│
│ 🟢 C-14 canal        3 days ›│
│ 🟤 Lake Ida          5 mi   ›│
│ 🔵 Pompano pier      1.0 mi ›│
└──────────────────────────────┘
```
**B. Best spots: top 3 only — small**
"Best spots today" shows the top 3, then "Show all 9 ›". *Why:* the best picks stay on top without repeating the whole list. Works well with A.
```
┌ 🏆 Best spots today ─────────┐
│ 1 Hillsboro jetty   ●●●●○    │
│ 2 Pompano pier      ●●●○○    │
│ 3 C-14 canal        ●●○○○    │
│        Show all 9 ›          │
└──────────────────────────────┘
```
**C. ★ Favorites first — medium**
A star on each spot; starred spots show on Home, the rest go under "All spots ›". *Why:* Home shows the 3–5 places you really fish. (Saved on the phone only, so no database change.)

**Tester checks:** 1, 6 and 20 spots; search and sort still work; Edit / 3-day outlook / Start trip still reachable after tapping a row; nothing hidden for a spot with no location.

---

## 2. Map page scrolling
**What's there now:** the map is 62% of the screen tall, then 6 buttons, then notes and the map key below it. So the page scrolls, and a finger on the map pans the map instead of scrolling the page — it feels like fighting it.

**A. Full-screen map, floating buttons (recommended) — medium**
The map fills the screen under the top bar. Buttons float on the map: ＋ Add, 🗂 Layers, ◎ Me in a corner; "Find new water", List, Boat mode go in a small "⋯ More" button. Notes and the map key open in the Layers sheet. *Why:* no page scroll at all — the map is the whole page, like Google Maps.
```
┌──────────────────────────────┐
│ [map fills the screen]   🗂  │
│                          ◎   │
│        📍     📍              │
│   📍                     ⋯   │
│                              │
│ ( + Add spot )               │
└──────────────────────────────┘
```
**B. Buttons on top, map fills the rest — small**
Move the button row above the map and make the map exactly fill what's left of the screen; notes become one line over the map. *Why:* nearly the same feel as A with less work; page still never scrolls.
```
┌──────────────────────────────┐
│ +Add  🗂Layers  ◎Me  ⋯       │
│┌────────────────────────────┐│
││ [map to the bottom edge]   ││
││                            ││
│└────────────────────────────┘│
└──────────────────────────────┘
```
**Tester checks:** iPhone and Android, with and without the Home Screen app; keyboard doesn't cover "Place spot"; pinch and pan work; Boat mode and Find new water still open; small phones (iPhone SE).

---

## 3. Compete — tournament leaderboard
**What's there now:** Compete lists contests/tournaments; standings only appear after you open one, scrolled below the details and entrants list, top 10 per board.

**A. Leaderboard first inside each tournament (recommended) — small**
Open a tournament → the leaderboard is at the top, with a 🥇🥈🥉 podium and "You: 7th" pinned under it; details and entrants move under a "Details ▾" fold. *Why:* the first thing people want is "who's winning and where am I?". Uses the standings the app already fetches.
```
┌ 🏆 Fall Snook Classic · LIVE ┐
│   🥈Ana   🥇Joe   🥉Sam      │
│   31″     34″     29″        │
│ 4 Lee 28″  5 Kim 27″ …       │
│ ▶ You: 7th · 25″             │
│ [Longest] [Heaviest]         │
│ Details ▾                    │
└──────────────────────────────┘
```
**B. A "Leaderboards" tab on Compete — medium**
A third tab next to Contests and Tournaments: one card per live tournament showing its top 3 and your place; tap for the full board. *Why:* see every race at a glance without opening each one. Live/just-ended only; no totals across tournaments (no new prize or Hall of Fame rules).
```
[🎣 Contests][🏆 Tournaments][📊 Leaderboards]
┌ Fall Snook Classic · LIVE ───┐
│ 🥇Joe 34″ 🥈Ana 31″ 🥉Sam 29″│
│ You: 7th                    ›│
└──────────────────────────────┘
```
**Tester checks:** tournament not started / live / ended / cancelled; you not entered; ties; teams mode; 1 entrant and 50 entrants.

---

## 4. Play feels rudimentary (polish only)
**What's there now:** title, wallet, a row of tabs (Tank · My fish · Fish race), then a card with two paragraphs of explanation, a sound row, and a second row of buttons (Tanks · Lagoon · Pond · Shop) before you see any fish.

**A. Tank first, one row of tabs (recommended) — small**
Wallet as small coin/gem pills in the title line; the long explanation moves behind an "ⓘ" button; Tanks/Lagoon/Pond/Shop become one tidy pill row; the tank itself starts near the top and is bigger. *Why:* you open Play and see your fish swimming straight away.
```
┌ Play            🪙 120  💎 3 ┐
│ [🐠Tank][🐟My fish][🏁Race]  │
│ (Tanks)(Lagoon)(Pond)(Shop) ⓘ🔊│
│┌────────────────────────────┐│
││  ~  🐟     🐠   ~   🐡     ││
││      big tank view         ││
│└────────────────────────────┘│
└──────────────────────────────┘
```
**B. A + nicer finish — medium**
Everything in A, plus: tank name and fish count on a small plaque, a soft "glass" frame and bubbles around the tank, shop items shown as picture tiles with prices, and My fish cards with a colored rim by rank. *Why:* it looks like a game, not a form. Only looks change — same coins, same shop, same rules.

**Tester checks:** new member with 0 fish, member with 40 species; sound stays off until tapped; coins shown match before/after; Shop buys still work; small phone.

---

## 5. Community — public filters take too much space
**What's there now:** under Public, five rows of chips stack up (Local/Global, how far back, fish ×10, water, photos/ranked) before the first catch.

**A. One "Filters" button + a sheet (recommended) — small**
One line: the Local/Global switch and a "⚙ Filters (2)" button; the button opens a sheet from the bottom (like Map › Layers) with all the same chips and a Done button. *Why:* catches start right under the tabs; the number shows filters are on.
```
┌ (📍Local)(🌎Global)  ⚙ Filters 2┐
│ 📍 14 catches within 25 mi, 7 days│
│ [catch] [catch] [catch] …        │
└──────────────────────────────────┘
```
**B. One sideways-scrolling chip row — small**
All filters as dropdown chips in a single row you swipe sideways: "7 days ▾", "All fish ▾", "Salt ▾", "📷". *Why:* one row of space, still one tap to change.
```
┌ 📍Local ▾ │ 7 days ▾ │ Snook ▾ │ Salt ▾ │→
```
**Tester checks:** filters still remembered after closing the app; "Clear filters" still there; 🏠 Home chip still appears when away from home; screen reader names each control.

---

## 6. Tackle box feels rudimentary (polish only)
**What's there now:** a text box + kind dropdown + Add, then a plain list: name, ✕, and one grey line ("12 fish · avg 18.2″ · mostly snook").

**A. Grouped cards with stat badges (recommended) — small**
Items grouped under Baits · Lures · Rods & line. Each item is a small card: icon, name, and badges "🐟 12" "📏 18″" "mostly snook". The best producer gets a "🏆 Top bait" tag. ✕ moves into a "⋯" menu so it isn't tapped by accident. *Why:* it feels like your own gear shelf and shows at a glance what works. Same data, nothing new saved.
```
┌ 🎒 My tackle box             ┐
│ BAITS                        │
│ 🦐 Live shrimp  🏆 Top bait   │
│   🐟12  📏18″  mostly snook  ⋯│
│ 🐟 Pilchards  🐟5  📏22″    ⋯│
│ LURES                        │
│ 🪝 ¼oz white jig 🐟3        ⋯│
│ RODS & LINE                  │
│ 🎣 7′ medium spin           ⋯│
│ [ + Add tackle ]             │
└──────────────────────────────┘
```
**B. A + tidy "Add" — small**
The add form folds into one "+ Add tackle" button that opens a short form with kind as picture buttons (🦐 Bait 🪝 Lure 🎣 Rod 〰 Line). The "used on your catches — tap to add" chips stay. *Why:* the top of the box isn't a form any more.

**Tester checks:** empty box; 30 items; remove still works and asks nothing new; names with "¼" and quotes; suggestions still appear while logging a catch.

---

## Designer's pick (for Richard to accept or change)
| # | Pick | Size |
|---|---|---|
| 1 Home | A + B | medium + small |
| 2 Map | A (B if we want it quick) | medium |
| 3 Compete | A now, B later if wanted | small |
| 4 Play | A, then B | small → medium |
| 5 Community | A | small |
| 6 Tackle | A + B | small |
Suggested order: 5 → 6 → 3 → 4 → 1 → 2 (quick wins first; Map last because it touches the most).

---

## Richard's decisions (Oct 20) — build notes for the Engineer
| # | Decision | Size | Notes |
|---|---|---|---|
| 1 Home | **1A** short spot rows + **"Best spots today" can fold** | medium | Fold = tap the card title (▾/▸). Starts open; open/closed remembered on this phone (localStorage, like other per-phone choices). Folded shows only the title + the #1 spot's name. 1B/1C not chosen. |
| 2 Map | **2A** full-screen map, floating buttons | medium | Build last. Notes + map key move into the Layers sheet. Test small phones and the Home Screen app. |
| 3 Compete | **3A now; 3B after a planning pass** | small (3A) | **3A built v143 (Oct 20)**, js/12, test155. 3B is not built until a short Designer plan answers the questions below. |
| 4 Play | **4A, then 4B** | small → medium | Looks only. Same coins, shop, rules. **4A built v144 (Oct 20)**, js/14, test156. |
| 5 Community | **5A** one "Filters (n)" button + bottom sheet | small | **Built v141 (Oct 20)**, js/21, test153. |
| 6 Tackle | **6A + 6B + new equipment kinds** (speargun, cast net, bow) — confirmed Oct 20 | small + 1 database change | **Built v142 + setup/91 (Oct 20)**, js/13, test154. The 🏆 label says "Most fish" so it fits nets and spears too. |

### Added Oct 20 after the picture mockups (claude.ai/artifact/Y92Y2xopsy3pt2zrZgTjXC)
- **Map search box: yes.** Part of 2A: "🔍 Search the map" floating top-left; type a place or one of your spot names, the map flies there. Needs a free place-lookup service (Researcher to pick one that is free and allowed for app use; OpenStreetMap's Nominatim has strict use limits). Your own spot names are searched on the phone first.
- **Tank name plaque: yes.** Today there are exactly two tanks per person (salt, fresh; `tank_setups`, setup/42) and they have **no name**. So:
  - 4B ships the plaque showing the tank type: "Saltwater tank · 6 fish" (no database change).
  - **Naming a tank** needs a new saved name (one small database change). Names are seen by others who can view your profile, so they need the same bad-word check and admin hide as other text.
- **Buy more tanks: goes to the Later list, planned after the lawyer review.** It is a new coin rule (spend coins to get a tank) and a new game piece, which task 9 keeps out until go-public review. Plan it together with tank naming as "Play: more tanks" (questions: price in coins or gems, how many max, which fish go in which tank, salt/fresh only or themed tanks).

### 3B planning questions (answer before building)
- Which tournaments show: live only, or also ended in the last 7 days?
- Friend contests too, or official tournaments only?
- Which board shows on each card when a tournament has several (Longest, Heaviest…)?
- Show tournaments you haven't joined (with a "Join" button), or only ones you're in?
- Order: ending soonest first, or the ones you're in first?
Not in 3B: totals across tournaments, new prizes, Hall of Fame changes.

### 6 — new equipment kinds
- The database only allows kinds bait / lure / rod / line / other (setup/29 check rule), so this needs one small migration (next `setup/NN`), widening that rule. The old rule has to be dropped and re-added; the connector may block that, in which case Richard runs it in the SQL Editor.
- Proposed new kinds (Designer suggestion, Richard to confirm): **🔱 Speargun / pole spear**, **🕸 Cast net**, **🏹 Bow (bowfishing)**. Keep **📦 Other** for anything else (gaff, kayak, cooler…).
- Proposed: these three **count fish caught** on their stats line (unlike rod/line), because the gear *is* how the fish was caught. A catch matches when its "Bait / lure" text contains the item's name, same as today.
- In 6A's grouping they sit in their own group: **Spear, net & bow**.
- Tester: add/remove each new kind; old items unchanged; the kind list on the add form; suggestions while logging still show only bait/lure/other (decide whether spear/net/bow should appear there too).
- Legal/Writer flag (no build impact): spearfishing and bowfishing have their own FWC rules; a one-line "check FWC rules" tip on those items is optional.
