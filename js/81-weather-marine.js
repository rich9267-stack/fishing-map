// ---- ⚓ Marine alerts (weather plan step 10; Project doc claude/weather-plan.md): the nearest NWS coastal marine zone for a place ----
// The NWS "alerts at a point" (js/10 wxFetch) only covers the land zone the point is in, so a Small Craft Advisory, Gale or Special Marine
// Warning for the water off the beach never showed. Here: find the coastal marine zone(s) at or near the place, then read their alerts.
// Finding the zone: is the place itself in one? If not, look 4 miles out in 8 directions, then 12 miles (lakes: the place itself only, so a
// lake never picks up the ocean's alerts). The zone never moves, so the answer is kept on the phone for 60 days (fm-wx-mzones).
// Alerts for the zone(s) are kept 5 minutes. US only (stateOf, js/53, or US coastal waters); elsewhere nothing is asked.
// js/10 wxFetch adds these to the Home alerts line; the Weather screen asks for its chosen place (js/75), which feeds the Shore/Boat verdicts
// (js/74 wxdVerdict) and the Rip currents tile (js/78).
const WXA_RINGS = [4, 12];            // miles out to look when the place is not inside a marine zone
const WXA_ZONE_DAYS = 60, WXA_ALERT_TTL = 5 * 60000, WXA_SAVE = "fm-wx-mzones", WXA_KEEP = 40;
const WXA_US_WATERS = [[23, -127, 49.5, -65], [51, -180, 72, -129], [18, -161, 23, -154], [17.5, -68, 18.8, -64.5], [13, 144, 15.5, 146]];   // lower 48, Alaska, Hawaii, PR/USVI, Guam
const wxaMem = { alerts: {} };
let wxaClock = () => Date.now();      // tests change this

function wxaInUs(lat, lng) {
  try { if (typeof stateOf === "function" && stateOf(lat, lng)) return true; } catch (e) {}
  return WXA_US_WATERS.some(b => lat >= b[0] && lat <= b[2] && lng >= b[1] && lng <= b[3]);
}
// A point `mi` miles from (lat, lng) toward compass bearing `deg`
function wxaMove(lat, lng, mi, deg) {
  const r = deg * Math.PI / 180, dLat = mi * Math.cos(r) / 69.0, dLng = mi * Math.sin(r) / (69.17 * Math.cos(lat * Math.PI / 180));
  return [lat + dLat, lng + dLng];
}
function wxaSaved() { try { return JSON.parse(localStorage.getItem(WXA_SAVE) || "{}") || {}; } catch (e) { return {}; } }
function wxaStore(key, zones) {
  try {
    const all = wxaSaved(); all[key] = { t: wxaClock(), zones };
    Object.keys(all).sort((a, b) => all[b].t - all[a].t).slice(WXA_KEEP).forEach(k => delete all[k]);
    localStorage.setItem(WXA_SAVE, JSON.stringify(all));
  } catch (e) {}
}
async function wxaJson(url) {
  const r = await fetch(url, { headers: { Accept: "application/geo+json" } });
  if (!r.ok) throw new Error("NWS " + r.status);
  return r.json();
}
// Coastal marine zones that contain one point → [{ id, name }]
async function wxaZonesAt(lat, lng) {
  const j = await wxaJson(`https://api.weather.gov/zones?type=coastal&point=${lat.toFixed(4)},${lng.toFixed(4)}&include_geometry=false`);
  return (j.features || []).map(f => f.properties || {}).filter(z => z.id).map(z => ({ id: String(z.id), name: String(z.name || z.id) }));
}
// The nearest marine zone(s) for a place (up to 3), or [] when there is none nearby. o.lake = only the place itself.
async function wxaZones(lat, lng, o) {
  o = o || {};
  if (!isFinite(lat) || !isFinite(lng) || !wxaInUs(lat, lng)) return [];
  const key = (o.lake ? "L" : "") + lat.toFixed(2) + "," + lng.toFixed(2), kept = wxaSaved()[key];
  if (kept && wxaClock() - kept.t < WXA_ZONE_DAYS * 86400000) return kept.zones;
  const add = (list, zs) => zs.forEach(z => { if (!list.some(x => x.id === z.id)) list.push(z); });
  let found = [], failed = 0, asked = 0;
  try { asked++; add(found, await wxaZonesAt(lat, lng)); } catch (e) { failed++; }
  for (const mi of o.lake ? [] : WXA_RINGS) {
    if (found.length) break;
    const pts = [0, 45, 90, 135, 180, 225, 270, 315].map(d => wxaMove(lat, lng, mi, d));
    const got = await Promise.all(pts.map(pt => { asked++; return wxaZonesAt(pt[0], pt[1]).catch(() => { failed++; return []; }); }));
    got.forEach(zs => add(found, zs));
  }
  found = found.slice(0, 3);
  if (found.length || !failed) wxaStore(key, found);   // don't remember "no zone" when the NWS didn't answer
  if (!found.length && failed === asked) throw new Error("NWS not answering");
  return found;
}

