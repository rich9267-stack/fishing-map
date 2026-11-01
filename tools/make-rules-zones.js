// Builds data/zones-rules/<ST>.json (one file per state) + data/zones-rules/index.json: the "special fishing rules apply" areas (NOAA Marine Protected Areas inventory: Florida's list + the rest of the
// country) where recreational fishing is restricted but not banned. js/33 uses it for the ℹ️ chip on spots inside such an area.
// (No-take / no-access areas are the solid red ones in the database table protected_zones; commercial-only rules are left out.)
// v262 (speed plan step 3): split by state so a phone downloads only the states it checks spots in. index.json lists each file's area boxes (tiny);
// js/33 reads it and fetches a state's file only when a spot / your position falls inside one of its boxes.
// State = the state the area's middle is in (js/53 stateOf); far-off areas (Alaska, Hawaii, islands) get AK / HI / CAR / PAC.
// Run on the computer (Node 18+):  node tools/make-rules-zones.js     Then: sh bump.sh, commit, push.
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
function stateOfLoader() {
  const ctx = { Math, JSON, isFinite, Array, Object, Set };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, "js/53-us-states.js"), "utf8") + "\nthis.stateOf = stateOf;", ctx);
  return ctx.stateOf;
}
function fileFor(o, stateOf) {
  const lat = (o.b[0] + o.b[2]) / 2, lng = (o.b[1] + o.b[3]) / 2;
  const st = stateOf(lat, lng); if (st) return st;
  if (lat > 50) return "AK";
  if (lat > 17.5 && lat < 23.5 && lng > -161 && lng < -154) return "HI";
  if (lng > -70 && lng < -60 && lat < 20) return "CAR";
  return "PAC";
}
// An area's box(es) for the index: one per half of the globe, so an area crossing the 180° line (Pacific monuments) doesn't get a box around the whole world
function boxesOf(o) {
  const bx = {};
  const polys = o.g.type === "Polygon" ? [o.g.coordinates] : o.g.coordinates;
  polys.forEach(pl => pl[0].forEach(([x, y]) => {
    const k = x < 0 ? "w" : "e", b = bx[k] = bx[k] || [90, 180, -90, -180];
    b[0] = Math.min(b[0], y); b[1] = Math.min(b[1], x); b[2] = Math.max(b[2], y); b[3] = Math.max(b[3], x);
  }));
  return Object.values(bx);
}
// Writes the per-state files + index.json (and removes the old single file)
function writeSplit(items, t) {
  const stateOf = stateOfLoader(), dir = path.join(ROOT, "data", "zones-rules"), by = {};
  items.forEach(o => { const f = fileFor(o, stateOf); (by[f] = by[f] || []).push(o); });
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const index = { t, files: {} };
  Object.keys(by).sort().forEach(f => {
    fs.writeFileSync(path.join(dir, f + ".json"), JSON.stringify({ t, items: by[f] }));
    index.files[f] = [].concat(...by[f].map(boxesOf));
  });
  fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(index));
  fs.rmSync(path.join(ROOT, "data", "zones-rules.json"), { force: true });
  return by;
}
module.exports = { writeSplit, fileFor, boxesOf };
const SRC = [
  ["https://services1.arcgis.com/eGSDp8lpKe5izqVc/ArcGIS/rest/services/Marine_Protected_Areas__MPAIs_/FeatureServer/0/query", "1=1"],
  ["https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/NOAA_MPA_Inventory_2023/FeatureServer/0/query", "State IS NULL OR State NOT LIKE '%FL%'"]];
const r4 = v => Math.round(v * 1e3) / 1e3;
const ring = rg => { const o = []; rg.forEach(p => { const q = [r4(p[0]), r4(p[1])]; const l = o[o.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) o.push(q); }); return o.length >= 4 ? o : null; };
const polys = g => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []).map(p => p.map(ring).filter(Boolean)).filter(p => p.length && p[0]);
if (require.main === module) (async () => {
  const items = [], seen = new Set();
  for (const [u, w] of SRC) {
    const qs = new URLSearchParams({ where: w, outFields: "Site_ID,Site_Name,Prot_Lvl,Fish_Rstr,Mgmt_Agen,URL,Anchor,Vessel", outSR: "4326", maxAllowableOffset: "0.02", resultRecordCount: "1000", f: "geojson" });
    const j = await (await fetch(u + "?" + qs)).json();
    if (!Array.isArray(j.features)) throw new Error("bad answer from " + u);
    j.features.forEach(f => {
      const p = f.properties || {};
      if (/^(no take|no access)$/i.test(p.Prot_Lvl || "")) return;                       // solid red ones live in the database
      if (!/recreational fishing (restricted|prohibited)/i.test(p.Fish_Rstr || "")) return;   // no rule for anglers (or only commercial)
      if (!f.geometry || !p.Site_Name || /to be avoided/i.test(p.Site_Name)) return;   // ("Areas to be Avoided" = ship routing, not a fishing rule)
      const g = polys(f.geometry); if (!g.length) return;
      const key = (p.Site_ID || p.Site_Name) + ""; if (seen.has(key)) return; seen.add(key);
      let a = 90, b = 180, c = -90, d = -180;
      g.forEach(pl => pl[0].forEach(([x, y]) => { a = Math.min(a, y); c = Math.max(c, y); b = Math.min(b, x); d = Math.max(d, x); }));
      const o = { n: p.Site_Name.trim(), f: p.Fish_Rstr.trim(), b: [a, b, c, d], g: g.length === 1 ? { type: "Polygon", coordinates: g[0] } : { type: "MultiPolygon", coordinates: g } };
      if (p.Prot_Lvl) o.p = p.Prot_Lvl; if (p.Mgmt_Agen) o.a = p.Mgmt_Agen.trim(); if (/^https?:\/\//.test((p.URL || "").trim())) o.u = p.URL.trim();
      if (p.Anchor && p.Anchor !== "Unrestricted") o.an = p.Anchor; if (p.Vessel && p.Vessel !== "Unrestricted") o.v = p.Vessel;
      items.push(o);
    });
  }
  const by = writeSplit(items, new Date().toISOString().slice(0, 10));
  console.log(items.length, "areas in", Object.keys(by).length, "files");
})();
