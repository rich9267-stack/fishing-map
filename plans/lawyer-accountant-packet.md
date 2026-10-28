# Lawyer + accountant packet (send this ahead of the appointments)

**Checked against the live app: v173, Oct 22 2026.** Before the appointment, ask Claude to "bring the lawyer packet up to date" so it matches the newest version. Rule (CLAUDE.md): anything new that touches members' data, photos, money, outside data or the fishing rules adds a line here.

Not legal or tax advice. This lists what the app does and what to ask. **terms.html and privacy.html stay unchanged until the lawyer answers.** After that, the Engineer applies the wording once and bumps `TERMS_VERSION` (js/49, now "2026-10-18") so members agree again once.

Today's texts: [terms.html](../terms.html) (dated Oct 18, marked "Draft") and [privacy.html](../privacy.html) (dated Oct 22). Bring both, printed or on the phone.

---

## 1. What the app is today (one paragraph for the lawyer)
"Fishing Map" (name will change) is a free phone web app run by one person (Richard, Pompano Beach, FL). It has no income, no ads, no payments and no company (no LLC). It's invite-only: anyone can ask, Richard approves each person, and members must be 18+. Members save fishing spots and catches with photos, each marked Private, Friends or Public. They chat, join groups, contests, races and games for in-app coins and gems (no cash value, can't be bought), and get tide, weather, safety and fishing-rule help. The app now covers **every US state**, not just Florida: size/bag rules, seasons and no-fishing zones, gathered from state agencies and NOAA. Fish ID sends a photo to Google Gemini (free tier). Members can opt in to let their photos train our own fish ID later; nothing is trained yet. Data is stored with Supabase and the site is hosted on GitHub Pages.

## 2. Where today's terms/privacy are already out of date
These were found by checking the texts against v173. Don't change anything yet; ask the lawyer for the wording.

| # | What the app does now | What the text says / misses |
|---|---|---|
| a | Covers all US states. Members may live outside Florida. | Terms: "governed by the laws of the State of Florida" (OK?). Nothing about members in other states (e.g. California privacy law). |
| b | Shows fishing rules for every state (from state agency websites and handbooks, some read from PDFs), seasons cards and 158 national no-fishing zones (NOAA MPA Inventory). | Terms say rules are "a help, not legal advice" (good). Privacy's **Data credits** name only Florida sources (FWC, FDEP). Missing: NOAA MPA Inventory, state agencies, OpenStreetMap ramps/piers outside Florida, and (v173) lake depth lines and public fishing waters from 13 state agencies' map servers (the map popup credits the agency). |
| c | Games show members' 🌎 Public catch photos with the member's name. Guess the fish also uses iNaturalist photos from across the US (reusable licences only). | Privacy says Public = seen by all approved members; it doesn't mention games. No credit or licence line for iNaturalist photos used in games. |
| d | Fish ID training (opt-in): the owner can **look at** opted-in members' Friends/Public photos on an owner-only review screen (even Friends photos of people who aren't his friends), flag wrong ones and merge fish names. Only a catch number + flag is stored. Nothing is copied or trained. | Privacy says photos "may be used to train". It doesn't say the owner reviews them by eye. |
| e | Photos are kept on each member's phone in a saved-photo store (newest 800) so they don't download again. The store is emptied on sign-out and on account delete. | Privacy: "deleting the catch or your account removes those photos". The server copy and small copy are removed, and the app stops showing it. But a copy can stay in **another member's** phone storage until newer photos push it out. Is that OK as worded? |
| f | Small copies (~20 KB) of every photo are made for lists. They're deleted with the photo. | Not mentioned (probably fine). |
| g | Coins, gems, contests, races, tank names, coin corrections by the owner/admins | Coin corrections are in both texts. **Missing:** "coins and gems have no cash value", contest/race rules, tank names as user content (see §4). |
| h | Weight is estimated from length ("≈") for many fish. | As-is clause names rules and fish ID but not weight estimates. |
| i | Terms header says "Draft… not reviewed by a lawyer yet". | Remove after the review. |

