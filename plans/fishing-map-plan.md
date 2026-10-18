# Fishing Map — Project Plan

_Last updated: October 15, 2026 (team meeting + Legal/Accounting review)_

## Purpose
A map that helps anglers decide where to fish in Florida today (home waters: Pompano Beach), by showing saved spots alongside current tide, wind, weather, barometric pressure, and moon/solunar times. Started for Richard and his friends; **going public and making money as soon as it is safe (decided Oct 15).**

**Live site:** https://rich9267-stack.github.io/fishing-map/ · **Code:** github.com/rich9267-stack/fishing-map · **Database:** Supabase project `euxcisnyansdrzzjyvsl` (East US, free tier; Claude connected via the Supabase connector) · **Privacy page:** https://rich9267-stack.github.io/fishing-map/privacy.html

## Status
**V1–V3 complete. V4 (Steps 1–8) and the social expansion (A–F) are done**, plus morning bite alerts, monthly repeating tournaments, severe-weather alerts + 🛟 check-in, roadmap items C–E, weekly summary, tackle box, what's-new popup, plan-a-trip map spot picker, invite-friends fix, v112 free color palettes. **Now: 2-week finish-and-polish sprint (Oct 16–29).** On hold: SFWMD gate data, only if the key ever arrives.

## Team meeting decisions (Oct 15)
- **2-week sprint (Oct 16–29):** finish unfinished features and polish. The only new additions: **statewide Florida data** (official spots, public lakes, depth lines, tide stations for Panhandle, Central and Northeast Florida).
- **Go public + monetize** as soon as the "safe to go public" list below is done. This **changes** three old rules: $0 budget, Richard approves every account, and "no real money anywhere."
- **Core app stays free** (our edge over Fishbrain); money only from extras. No subscription.
- **Three currencies:** 🪙 coins (earned, shop + races) · 💎 gems (earned only, never sold) · 🏴‍☠️ **doubloons (bought with real money, cosmetic only)**. Doubloons can buy: artist style packs, premium tank decorations / fish skins, extra tanks, profile frames/banners, catch-card borders. Doubloons can **never** buy race entries, coins, gems, or anything that changes Power. Show the real-money price on every doubloon button; add a spending-limit setting.
- **Business plan first** (CEO + Researcher draft as a doc): what we sell, prices, costs, break-even, and setup (Florida LLC, EIN, business bank account, sales tax on digital items, payment service with hosted checkout). Book one paid hour with a local accountant before filing.
- **Fish ID at scale:** we pay for Gemini (default for everyone, keep 30/day per person). Plus **"Use my own AI"** in Settings as an advanced option, after launch: Gemini first, then ChatGPT, then Claude. Users need an API key (a ChatGPT/Claude/Gemini *subscription* is not enough). Key stays on the phone only, never saved by us; "remove my key" button; every answer still mapped to our species list; each AI tested with real fish photos. Own-key use has no daily limit (their cost). Supports the "no subscription" story: *Free Fish ID, or use the AI you already trust.*
- **Tutorials:** a short first-time tutorial on every screen, shown once, with a **?** help button to bring it back. (Replaces the "simple mode" idea.)
- **Art:** snook trial only for now; Richard is asking around for local amateur artists.

