# Phone test session 1 — tick list (sprint #7)
_Tester + Richard · drafted Oct 16, 2026 · covers v114–v120 · about 20 minutes · **run by Richard Oct 17** (results at the bottom)_

**How to use it:** open the app on your phone (close and reopen it first so you have v120), go down the list, and tick each line. If something looks off, write the line number and what you saw — a screenshot helps. Items marked 🧑‍🤝‍🧑 need a second account (a friend or a test account); skip them if you can't and say so.

## A. Screen intros and the ? button (v117) — PASSED
- [x] A1. Tap each bottom tab in turn (Home, Map, Play, Compete, Community, Stats). On each one, tap the **?** next to your picture. That screen's intro card comes back, with an arrow pointing at something.
- [x] A2. Tap **Got it**. The card closes and does not come back by itself when you leave the screen and return.
- [x] A3. Open **Me** and then **Settings**. Each page has a **?** in its header, and it brings back that page's card.
- [x] A4. The **?** sits in the same corner on every screen and is easy to hit with your thumb.
- [x] A5. 🧑‍🤝‍🧑 With a brand-new account: each tab's card appears once on first visit, and the fish-ID/measuring tip appears once after the first photo.

## B. "Spot" wording (v118) — PASSED
- [x] B1. Find new water: the intro text says "spot" where it means a fishing spot.
- [x] B2. 🧑‍🤝‍🧑 On a new account with no spots, the empty box says "No spots yet".
- [x] B3. Boat mode check-in: the label says "spot", not "place".
- [x] B4. Nothing you tap says "place" when it means your own fishing spot (✅ official places are the one exception, on purpose).

## C. Red 🚫 no-fishing warnings (v118) — PASSED
Switch the app's area to a place with a protected zone (for example the Keys), or look for a spot inside one of the red zones on the map layer.
- [x] C1. **Home** (Best spot today / suggestions): a spot inside a no-fishing area shows the red 🚫 line, and the spot is still in the list.
- [x] C2. **Find new water**: same red 🚫 line, spot still listed.
- [x] C3. **Plan a trip**: same red 🚫 line when you pick that spot, and you can still keep going.
- [x] C4. A normal spot outside any zone shows no red line anywhere.

## D. Club / business pages: requests, renames and alerts (v118–v119) 🧑‍🤝‍🧑 — FAILED (alerts)
Needs a page owned by a second account, with you as admin. (D7–D8 added after the first run.)
- [x] D1. As the owner: tap **Request a rename**, type a new name, send. It shows as waiting.
- [ ] D2. As admin: you get a phone alert. Tapping it opens the Invite / requests screen with the request on it. **FAILED — the alert existed, but its link doesn't work.**
- [x] D3. Approve it. The page now has the new name. _(done by hand from Me › Invite)_
- [ ] D4. As the owner: you get a phone alert about the decision. Tapping it opens your page. **FAILED — owner got nothing, not even in the inbox.**
- [ ] D5. Send a second request and decline it. The owner gets an alert and the name stays the same. **NOT TESTED** (only one request exists).
- [ ] D6. Send a request and cancel it as the owner. Nobody gets an alert. **NOT TESTED.**
- [ ] D7. As the owner: ask for a **new club or business page**. As admin, you get a phone alert and an inbox line; tapping it opens Me › Invite with the request. **FAILED — no alert exists for this yet (to be built).**
- [ ] D8. Approve or decline that page. The owner gets a phone alert and an inbox line; tapping it opens the page (or the pages list if declined). **NOT BUILT YET.**

## E. Statewide ramps, parks, piers and tides (v114–v116) — PASSED (finding a spot on the map is a pain)
For each area, switch the app's area (Find new water → look in that area), then check. Try at least one Atlantic area, one Central area and one Panhandle area. Examples: Jacksonville, Orlando, Pensacola or Panama City.
- [x] E1. Find new water shows ✅ Official boat ramps and parks/piers, labeled "check before you go".
- [x] E2. Tide times look right for that area's local clock. Compare one with a tide chart or NOAA's website.
- [x] E3. In the Panhandle (Pensacola, Panama City): tide times are on **Central** time, not shifted by an hour.
- [x] E4. Water temperature shows for areas that have a station (Jacksonville, Pensacola, Panama City). Where there is none, the app says so and does not show a wrong number.
- [x] E5. The page footer credits FWC for ramps and FDEP for parks, piers and jetties, with "reference only, not for navigation".

