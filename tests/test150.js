// Monthly totals (opt-in, GPS-verified; locked) + two small fixes (setup/88, js/48-share-totals.js).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const sql = read("setup/88-monthly-totals-and-fixes.sql");
ok(/share_totals boolean not null default false/.test(sql), "the opt-in is off by default");
ok(/p_on and not public\.gate_is_open\('monthly_totals'\)/.test(sql), "nobody can opt in while the switch is closed");
ok(/c\.caught_at >= ap\.share_totals_at/.test(sql) && /ap\.share_totals/.test(sql), "only catches after opting in count, and only while opted in");
ok(/g\.accuracy_m <= 100/.test(sql) && /<= 1800/.test(sql), "a GPS stamp must be 100 m or better and within 30 minutes of the catch");
ok(/p\.hidden_at is null/.test(sql) && /from public\.photos p where p\.catch_id = c\.id/.test(sql), "a visible photo is required");
ok(/count\(distinct v\.created_by\) >= p_min_people/.test(sql) && /monthly_totals_core\(p_year, p_month, 3\)/.test(sql), "a line needs at least 3 different people");
ok(/monthly_totals\([\s\S]*has_power\('dashboard'\)[\s\S]*gate_is_open\('monthly_totals'\)/.test(sql), "viewing needs the Dashboard box and the open switch");
ok(/select v\.area, v\.species, count\(\*\)::bigint, sum\(v\.n\)::bigint\s+from v/.test(sql), "the output is only area, species and counts: no per-person columns");

const js = read("js/48-share-totals.js");
const calls = [], boxes = { "share-totals-box": el("div"), "totals-admin": el("div"), "settings-btn": el("button") };
function el(t, c, txt) { const e = { t, c, text: txt || "", kids: [], style: {}, value: "", hidden: false, checked: false, appendChild(k) { this.kids.push(k); return k; }, insertBefore(k) { this.kids.unshift(k); }, addEventListener(ev, f) { this[ev] = f; }, setAttribute() {}, set innerHTML(v) { this.kids = []; } }; return e; }
function makeCtx(open) {
  boxes["share-totals-box"].kids = []; boxes["totals-admin"].kids = [];
  const ctx = {
    window: {}, me: { id: "u1" }, adminCan: () => true, el, document: { getElementById: id => boxes[id] },
    db: { rpc: async (n, a) => { calls.push([n, a]); if (n === "gate_is_open") return { data: open }; if (n === "my_share_totals") return { data: false }; if (n === "set_share_totals") return { data: a.p_on }; if (n === "monthly_totals") return { data: [{ area: "Florida", species: "Snook", catches: 5, fish: 6 }] }; return { data: 4 }; } }
  };
  vm.createContext(ctx); vm.runInContext(js + "\nthis.out = { shareTotalsRender, adminTotalsLoad, shareTotalsOn };", ctx); return ctx;
}
const tick = () => new Promise(r => setTimeout(r, 0));
(async () => {
  let c = makeCtx(false); await c.out.shareTotalsRender();
  ok(boxes["share-totals-box"].hidden === true && !boxes["share-totals-box"].kids.length, "Settings: switch closed => the opt-in is not shown");
  await c.out.adminTotalsLoad();
  ok(boxes["totals-admin"].kids.some(k => /Locked/.test(k.text)), "Admin Totals: switch closed => Locked");
  c = makeCtx(true); await c.out.shareTotalsRender();
  const lab = boxes["share-totals-box"].kids.find(k => k.c === "check-row"); const cb = lab.kids[0];
  ok(boxes["share-totals-box"].hidden === false && cb.checked === false, "Settings: switch open => the box shows, unticked");
  calls.length = 0; cb.checked = true; cb.change(); await tick();
  ok(calls.some(x => x[0] === "set_share_totals" && x[1].p_on === true), "ticking it saves the opt-in");
  await c.out.adminTotalsLoad();
  const go = boxes["totals-admin"].kids.find(k => k.text === "Show"), out = boxes["totals-admin"].kids[boxes["totals-admin"].kids.length - 1];
  const yr = boxes["totals-admin"].kids.find(k => k.t === "select"); yr.value = "2026";
  go.click(); await tick();
  ok(out.kids.some(k => /Florida · Snook: 5 catches, 6 fish/.test(k.text)) && out.kids.some(k => /CSV/.test(k.text)), "Admin Totals shows the lines and a CSV button");
  const js12 = read("js/12-contests-alerts.js"), js09 = read("js/09-map-forecast.js"), js11 = read("js/11-accounts-social.js");
  ok(/shareTotalsOn/.test(js12), "opted-in people get a GPS stamp when they log a catch live");
  ok(/my_hidden_spots/.test(js09) && /Hidden from others by the team/.test(js09), "owner sees a label on a spot the team hid");
  ok(/adminPhotoShown/.test(js11) && /photoN\[r\.target_id\] > 0/.test(js11), "Hide photo only shows only when the catch still has a photo");
  ok(read("index.html").includes("js/48-share-totals.js") && read("index.html").includes('id="share-totals-box"') && read("index.html").includes('id="totals-admin"') && read("sw.js").includes("./js/48-share-totals.js"), "script and sections are in index.html and the offline list");
  ok(/id: "totals"[^}]*dashboard/.test(read("js/40-admin-page.js")), "Admin page has a Totals section");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
