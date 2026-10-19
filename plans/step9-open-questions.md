# Steps 9 and 10 — what happened (updated Oct 18)

## Decision (Richard, Oct 18)
We do NOT break any current privacy promise. All members are 18 or older. So these were **dropped** (code removed in v139):
- the private-spot view (v136)
- reading a reported private chat (v137)
- monthly totals for wildlife agencies and its Settings opt-in (v138)
- deleting another person's data (never built)

**Kept:** correcting coins and race results (Admin > Coins; a new ledger line with a typed reason; locked by switch `coin_corrections`, which is closed). The privacy page now says so in one sentence.

## The database was left alone (nothing was dropped). What could be dropped, and what is safest
All of it is harmless while the switches stay closed. Nothing in the app calls it any more.
| Piece | What it is | Safest? |
|---|---|---|
| table `gate_switches` (setup/86) | the on/off switches; `coin_corrections` is still used | **Keep** |
| `gate_is_open()` | answers a switch | **Keep** (coins use it) |
| `admin_private_spot_find`, `admin_open_private_spot` (86) | private-spot view | Drop later (optional) |
| `admin_reported_chats`, `admin_open_reported_chat` (87) | chat review | Drop later (optional) |
| `monthly_totals`, `monthly_totals_optins`, `set_share_totals`, `my_share_totals`, `private.monthly_totals_core`, `private.area_of` (88) | monthly totals | Drop later (optional) |
| columns `app_prefs.share_totals`, `share_totals_at` (88) | opt-in flag, all false | **Keep** (dropping a column can't be undone; harmless) |
| switch rows `private_spots`, `chat_review`, `monthly_totals` | all closed | Keep closed (or delete the rows later) |
| the four locked power names (`open_private_spots`, `review_chat`, `delete_person_data`) in `has_power` | owner-only, hidden in the app | Keep |
| `my_hidden_spots()`, `admin_photo_state()` (88) | the two small fixes | **Keep** |

**Safest:** change nothing. The gate switches are closed, the owner is the only one who could ever open them, and no screen uses them. If you want a tidy database, the next-safest is to drop only the unused FUNCTIONS (they can be recreated from setup/86-88). I will not run any drop until you say yes.

## Wording check (what the app says now)
Checked the app text for "only you" and "Private": every one is still accurate, because nothing can open a private spot or a private chat. One thing to know: a person who reports a chat message sends a short snippet of it (up to 200 letters) to the admins, and the owner can reach stored data through the database (the privacy page already says the organizer can technically reach stored data).

## Terms page and the "I agree" box (v139) — DRAFT, needs a lawyer before strangers join
- `terms.html` is new; linked next to Privacy (sign-in screen, Settings, bottom of the privacy page).
- The access request has a required box: "I agree to the Terms and Privacy page, and I am 18 or older." (Google sign-ins reach the same screen, so one box covers every way in.)
- **Saving the date each member accepted needs a database change. Proposed `setup/89`, NOT applied (Richard says yes first):**
  - add two columns to `members`: `terms_accepted_at timestamptz`, `terms_version text` (no new table, so the weekly backup needs nothing);
  - add function `accept_terms(p_version text)`: sets those two columns on the signed-in person's own member row (by their email), only if they are signed in; refuses nothing else; no drops;
  - the app already calls `accept_terms` right after the access request and ignores the error until the function exists.

## Existing members — PLAN ONLY (not built until Richard says)
A one-time banner when an existing member opens the app after the terms go live: "We added a Terms page. Please read it. [Terms] [I understand]". Tapping "I understand" calls `accept_terms` (same function), and the banner never shows again for that terms version. It needs setup/89 first. When the Terms change in future, bump the version string and the banner returns.
