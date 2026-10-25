# Fishing Map — "Clean Social" redesign handoff

Owner: Richard. Mockups made in a Claude Design canvas. This folder holds:

- `DESIGN-HANDOFF.md` — this spec (the source of truth)
- `mockups/Home.html`, `mockups/Community.html`, `mockups/Profile.html` — the mockup source for each screen (390×844 phone frames). Open them to read exact sizes, colors and spacing. They are in a design-tool format (`<x-dc>` tags and a `support.js` line), so **don't copy the markup in as-is**. Rebuild each screen in the app's own code.

Placeholder text in the mockups is in [square brackets]. Use real app data there.

## Goals

1. Stop the app from looking AI-made: **no emoji used as icons anywhere in the UI**, fewer boxed cards, one accent color, a real icon set.
2. The base layout should feel like a familiar social app, but original: no Twitter/X or Instagram logos, colors, icons or gradients.
3. Home = deciding where to fish today. Community = the social feed. Profile = a social-style profile page.
4. The six stylized looks on the canvas (Tide Table, Night Dock, Bait Shop, Fish Finder, Coastal Editorial, Keys Postcard) are **not** part of this job. They are future premium skin ideas for artists. Build the base so colors and fonts come from theme variables (CSS custom properties), so skins can swap them later without layout changes.

## Design tokens (light theme)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | page background |
| `--text` | `#111418` | main text, active icons |
| `--text-2` | `#5B6470` | secondary text, inactive icons |
| `--line` | `#E6E8EB` | hairline dividers |
| `--line-strong` | `#CDD2D8` | outlined buttons |
| `--section-gap` | `#F2F4F6` | 8px band between major Home sections |
| `--accent` | `#0A6F91` | the ONE accent: primary buttons, tide line, active tab underline, links |
| `--alert-bg` / `--alert-text` | `#FFF6E5` / `#6B4A00` | the single alerts row |
| `--placeholder` | `#D9DEE2` | image placeholders |

- Font: the system font stack `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`. No web font.
- Icons: simple line icons, 1.8px stroke, 24px. The active nav icon is filled. One consistent set. A free open-source set like Lucide or Tabler is fine, or the hand-drawn SVGs in the mockups.
- Tap targets ≥ 44px. Text contrast ≥ 4.5:1.
- Dark theme: not designed yet. Keep everything in tokens so a dark set can be added.

## Global layout

- **Bottom nav (6 tabs, unchanged order):** Home, Map, Play, Compete, Community, Stats. Icon above label, 10.5px label. Active tab = filled icon + dark bold label. No emoji.
- **Floating + button** (log a catch): 56px circle, accent color, white +, bottom-right above the nav.
- **Top-right profile picture** (32px circle) on Home and Community. Tapping it opens the new Profile screen.
- The big shared header the app shows on every page today (logo, home waters, location prompt, "Signed in as", advisories) is removed from other pages. Each page has its own small header instead.

## Screen 1 — Home (`mockups/Home.html`)

Top to bottom:

1. **Header:** "Fishing Map" (22px, weight 800), and under it "Pompano / Ft Lauderdale ▾" (home-waters picker, 12px grey). Right side: Search icon, Help (?) icon (opens that screen's tutorial), profile picture.
2. **"On the water now" row:** horizontal circles (56px) of friends currently on a trip, each with an accent-colored ring and a name under it. The first circle is a dashed "+" labeled **Heading out** (the existing Heading out feature). At the right end: "On the water now / N friends fishing".
3. **Alerts row:** ONE tappable line, e.g. "**3 coastal alerts** · rip current, flood" plus "View". Tapping it shows the full advisory list. Replaces the stacked yellow advisory cards.
4. **Conditions:**
   - "Tide · going out", "Low at 2:50 PM", and "in 4h 6m" on the right in accent color.
   - **Tide line graph:** a smooth curve from 6a to 10p in accent color (2.25px), with a dashed vertical "now" line and a hollow dot where now meets the curve, and hour labels 6a / 10a / 2p / 6p / 10p underneath. Use the real NOAA tide predictions already in the app.
   - One line under it: "**NE 17** wind · **84°** water · **Full** moon".
5. **Location prompt:** a pin icon, "You're at / Bitt's parents dock", and ONE accent "Start trip" button. This is the only Start trip button on Home; remove the duplicates.
6. **Quick actions:** two outlined buttons side by side: **Plan a trip** (calendar icon, "Invite friends") and **Learn** (book icon, "Rules, fish, rigs, knots").
7. **Best spots today:** title, plus a "How it's ranked" link on the right. Rows: a 40px rounded number badge, the spot name (bold), a one-line reason (grey), and the best time on the right ("Now" in accent, or a time in grey). Drop the long explanation paragraph; it goes in the help tutorial.

No social feed on Home.

## Screen 2 — Community (`mockups/Community.html`)

1. **Header:** "Community" (22px, weight 800). Right side: Search, Friends & groups icon, Messages icon, profile picture.
2. **Tabs:** "My circle" | "Public" split 50/50, with a 3px accent underline on the active tab. Replaces the old segmented switch.
3. **"Who's going" row:** the old "Who's going?" trips box as story-style circles. The first is a dashed "+" labeled **Plan a trip**; the rest are friends' planned trips with an accent ring and "Name · Day" under each.
4. **Feed:** posts, newest first, divided by hairlines (no boxes around each post):
   - avatar (40px; tap opens that user's profile), **Name** @handle · time, ⋯ menu
   - the catch line, e.g. "Mangrove snapper, 4.5" · about 1 oz"
   - a grey detail line: spot · bait · tide · water temperature
   - the photo (rounded 14px)
   - actions: cheer (heart line icon + count), comment, share
   - Keep the existing privacy rules exactly as they are (private-spot catches visible only to the owner, blurred public pins, and so on).
5. The old sub-tabs (Feed / Trips / Friends / Messages / Groups) go away: Trips = the circle row, Friends & Groups = the header icon, Messages = the header icon.

## Screen 3 — Profile (`mockups/Profile.html`) — NEW

Opens from the top-right profile picture. No bottom-nav tab is highlighted on this screen.

1. **Cover photo** (150px tall) with a round back arrow at the top-left (back to the previous screen).
2. **Avatar** (84px, white 4px border) overlapping the cover. On the right: an outlined **"⚙ Settings & edit"** button that opens the screen the profile picture opens TODAY (the existing account/settings screen). Next to it, a Share profile icon button.
3. Name (21px bold), @handle, bio, "Home waters: …", "Mostly: <most-caught species>".
4. Counts: **47** fish · **4** trips · **N** friends (real data).
5. **Best catches row:** circles showing best length + species, ending with a "My tank" circle that opens the Play › Tank.
6. **Tabs:** Catches | Spots | Trips | Badges, with an accent underline on the active one.
7. **Catches grid:** 3 columns, 2px gaps, square photo tiles with the species name in the bottom-left corner.
   Respect privacy: other people see only what each item's Private / Friends / Public setting allows.

## Build order (one step at a time, test after each)

1. Add the theme tokens + icon set, and replace every emoji icon in the UI.
2. New bottom nav styling + floating + button.
3. Home screen.
4. Community screen.
5. Profile screen + rewire the top-right profile picture.
6. Review the other tabs (Map, Play, Compete, Stats) for leftover emoji, boxes-in-boxes and the old shared header.
