# Plan: run 🔍 Fish ID through Claude instead of Gemini (Oct 27)

_Why: Richard says Gemini is slow and not good. Today: `supabase/functions/identify-fish/index.ts` sends one photo to Gemini (free tier), tries several model names, returns up to 3 suggestions. Nothing else in the app has to change._

## What changes (small)
- **Server function only:** replace the Gemini call with one call to Claude's Messages API (photo + the same prompt, same fish-name lists, same state/area/water hints). Ask for a forced "answer" tool so the reply is always the same shape: `fish_visible` + up to 3 `{name, confidence, clue}`. The app already reads exactly that shape, so the screens stay the same.
- **Same safety as now:** invited members only, 30 a day each (`fish_id_take`, setup/66), photo-size check, no location sent.
- **Faster:** shrink the photo on the phone to about 1024 px on the long side before sending (fewer bytes, quicker answer, cheaper).
- **Words:** update `ID_NOTE` in js/07 (+ privacy.html / lawyer packet "Fish ID" section) from Google to Anthropic. Wording only after Richard OKs it; lawyer line goes into the pending list.
- **Model:** start with the small fast Claude model (Haiku 5.5). If it misses fish in the test set, one switch (a setting in Supabase, no code) moves to a bigger one (Sonnet 5.5). Keep the fish-name list in the prompt.

## What Richard must do (I can't)
1. Make an account at console.anthropic.com and **add a few dollars of credit** (no free tier; budget was $0, so this is the one new cost). Set a **monthly spend limit** (e.g. $5) so it can never surprise him.
2. Create an API key and save it in Supabase → Edge Functions → Secrets as `ANTHROPIC_API_KEY` (never in chat or the repo). Then the old `GEMINI_API_KEY` can be deleted.

## Cost guess (to confirm on Anthropic's pricing page)
One photo is roughly 1–2 thousand input tokens plus a short answer: a fraction of a cent per Fish ID with the small model. 30 a day × 20 members would still be a few dollars a month at most; the 30-a-day cap and the spend limit are the guard rails.

## Questions to settle before building
- OK to spend a few dollars a month? (Gemini stays as the free fallback if he says no.)
- Privacy: Anthropic's API terms say API inputs are not used to train models by default — **confirm against the current terms and put the exact line in the lawyer packet** (replaces the "Google may use it" warning, which is a plus for members).
- Keep Gemini as a back-up if Claude is down? (Recommend: no, simpler; show "try again" like now.)

## Steps
1. Richard: account, credit, spend limit, key in Supabase (above).
2. Engineer: rewrite the function (deploy via the connector), shrink photo in js/07, text update, test (fake the API like test122/fish-ID tests), bump.
3. Compare: run ~20 of Richard's real catch photos through both, side by side, check speed and right answers.
4. Switch over; delete the Gemini key; update docs/security.md + packet line.