## 3. Questions for the lawyer (by topic)
**Going public, the business, the name**
1. Is the as-is clause enough for a free app run by one person, or do I need an LLC before strangers join (with no income)? LLC cost ≈ $125 + $138.75/year (Florida).
2. Is a tick box "I'm 18 or older" enough?
3. The chosen name (when picked): any conflict worry? Anything to register?
4. DMCA: do I need a registered agent (≈ $6) and a takedown contact for members' photos?
5. Admin powers (remove, hide, warn, ban, coin corrections): is the wording fair and enough?

**The whole US (new since Oct 21)**
6. Is "Florida law governs" OK for members in other states? Do any state privacy laws (e.g. California) need extra wording or an opt-out, even with no sales and no ads?
7. The app shows size/bag limits, seasons and no-fishing zones for every state. Is "a help, not legal advice; you must check the current rules" enough if a rule is wrong or out of date? Should every rules card show "last checked" + a link to the state's page?
8. Reusing state agency and NOAA information (rules, no-fishing zones, and since v173 lake depth lines and public fishing waters from state map servers): any permission or credit needed (as we did for FWC/FDEP)? Depth lines: is "not for navigation" needed, as for FWC/FDEP places?

**Photos and games**
9. Games show members' Public catch photos with their names. Is "Public = all approved members" enough, or should the privacy page say "including in games"?
10. iNaturalist photos in games (reusable licences only): what credit must we show?
11. Photos saved on other members' phones (§2 e): is our deletion promise still true enough, or how should it be worded?

**Fish ID (Google Gemini, today)**
12. Fish ID photos go to Google's free tier, which may use them. Is the current privacy line enough?

**Own Fish ID model (opt-in, nothing trained yet; full plan in plans/fishid-model-plan.md)**
13. Is the "Help improve Fish ID" box enough consent to train on opted-in members' Friends/Public photos and fish names? What must it say?
14. May the owner look at those photos on the review screen (including Friends photos of non-friends)? Must the privacy page say so?
15. Does training in the owner's own browser (photos held in memory, never saved) count as **copying**? May training copy photos for a short time to an outside service (Google Colab or Teachable Machine) if they're deleted right after?
16. When someone deletes a photo or account, or unticks the box: is leaving them out of the **next** retrain (e.g. within 30 days) enough, or must the **trained model** be replaced sooner?
17. Who owns the trained model? May we keep, share or sell it after members leave?
18. Photos showing people, faces, boats, license plates or children: skip them or crop to the fish?
19. If our model names a protected fish as legal: what warning must the app show?

**Coins, contests, races (no real money today)**
20. Coins and gems: proposed line "no cash value, can't be bought, sold or traded, and can be corrected by the owner (logged)". OK?
21. Contests, tournaments and races give coin prizes only; friend races have coin entry fees; no purchase. Any Florida/US contest rule to follow? Public race rooms with strangers?

**Tanks, tank names, doubloons (selling is NOT built; extra tanks show "Coming soon")**
22. Is a tank name user content under the current terms, or does it need its own line?
23. Selling doubloons later: refunds, chargebacks, unspent doubloons if the app closes or an account is deleted or banned; virtual-currency, gift-card or money-transmitter rules; is "purchases are final" allowed (Florida, Apple/Google)?
24. Do I need an LLC before the first sale?

**Conservation (partner first, own nonprofit later)**
25. May the app say it "supports" a group, or pledge a share of income, without the group's written OK?
26. When is it worth forming a Florida nonprofit + 501(c)(3)? Is a fiscal sponsor a good first step? Can the nonprofit share the app's name, and what must stay separate?
27. Do cleanup or tagging days run through the app need waivers or insurance?

