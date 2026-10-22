// ---- 〰 Lake depth lines + 🏞 public fishing water outside Florida (US plan step 7, last piece) ----
// Only for states whose fish & wildlife (or environment) agency puts its lake maps on a free map server. Florida keeps FWC's layers
// (js/22, js/23) exactly as before: nothing here asks anything while the map shows only Florida (and open water / other countries).
// Every source is asked only for the part of the map on screen, so nothing is stored in our database.
const USL_ZOOM_DEPTH = 13, USL_ZOOM_WATER = 9;
// depth: field = the depth number on each line, m = the source counts in meters (we show feet)
const USL_DEPTH = {
  MN: { url: "https://enterprise.gisdata.mn.gov/aghost/rest/services/us_mn_state_dnr/water_lake_bathymetry/MapServer/0", field: "abs_depth", lake: "lake_name", who: "Minnesota DNR" },
  MI: { url: "https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/DNRHydrologyOPENDATA/FeatureServer/1", field: "MinDepth", lake: "Name", who: "Michigan DNR" },
  IN: { url: "https://gisdata.in.gov/server/rest/services/Hosted/Lake_Bathymetry_RO/FeatureServer/0", field: "contour", lake: "lake_name", who: "Indiana DNR" },
  NE: { url: "https://services5.arcgis.com/IOshH1zLrIieqrNk/arcgis/rest/services/LakeContours/FeatureServer/0", field: "Depth", lake: "Name", who: "Nebraska Game & Parks" },
  NJ: { url: "https://services1.arcgis.com/QWdNfRs7lkPq4g4Q/arcgis/rest/services/Lake_Bathymetry_Contours_in_New_Jersey/FeatureServer/1", field: "VAL2NUM", lake: "WATBODNM", who: "New Jersey DEP", m: true },
  MA: { url: "https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/MassWildlife_Inland_Bathymetry/MapServer/0", field: "DEPTH", lake: "NAME", who: "MassWildlife" },
  NH: { url: "https://nhgeodata.unh.edu/hosting/rest/services/Hosted/EDP_Bathymetry_Lakes/FeatureServer/0", field: "depth", lake: "lake", who: "New Hampshire DES" },
  ND: { url: "https://ndgishub.nd.gov/arcgis/rest/services/Applications/GNF_LakeContoursCached/MapServer/0", field: "CONTOUR", lake: "LAKE_NAME", who: "North Dakota Game & Fish" },
  WV: { url: "https://services9.arcgis.com/SQbkdxLkuQJuLGtx/arcgis/rest/services/West_Virginia_Public_Fishing_Lake_Contours/FeatureServer/9", field: "Contour", lake: "LakeName", who: "West Virginia DNR" },
  WA: { url: "https://services.arcgis.com/6lCKYNJLvwTXqrmp/arcgis/rest/services/ECY/FeatureServer/3", field: "Depth", lake: "GNIS_Name", who: "Washington Ecology" }
};
// public fishing water: name = its name field, sub = a second line, link = a web page field, where = only these rows, kind = what it is
const USL_WATER = {
  NC: [{ url: "https://services1.arcgis.com/YfqBAUM5nWR3yhGP/arcgis/rest/services/NCWRC_Public_Fishing_Areas_view/FeatureServer/0", name: "PFA_Name", sub: "County", subEnd: " County", kind: "Public fishing area", who: "NC Wildlife Resources Commission", where: "Site_Status='OPEN'" }],
  WV: [{ url: "https://services9.arcgis.com/SQbkdxLkuQJuLGtx/arcgis/rest/services/West_Virginia_Public_Fishing_Lakes/FeatureServer/29", name: "LakeName", sub: "County_1", subEnd: " County", kind: "Public fishing lake", who: "West Virginia DNR" }],
  NM: [{ url: "https://services2.arcgis.com/CjbW1bVhK4dB3WOa/arcgis/rest/services/Fishing_Waters_Map/FeatureServer/5", name: "Waterbody_Name", sub: "Access_Name", kind: "Fishing access", who: "New Mexico Game & Fish" }],
  NJ: [{ url: "https://services1.arcgis.com/QWdNfRs7lkPq4g4Q/arcgis/rest/services/Envr_admin_DFW_places_to_fish_wb/FeatureServer/0", name: "WATERBODY", sub: "NEAREST_TOWN", subStart: "Near ", kind: "Great Fishing Close to Home water", who: "New Jersey Fish & Wildlife" }],
  MN: [{ url: "https://enterprise.gisdata.mn.gov/aghost/rest/services/us_mn_state_dnr/water_fishing_in_neighborhood/FeatureServer/0", name: "pw_basin_name", sub: "cty_name", subEnd: " County", kind: "Fishing in the Neighborhood pond", who: "Minnesota DNR" },
       { url: "https://enterprise.gisdata.mn.gov/aghost/rest/services/us_mn_state_dnr/struc_fishing_sites_in_minnesota/FeatureServer/0", name: "facility_name", sub: "fishing_site_type", kind: "Public fishing site", who: "Minnesota DNR" }],
  KY: [{ url: "https://services3.arcgis.com/ghsX9CKghMvyYjBU/arcgis/rest/services/Ky_KDFWR_Lakes/FeatureServer/0", name: "NAME", kind: "Lake managed for fishing", who: "Kentucky Fish & Wildlife", where: "FishMgmt='Yes'" }],
  VA: [{ url: "https://services1.arcgis.com/PxUNqSbaWFvFgHnJ/arcgis/rest/services/PublicFishingLakes/FeatureServer/0", name: "NAME", sub: "Boat_Motor", kind: "Public fishing lake", who: "Virginia's public fishing lakes list" }],
  NE: [{ url: "https://services5.arcgis.com/IOshH1zLrIieqrNk/arcgis/rest/services/LakePoints/FeatureServer/0", name: "Name", sub: "County", subEnd: " County", kind: "Lake with a state lake map", who: "Nebraska Game & Parks" }],
  MT: [{ url: "https://services3.arcgis.com/Cdxz8r11hT0MGzg1/arcgis/rest/services/FWPLND_FAS_POINTS/FeatureServer/0", name: "NAME", sub: "BOAT_FAC", link: "WEB_PAGE", kind: "Fishing Access Site", who: "Montana FWP" }],
  MI: [{ url: "https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/family_friendly_fishing_readonly/FeatureServer/0", name: "Waterbody_Name", sub: "County", subEnd: " County", kind: "Family-friendly fishing spot", who: "Michigan DNR" }],
  IN: [{ url: "https://gisdata.in.gov/server/rest/services/Hosted/Fish_Access_RO/FeatureServer/0", name: "site_name", sub: "county", subEnd: " County", kind: "Public fishing access", who: "Indiana DNR" }]
};

