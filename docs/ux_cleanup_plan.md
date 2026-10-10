# Organization + quality-of-life plan (agreed with Richard, 2026-10-10)

Richard's choices: cover menus/navigation, Today screen, Settings page and small polish; **bottom tab bar**; **split the big file, in small safe steps**.

## Where we are (the problems)
- Top bar has 7 links on a phone (Profile, Alerts, Messages, Friends, Invite, Refresh, Sign out).
- Social stuff is scattered: Friends/Messages/Alerts in the top bar; Groups, Compete, Public, Who's-going in the Feed tab.
- List tab = one long scroll (spots, best spot, suggestions, weather, moon).
- Profile card mixes profile editing with alert settings and the Home Screen install help.
- `index.html` is one 630 KB / 9,600-line file (56 `// ---- ` sections). Costly and risky to edit.

## Target layout
- **Bottom bar (5 slots):** 🏠 Home · 🗺 Map · ➕ Log (big centre button = the existing quick-catch) · 👥 Community · 📊 Stats
- **Top right: your picture → "Me" menu:** Profile, Settings, Alerts (badge), Invite (admin), Refresh, Sign out.
- **Community** (sub-tabs): Feed (circle / public) · Friends · Messages (unread badge) · Groups · Compete · Who's going.
- **Stats:** Insights · Seasons · Records · Year in review · Tackle box.
- **Home ("Today"):** conditions strip (tide, wind, water temp, moon), best spot, suggestions, then My spots with search/filter.
- **Settings page:** alerts + quiet hours, privacy (profile visibility), units, offline maps, install-to-Home-Screen help, what's new.

## Order of work (each step = tested, shown to Richard, committed on his "Commit")
1. ✅ DONE — **Navigation shell** — bottom bar + Me menu + Community hub. Old tab buttons stay in the page (hidden) and the new buttons call the same `showView`, so all existing tests keep passing. Phone check: every old feature still reachable in ≤2 taps.
2. ✅ DONE — **Split the file** (invisible to users). Plain `<script src>` files that share one scope (no build step, still $0): `css/app.css`, then `js/01-core.js … js/NN-*.js` following the `// ---- ` sections. Move 3–4 sections per step, run all checks each time. Needs: `sw.js` precache list, tests' html loader (inline the files), CLAUDE.md "where things are" map.
3. **Home / Today screen** — regroup the List tab; collapse Best spot + conditions into a strip; spot list with sticky search.
4. **Settings page** — move alerts/privacy/offline/install out of the Profile card; Profile becomes just the profile.
5. **Polish pass** — remember last tab/filters; friendlier empty screens with a next step; in-app pop-ups instead of browser `confirm()`/`alert()`; clear offline + loading messages; bigger tap targets; unread badges; quick accessibility check (labels, contrast, dark mode).

## Rules for this work
- No feature is removed; anything that moves keeps working from its old deep link (`?go=…`).
- Keep element ids used by tests until the tests are updated in the same step.
- Each step ends with `sh run-all.sh` = ALL OK, a plain-language "what to tap" list for Richard, and a `WHATS_NEW` line only if people will see a difference.
