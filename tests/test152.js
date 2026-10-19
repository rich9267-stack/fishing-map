// One-time Terms banner for existing members (js/49-terms-banner.js, setup/89).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
function el(t, c, txt) { return { t, c, text: txt || "", kids: [], style: {}, hidden: false, appendChild(k) { this.kids.push(k); return k; }, addEventListener(ev, f) { this[ev] = f; }, set innerHTML(v) { this.kids = []; } }; }
const box = el("div"); box.hidden = true;
function ctx(version, fail) {
  const calls = [];
  const c = { el, me: { email: "a@b.com" }, toast() {}, window: {}, document: {},
    $: id => id === "terms-banner" ? box : null,
    db: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { terms_version: version } }) }) }) }),
      rpc: async (n, a) => { calls.push([n, a]); return fail ? { error: { message: "x" } } : { data: "ok" }; } } };
  vm.createContext(c); vm.runInContext(read("js/49-terms-banner.js") + "\nthis.out = { termsBannerCheck };", c); c.calls = calls; return c;
}
(async () => {
  let c = ctx(null); await c.out.termsBannerCheck();
  ok(!box.hidden && box.kids.length === 2, "member with no saved version sees the banner");
  const btns = box.kids[1].kids, link = btns[0], go = btns[1];
  ok(link.href === "terms.html" && go.text === "I understand", "banner has the Terms link and I understand");
  await go.click(); ok(c.calls[0][0] === "accept_terms" && c.calls[0][1].p_version === "2026-10-18" && box.hidden, "tapping I understand saves the version and hides the banner");
  c = ctx("2026-10-18"); await c.out.termsBannerCheck(); ok(box.hidden, "already accepted this version: no banner");
  c = ctx("2025-01-01"); await c.out.termsBannerCheck(); ok(!box.hidden, "older version: banner returns");
  c = ctx(null, true); await c.out.termsBannerCheck(); await box.kids[1].kids[1].click(); ok(!box.hidden, "failed save keeps the banner");
  const idx = read("index.html"), js11 = read("js/11-accounts-social.js");
  ok(idx.includes("js/49-terms-banner.js") && idx.includes('id="terms-banner"') && read("sw.js").includes("./js/49-terms-banner.js") && /termsBannerCheck\(\)/.test(js11), "wired into index.html, offline list and sign-in");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
