# Games plan (repo copy)

_The full plan is the Project doc `claude/games-plan.md`. Claude Code can't open Project docs, so this copy holds only what the Engineer was given for step 1 (Richard's handoff, Oct 20, 2026) and the progress. To make this a full copy, paste the Project doc's text below the line at the bottom._

## Progress
- **Step 1 ✅ (v151, Oct 20):** Play › Races is now 🎮 Games + the first game, Keeper or release?. Built in `js/51-games.js`; test `tests/test163.js`.
- Step 2: next (see the Project doc).

## Step 1 as built
1. **Games screen.** Play's third tab is now "🎮 Games". It opens a list of game cards (icon, name, one line, small status), in this order:
   Fishing bingo ("Coming soon", greyed) · Guess the fish ("Coming soon") · How long is it? ("Coming soon") · Keeper or release? ("Today's 5 ready" / "2 of 5 done" / "Done · 4/5") · Fish race (opens the race screen, unchanged; status "N wins left today" from today's paid race wins).
   The race screen has "‹ Games" to go back. Old `?go=race` links, race-room phone alerts and `showPlay("race")` still open the race directly.
2. **Keeper or release?** 5 questions a day, the same for everyone (picked from the New York date with a seeded shuffle). Each shows a species, a length (total or fork, as the rule says), a date in this year and where the rule applies (e.g. "Atlantic coast, the Keys"). The answer comes from the app's own size & bag rules (`fish_rules`, the same checks as the keeper checker): catch-and-release only, closed season, too small, over the slot. After each answer: a one-line reason. End screen: score out of 5 and a list of all 5.
   - One question per species. Rules with this-year-only dates (red snapper, Gulf gag and amberjack) and rules with nothing to decide (no size, no season) are left out. "One over the slot allowed" rules never get an over-the-slot question. Fork-length rules never get a length within 1.5″ of the minimum (the checker calls those "close call").
   - Never uses anyone's catches or photos. No coins, no gems, nothing saved to the database. Today's answers are kept on the phone only (`fm-keeper-<user id>`).
   - The FWC freshness line stays on screen ("A guide only. Always check the current FWC rules (checked …)" or the "last checked N days ago" warning).
3. **Look:** matches the "Games Screen Mockup" (Games list + quiz screen) with the app's own colors, light and dark mode. Tap targets 44px or more. On phones narrower than 440px the status pill sits under the game's name. The mockup's "Daily streak" box is not in step 1.
4. **? intro card:** "Quick games 🎮 — Play a round while you wait for the tide." Button: Got it. Shown once; the ? on the Games screen (and the top ? button while on Games) brings it back. Its "seen" mark is kept on the phone only, because the account's tutorial list only allows the 8 screens of setup/73 (no database change in this step).

## Not in step 1
Coins, gems, database tables, bingo, the photo games, streaks, any privacy/terms wording.

---
<!-- Paste the Project doc claude/games-plan.md below this line -->
