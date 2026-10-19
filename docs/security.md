# Fishing Map — security (plain language)

Last audit: Oct 15, 2026 (v109; v110 added the CAPTCHA code, public-place pins and privacy wording). Re-run the audit before each wave of new testers: Supabase → Advisors → Security, and `cd tests && node test122.js`.

## What already protects the app
- Every table has row-level security: the database itself decides who may read or change each row. Photos are in private storage.
- Only approved members (by email, approved by Richard) can see or change anything. Strangers who sign up land in "pending".
- Private / Friends / Public levels; public pins are blurred in the database.
- Secrets (Gemini key, push keys, service key) live only in Supabase, never in the repo (test122 scans for them).
- Scheduled functions need a secret header; Fish ID needs a signed-in member and is capped at 30 a day each.
- v109: popups and pages never turn typed-in text into HTML; a Content-Security-Policy limits what the page may load; the app won't run inside another site's frame.

## Things only Richard can do (Supabase / GitHub / Google dashboards)
1. **Authentication → Sign In / Providers → Email → "Confirm email" = ON.** (Audit finding: the newest email accounts were confirmed instantly with no confirmation email. The app trusts the email address, so without this a stranger could sign up with an approved friend's email before the friend does.) After switching it on: sign up with a new test email and check the confirmation email arrives and the app says to check email.
2. **Authentication → Sign In / Providers → Email:** minimum password length 8 or more. Turn on "Prevent use of leaked passwords" if your plan offers it (it may need the Pro plan; skip if greyed out).
3. **Authentication → URL Configuration:** Site URL = `https://rich9267-stack.github.io/fishing-map/`; Redirect URLs = only that address (no `*` wildcards).
4. **Authentication → Rate Limits:** keep email sending low (Gmail allows ~500/day; a bot could use it all and block password resets).
   **CAPTCHA (app side built in v110, switched OFF until you do this, in this order):**
   a. Cloudflare (free account) → Turnstile → Add widget → hostname `rich9267-stack.github.io` → mode "Managed". Copy the **Site key** (public) and the **Secret key** (private).
   b. ✅ Done (Oct 15): the **Site key** is in `TURNSTILE_SITE_KEY` in `js/11-accounts-social.js` (v110). The Secret key was never shared.
   c. After the new version is live and you can see the "I'm not a robot" box on the sign-in screen: Supabase → Authentication → Attack Protection → Enable CAPTCHA → provider Turnstile → paste the **Secret key** (never in chat). Save.
   d. Test: sign in with email + password, then "Create an account" with a new test email, then "Forgot password". Google sign-in does not use the box.
   If sign-in ever breaks: Supabase → Attack Protection → turn CAPTCHA off (everything works again immediately).
5. **Turn on 2-step sign-in** for your Supabase, GitHub and Google accounts. Your account is the admin key to everything.
6. **GitHub → repo Settings → Code security:** turn on Secret scanning + push protection and Dependabot alerts (free on public repos).
7. ✅ Done. Run `setup/67-lock-down-signed-out.sql` in the SQL Editor once v109 is confirmed good on your phone (it has an UNDO block at the bottom).
8. Weekly while testers join: Supabase → Storage / Database usage (free limits 1 GB photos, 500 MB database).

**Oct 19:** setup/90 applied: six later functions (admin_power_names + the five page-rename ones) were still open to signed-out callers; now locked. After adding any new function, check `routine_privileges` for grantee anon/PUBLIC (should be 0 rows). Items 1-3, 5, 6 and CAPTCHA confirmed done by Richard.

## Known design choices (not bugs)
- Every approved member can see every other member's handle, display name and "home area" (needed for Find friends). The privacy page says so (v110).
- Public spots at a known public place (an official ramp / park / pier within ~500 ft) show that place's own exact location to strangers (setup/68); every other public spot stays blurred 100–400 m and gets no Directions button.
- `spots_visible` (a SECURITY DEFINER view) is the advisor's one ERROR. It is how blurred public pins work; it checks membership inside.
- Members can upload up to 5 MB per photo with no per-person total; watch storage usage.
- One admin account (Richard). Admins can't delete their account from the app.

## Next hardening ideas (not done)
- Per-person caps on comments/reports/photos: Richard decided NOT to add them (Oct 15). A CSP `frame-ancestors` header (GitHub Pages can't send headers; the in-app frame guard covers it).