// Which states other than Florida does the map on screen reach? (9 points across the view; open water and other countries don't count)
function uslStatesInView() {
  const out = new Set();
  if (typeof map === "undefined" || !map || typeof stateOf !== "function") return out;
  const b = map.getBounds(), w = b.getWest(), e = b.getEast(), s = b.getSouth(), n = b.getNorth();
  for (const fy of [0, 0.5, 1]) for (const fx of [0, 0.5, 1]) {
    const st = stateOf(s + (n - s) * fy, w + (e - w) * fx);
    if (st && st !== "FL") out.add(st);
  }
  return out;
}
const uslBox = () => { const b = map.getBounds(); return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(v => v.toFixed(4)).join(","); };
const uslVal = v => (v == null || String(v).trim() === "" ? "" : String(v).trim());
const uslTitle = x => /[a-z]/.test(x) ? x : x.toLowerCase().replace(/(^|[\s-])\w/g, m => m.toUpperCase());   // CRAWFORD LAKE → Crawford Lake
function uslQuery(src, box, fields, extra) {
  return `${src.url}/query?where=${encodeURIComponent(src.where || "1=1")}&geometry=${box}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=${encodeURIComponent(fields)}&outSR=4326${extra}`;
}
async function uslGet(url) {
  try { const r = await fetch(url); if (!r.ok) return null; const d = await r.json(); return d.error || !Array.isArray(d.features) ? null : d.features; } catch (e) { return null; }
}

