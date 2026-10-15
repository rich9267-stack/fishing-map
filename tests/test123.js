// Sign-up / sign-in "security check" (Cloudflare Turnstile) in js/11-accounts-social.js, plus the policy that lets it load.
// Runs the sign-in part of the file with a tiny fake page: with no key nothing changes; with a key the token is required and sent.
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const src = read("js/11-accounts-social.js");
const part = src.slice(src.indexOf("// ---- Sign-in"), src.indexOf("async function gate()"));
ok(part.includes("TURNSTILE_SITE_KEY") && part.includes("captchaToken"), "the sign-in section holds the security-check code");

function run(siteKey) {
  const code = part.replace(/const TURNSTILE_SITE_KEY = "[^"]*";/, `const TURNSTILE_SITE_KEY = "${siteKey}";`);
  const nodes = {}, calls = [], log = { scripts: [], renders: [], resets: [], gated: 0 };
  const node = () => ({ hidden: false, textContent: "", className: "", value: "", required: false, autocomplete: "", disabled: false, dataset: {}, handlers: {}, addEventListener(t, f) { this.handlers[t] = f; } });
  const $ = id => nodes[id] || (nodes[id] = node());
  const win = {};
  const doc = {
    createElement: () => ({}),
    head: { appendChild(s) { log.scripts.push(s.src); win.turnstile = {
      render: (sel, opts) => { log.renders.push({ sel, opts }); return "w1"; },
      reset: id => log.resets.push(id) }; Promise.resolve().then(() => s.onload && s.onload()); } },
    querySelectorAll: () => []
  };
  const db = { auth: {
    signInWithPassword: async a => { calls.push(["signin", a]); return { error: null }; },
    signUp: async a => { calls.push(["signup", a]); return { data: { session: null }, error: null }; },
    resetPasswordForEmail: async (e, o) => { calls.push(["reset", e, o]); return { error: null }; },
    updateUser: async a => { calls.push(["newpw", a]); return { error: null }; } } };
  const ctx = { console, Promise, setTimeout, $, db, window: win, document: doc, location: { origin: "https://x.test", pathname: "/fishing-map/", hash: "" }, history: { replaceState() {} },
    async gate() { log.gated++; } };
  vm.createContext(ctx);
  vm.runInContext(code + "\nthis.api = { showAuth, captchaNeeded, setMode: m => { authMode = m; } };", ctx);
  return { api: ctx.api, $, calls, log, win, submit: () => nodes["auth-form"].handlers.submit({ preventDefault() {} }) };
}
const fill = (t, email, pw) => { t.$("a-email").value = email; t.$("a-pw").value = pw; t.$("a-name").value = "Sam"; };
const tick = () => new Promise(r => setTimeout(r, 0));

(async () => {
  // 1) no key: exactly as before
  let t = run("");
  t.api.showAuth("signin"); await tick();
  ok(t.log.scripts.length === 0 && t.$("auth-captcha").hidden === true, "no key: no outside script is loaded and the check stays hidden");
  fill(t, "a@b.com", "password1"); await t.submit();
  ok(t.calls.length === 1 && t.calls[0][0] === "signin" && !("captchaToken" in t.calls[0][1].options), "no key: sign-in works as before with no token");

  // 2) with a key
  t = run("0xTESTKEY");
  t.api.showAuth("signin"); await tick(); await tick();
  ok(t.log.scripts.length === 1 && /^https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/.test(t.log.scripts[0]), "key set: Cloudflare's script is loaded");
  ok(t.$("auth-captcha").hidden === false && t.log.renders.length === 1 && t.log.renders[0].opts.sitekey === "0xTESTKEY", "key set: the check is shown with the site key");
  fill(t, "a@b.com", "password1"); await t.submit();
  ok(t.calls.length === 0 && /security check/i.test(t.$("auth-msg").textContent), "no token yet: nothing is sent, the person is asked to wait");
  t.log.renders[0].opts.callback("tok-1"); await t.submit();
  ok(t.calls.length === 1 && t.calls[0][0] === "signin" && t.calls[0][1].options.captchaToken === "tok-1", "sign-in sends the token");
  ok(t.log.resets.length === 1 && t.log.resets[0] === "w1", "the check is reset after use (each token works once)");
  await t.submit();
  ok(t.calls.length === 1, "a used token can't be sent again");

  t.api.showAuth("signup"); t.log.renders[0].opts.callback("tok-2"); fill(t, "n@b.com", "password1"); await t.submit();
  const su = t.calls.find(c => c[0] === "signup");
  ok(su && su[1].options.captchaToken === "tok-2" && su[1].options.data.name === "Sam" && su[1].options.emailRedirectTo, "sign-up sends the token and keeps its name + redirect");
  t.api.showAuth("reset"); t.log.renders[0].opts.callback("tok-3"); fill(t, "n@b.com", ""); await t.submit();
  const rs = t.calls.find(c => c[0] === "reset");
  ok(rs && rs[2].captchaToken === "tok-3" && rs[2].redirectTo, "password reset sends the token");
  t.api.showAuth("newpw");
  ok(t.$("auth-captcha").hidden === true && !t.api.captchaNeeded(), "choosing a new password (already signed in by the email link) needs no check");
  fill(t, "", "newpassword1"); await t.submit();
  ok(t.calls.find(c => c[0] === "newpw"), "new-password step is not blocked by the check");

  // wording for a failed check (the fake database never fails, so the file text is checked)
  ok(/captcha\/i\.test\(m\) \? "The security check didn't pass/.test(part), "a failed check gets a plain-language message");

  // 3) the page's security policy lets the check load
  const html = read("index.html");
  const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  const dir = n => (csp.split(";").map(x => x.trim()).find(x => x.startsWith(n + " ")) || "");
  ok(dir("script-src").includes("https://challenges.cloudflare.com"), "policy: script-src allows Cloudflare's check");
  ok(dir("frame-src") === "frame-src https://challenges.cloudflare.com", "policy: frames allowed only from Cloudflare's check");
  ok(dir("connect-src").includes("https://challenges.cloudflare.com"), "policy: connect-src allows Cloudflare's check");
  ok(/id="auth-captcha"/.test(html) && /id="auth-captcha-box"/.test(html), "index.html has the spot for the check");
  ok(/TURNSTILE_SITE_KEY = "(|0x[0-9A-Za-z_-]{15,})";/.test(src), "the shipped site key is empty or a real-looking Turnstile site key (never a secret key)");
  ok(!/0x4[0-9A-Za-z_-]{15,}/.test(src.replace(/TURNSTILE_SITE_KEY = "[^"]*"/, "")), "no other Turnstile-style key sits in the code");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
