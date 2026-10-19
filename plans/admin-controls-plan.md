# Better admin controls — plan (v5, Oct 17)
_Designer · planning only: nothing built, nothing changed in the app or database. Not a lawyer; Legal checks the privacy and terms wording before the gated boxes switch on._

**Words used from now on:** **Owner** = Richard. **Admins** = people Richard picks and gives tick boxes. (In today's app and database, "admin" means full power. Step 1 turns today's admin power into "owner" for Richard and defines the new, smaller "admin".)

## Why Richard wants this
He couldn't do some things, finds the tools hard to find (one long scroll under Me › Invite), is getting ready for strangers, and doesn't trust what he can't see. He wants a mix of **seeing more, doing more and safety nets**.

## What admins can do today (read from the code Oct 17)
All under **Me › Invite** unless noted.
1. Add an email to the invite list, then send the invite link.
2. Approve or decline access requests; re-approve someone declined or banned.
3. "Remove" someone from the list (deletes the list entry; not a ban).
4. 📊 Dashboard: people, active this week, spots, catches, alert phones, open reports, top species.
5. 🚩 Blurred items (3 reports): Keep or Remove.
6. Reports list: Remove a reported catch or comment, **Ban user** (the only place a ban exists), Resolve.
7. Page requests: approve or decline club and business pages; business-page allowance; remove a live page.
8. Page rename requests: approve or decline (also a phone alert).
9. 🐟 Size & bag rules editor.
10. Problem reports from users: Me › Settings, bottom (also a phone alert).
11. Official tournaments and monthly series; cancel any tournament: Compete › Tournaments.
12. Delete anyone's spot (with Undo): Edit spot.
13. ⭐ Make or un-make an official place: Edit spot.
14. Admins can't delete their own account.

**Gaps:** no log of admin actions · no way to make or remove admins in the app (database only) · can't remove a photo or chat message unless reported · can't hide a public spot without deleting it · no warning before a ban · nobody, including admins, can see private spots today.

## Decisions (Richard, Oct 17)
- **One Admin page** (Me › Admin) gathering everything, in sections.
- **Owner and admins.** Every power is a **tick box per admin, starting with nothing allowed**, at the owner's discretion.
- **Full-power admin.** An extremely trusted admin can be given **every box, the same powers as the owner.** Safeguard I recommend: the owner account itself can never be removed, demoted or have its boxes changed by anyone else.
- **Private spots:** the owner (and any admin the owner ticks) can open any private spot, **always logged with a typed reason.** Purpose: **confirm catches are not misreported** (for example a different river or canal nearby) before they count in the monthly totals.
- **Agency reporting:** an angler who overfishes is **not reported**; only the **total number of fish per month** goes to agencies so federal and state resources can be allocated to support populations.
- **Monthly totals are opt-in** ("include my catches in the monthly totals"), **and** are described in the privacy policy and terms.
- **Private chats:** only reported or safety issues, reviewed by **a real person, not AI.** Admins can do this with a tick box, at the owner's say.
- **Coins, purchases, race results:** corrected by the owner and admins ticked for it, when cheating is noticed, as logged correcting entries.
- **Report snippets:** admins see them.
- **Delete a spot** and **Remove from the list:** each has its own tick box; an admin without the tick can't do it. Deleting a person's data is also its own box.
- **Do more (if ticked):** remove a photo or message · hide a public spot · warn someone first · fix a wrong official place.
- **Safety nets:** a log of admin actions · undo for removals · an extra confirm before a ban · make and remove admins in the app.
- **Testing admins:** use the existing **test user account** as the second account for step 4.

## Boxes an admin can be given
People (approve or decline requests) · Invite · Remove from list · Reports and removing content · Warn · Ban · Pages · Size & bag rules · Tournaments · Official places · Delete a spot · Hide public spots · Problem reports · Dashboard · Read the log · Manage admins.
**Gated boxes** (locked until the privacy page and terms say so): Open private spots · Review a reported private chat · Correct coins and race results · Delete a person's data.
A **"Full powers"** shortcut ticks everything.