// ---- 〰 depth lines: drawn in blue on top of FWC's (which stop at Florida's lakes) ----
let uslDepLayer = null, uslDepSeq = 0, uslDepMsg = "";
const uslDepthFt = (src, v) => { v = Math.abs(Number(v)); return isFinite(v) ? (src.m ? v * 3.28084 : v) : NaN; };
async function uslDepthDraw() {
  const seq = ++uslDepSeq;
  if (uslDepLayer && map) { map.removeLayer(uslDepLayer); uslDepLayer = null; }
  uslDepMsg = "";
  if (typeof depOn === "undefined" || !depOn || !map) return;
  const sts = [...uslStatesInView()].filter(st => USL_DEPTH[st]);
  if (!sts.length || map.getZoom() < USL_ZOOM_DEPTH) return;
  const off = "&maxAllowableOffset=" + (360 / (256 * Math.pow(2, map.getZoom()))).toFixed(6);
  const all = await Promise.all(sts.map(st => uslGet(uslQuery(USL_DEPTH[st], uslBox(), USL_DEPTH[st].field, off + "&returnGeometry=true&resultRecordCount=2000&f=geojson"))));
  if (seq !== uslDepSeq || !depOn) return;
  const g = L.layerGroup();
  all.forEach(fs => (fs || []).forEach(f => { if (f.geometry) L.geoJSON(f, { style: { color: "#1f6fb2", weight: 1.2, opacity: 0.85, fill: false }, interactive: false }).addTo(g); }));
  g.addTo(map); uslDepLayer = g;
  uslDepMsg = all.some(x => x === null) ? "Couldn't load some lake depth lines right now — try again later." : "";
  if (typeof depNote === "function") depNote();
}
function uslDepthOff() { uslDepSeq++; if (uslDepLayer && map) map.removeLayer(uslDepLayer); uslDepLayer = null; uslDepMsg = ""; }
// The note under the map when the middle of the view is in another state; null = Florida's note as before
function uslDepthNote(z) {
  const i = typeof rulesInfo === "function" ? rulesInfo() : null;
  if (!i || !i.outside || !i.state) return null;
  const nm = (typeof STATE_NAMES !== "undefined" && STATE_NAMES[i.state]) || i.state, src = USL_DEPTH[i.state];
  if (!src) return `No free lake depth lines for ${nm} yet. Ocean depth lines show where FWC's Southeast map reaches. A guide only, not for navigation.`;
  return (z < USL_ZOOM_DEPTH ? `Zoom in on a lake to see ${src.who}'s depth lines.` : `〰 Lake depth lines from ${src.who} (blue), on lakes it has surveyed. Tap near a line to read its depth.`) +
    (uslDepMsg ? " " + uslDepMsg : "") + " A guide only, not for navigation.";
}
// tap: the lines near the tap in the states on screen → { vals: [feet], who } (null = a server didn't answer, empty = no line)
async function uslDepthAsk(box, z) {
  const sts = [...uslStatesInView()].filter(st => USL_DEPTH[st]);
  if (!sts.length || z < USL_ZOOM_DEPTH) return { vals: [], who: "" };
  const res = await Promise.all(sts.map(st => uslGet(uslQuery(USL_DEPTH[st], box, USL_DEPTH[st].field, "&returnGeometry=false&resultRecordCount=20&f=json"))
    .then(fs => fs && { st, vals: fs.map(f => uslDepthFt(USL_DEPTH[st], (f.attributes || {})[USL_DEPTH[st].field])).filter(v => isFinite(v) && v > 0) })));
  if (res.every(r => r === null)) return null;
  const hit = res.filter(r => r && r.vals.length);
  return { vals: hit.flatMap(r => r.vals), who: hit.map(r => USL_DEPTH[r.st].who).join(" / ") };
}