## Legal + Accounting review (Oct 15) — not a lawyer/CPA; confirm with professionals
- **Doubloons (lesson from the FTC's Genshin Impact case):** show the dollar price next to every doubloon price; **no mystery/random items** for doubloons; **18+ to buy** (accounts stay 13+); doubloons can never become coins (coins pay race pots).
- **Fish ID privacy now:** on Gemini's free tier Google may use photos to improve its products (human reviewers may see them); the paid tier does not. Privacy page must say this until we switch to paid; own free-key users get the same warning.
- **Terms of use** before anyone pays: virtual items have no cash value, purchases final / refund policy, account bans, own-AI-key users pay and follow that company's rules.
- **Artist contract** must transfer art rights to the LLC (lawyer reviews before signing).
- **Brand name:** "Fishing Map" is too generic to protect; pick a real name + conflict check before marketing.
- **DMCA agent** (copyright takedown contact) registered with the U.S. Copyright Office — users upload photos.
- **Business setup order:** Florida LLC ($125 at Sunbiz) → EIN (free, IRS) → business bank account → Stripe. Annual report $138.75, due Jan 1–May 1 ($400 late fee). Keep business money separate.
- **Pricing:** Stripe 2.9% + 30¢ per card ($15 per dispute) → smallest doubloon pack **$4.99** (a 99¢ item loses ~33% to fees).
- **Taxes:** Florida likely doesn't tax electronically delivered items (confirm with CPA; other states may once sales grow). Set aside ~25–30% of profit; quarterly estimated taxes. Accounting starts a bookkeeping sheet the day the LLC exists.
- **Lawyer for:** artist contract + one review of terms and privacy page. **Accountant:** one paid hour before filing.

## 2-week sprint
| # | What | Who |
|---|---|---|
| 1 | Security checklist done (setup/67, 2-step sign-in, secret scanning, confirm email) | Richard + Security |
| 2 | Weekly database backup Richard can open | IT + Engineer |
| 3 | Extra tests for everything that moves coins (race fees, refunds, pot split) | Engineer |
| 4 | Statewide Florida data | Researcher + Engineer |
| 5 | Screen tutorials + ? help button | Designer → Writer → Engineer |
| 6 | Wording pass (spots/places, trips/sessions), privacy page recheck (incl. Fish ID photos go to Google), unfinished bits (no-fishing warnings in Plan a trip / Find new water / Home, trophy cups for tournament wins, page renaming) | Writer + Engineer |
| 7 | Two phone test sessions with a tick list | Tester + Richard |
| 8 | Usage numbers summary (active users, catches/week, tank & race use) | Researcher |

## Safe to go public when
1. Security checklist done and backups working.
2. Coin/race tests pass and phone tests ticked.
3. Privacy page + simple terms of use match what the app does.
4. Sign-ups at scale: CAPTCHA + confirm email replace manual approval.
5. Supabase limits checked for more users (photo storage, ~500 emails/day, chat).
6. Business set up (LLC → EIN → bank account → Stripe) before taking any money.
7. Paid Gemini Fish ID switched on (privacy page updated now in the meantime).
8. Doubloon rules in place: 18+ to buy, dollar prices shown, no mystery items, no doubloons → coins.
9. Terms of use written + lawyer review of terms and privacy page.
10. Artist contract transfers rights to the LLC (before any paid pack).
11. Brand name picked + conflict check; DMCA agent registered.

## Key decisions
| Topic | Decision |
|---|---|
| Who it's for | Richard + friends now; public Florida anglers after the sprint and safety list (Oct 15) |
| Main job | Pick where to go today (spots + conditions) |
| Area | All of Florida (statewide data in the sprint); works anywhere NOAA has tide stations |
| Devices | Phone (on the water, usually from the home screen) and computer — a website that works well on both |
| Access | Invite-only today (Google or email + password); open sign-up with CAPTCHA + email confirm when public. Signing in is required to see anything. |
| Editing | Everyone edits/deletes only their own spots, catches, and photos |
| Private spots | Owner-only; their catches and photos are hidden too |
| Budget | Was $0; **changing (Oct 15)**: small costs allowed once there is revenue (paid Fish ID, domain, artists, LLC fees). Business plan sets the numbers. |
| Money | Core free, no paywall, no subscription, no ads planned; doubloons for cosmetics (smallest pack $4.99); style packs paid |
| Looks | Free color palettes for everyone (v112); artist-made regional style packs (Cowboy, Southern, Florida, Northeast, Midwest anglers) as paid unlocks later |

## Finished work (details: `docs/plan_history.md` and `docs/build_history.md` in the repo)
- **V1** — tides, wind/weather, shared spots, catch log, map, suggested spots.
- **V2** — invite-only logins, private spots, filters, photos, quick catch (offline), insights, Best spot today, tide stations, Google sign-in.
- **V3** — water temperature, satellite layers, Seasons tab, public sightings, tap-to-measure, free fish ID (Gemini).
- **V4** — trips & skunks, 3-day spot forecast, catch feed, "Who's going?", leaderboards & contests, phone alerts, map extras, Boat mode, weather safety + check-in.
- **Social A–F** — Private / Friends / Public levels, friends, access requests, public section, chat, report/block. Public pins blurred 100–400 m with a secret salt; owner can hide the exact spot from friends.
- **Later** — UX cleanup (bottom bar, Home, Settings, file split, polish), tank simulator steps 1–8, fish ranks + races, Fishbrain audit items 1–12, Host pages, Gulf + Keys, security work, official places, color palettes, Fish ID Gulf/Keys.

## Tools in use
| Piece | Tool | Notes |
|---|---|---|
| Website | GitHub Pages (free) + service worker for offline | Repo rich9267-stack/fishing-map |
| Accounts, spots, catches, photos | Supabase (free tier) | 1 GB photo storage ≈ 3,000 photos; free tier has no self-restore backups → weekly export (sprint #2) |
| Sign-in | Supabase Auth: email + password, Google | Google Cloud project "Fishing Map" |
| Email | Gmail SMTP via app password | ~500/day limit — needs a real email service before going public |
| Map | Leaflet + OpenStreetMap; Esri satellite imagery | Free |
| Tides / weather / water / canals | NOAA, National Weather Service, USGS, Open-Meteo | Free public data |
| Phone alerts | Web push via edge functions `send-push`, `morning-bites`, `weather-watch` + pg_cron | Free |
| Satellite layers | NOAA CoastWatch ERDDAP | Free |
| Map extras | NOAA chart service, FWC reefs / ramps / lakes / depth lines, marine protected areas | Free public GIS |
| Public sightings | iNaturalist API | ~1 request per spot area every 6 hours |
| Fish ID | Google Gemini API via Supabase Edge Function | Free tier today → paid before launch; "Use my own AI" (Gemini → ChatGPT → Claude) after launch |
| Payments (planned) | Stripe hosted checkout | 2.9% + 30¢ per card; needs LLC + EIN + business bank first |
| Moon & solunar | SunCalc | |
| Photo details | exifr | |
| Suggested spots | OpenStreetMap via Overpass API | Cached 7 days per area |

## Build approach
Small steps, each one something Richard can open on his phone and check before moving on. Keep this doc short: when a step is finished, change its row to ✅ with a one-line note and put the detail in the repo's docs/build_history.md.

## Saved for later
- Custom web address (about $10–15/year) — likely needed before going public
- Sign in with Apple (needs $99/year Apple Developer membership)
- **Paid artist style packs**: find artists, signed rights-transfer contract, set prices, add payments (doubloons); then show the locked tiles under Colors.
- "Use my own AI" for Fish ID (after launch: Gemini, then ChatGPT, then Claude)
- **On hold:** SFWMD canal gate data (client ID/secret requested Oct 8, no reply).
- Auto-detecting the reference object in the measure tool

## Open questions
- Doubloon prices and pack prices (business plan; smallest pack $4.99).
- Brand name for going public.
- Public race rooms once strangers join?
