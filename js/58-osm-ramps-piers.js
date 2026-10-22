// ---- ✅ Boat ramps and piers outside Florida (US plan step 5 "Spots everywhere") ----
// Florida has official state lists (FWC ramps, FL DEP parks/piers in the official_spots table, js/02). Other states are not loaded (yet), so while
// the ✅ Official public spots layer (js/37) is on and the map shows somewhere outside Florida, the app asks OpenStreetMap (the free Overpass API,
// same as Find new water) for the boat ramps and piers in the part of the map ON SCREEN only. Nothing goes into our database.
// Florida stays exactly as before: places inside Florida are dropped, and a view that is all Florida (or open sea) asks nothing.
// Only places OpenStreetMap shows as clearly public and open are kept (osmClearlyPublic, js/09) — when unsure, left out.
// Each answer is kept on this phone for a week (the last OSMOL.keep views), so panning back or going offline still shows them.
// The tap card says where it comes from (OpenStreetMap, a volunteer map — not an official list) and how sure we are it is public (TRUST, js/09).
const OSMOL = { key: "fm-osm-ol-v2", age: 7 * 86400000, keep: 8, maxDeg: 1.2, pad: 0.1, boxes: [], read: false, loading: null, failAt: 0, note: "" };

function osmOlRead() {
  OSMOL.read = true;
  try { const j = JSON.parse(localStorage.getItem(OSMOL.key) || "null"); if (j && Array.isArray(j.boxes)) OSMOL.boxes = j.boxes.filter(b => b && Array.isArray(b.items) && isFinite(b.t)); } catch (e) { /* no copy yet */ }
}
function osmOlSave() { try { localStorage.setItem(OSMOL.key, JSON.stringify({ boxes: OSMOL.boxes })); } catch (e) { /* storage full: asked again next time */ } }

// Is any part of this view outside Florida (on land or near a coast)? Checks a 5 × 5 grid of points across the view.
function osmOlNeeds(s, w, n, e) {
  if (typeof stateOf !== "function") return false;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
    const st = stateOf(s + (n - s) * i / 4, w + (e - w) * j / 4);
    if (st && st !== "FL") return true;
  }
  return false;
}
const osmOlHas = (b, s, w, n, e) => b.s <= s && b.w <= w && b.n >= n && b.e >= e;

// An OpenStreetMap element → a place shaped like an official spot (source "osm"), or null (private, not a ramp/pier, or in Florida)
function osmOlPlace(el) {
  const g = typeof osmToSpot === "function" ? osmToSpot(el) : null;   // js/09: outside Florida only clearly public, open places (osmClearlyPublic)
  if (!g || (g.kind !== "ramp" && g.kind !== "pier") || /\bprivate\b/i.test(g.name)) return null;   // e.g. "Boat Ramp - Private"
  const st = typeof stateOf === "function" ? stateOf(g.lat, g.lng) : null;
  if (!st || st === "FL") return null;   // Florida keeps its official lists only
  return { id: null, key: "osm/" + g.key, source: "osm", trust: g.trust, via: g.via, name: g.name, kind: g.kind, lat: g.lat, lng: g.lng, state: st, county: null, water_type: null, details: {} };
}

// Load the ramps and piers for the view (a Leaflet LatLngBounds). Resolves true when new places arrived.
function osmOlLoad(bounds) {
  if (!OSMOL.read) osmOlRead();
  const s = bounds.getSouth(), w = bounds.getWest(), n = bounds.getNorth(), e = bounds.getEast();
  OSMOL.note = "";
  if (!osmOlNeeds(s, w, n, e)) return Promise.resolve(false);   // all Florida / open sea: nothing to ask
  if (n - s > OSMOL.maxDeg || e - w > OSMOL.maxDeg) { OSMOL.note = "Zoom in a little to see boat ramps and piers from OpenStreetMap."; return Promise.resolve(false); }
  if (OSMOL.boxes.some(b => Date.now() - b.t < OSMOL.age && osmOlHas(b, s, w, n, e))) return Promise.resolve(false);   // already have this view
  if (OSMOL.loading) {   // still busy with the last view: then ask again for this one (usually already covered by then)
    OSMOL.note = "Loading boat ramps and piers from OpenStreetMap…";
    return OSMOL.loading.then(a => osmOlLoad(bounds).then(z => a || z));
  }
  if (OSMOL.failAt && Date.now() - OSMOL.failAt < 120000) { OSMOL.note = "Couldn't reach OpenStreetMap for boat ramps and piers — try again in a minute."; return Promise.resolve(false); }
  // the view plus a small margin, rounded out to 0.05° so small pans reuse the same answer
  const r = (v, up) => (up ? Math.ceil(v * 20 - 1e-9) : Math.floor(v * 20 + 1e-9)) / 20;   // (the tiny nudge stops 32.3 rounding up to 32.35)
  const box = { s: r(s - OSMOL.pad, false), w: r(w - OSMOL.pad, false), n: r(n + OSMOL.pad, true), e: r(e + OSMOL.pad, true) };
  const bb = [box.s, box.w, box.n, box.e].map(v => v.toFixed(2)).join(",");
  // piers: only named, fishing or public ones (most OpenStreetMap "piers" are backyard docks, which osmToSpot drops anyway — this keeps the download small)
  const q = `[out:json][timeout:25];(nwr["leisure"="slipway"](${bb});nwr["man_made"="pier"]["name"](${bb});nwr["man_made"="pier"]["fishing"="yes"](${bb});` +
    `nwr["man_made"="pier"]["access"~"^(yes|public|permissive)$"](${bb}););out center tags;`;
  OSMOL.note = "Loading boat ramps and piers from OpenStreetMap…";
  OSMOL.loading = (async () => {
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (!res.ok) throw new Error("http " + res.status);
      const data = await res.json(), seen = new Set();
      box.items = (data.elements || []).map(osmOlPlace).filter(x => x && !seen.has(x.key) && seen.add(x.key));
      box.t = Date.now();
      OSMOL.boxes = OSMOL.boxes.filter(b => !osmOlHas(box, b.s, b.w, b.n, b.e)).concat([box]).slice(-OSMOL.keep);
      osmOlSave();
      OSMOL.failAt = 0; OSMOL.note = "";
      return true;
    } catch (err) {
      OSMOL.failAt = Date.now(); OSMOL.note = "Couldn't reach OpenStreetMap for boat ramps and piers — try again in a minute.";
      return false;   // what this phone already holds is still drawn
    } finally { OSMOL.loading = null; }
  })();
  return OSMOL.loading;
}

// Every place this phone holds (older copies included, so it works offline); js/37 keeps only those inside the view
function osmOlItems() {
  if (!OSMOL.read) osmOlRead();
  const seen = new Set(), all = [];
  OSMOL.boxes.forEach(b => b.items.forEach(o => { if (!seen.has(o.key)) { seen.add(o.key); all.push(o); } }));
  return all;
}
const osmOlNote = () => OSMOL.note;
