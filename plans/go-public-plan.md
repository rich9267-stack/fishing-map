# Go-public plan — full team meeting (Oct 19, 2026)
_Chaired by the Manager. All 12 roles seated (Product = CEO + Designer; Support/Community = Marketing + Writer). Planning only: nothing was built, no file or database was changed. Not a lawyer, not a CPA._

**Read for this meeting:** CLAUDE.md, docs/security.md, plans/step9-open-questions.md, plans/database-change-rule.md, docs/roadmap.md, docs/parked_ideas.md, plus terms.html, privacy.html and the progress log.

**Facts:** v140 live, invite-only, $0 budget. New job Oct 27, first pay ~late Nov. Lawyer + accountant review waits for that pay. Security checklist done. Members 18+. No privacy promise may be broken.

## The big idea (agreed)
1. **Keep manual approval when we go public.** Strangers ask for an account; Richard approves them in small waves. That keeps the privacy page true ("the organizer approves each person"), and "stop approving" is an instant brake.
2. **Prepare everything the lawyer needs now, for free.** On money day the lawyer reads one packet, we change the wording once, members re-agree once, and wave 1 can start within days.
3. **Go public free first. Money features (doubloons, payments, artist packs) come later**, after a separate decision.
4. **Use the week before Oct 27 for the tasks that need Richard's hands.** After that, Claude does the work and Richard only checks.

---

## Round table
**Missing** = still missing or risky for going public · **Free now** = can do before late Nov · **Waits** = needs money or the lawyer/accountant

### CEO (business, Product)
- **Missing:** the Oct 15 plan said "go public + make money"; today the budget is $0. Going public and making money are two separate steps now. Mixing them would mean an LLC, Stripe and tax setup before a single stranger has tried the app.
- **Free now:** a one-page "money day shopping list" (what we pay for, rough cost, what can wait). Decide the order: review → waves → money features much later.
- **Waits:** lawyer review (rough guess $300–1,500, flat fee vs hourly), accountant hour (rough guess $100–300). Recommend: skip the LLC until you decide to sell anything (the lawyer must confirm this; see disagreement below).

### Manager (plan, order)
- **Missing:** `plans/progress-log.md` still describes Oct 17 ("alert fix next", "sprint Oct 16–29"); CLAUDE.md says all of that is built. Stale logs cause wrong next steps.
- **Free now:** refresh the progress log to v140 (small, no code). Keep the ranked list below as the only to-do list until money day.
- **Waits:** booking the lawyer appointment (Richard, once paid).

### Researcher
- **Missing:** the costs above are guesses; free-tier limits for more users are not checked recently (Gmail ~500 emails/day, Gemini free daily limit vs 30 Fish IDs per person, Supabase 1 GB photos / 500 MB database).
- **Free now:** confirm real prices (lawyer flat fees in Broward/Palm Beach, DMCA agent fee, domain); check 3 name ideas for conflicts (US trademark search, Florida Sunbiz, app stores, web address free?).
- **Waits:** nothing.

### Designer (Product, screens)
- **Missing:** a stranger's first 5 minutes have never been tested end to end with a fresh account (ask for account → wait → approved → tutorials → first catch).
- **Free now:** help the Tester write that "stranger rehearsal" tick list; note any screen that confuses a newcomer.
- **Waits:** custom logo/brand look for a new name (only if a new name is chosen; artists cost money).

### Writer (text, Support/Community)
- **Missing:** no welcome message, no short "how to get started" help, and the terms say "contact the organizer" with no way to do it for a stranger.
- **Free now:** draft the invite text for each wave, a welcome note for newly approved people, and the proposed new terms/privacy lines (as a draft for the lawyer, not live yet).
- **Waits:** final wording after the lawyer.

### Engineer
- **Missing:** nothing must be built to go public. Risk: building new features now adds things the lawyer must read.
- **Free now:** run the full checks and the security test; read Supabase usage numbers; make the weekly backup include photos; help IT practise a restore into a spare free Supabase project.
- **Waits:** applying the lawyer's wording (bump the terms version so members re-agree once).

