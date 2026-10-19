# Step 9 — what is built, what is locked, what still needs a decision

## Built and LOCKED (v136)
Me › Admin › 🔒 Private spots (owner only). It shows "Locked" until Richard opens the switch in the SQL Editor:

    update public.gate_switches set is_open = true, changed_at = now() where name = 'private_spots';

To close it again: same line with `is_open = false`. Both switches start closed (`private_spots`, `monthly_totals`).
Other admins cannot be given the box yet (it stays owner-only until a later change, after Legal has looked).

## Before the switch is opened (Richard + Legal, not the Engineer)
1. Privacy page (`privacy.html`) and terms must say, in plain words, that private spots are NOT only for the owner. Today the page says "Private spots ... are visible only to you" (line ~36), which would be untrue once the switch is open. Draft wording for Legal to review (not published; the Engineer is not a lawyer):
   - "The owner of Fishing Map, and administrators the owner trusts, can open a single private spot to check that catches are reported correctly. Each time this happens it is written to a log with who opened it, which spot, when and why. We never browse private spots, and we never share them with anyone else."
2. The terms need a matching sentence (members agree to this when they join).
3. Decide whether existing members must be told (an alert or a banner) when the wording changes.

## Not built yet: monthly totals — needs decisions first
- **What counts as a "verified" catch?** The app has no such flag today. Options: measured with the in-app tape, has a photo, or logged on a trip with a position. Pick one.
- **Which agencies, which format?** (FWC and others.) The Researcher should answer this. Counts by month, species and broad area only; no names, photos, exact spots or per-person numbers.
- **"Broad area":** counties? the app's regions (Atlantic, Keys, Southwest, Panhandle)? Small groups (for example fewer than 5 catches) should be hidden so nobody can be picked out.
- The opt-in setting ("include my catches in the monthly totals") sits in Settings, off until the person turns it on, and appears only once the privacy page and terms describe it.

## Step 10 switches (v137) — same rule
Two more switches, both closed: `coin_corrections` (Admin › 💰 Coins) and `chat_review` (Admin › 💬 Chat review). Open with the same kind of line:

    update public.gate_switches set is_open = true, changed_at = now() where name = 'coin_corrections';
    update public.gate_switches set is_open = true, changed_at = now() where name = 'chat_review';

Chat review changes the "private chats are only for the two people" promise, so the privacy page and terms need a sentence too (draft for Legal): "If a message is reported, the owner or a trusted administrator may read the conversation between those two people to deal with the report. Each time, it is written to a log with who, why and when. We never browse private chats."
Coin corrections need one line in the terms: "The owner may correct coin and gem balances when a bug or cheating is found. Corrections are shown in your coin history."

## Not built: delete a person's data
It would need a full copy of the delete-my-account routine for another person (spots handed to friends, races cancelled, etc.), plus a check that a fresh backup exists. Decide first: should it exist at all, given a person can already delete their own account?

## Decisions Richard made (Oct 18) and what v138 did with them
- Monthly totals are an **opt-in program** for reporting to state wildlife agencies (FWC in Florida; other states as the app grows). Built (locked): Settings box + Admin > Totals. Open it with: `update public.gate_switches set is_open = true, changed_at = now() where name = 'monthly_totals';`
- **Verified** = a catch with a photo AND a GPS stamp (100 m or better, within 30 minutes of the catch). Only catches after the person opts in.
- **Still open:** the state is found with a rough Florida box; other states show as "Other". Before sending anything to an agency, add real state boundaries (and each agency's format). Draft privacy sentence: "If you choose to, your verified catches (a photo plus a GPS location taken when you logged the catch) are counted in monthly totals by state, species and month that we share with state wildlife agencies. Totals never include your name, photos or exact spots, and we only show a total when at least 3 people are in it. You can turn this off at any time."
- **Delete a person's data: dropped.**
