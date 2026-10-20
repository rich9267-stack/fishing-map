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

## Now (Oct 20, v143 live; details of every version in docs/feature_notes.md and docs/build_history.md)
**State:** the app is invite-only. Everything planned so far is built: UX v2, host pages, Gulf + Keys + Atlantic + Panhandle data, red tide, regional rules, protected zones, official public spots layer, tutorials, color palettes, delete my account (setup/54 applied), admin controls (plans/admin-controls-plan.md; powers, log, undo, warnings, hide, fix official places, locked coin corrections), draft terms.html + required 'I agree / 18+' box + one-time Terms banner (setup/89), security hardening (docs/security.md; setup/67 and 90 applied; CAPTCHA, Confirm email, 2-step all done).
**Dropped on purpose (Oct 18):** private-spot view, reported-chat review, monthly totals, delete-a-person's-data (would break privacy promises). Unused database pieces were left in place (plans/step9-open-questions.md; safest = change nothing).
**POSTPONED until Richard is paid (~late Nov 2026):** lawyer/accountant review of terms.html and privacy.html. Keep the app invite-only (no strangers) until then. After review: update the texts, bump TERMS_VERSION in js/49 so members re-agree.
**On hold:** tank artist work (tank step 9; paid style packs hidden) until Richard says go; SFWMD gate data. Settled: page tournaments pay no prizes / no Hall of Fame; no per-person caps.
**Known small leftovers:** phone alerts about new page requests go to every admin; a report keeps up to 200 letters of the reported message for admins.
**Every database change:** follow plans/database-change-rule.md. After adding a function, check no 'anon'/PUBLIC execute grants remain (docs/security.md).