### Tester
- **Missing:** phone test session 2 was never done as a full "stranger" run (email sign-up, Google sign-up, confirm email, robot box, "I agree / 18+" box, pending screen, approval, first catch, report, block, delete account).
- **Free now:** one tick list, ~25 min, run by Richard **this week** with the test account.
- **Waits:** a second, shorter run on go-public day after the wording change.

### IT
- **Missing:** the backup has never been **restored**, so we don't know it works as a way back. Photos (~16 MB) are not backed up, and there is only one copy (Richard's computer).
- **Free now:** add photos to the weekly backup; practise one restore into a spare free Supabase project and compare counts; Richard picks a private second place for a copy (for example his personal Google Drive — never the public GitHub).
- **Waits:** nothing. (The weekly backup still needs the computer on Sunday 8:47 AM.)

### Security
- **Missing:** Google sign-in: if the Google Cloud "Fishing Map" project's sign-in screen is still in **Testing**, strangers can't use "Sign in with Google". App email comes from Richard's personal Gmail.
- **Free now:** re-run the audit (Supabase Advisors + `test122`) now and again right before wave 1. Richard checks the Google sign-in screen status (10 min). Richard makes a free separate Gmail for the app (sender + contact address).
- **Waits:** paid Gemini for Fish ID (stops Google using photos; rough guess: a few dollars a month at this size). Until then the privacy page already warns, so no promise is broken.

### Marketing (Support/Community)
- **Missing:** "Fishing Map" is too generic to protect, and renaming after strangers install it to their home screen is messy.
- **Free now:** 3 name ideas + free checks (with Researcher); a waves plan (who to invite first: friends of friends, one local club or pier group, then one local Facebook group).
- **Waits:** domain (~$10–15/year) and trademark (optional, later, roughly $350 per class).

### Legal
- **Missing:** the draft terms have no lines for **coins and gems** ("no cash value, can be adjusted, never bought or sold") or **contest/race rules** (no purchase needed, coin prizes only, coin entry fees in friend races). No contact address. No copyright-takedown contact (DMCA agent) although members upload photos. Nothing is lawyer-approved.
- **Free now:** build a **lawyer packet**: current terms + privacy, proposed changes, and a short question list. Changes stay in the packet until the lawyer agrees, so members re-agree only once.
- **Waits:** lawyer review; DMCA agent registration (about $6 — Researcher confirms).

### Accounting
- **Missing:** no money comes in, so there are no books to keep yet. The questions are about *when* to start.
- **Free now:** a simple expense sheet ready for money day (lawyer, domain, Gemini); a short accountant question list.
- **Waits:** accountant hour, only if Richard still wants it before selling anything.

## Disagreements (named plainly)
- **LLC timing.** Legal: an LLC can protect your own money if a stranger blames the app (a bad tide time, a closed ramp). CEO: no income, so $125 + $138.75 a year buys little yet. **Decided by:** the lawyer's answer (it is on the question list). The as-is clause already helps.
- **Name before or after going public.** Marketing + Engineer: pick it before wave 1 (renaming later breaks home-screen installs and needs the terms changed again). CEO: don't spend on it yet. **Agreed:** choose the name for free now; buy the domain on money day.

---

