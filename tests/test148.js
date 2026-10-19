// Admin controls step 9 (first half): the locked private-spot view (setup/86, js/46-admin-private.js).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const sql = read("setup/86-private-spot-view.sql");
ok(/\('private_spots', false/.test(sql) && /\('monthly_totals', false/.test(sql), "both master switches start closed");
ok(/admin_open_private_spot[\s\S]*has_power\('open_private_spots'\)[\s\S]*gate_is_open\('private_spots'\)/.test(sql), "opening needs the box AND the open switch");
ok(/length\(p_reason\) < 10/.test(sql), "opening needs a typed reason");
ok(/log_admin\('private_spot_opened'[^;]*s\.name[^;]*reason/.test(sql) && !/log_admin\([^;]*s\.(lat|lng)/.test(sql), "the opening is logged with the reason and no coordinates");
ok(/revoke all on public\.gate_switches from anon, authenticated/.test(sql), "the switches can't be read or changed from the app");
ok(/visibility = 'private'/.test(sql), "only private spots go through this view");

const calls = [];
function el(t, c, txt) { const e = { t, c, text: txt || "", kids: [], style: {}, value: "", appendChild(k) { this.kids.push(k); return k; }, addEventListener(ev, f) { this[ev] = f; }, setAttribute() {}, set innerHTML(v) { this.kids = []; } }; return e; }
const box = el("div");
function makeCtx(open, can) {
  box.kids = [];
  const ctx = {
    adminCan: p => can && p === "open_private_spots", el, alert() {}, askReason: async () => "checking a reported catch here",
    document: { getElementById: id => id === "private-admin" ? box : null }, window: {},
    db: { rpc: async (n, a) => { calls.push([n, a]); if (n === "gate_is_open") return { data: open }; if (n === "admin_private_spot_find") return { data: [{ id: "s1", name: "Secret hole", owner_name: "Tess", spot_type: "dock", water_type: "saltwater" }] }; return { data: [{ name: "Secret hole", owner_name: "Tess", spot_type: "dock", water_type: "saltwater", notes: "", lat: 26.1, lng: -80.1 }] }; } }
  };
  vm.createContext(ctx); vm.runInContext(read("js/46-admin-private.js") + "\nthis.out = { adminPrivateLoad };", ctx); return ctx;
}
(async () => {
  let c = makeCtx(false, true); await c.out.adminPrivateLoad();
  ok(box.kids.some(k => /Locked/.test(k.text)) && !box.kids.some(k => k.t === "input"), "switch closed: shows Locked and no search box");
  c = makeCtx(true, false); await c.out.adminPrivateLoad();
  ok(box.kids.length === 0, "no box ticked (or not owner): nothing shown");
  c = makeCtx(true, true); calls.length = 0; await c.out.adminPrivateLoad();
  const q = box.kids.find(k => k.t === "input"), go = box.kids.find(k => k.text === "Search"), list = box.kids[4];
  q.value = "secret"; await go.click(); await new Promise(r => setTimeout(r, 0));
  ok(calls.some(x => x[0] === "admin_private_spot_find" && x[1].p_q === "secret"), "search calls the server");
  const btn = list.kids[0].kids.find(k => /Open/.test(k.text)); await btn.click(); await new Promise(r => setTimeout(r, 0));
  ok(calls.some(x => x[0] === "admin_open_private_spot" && x[1].p_spot === "s1" && /reported catch/.test(x[1].p_reason)), "opening sends the spot and the typed reason");
  ok(read("index.html").includes("js/46-admin-private.js") && read("index.html").includes('id="private-admin"') && read("sw.js").includes("./js/46-admin-private.js"), "script and section are in index.html and the offline list");
  ok(/id: "private"[^}]*open_private_spots/.test(read("js/40-admin-page.js")) && /private_spot_opened/.test(read("js/39-admin-log.js")), "Admin page section and log words exist");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
