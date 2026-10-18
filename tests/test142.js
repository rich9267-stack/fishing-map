// Admin controls step 3: the Admin page (js/40-admin-page.js, Me > Admin).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const html = read("index.html"), js = read("js/40-admin-page.js");
ok(html.includes("js/40-admin-page.js") && read("sw.js").includes("./js/40-admin-page.js"), "page script is in index.html and the offline list");
ok(html.indexOf("js/40-admin-page.js") > html.indexOf("js/39-admin-log.js"), "loads after the log viewer");
["people", "reports", "pages", "rules", "dashboard", "log"].forEach(s => ok(new RegExp('<div data-asec="' + s + '">').test(html), "page has a " + s + " section"));
ok(/id="admin-nav"/.test(html), "page has the section button row");
ok(/<div class="label">Admin<\/div>/.test(html), "page is titled Admin");
ok(/handleGo|go === "admin"/.test(read("js/12-contests-alerts.js")) && /go === "admin"[^\n]*adminPageOpen/.test(read("js/12-contests-alerts.js")), "?go=admin&sec= link opens a section");
ok(/go === "invite"/.test(read("js/12-contests-alerts.js")), "old ?go=invite alert link still works");
ok(/go === "problems"/.test(read("js/12-contests-alerts.js")), "problem alert link still works");

// run the page logic with a tiny fake page
function make(powers) {
  const nav = { innerHTML: "", kids: [], appendChild(b) { this.kids.push(b); } };
  const secs = ["people", "reports", "pages", "rules", "dashboard", "log"].map(id => ({ dataset: { asec: id }, hidden: false }));
  const card = { querySelectorAll: () => secs };
  let problems = 0;
  const ctx = {
    adminCan: p => powers.includes(p), goProblems: () => problems++,
    el: (t, c, txt) => ({ tag: t, className: c, text: txt, dataset: {}, setAttribute() {}, addEventListener(e, f) { this.click = f; } }),
    document: { getElementById: id => id === "invite-card" ? card : id === "admin-nav" ? nav : { addEventListener() {}, click() {} }, querySelector: () => null }
  };
  ctx.window = {};
  vm.createContext(ctx); vm.runInContext(js, ctx);
  return { ctx, nav, secs, probs: () => problems };
}
let t = make(["people", "reports", "pages", "rules", "problems", "dashboard", "read_log"]);
t.ctx.window.adminPageShow("reports");
ok(t.nav.kids.length === 8, "an admin with these boxes sees 8 section buttons");
ok(t.secs.filter(s => !s.hidden).map(s => s.dataset.asec).join() === "reports", "only the chosen section shows");
t.nav.kids = []; t.ctx.window.adminPageShow("problems");
ok(t.probs() === 1, "Problems button opens the problem list");
t = make(["reports", "read_log"]);
t.ctx.window.adminPageShow("pages");
ok(t.nav.kids.length === 3 && t.secs.filter(s => !s.hidden).map(s => s.dataset.asec).join() === "reports", "an admin without a box doesn't see that section (falls back to the first allowed)");
console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