## Ranked free tasks (next 5–8)
| # | Task | Who | Size | How Richard checks on his phone |
|---|---|---|---|---|
| 1 | **Stranger rehearsal** — one tick list, run with the test account **before Oct 27** (email + Google sign-up, robot box, confirm email, "I agree / 18+", pending, approval, tutorials, first catch with photo, report, block, delete account) | Tester + Designer write it; Richard runs it | Medium | Ticks every line; anything off → line number + screenshot |
| 2 | **Dashboard check (10 min, before Oct 27)** — Google sign-in screen status (Testing or In production); make a free app Gmail for sending + contact | Richard, IT guides | Small | A "Sign in with Google" test from a second Google account works |
| 3 | **Pick the name** — 3 ideas, each with free conflict checks | Researcher + Marketing | Small | One-page doc; Richard picks one or keeps "Fishing Map" |
| 4 | **Lawyer packet** — today's terms/privacy, proposed lines (coins/gems, contests/races, contact, DMCA, name), questions for the lawyer and accountant | Legal + Writer + Accounting | Medium | Reads the one-page question list; nothing in the app changes |
| 5 | **Free-limits + security check** — Supabase usage, Gmail, Gemini daily limit, chat; advisors + test122 | Researcher + Engineer + Security | Small | One traffic-light table (green / yellow / red) |
| 6 | **Backup: photos + one practice restore + second copy** | IT + Engineer | Medium | Push says "BACKUP OK" with photos; restore note says counts match |
| 7 | **Welcome kit + waves plan** — invite text per wave, welcome note, short "how to start" help | Writer + Marketing | Small | Reads the texts; sends the wave-0 text to one friend |
| 8 | **Money-day list + progress-log refresh** — costs, order, expense sheet; log brought to v140 | CEO + Accounting + Manager | Small | Reads one short list |
| 9 | **UI/UX review, one more time** — walk every main screen as a stranger would; list what is confusing, crowded or hard to tap; Richard picks which fixes to make (small fixes only, nothing new) | Designer (+ Tester) | Medium | Reads a short list of screens with a "fix / leave" choice per item; then checks each fix on the phone |

| 10 | **Supabase warnings** — fix in 3 small, invisible steps (see below) | Engineer + Security | Medium | Supabase → Advisors count drops; app works the same on the phone |
| 11 | **Speed + code cleanup** — measure first, then remove dead code, shrink what loads first; no feature changes | Engineer + Tester | Medium | App opens as fast or faster; full phone tick list still passes |

Tasks 1–2 need Richard's time, so they go first (this week). Task 9 fits well right after task 1, while the stranger run is fresh. Tasks 3–8 are mostly Claude's work after Oct 27.
**Suggested build order for 9–11:** 10 (invisible, safe) → 11 (cleaner code makes the screen fixes easier) → 9 one screen at a time.

### Task 9 — Richard's UI/UX list (Oct 19)
1. **Home** feels cluttered once more than 5 spots are saved.
2. **Map** page: Richard doesn't like the scrolling.
3. **Compete** needs a tournament leaderboard. (Oct 16 note: standings already sit inside each contest; Richard wants a clear leaderboard view.)
4. **Play** section feels rudimentary.
5. **Community** public feed filters take up too much screen space.
6. **Tackle box** feels rudimentary.
Designer turns each into 1–3 options with a mockup; Richard picks; Engineer builds one at a time. Keep 4 and 6 to polish of what exists (no new game systems or coin rules), so nothing new lands on the lawyer's or Tester's desk.