// Same names as js/10 (WX_URGENT / WX_NORMAL): the alerts worth showing
const WXA_URGENT = /^(Special Marine Warning|Gale Warning|Storm Warning|Hurricane Force Wind Warning|Hazardous Seas Warning|Hurricane Warning|Tropical Storm Warning|Storm Surge Warning|Tsunami Warning|Waterspout Warning|Tornado Warning|Severe Thunderstorm Warning|Extreme Wind Warning)$/;
const WXA_NORMAL = /^(Small Craft Advisory.*|Brisk Wind Advisory|Gale Watch|Storm Watch|Hazardous Seas Watch|Hurricane Force Wind Watch|Hurricane Watch|Tropical Storm Watch|Storm Surge Watch|Marine Weather Statement|Dense Fog Advisory|Rip Current Statement|Beach Hazards Statement|High Surf Advisory|High Surf Warning|Coastal Flood Warning|Coastal Flood Advisory|Low Water Advisory)$/;
// One NWS alert (properties) → the app's alert shape (same as js/10)
function wxaShape(a, marine) {
  return { id: a.id || a["@id"] || "", event: a.event, urgent: WXA_URGENT.test(a.event || ""), ends: a.ends || a.expires, marine: !!marine,
    area: marine && marine.name ? marine.name : String(a.areaDesc || "").split(";")[0].trim(), headline: a.headline || "", text: String(a.description || "").replace(/\s+/g, " ").trim() };
}
const wxaWanted = a => a && a.messageType !== "Cancel" && (WXA_URGENT.test(a.event || "") || WXA_NORMAL.test(a.event || ""));

// Alerts for the nearest marine zone(s): { zones, list }. Never throws (no signal = what was kept, or nothing).
async function wxaAlerts(lat, lng, o) {
  o = o || {};
  let zones = [];
  try { zones = await wxaZones(lat, lng, o); } catch (e) { return { zones: [], list: [], down: true }; }
  if (!zones.length) return { zones, list: [] };
  const key = zones.map(z => z.id).join(","), c = wxaMem.alerts[key];
  if (c && !o.force && wxaClock() - c.t < WXA_ALERT_TTL) return { zones, list: c.list };
  try {
    const j = await wxaJson(`https://api.weather.gov/alerts/active?zone=${key}`);
    const list = (j.features || []).map(f => f.properties || {}).filter(wxaWanted).map(a => {
      const ids = (a.geocode && a.geocode.UGC) || [];
      return wxaShape(a, zones.find(z => ids.includes(z.id)) || zones[0]);
    });
    wxaMem.alerts[key] = { t: wxaClock(), list };
    return { zones, list };
  } catch (e) { return { zones, list: c ? c.list : [], down: true }; }
}
// Put two alert lists together (same alert once), urgent first
function wxaMerge(a, b) {
  const out = [];
  (a || []).concat(b || []).forEach(x => {
    if (!out.some(y => (x.id && y.id === x.id) || (y.event === x.event && y.ends === x.ends && y.area === x.area))) out.push(x);
  });
  return out.sort((x, y) => (y.urgent ? 1 : 0) - (x.urgent ? 1 : 0));
}