// ---- 🏞 public fishing water: green, like FWC's public lakes ----
let uslWaterLayer = null, uslWaterSeq = 0, uslWaterMsg = "";
async function uslWaterLoad() {
  const seq = ++uslWaterSeq;
  if (uslWaterLayer && map) { map.removeLayer(uslWaterLayer); uslWaterLayer = null; }
  uslWaterMsg = "";
  if (typeof pwOn === "undefined" || !pwOn || !map) return;
  const sts = [...uslStatesInView()];
  const srcs = sts.flatMap(st => (USL_WATER[st] || []).map(src => ({ st, src })));
  if (!srcs.length) {
    const i = typeof rulesInfo === "function" ? rulesInfo() : null;
    if (i && i.outside && i.state) uslWaterMsg = `No free public-lakes list for ${(typeof STATE_NAMES !== "undefined" && STATE_NAMES[i.state]) || i.state} yet.`;
    if (typeof pwNote === "function") pwNote(); return;
  }
  if (map.getZoom() < USL_ZOOM_WATER) { uslWaterMsg = "Zoom in to see the state's public fishing water."; if (typeof pwNote === "function") pwNote(); return; }
  const off = "&maxAllowableOffset=" + (360 / (256 * Math.pow(2, map.getZoom()))).toFixed(6), box = uslBox();
  const res = await Promise.all(srcs.map(({ src }) => uslGet(uslQuery(src, box, [src.name, src.sub, src.link].filter(Boolean).join(","), off + "&returnGeometry=true&resultRecordCount=1000&f=geojson"))));
  if (seq !== uslWaterSeq || !pwOn) return;
  const g = L.layerGroup(); let n = 0;
  res.forEach((fs, k) => (fs || []).forEach(f => { const it = uslWaterItem(srcs[k].st, srcs[k].src, f); if (it) { uslWaterDraw(it, f).addTo(g); n++; } }));
  g.addTo(map); uslWaterLayer = g;
  const who = [...new Set(srcs.filter((x, k) => res[k]).map(x => x.src.who))].join(" / ");
  uslWaterMsg = res.every(x => x === null) ? "Couldn't load the state's public fishing water right now — try again later."
    : n ? `🏞 ${n} public fishing place${n === 1 ? "" : "s"} from ${who} in view.` : `No public fishing water from ${who} in this view.`;
  if (typeof pwNote === "function") pwNote();
}
function uslWaterOff() { uslWaterSeq++; if (uslWaterLayer && map) map.removeLayer(uslWaterLayer); uslWaterLayer = null; uslWaterMsg = ""; }
// one feature → { name, sub, kind, who, link, lat, lng, point } (lat/lng = the point, or the middle of the lake)
function uslWaterItem(st, src, f) {
  if (!f || !f.geometry) return null;
  const p = f.properties || {}, point = f.geometry.type === "Point";
  let lat, lng;
  if (point) [lng, lat] = f.geometry.coordinates;
  else { try { const c = L.geoJSON(f).getBounds().getCenter(); lat = c.lat; lng = c.lng; } catch (e) { return null; } }
  if (!isFinite(lat) || !isFinite(lng)) return null;
  const sub = uslVal(p[src.sub]), link = uslVal(p[src.link]);
  return { us: true, st, point, lat, lng, name: uslTitle(uslVal(p[src.name]) || src.kind), kind: src.kind, who: src.who,
    sub: sub ? (src.subStart || "") + uslTitle(sub) + (src.subEnd || "") : "", link: /^https:\/\//.test(link) ? link : "",
    note: `${src.kind} listed by ${src.who}. Check the state's rules before you fish.` };
}
function uslWaterDraw(it, f) {
  const g = L.layerGroup();
  if (!it.point) L.geoJSON(f, { style: { color: "#2e8b57", weight: 2, fillColor: "#2e8b57", fillOpacity: 0.15 }, interactive: false }).addTo(g);
  L.circleMarker([it.lat, it.lng], { radius: it.point ? 6 : 7, color: "#fff", weight: 2, fillColor: "#2e8b57", fillOpacity: 0.95, a11y: `${it.kind}: ${it.name}` })
    .bindPopup(() => uslWaterPopup(it)).addTo(g);
  return g;
}
function uslWaterPopup(it) {
  const box = document.createElement("div");
  box.appendChild(el("div", "pop-name", "🏞 " + it.name));
  box.appendChild(el("div", "pop-meta", it.kind + (it.sub ? " · " + it.sub : "")));
  box.appendChild(el("div", "pop-meta", `Listed by ${it.who}. Check the state's rules (seasons, limits, hours) before you fish.`));
  const add = (text, href) => { const a = el("a", "pop-meta", text); a.href = href; a.target = "_blank"; a.rel = "noopener"; box.appendChild(a); };
  if (it.link) add("More about this place ↗", it.link);
  const ag = typeof stateAgency === "function" ? stateAgency(it.st) : null;
  if (ag && ag.rules) add(`${ag.short} fishing rules ↗`, ag.rules);
  add("Directions ↗", `https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}`);
  if (typeof pwSaved === "function" && pwSaved(it)) box.appendChild(el("div", "pop-meta", "✓ Already one of your spots."));
  else if (typeof pwAdd === "function") {
    const actions = el("div", "pop-actions"), b = el("button", null, "+ Add to my spots"); b.type = "button";
    b.addEventListener("click", () => pwAdd(it)); actions.appendChild(b); box.appendChild(actions);
  }
  return box;
}