### Task 10 — Supabase warnings (read Oct 19, about 300 lines in 10 kinds)
| Kind | How many | What it means | Plan |
|---|---|---|---|
| Signed-in members can run "special-power" functions | 170 | Mostly on purpose (that's how the app talks to the database; each function checks who you are inside) | Engineer lists them; ones nothing uses any more (the dropped private-spot, chat-review and monthly-totals pieces) are removed by Richard in the SQL Editor (the connector blocks removals) |
| Security rules re-check your sign-in on every row | 81 | Speed only | Small rewrite of each rule, same meaning; faster lists as people join |
| Links between tables with no index | 36 | Speed only | Add the missing indexes (safe, adds only) |
| Unused indexes | 3 | Tiny waste | Leave until more users |
| Two rules on one table | 1 | Speed only | Merge into one |
| Function "search path" not set | 2 | Small safety hole | One-line fix each |
| Tables locked with no rules | 6 | On purpose (secrets and internal tables nobody may read) | Leave; note why |
| `spots_visible` "ERROR" | 1 | On purpose (how blurred public pins work; docs/security.md) | Leave; note why |
| Leaked-password check off | 1 | Needs the paid plan | Leave; on money-day list |
Steps: (a) speed fixes (81 + 36 + 1) as one migration, tests ALL OK; (b) the 2 search-path fixes; (c) unused functions: a list for Richard, removal SQL he runs himself with an undo block. After each: re-read the advisors and check none of the "anon/PUBLIC" grants came back.

### Lawyer packet: conservation (added Oct 19)
Plan: **partner first, own nonprofit later.** While the app is small, support established Florida groups (for example Snook & Gamefish Foundation, Bonefish & Tarpon Trust, CCA Florida) with a pledged share of any future app income, and run cleanup or tagging days through the app's groups and tournaments. Form our own nonprofit only once there is steady money and two more trusted people for a board. Keep the app business and any nonprofit completely separate.
Questions for the lawyer:
- Can the app say it "supports" a conservation group, or pledge a share of income, without that group's written OK? What wording is safe?
- When is it worth forming our own Florida nonprofit + IRS 501(c)(3), and what yearly paperwork comes with it?
- Is a fiscal sponsor (an existing nonprofit holding donations for our project) a good first step?
- Can the nonprofit and the app share a name? Any rules on the app collecting donations for it?
- What must stay separate between the app business (or LLC) and a nonprofit so no rules are broken?
- Do conservation events run through the app (cleanups, tagging days) need waivers or insurance?
Accountant: how a pledged share of income is recorded and taxed; donations from the app business.

---

## Go-public day checklist
### A. Before the appointment
- [ ] Send the lawyer packet ahead, so the paid time is spent answering, not reading.
- [ ] Name chosen; costs list ready.

### B. Lawyer reviews (one appointment)
- [ ] terms.html and privacy.html, including the new coins/gems and contest/race lines
- [ ] The "18 or older" line: is a tick box enough?
- [ ] Contests, tournaments and races: coin prizes only, coin entry fees in friend races, no purchase — any Florida contest rule to follow?
- [ ] Coins and gems: "no cash value", owner can correct them (logged)
- [ ] User photos: DMCA agent and a takedown contact
- [ ] As-is / safety wording (weather, tides, ramps, rules, fish ID)
- [ ] Admin powers wording (remove, hide, warn, ban, coin corrections)
- [ ] Fish ID photos going to Google (free tier)
- [ ] Do I need an LLC before strangers join, with no income?
- [ ] The chosen name (any conflict worry?)

### C. Accountant (optional, one hour)
- [ ] Anything to set up with zero income? Keep receipts for the lawyer, domain, Gemini?
- [ ] What changes the day doubloons are sold (LLC, EIN, bank account, sales tax on digital items, quarterly taxes)?

### D. After the review
- [ ] Engineer applies the wording, bumps the terms version (members see the banner and re-agree once), adds a What's new line.
- [ ] Richard: DMCA agent registered; domain bought (if chosen); paid Gemini switched on (if chosen) and the privacy line updated.

### E. Richard in the dashboards
- [ ] Supabase: Advisors → Security clean; usage (photos, database, emails) green; CAPTCHA on; Confirm email on; redirect address only the live site.
- [ ] Google: sign-in screen "In production", privacy page link filled in.
- [ ] GitHub: secret scanning still on.

### F. Tests
- [ ] Full checks ALL OK + security test.
- [ ] Short stranger rehearsal again with a brand-new account.
- [ ] "IT: run the weekly backup now" → BACKUP OK.

### G. Inviting strangers in small waves (approval stays on)
- **Wave 0:** 5 friends of friends. Wait 1 week.
- **Wave 1:** 10–20 people from one local club or pier group. Wait 1–2 weeks.
- **Wave 2:** about 50 from one local Facebook group.
- **Between waves, check:** problem reports, storage, emails sent, Fish ID use, any reports or bans. Any red → pause the next wave.
- Opening sign-up **without** approval is a separate team decision after wave 2 (it changes the privacy page).

### H. How we roll back
- **Too many / wrong people:** stop approving (instant). Ban with a written reason (can be undone).
- **A new version breaks something:** Engineer puts the last good version back on GitHub (minutes).
- **Sign-in breaks:** Supabase → Attack Protection → CAPTCHA off.
- **Data lost or damaged:** restore from the Sunday backup (practised in task 6).
- **Wording problem:** pause waves; the app stays invite-only until fixed.

---

## Do NOT build yet
- Doubloons, Stripe, any payments, paid artist packs.
- "Use my own AI" for Fish ID.
- Public race rooms (strangers + coin entry fees = lawyer question first).
- Anything dropped Oct 18: private-spot view, chat review, monthly totals, deleting another person's data.
- Open sign-up without approval.
- Visit tracking / analytics (not in the privacy page).
- Dropping the unused database pieces (safest = change nothing).
- New big features (tank sound, SFWMD gates, fish tracking). Every new feature is more for the lawyer to read and the Tester to check.

---

## Weekly routine while you're at the new job (~15 minutes a week)
**Richard checks:**
- Sunday (1 min): the "BACKUP OK" message arrived. Missing → say "IT: run the weekly backup now".
- Monday (1 min): read the "Fishing Map weekly summary" push. ALL GREEN = nothing to do; CHECK or ACTION = do the one line it says.
- Once a week (10 min): open the app, Me → Alerts and problem reports, approve or decline requests.
- Reply to any "please check" note from Claude with a tick or a line number.

**Claude does alone (in a session you start with one pasted prompt):**
- The next free task from the list; full checks; Supabase usage and security look; draft text.
- Leaves everything ready; never commits, never changes the database, never changes wording members see without your OK.

**Waits for Richard:**
- "Commit", any database change, any terms/privacy change, approvals, dashboard switches, money.

---

## Decisions (Richard, Oct 19)
1. **LLC:** still open — wait for the lawyer's answer (recommended).
2. **Name:** it **will change**; Richard is still deciding. Task 3 stays; the name goes into the lawyer packet once picked.
3. **Fish ID:** stays on **free Gemini** for now (fine while new people arrive in small waves). The privacy page warning stays as it is. Revisit if the weekly summary shows Fish ID use getting near the free daily limit.
4. **Weekly push summary: yes.** Scheduled task "Fishing Map weekly summary", Mondays 8:43 AM Eastern, runs in the cloud, read-only, counts only (no names or private details). Pushes: backup ran or not, problem reports, member reports, waiting requests, catches/anglers/photos/Fish ID this week, photo and database space. First run Mon Oct 26.
5. **Conservation:** partner first, own nonprofit later (in the lawyer packet, task 4).
6. **UI/UX:** one more full look before going public (task 9).

## Sources (Researcher to confirm prices in task 3/8)
- [Copyright Office: electronic system for DMCA agents](https://copyright.gov/newsnet/2016/640.html)
- [Gemini API pricing and free tier](https://ai.google.dev/gemini-api/docs/pricing)
- Earlier numbers (LLC $125, annual report $138.75, Stripe fees) from the Oct 15 Legal + Accounting review in `claude/fishing-map-plan.md`.

---

## Ready-to-paste prompt for the first task
```
I'm Richard (Pompano Beach, no programming experience). Tester + Designer: task 1 from plans/go-public-plan.md
(if it isn't in the repo yet, read the Project doc claude/go-public-plan.md).
Write a "stranger rehearsal" tick list to plans/go-public-rehearsal.md that I run on my phone with the test
account before Oct 27, about 25 minutes. Cover: ask for an account by email and by Google, the robot box,
the confirm-email message, the "I agree / I am 18 or older" box, the pending screen, me approving it,
the tutorials, a first catch with a photo, Fish ID, report and block, the Terms banner, and Delete my account
(with the download offer first). For each line: what to tap and what I should see. Mark lines that need two
phones or two accounts. Read the code only to get the screens right; do not change any code, wording or the
database. Keep it short and plain. I say "Commit" before anything is committed (include plans/go-public-plan.md then).
```