**Learn → Fish illustrations (v228)**
28. Each fish card links one outside illustration (drawing or painting, no photos; not copied into the app): U.S. Fish & Wildlife Service (Duane Raver) and NOAA / U.S. Fish Commission files first, then older public-domain drawings (FMIB, pre-1930) and one CC BY drawing, all via Wikimedia Commons. The credit, licence and source page show under it. Is that credit line enough (incl. CC BY), is linking (not hosting) fine, and is it OK to rely on Commons' public-domain labels for the old drawings? List: data/learn/fish-pictures.json; 29 fish have none.

## 4. Proposed new lines (drafts for the lawyer to fix, NOT live)
- **Coins and gems:** "Coins and gems are points for fun. They have no cash value, can't be bought, sold or traded, and the owner may correct them (always logged)."
- **Contests and races:** "No purchase needed. Prizes are coins only. We may cancel or correct a result for cheating or mistakes."
- **Tank names:** "Tank names are content you post; the same rules apply and we may remove a name."
- **Doubloons (only when selling starts):** "Extra tanks and other doubloon items are a limited licence to use a look in the app. They have no cash value, can't be traded or sold, and stay with your account. Purchases are final except where the law requires a refund. If we close the app or remove an item, …" (lawyer to write).
- **Whole US:** "Fishing rules, seasons and closed areas come from state and federal agencies and may be out of date. Always check the agency's current rules." Plus data credits for the NOAA MPA Inventory, state agencies, OpenStreetMap and iNaturalist photos.
- **Games:** "Your 🌎 Public catch photos and name can appear in in-app games for other members."
- **Fish ID training:** "If you turn it on, the owner may look at those photos to check the fish names. Only the fish name and a yes/no check are kept, never a copy of the photo." Plus whatever the lawyer says about training and deletion.
- **Photos on phones:** "To save data, photos you've seen are kept on your phone for a while and removed when you sign out."

## 5. Accountant (optional, one hour)
**Questions**
1. With zero income today: anything to set up now? Which receipts should I keep (lawyer, domain, any paid plan)? Are they deductible before there is income?
2. What changes the day something is sold (doubloons): LLC, EIN, business bank account, Florida sales tax on digital items, quarterly taxes, Stripe fees?
3. Unspent doubloons: is the income counted when bought or when spent?
4. A pledged share of income for conservation groups: how is it recorded and taxed?
5. If I pay for a bigger Supabase plan (see below) before there is income: hobby cost or business expense?

**Expense sheet (fill in on money day; numbers are rough, confirm before paying)**
| Item | Rough cost | When | Status |
|---|---|---|---|
| Lawyer review (terms, privacy, questions above) | $300–1,500 (flat fee vs hourly) | first pay, ~late Nov | not booked |
| Accountant hour | $100–300 | optional | not booked |
| DMCA agent registration | ≈ $6 | if the lawyer says yes | — |
| Domain for the new name | ≈ $10–20 / year | after the name is picked | — |
| Florida LLC | $125 + $138.75 / year | only if the lawyer says so | — |
| Supabase paid plan | ≈ $25 / month (confirm) | **only if the free limits run out.** Photo downloads went over the free limit on Oct 22; v172 cut them a lot. Watch the Monday summary. | free plan |
| Supabase leaked-password check | in the paid plan | with the paid plan | off |
| Google Gemini (Fish ID) | free tier; paid is per photo | only if the daily limit is reached | free |
| Stripe | ≈ 2.9% + 30¢ per sale | only when doubloons are sold | not set up |
| Everything else (GitHub Pages, NOAA, NWS, OpenStreetMap, iNaturalist) | $0 | — | free |

## 6. After the appointments
- [ ] Engineer: apply the lawyer's wording to terms.html and privacy.html in one go, remove "Draft", bump `TERMS_VERSION` (js/49), add a What's new line.
- [ ] Richard: DMCA agent (if yes), domain (if chosen), LLC (if advised).
- [ ] Update this packet: mark each question answered (with the answer in one line) and keep it as the record.

_Where the earlier notes live: plans/go-public-plan.md (Oct 19 meeting, conservation and tanks sections), plans/fishid-model-plan.md (Fish ID training plan and its questions). This packet collects all of them; send this one._
