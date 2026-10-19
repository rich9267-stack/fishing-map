// Admin controls step 8: fix an official place (setup/85, js/45-admin-official.js).
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const sql = read("setup/85-fix-official-places.sql");
ok(/admin_official_edit[\s\S]*has_power\('official_places'\)/.test(sql) && /admin_official_find[\s\S]*has_power\('official_places'\)/.test(sql), "fixing needs the Official places box");
ok(/not in Florida/.test(sql), "a place can't be moved outside Florida");
ok(/original = coalesce\(o\.original/.test(sql), "the first-ever values are kept");
ok(/guard_official/.test(sql) && /new\.name := old\.name/.test(sql) && /app\.admin_rpc/.test(sql), "a data reload can't undo a fix");
ok(/This place was fixed by an admin; put back the original first/.test(sql), "a fixed place can't be deleted by a reload");
ok(/official_place_fixed/.test(sql) && /official_place_reverted/.test(sql), "fixes are logged");
ok(!/\|\| new\.lat|\|\| new\.lng/.test(sql), "no coordinates in the log text");

const js = read("js/45-admin-official.js");
const calls = [];
function el(t, c, txt) { const e = { t, c, text: txt || "", kids: [], style: {}, value: "", checked: false, appendChild(k) { this.kids.push(k); return k; }, addEventListener(ev, f) { this[ev] = f; }, setAttribute() {}, remove() {}, set innerHTML(v) { this.kids = []; }, get textContent() { return this.text; }, set textContent(v) { this.text = v; } }; return e; }
const box = el("div");
const ctx = {
  adminCan: () => true, el, toast() {}, askOk: async () => true, LAT: 26, LNG: -80, window: { adminPageOpen() {} }, officialCells: {}, officialCellKey: () => "k", officialRebuild() {},
  loadOfficialSpots: async () => true, map: { getCenter: () => ({ lat: 26.5, lng: -80.2 }) },
  document: { getElementById: id => id === "official-admin" ? box : null, createTextNode: t => ({ t }) },
  db: { rpc: async (n, a) => { calls.push([n, a]); return n === "admin_official_find" ? { data: [{ id: 7, source: "fwc-ramp", name: "Old Ramp", kind: "ramp", lat: 26.1, lng: -80.1, active: true, edited: false, county: "Broward" }] } : {}; } }
};
vm.createContext(ctx);
vm.runInContext(js + "\nthis.out = { adminOfficialLoad };", ctx);
(async () => {
  ctx.out.adminOfficialLoad();
  const near = box.kids.find(k => k.text === "📌 Near my map"), list = box.kids[box.kids.length - 1];
  near.click(); await new Promise(r => setTimeout(r, 0));
  ok(calls.some(x => x[0] === "admin_official_find" && x[1].p_lat === 26.5 && x[1].p_q === null), "Near my map searches around the map centre");
  const card = list.kids[0];
  ok(/Old Ramp/.test(card.kids[0].text) && /FWC ramp list/.test(card.kids[1].text), "result shows name and where it came from");
  const fix = card.kids.find(k => k.text === "🛠 Fix this place"); fix.click();
  const ed = card.kids[card.kids.length - 1], inputs = ed.kids.filter(k => k.t === "input" && k.type === "text");
  inputs[0].value = "New Ramp Name"; inputs[1].value = "26.2"; inputs[2].value = "-80.2";
  const save = ed.kids.find(k => k.c === "feed-actions").kids[0]; calls.length = 0; save.click(); await new Promise(r => setTimeout(r, 0));
  const e = calls.find(x => x[0] === "admin_official_edit");
  ok(e && e[1].p_id === 7 && e[1].p_name === "New Ramp Name" && e[1].p_lat === 26.2 && e[1].p_active === true, "Save sends the new name, position and on/off");
  const js37 = read("js/37-official-layer.js"), j40 = read("js/40-admin-page.js");
  ok(/adminOfficialFix\(o\)/.test(js37), "the map tap card has a Fix this place button for admins");
  ok(/id: "official"[^}]*official_places/.test(j40), "Admin page has a Places section for the Official places box");
  ok(read("index.html").includes("js/45-admin-official.js") && read("index.html").includes('id="official-admin"') && read("sw.js").includes("./js/45-admin-official.js"), "script and section are in index.html and the offline list");
  ok(/official_place_fixed/.test(read("js/39-admin-log.js")), "log has plain words for fixes");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