## Build order (each step small, checkable on the phone)
1. **Owner + admin foundation, nothing visible.** Richard becomes owner; every current power keeps working as today; each power gets a permission name later steps check. *Check:* Me › Invite still shows everything.
2. **Admin log.** Records who did what and when for every owner and admin action. Readable by the owner and any admin ticked "Read the log"; nobody can edit or delete lines from the app. Never stores private coordinates or message text beyond what a report already carries.
3. **Admin page.** Me › Admin: People · Reports · Pages · Rules · Problems · Dashboard · Log. Old shortcuts and phone-alert links keep working. *Check:* every power above is reachable in two taps.
4. **Admins and tick boxes.** Owner makes someone an admin and ticks boxes (or "Full powers"); the server refuses anything not ticked; an admin only sees ticked sections. *Tested with the test user account.*
5. **Undo + safer bans.** Bring-back button for removed catches, comments, pages and spots; a ban needs a written reason and a second confirm; reason goes in the log.
6. **Warn someone.** A plain message in their Alerts plus a phone alert; warnings counted on the person's report line.
7. **Remove a reported photo or message; hide a public spot.** Hide is reversible and the spot's owner is told. Messages are removable only through a report.
8. **Fix an official place.** Edit name or type, move it, or switch it off; fixes must survive a later data reload (Engineer to check).
9. **Private spots and monthly totals (gated).** See below.
10. **Other gated boxes:** correct coins and race results; delete a person's data; review a reported private chat. See below.

**Build first:** 1–4. **Later:** 5–8. **Gated:** 9–10.

## UPDATE Oct 18 — what was dropped (Richard)
**No current privacy promise is broken. All members are 18 or older.** So these were built, then DROPPED: the private-spot view, reading a reported private chat, monthly totals for agencies, and deleting another person's data. Kept from steps 9–10: correcting coins and race results (a new ledger line with a typed reason; still locked behind a closed switch). The text below is the old plan, kept for history.

## Steps 9 and 10 — how to do them safely (OLD, see the update above)
The gated boxes stay locked until the privacy page and terms say it and Legal has looked at the wording. Every use goes in the log with a short **reason typed by the person using it.**

**9. Private spots and monthly totals.**
- **Private-spot view:** opens one spot at a time, with a typed reason; the log keeps who, which spot, when and why (never the coordinates). Anyone ticked can do it, so the privacy page must say **"the owner and trusted administrators can open private spots to check catches are reported correctly."**
- **Monthly totals:** counts by month, species and broad area, with **no names, photos, exact spots or per-person numbers**, made by the server. Only catches from people who **opted in**, and only verified ones, count. The setting ("include my catches in the monthly totals") sits in Settings, off until the person turns it on; the privacy policy and terms describe it. Which agencies want this and in what format is a Researcher question (FWC and others).
- Plain promise for the privacy page: **only monthly totals are shared; individuals are never reported.**

**10. Other gated boxes.**
- **Coins and race results:** never edit rows. Add a **correcting entry with a reason** (the coin ledger already works this way). Real-money (doubloon) purchases and refunds are a separate case: recommend they stay with the owner and a full-powers admin, go through Stripe and get a log line. Not a lawyer; Accounting and Legal look at refunds.
- **Delete a person's data:** full delete of one person's account data after a confirm that names the person and a fresh backup. The person can already delete their own account.
- **Private chats:** only a chat tied to a report or a safety problem, shown only for that pair, opened by a person (never AI), with a typed reason. No browsing of chats.

## Risks
- **Trust (biggest).** Today the app and privacy page say private spots and chats are only for the people involved. The gated boxes change that promise. Say it plainly up front. The more people hold a box, the more it matters.
- **A full-powers admin** can open private spots, review chats, correct coins and delete data. Choose that person with care, make sure they have 2-step sign-in, and rely on the log.
- **Scope vs the sprint.** The Oct 15 meeting limited the sprint to statewide data and polish. Suggest starting step 1 after phone test session 1 is ticked; steps 1–3 before going public, the rest after.
- **Public sign-up** (CAPTCHA and email confirm replace manual approval) shrinks Access requests and raises the need for search, ban and log.
- **Existing powers become boxes:** today every admin can delete spots and remove people from the list. After step 4 only ticked admins can. Engineer checks what "Remove from list" leaves behind.
- **Lock-out:** one owner account that nobody else can remove. Database access stays as the emergency way back in.
- **Log data** holds names and reasons, so it is admin-only and goes in the weekly backup.
- **Tests:** every step adds checks; coin and race checks must stay green.

## Open questions
None right now. Plan is ready for the Engineer to start step 1.
