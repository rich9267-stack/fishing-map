# Fishing Map — working notes (keep SHORT; details in docs/)

Owner: Richard (Pompano Beach, no programming experience). Plain language, small steps he can check on his phone. Budget $0. Live: https://rich9267-stack.github.io/fishing-map/ · repo rich9267-stack/fishing-map · Supabase `euxcisnyansdrzzjyvsl` · plan doc = Project doc `claude/fishing-map-plan.md`.

## Rules
- Code: `index.html` (HTML only), `css/app.css`, `js/NN-*.js` (plain scripts, one shared scope, loaded in order), `sw.js`. NEVER read a whole js file: `grep -n "// ---- " js/*.js`, then Read that range. Which file holds what: `ls js/` names say it; details in `docs/code_map.md` (read only if needed).
- Startup calls live in `js/99-boot.js` (functions aren't hoisted across files). New feature = new `js/NN-name.js` + `<script>` tag in index.html + `APP_FILES` in sw.js (or add to the file whose topic fits).
- Database: apply as a Supabase migration, save SQL as next `setup/NN-name.sql`; test with pretend users in `begin; … rollback;`. The connector silently cancels destructive-looking SQL (truncate, revoke, delete, update without where) — write around it or ask Richard to run it in the SQL Editor.
- Checks: `cd tests && sh run-all.sh` (needs ALL OK; `npm install` first time). New test: copy the head of the newest testNN.js (fakes Supabase + web APIs), add it to run-all.sh. While building run only the new test; full suite once before commit.
- Ship: `sh bump.sh`, add a `WHATS_NEW` entry (js/13) for anything people see, one entry in `docs/build_history.md`.
- Commit: only when Richard says "Commit", or when he asked to "build and commit" — then commit + push after ALL OK and check `gh run list --limit 1` = success before telling him. Trailers: see the session reminder.
- Token saving: keep replies short (what changed + how to check on the phone). After every finished feature, end with a ready-to-paste prompt for a NEW session for the next item.
- Keep this file and README.md short.

## Now
UX v2 (layout + navigation; design = Design canvas "Fishing Map — New Layout" in Richard's artifacts). Steps 1–4 done (v87 bar; v88 short Home + Map sheets, js/25; v89 Stats + Community sub-tabs, js/26; v90 Me page + 🔍 Find anything, js/27). Step 5 polish done (v91: Find remembers searches, empty-state buttons, tap sizes). UX v2 complete; v92 = Map tidy-up + tappable names + suggestions v2; v93 = want-to-try / not-interested sync across devices (setup/55 applied) + tappable names on species records and photo captions. v94 = tappable names in the Messages list. v95 = screen-reader pin labels on the trip-review map (the only item left on the map screen-reader list is the tank). Artist work (tank step 9) is ON HOLD until Richard says go. #5 delete my account needs setup/54 pasted in the SQL Editor by Richard. On hold: SFWMD gate data.
