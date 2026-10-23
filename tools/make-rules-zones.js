// Builds data/zones-rules.json: the "special fishing rules apply" areas (NOAA Marine Protected Areas inventory: Florida's list + the rest of the
// country) where recreational fishing is restricted but not banned. js/33 uses it for the ℹ️ chip on spots inside such an area.
// (No-take / no-access areas are the solid red ones in the database table protected_zones; commercial-only rules are left out.)
// Run on the computer (Node 18+):  node tools/make-rules-zones.js     Then: sh bump.sh, commit, push.
const fs = require("fs"), path = require("path");
const SRC = [
  ["https://services1.arcgis.com/eGSDp8lpKe5izqVc/ArcGIS/rest/services/Marine_Protected_Areas__MPAIs_/FeatureServer/0/query", "1=1"],
  ["https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/NOAA_MPA_Inventory_2023/FeatureServer/0/query", "State IS NULL OR State NOT LIKE '%FL%'"]];
const r4 = v => Math.round(v * 1e3) / 1e3;
const ring = rg => { const o = []; rg.forEach(p => { const q = [r4(p[0]), r4(p[1])]; const l = o[o.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) o.push(q); }); return o.length >= 4 ? o : null; };
const polys = g => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []).map(p => p.map(ring).filter(Boolean)).filter(p => p.length && p[0]);
(async () => {
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
  const out = path.join(__dirname, "..", "data", "zones-rules.json");
  fs.writeFileSync(out, JSON.stringify({ t: new Date().toISOString().slice(0, 10), items }));
  console.log(items.length, "areas,", (fs.statSync(out).size / 1e6).toFixed(2), "MB");
})();
