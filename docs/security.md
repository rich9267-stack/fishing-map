# Fishing Map — security (plain language)

Last audit: Oct 15, 2026 (v109). Re-run the audit before each wave of new testers: Supabase → Advisors → Security, and `cd tests && node test122.js`.

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
4. **Authentication → Rate Limits:** keep email sending low (Gmail allows ~500/day; a bot could use it all and block password resets). **Attack Protection → CAPTCHA** (free Cloudflare Turnstile) is the proper fix against bot sign-ups — needs a small app change; ask Claude when you open sign-ups wider than invite-only.
5. **Turn on 2-step sign-in** for your Supabase, GitHub and Google accounts. Your account is the admin key to everything.
6. **GitHub → repo Settings → Code security:** turn on Secret scanning + push protection and Dependabot alerts (free on public repos).
7. Run `setup/67-lock-down-signed-out.sql` in the SQL Editor once v109 is confirmed good on your phone (it has an UNDO block at the bottom).
8. Weekly while testers join: Supabase → Storage / Database usage (free limits 1 GB photos, 500 MB database).

## Known design choices (not bugs)
- Every approved member can see every other member's handle, display name and "home area" (needed for Find friends). Say so to testers; the privacy page should match.
- `spots_visible` (a SECURITY DEFINER view) is the advisor's one ERROR. It is how blurred public pins work; it checks membership inside.
- Members can upload up to 5 MB per photo with no per-person total; watch storage usage.
- One admin account (Richard). Admins can't delete their account from the app.

## Next hardening ideas (not done)
- CAPTCHA on sign-up/sign-in. Per-person caps on comments/reports. A per-person photo cap. A CSP `frame-ancestors` header (GitHub Pages can't send headers; the in-app frame guard covers it).