## F. Weather page and refresh (v120) — PASSED
- [x] F1. Home → tap the weather strip → scroll down, then swipe down to scroll back up. It stays on the weather page.
- [x] F2. The pressure line shows a reading and a trend (↗ ↘ →).
- [x] F3. Back on Home, pull down from the very top. Pull-to-refresh still works.

## Wrap-up
- [x] Anything felt slow, odd or confusing? See results below.
- [ ] After this session: fix the alert problems, re-run D1–D8, then re-run the usage counts (Researcher) and plan session 2.

---

## Results (Oct 17, Richard's report + Designer's check of the code and the database)
**A, B, C, F passed. E passed.** Richard on E: finding a spot on the map is a pain, and he wants the official public spots as their own map layer → designed in `claude/map-official-layer.md`.
**D failed.** Richard: the **club page request** never gave him an alert (he was inside the app at the time and saw nothing); tapping the notification or the alert inbox did not open the rename approval; the test account never got any alerts, and its alert settings aren't turned on but it should still get them in the alert inbox.

**What the check found (read-only; nothing was changed):**
1. **Links inside the rename and problem-report alerts are broken.** The rename-request alert (`./?go=invite`), the rename-decision alert (`./?go=pages&id=…`) and the problem-report alert (`./?go=problems`) are written with a leading `./`. The phone tap handler (`sw.js`, notification click) only accepts links that start with `?`, and the alerts inbox (`js/10`, inbox rows → `handleGo`) reads the link as if it started with `?`. So tapping from the phone or the inbox opens the app and goes nowhere. Other alerts (contest, feed) use the `?go=` form and work.
2. **The inbox only holds an alert if the phone would also have been pinged.** The alert queue (`enqueue_notification`) quits before saving anything when the person has no phone registered or has that alert type switched off. The test account has no phone registered, so its inbox got nothing. (Nobody has Friends & messages switched off today.)
3. **A new club or business page request sends no alert at all, and neither does approving or declining it.** Only the badge on Me › Invite counts it (setup/56–58 have no alert for it). That is why Richard saw nothing.
4. The **rename-request** alert did reach Richard's phone (database: created, "sent 1, failed 0") but with the broken link. The two rename triggers from setup/75 are in place. There is one rename request in total (approved), so D5 and D6 were never run.

## Engineer fix note (small steps, each checkable on the phone)
**Step 1 — make alert links work.** Make both places (phone tap handler in `sw.js` and the inbox rows) accept `./?go=…` as well as `?go=…`, and fix the three alert texts in the database so new alerts use the same form as the others; fix the existing saved one too. Add a test that opens each of the three alert links. *Phone check:* Me › Alerts, tap the old rename alert, you land on Me › Invite with the request section.
**Step 2 — inbox for people without alerts on.** Save the inbox row whenever an alert is addressed to a person; only skip the phone ping when they have no phone or have that alert type switched off. Keep the current rule that a switched-off alert type is not saved (that is the person's choice). The existing alert tests must stay green. *Phone check:* with the test account (no phone alerts), approve a rename as admin; the test account's Alerts list shows "Your page has a new name" and tapping it opens the page.
**Step 3 — alerts for club and business page requests.** A new page request sends every approved admin "🏷 New page request" (tap → Me › Invite). Approving or declining it sends the owner an alert (tap → the page, or the pages list if declined). Same pattern and "Friends & messages" category as setup/75; a failed alert must never block the request or decision. *Phone check:* D7 and D8.
**Step 4 — re-run D1–D8** with the test account, then session 2.
Do not start the admin-controls plan until these are done; the admin log and admin alerts rely on the same inbox.
