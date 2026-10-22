# Own Fish ID model: plan (step 4, Oct 22 2026) — plan only

**Nothing is trained or copied until after the lawyer review (~late Nov 2026) says yes.** Until then the owner-only 🧠 Fish ID tab only counts and previews photos (steps 2–4, setup/101 and 104, js/57).

## Where we are
- Today's Fish ID sends one photo to Google Gemini (free tier) through our Supabase function and shows up to 3 guesses (js/07). It works, but it depends on Google's free limits and sends the photo to Google.
- Our own model would be trained on members' **Friends/Public** catch photos, only from members who ticked "Help improve Fish ID" (Settings → Your data). Never Private.
- The owner can flag wrong photos and merge name spellings (step 3). The "🎯 Ready to train?" box (step 4) says how many fish have 30+ good photos.
- A first try needs **at least 2 fish with 30+ photos each**. A useful model needs more: roughly 10–20 common fish with 100+ photos each.

## Free ways to train ($0)
All three make a small model file (about 3–20 MB) that can sit on our GitHub Pages site like any other app file.

### Option A — train in the owner's browser (TensorFlow.js)
- **How:** a hidden owner-only page loads the training photos one at a time from the existing 10-minute links, teaches a small ready-made picture model (MobileNet) the new fish names, and saves only the finished model file.
- **What it needs:** a laptop or desktop with Chrome, an evening, a new js file. No new accounts. Free.
- **Copying?** Photos are held in the browser's memory while training and are not saved to disk by us. **Lawyer question: is that "copying"?**
- **Good:** simplest, $0, no outside company sees the photos. **Weak:** less accurate than Option C.

### Option B — Google Teachable Machine (free website)
- **How:** drag photos for each fish into the website; it trains in the browser and gives a model file.
- **What it needs:** the photos as files on a computer to drag in.
- **Copying?** **Yes**: photos must be downloaded first. This is the "export/download" we said we would not build. Only possible if the lawyer says yes.
- **Good:** no code. **Weak:** needs a download, so it's the worst for privacy.

### Option C — free Google Colab notebook (Python, free graphics card)
- **How:** a notebook fetches the training photos from short links, fine-tunes a stronger model (e.g. EfficientNet), turns it into a model file for phones, then deletes the photos when the session ends.
- **What it needs:** a free Google account, a copy-paste notebook, and a one-time training key that expires.
- **Copying?** **Yes, temporarily**: photos sit on Google's computer during training. **Lawyer question.**
- **Good:** most accurate. **Weak:** Google handles the photos, and it needs a careful key.

**Recommendation:** start with **Option A**. It's the only way where photos never leave the owner's browser, and it needs no new account. Move to C only if A is not accurate enough and the lawyer agrees.

## Free ways to run it
- **On the phone, in the app (recommended):** the model file downloads once, about 3–20 MB, and is then kept offline. Fish ID works without signal, and the photo never leaves the phone. It's free.
- **Both:** show our own model's guess first, and keep Gemini as a "second opinion" button.
- **Not recommended:** running it on a server (a Supabase function), because of free-tier limits and because photos would be sent again.

## When someone deletes a photo or account, or unticks the box
- The photo drops out of the training list at once. This already works, because the list is never copied.
- A model that is **already trained** doesn't contain the photos, but it has "learned" a little from them. There is no simple way to remove one photo from a trained model.
- **Plan:** retrain from the current list on a schedule (e.g. every month) and replace the old model file. The old file is then deleted. After that, the deleted photos have no effect left.
- Keep a small record of **when** each model was made and **how many** photos it used. Don't keep which photos, so there's no list of people.

## Questions for the lawyer review
_(Also copied into plans/lawyer-accountant-packet.md, the one file to send.)_
1. May we use opted-in members' Friends/Public catch photos (and the fish name they typed) to train our own fish ID model? Is the current "Help improve Fish ID" box wording enough consent, or what must it say?
2. Does training in the owner's browser (Option A: photos held in memory, nothing saved) count as **copying** the photos? Is it allowed?
3. May training **copy** photos temporarily to an outside service (Google Colab, Option C, or Teachable Machine, Option B) if they're deleted right after? What must the privacy page say about that?
4. When someone **deletes** a photo, a catch or their account, or unticks the box, is it enough to leave them out of the **next** retraining (e.g. within 30 days)? Or must the **trained model** be replaced sooner? What should the privacy page promise?
5. Who owns the **trained model**? May we keep using it, share it, or sell it (e.g. with doubloons) after members leave?
6. Photos can show people, boats, license plates or places. Is training on those OK? Should we crop to the fish or skip photos with faces?
7. Members must be 18+. Does anything change for a photo that shows a child?
8. The app now covers the whole US, so members may live in other states. Do any state privacy laws (e.g. California) need extra wording or an opt-out?
9. If the model guesses wrong (e.g. calls a protected fish a legal one), what warning must the app show?
10. After the review: update terms.html and privacy.html, then bump TERMS_VERSION in js/49 so members agree again.

## Next steps (only after the review says yes)
- Step 5: owner-only "Train" page for Option A (photos in memory only), plus a test run on 2–5 fish. Compare its guesses with Gemini on a few known photos.
- Step 6: ship the model file in the app with our guess first and Gemini as a second opinion. Add a monthly retrain reminder for the owner.
