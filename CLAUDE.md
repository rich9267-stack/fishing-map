# Fishing Map — working notes (keep this file SHORT; details go in docs/)

Owner: Richard (Pompano Beach, no programming experience). Explain in plain language, small steps he can check on his phone. Budget $0. Live: https://rich9267-stack.github.io/fishing-map/ · repo rich9267-stack/fishing-map · Supabase project `euxcisnyansdrzzjyvsl` · plan doc = claude.ai Project doc `claude/fishing-map-plan.md`.

## Rules
- NEVER read `index.html` whole (~300 KB, ~80k tokens). Find the part with `grep -n "// ---- " index.html`, then Read only that range.
- Whole app = `index.html` (HTML + CSS + one script) + `sw.js` (offline cache; bump its cache name when shipping). Libraries load from CDN.
- Database changes: apply as a Supabase migration, then save the SQL as the next `setup/NN-name.sql`. Test rules with pretend users inside `begin; … rollback;`.
- Deploy: `git push` to main → GitHub Pages. Check `gh run list --limit 1` says success before telling Richard.
- Checks: `cd tests && npm install` (first time), then `sh run-all.sh` (needs ALL OK). Copy the newest `tests/test34.js` as a template for a new one; it fakes Supabase and the web APIs. Exit code 0 = no crash; read the printed lines for correctness.
- Don't commit until Richard says so. Git commit trailers: see the session reminder.
- Keep this file and README.md short. New step details → `docs/build_history.md`; only update the one-line status in README and the plan doc.

## Where things are in index.html (search the marker text)
`// ---- Wind & weather` · `Shared spots` · `Per-spot conditions` (tide stations) · `Water temperature` · `Photos` · `Catch insights` · `Records` (leaderboards) · `Seasons calendar` · `Public sightings` · `Quick catch` · `Offline` · `Fishing trips` · `Filters` · `Catch log` · `Conditions at any date` · `Length and weight` · `Tap-to-measure` · `Fish ID` · `Catch feed` · `🌎 Public` (Public mode of the Feed tab, profile pages, "Public spots" map toggle) · `"Who's going?" plans` · `Best spot today` · `3-day outlook` · `Map view` · `Suggested spots` · `Satellite layers` · `Sign-in` · `Friends` · `Profile` · `Messages` (chat) · `Safety` (report/block) · `Contests` (🏁 tournaments + catch_geo) · `Phone alerts` (web push, handleGo) · `Welcome flow` · `Trip review` (📖, trip_review rpc) · `Map extras` (chart/reefs/ramps/zones) · `Boat mode` · `📏 Keeper checker` (fish_rules, admin editor) · `More insights` (bait/heat map/tide graph) · `🛟 Safety` (NWS weather banner + check-in/float plan, edge fn `weather-watch`) · `Hall of Fame` (hall_of_fame rpc, profile trophies) · `Alerts inbox` · `Share card` · `Year in review` (badges) · `🧰 Polish (D)` (spot search/sort, undo delete, CSV export, offline map tiles, admin dashboard) · `Invite list` (+ access requests) · `Refreshing`.

## Social model (V4.5)
`visibility` private|friends|public on spots and catches; app reads spots via view `spots_visible` (blurred pin for non-friends); tables friendships, profiles, members.status (approved|pending|blocked). Details: `setup/13-15*.sql`, `docs/build_history.md`.

## Pending
Social A–F, leaderboards and 🏁 Contests (official + friend competitions) done; phone alerts (round 1: social/contests/trips) done; overtaken alerts, quiet hours, trip photos, group chat, map extras and boat mode built; morning bite alerts built (edge fn `morning-bites`, cron every 10 min); monthly repeating tournaments built (series_roll cron); follow ⭐ spots, keeper checker and extra insights built; Hall of Fame, share card, alerts inbox, year in review + badges built (roadmap C); severe weather alerts + 🛟 check-in built (`weather-watch` cron 10 min, `float-check` cron 5 min); polish D (roadmap 11) built incl. blur-for-review after 3 reports; remaining: SFWMD gate data, measure-tool rework (E). SFWMD gate data waiting on Richard's key (he saves secrets in Supabase himself, never in chat).
