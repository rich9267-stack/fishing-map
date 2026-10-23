// test185: US plan step 7, last piece: lake depth lines + public fishing water outside Florida (js/59, hooks in js/22 + js/23).
// Florida must look exactly the same: the v172 code (git 0baea70) and the new code are run side by side in a Florida view.
const fs = require("fs"), vm = require("vm"), path = require("path"), { execSync } = require("child_process");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const old = f => execSync("git show 0baea70:" + f, { cwd: root, encoding: "utf8" });   // v172, the last version before this step
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const mk = (tag, cls, text) => ({ tag, className: cls || "", textContent: text || "", children: [], attrs: {}, hidden: false, handlers: {}, dataset: {}, value: "", style: {},
  classList: { toggle() {}, add() {} }, appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; }, scrollIntoView() {} });
const texts = n => [n.textContent].concat(...n.children.map(texts)).filter(Boolean);
// fake state outlines: Florida box, Minnesota north, New Jersey east, North Carolina south-east, Georgia south
const fakeState = (lat, lng) => (lat < 24 || lat > 50 || lng < -125 || lng > -66) ? null : (lat < 30.7 && lng > -87.6 && lng < -79.8) ? "FL"
  : lat > 43 && lng < -89 ? "MN" : lng > -75.6 && lat > 39 ? "NJ" : lat > 34 && lat < 36.5 && lng > -84 ? "NC" : "GA";
const NAMES = { FL: "Florida", MN: "Minnesota", NJ: "New Jersey", NC: "North Carolina", GA: "Georgia" };
const line = (props, x, y) => ({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: [[x, y], [x + 0.001, y + 0.001]] } });

function ctx(files, view, opts) {
  opts = opts || {};
  const notes = {}, fetched = [], popups = [], store = {};
  const map = { z: view.z, layers: [], handlers: {}, getZoom() { return this.z; }, removeLayer(l) { this.layers = this.layers.filter(x => x !== l); }, hasLayer(l) { return this.layers.includes(l); },
    on(e, f) { (this.handlers[e] = this.handlers[e] || []).push(f); }, closePopup() {},
    getBounds: () => ({ getWest: () => view.b[0], getSouth: () => view.b[1], getEast: () => view.b[2], getNorth: () => view.b[3], getCenter: () => ({ lat: (view.b[1] + view.b[3]) / 2, lng: (view.b[0] + view.b[2]) / 2 }) }),
    latLngToContainerPoint: () => ({ x: 100, y: 100 }), containerPointToLatLng: ([x, y]) => ({ lat: (view.b[1] + view.b[3]) / 2 + (100 - y) * 1e-4, lng: (view.b[0] + view.b[2]) / 2 + (x - 100) * 1e-4 }) };
  const into = t => (t.items || t.layers);
  const bounds = f => { const pts = []; const walk = a => typeof a[0] === "number" ? pts.push(a) : a.forEach(walk); walk(f.geometry.coordinates);
    const la = pts.map(p => p[1]), ln = pts.map(p => p[0]); return { getCenter: () => ({ lat: (Math.min(...la) + Math.max(...la)) / 2, lng: (Math.min(...ln) + Math.max(...ln)) / 2 }), isValid: () => true }; };
  const L = {
    geoJSON: (f, o) => ({ f, o, addTo(t) { into(t).push(this); return this; }, getBounds: () => bounds(f), eachLayer() {} }),
    layerGroup: () => ({ items: [], addTo(t) { into(t).push(this); return this; }, clearLayers() { this.items = []; } }),
    circleMarker: (ll, o) => ({ ll, o, bindPopup(fn) { this.pop = fn; return this; }, addTo(t) { into(t).push(this); return this; } }),
    popup: () => ({ setLatLng() { return this; }, setContent(c) { popups.push(c); return this; }, openOn() { return this; } }),
    TileLayer: { extend: () => function () { this.on = () => this; this.addTo = t => { into(t).push(this); return this; }; } }
  };
  const c = {
    console, Date, JSON, Math, isFinite, Array, Object, Promise, Set, String, Number, RegExp, encodeURIComponent, setTimeout, clearTimeout,
    $: id => notes[id] || (notes[id] = mk("div")), el: mk, document: { createElement: t => mk(t) }, map, L, initMap() {},
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
    stateOf: fakeState, STATE_NAMES: NAMES, LAT: 26.24, LNG: -80.1, spots: [], hasLoc: () => true, miles: () => 99, placing: false,
    showView() {}, closeSpotForm() {}, openForm() {}, renderSpots() {},
    rulesInfo: () => { const st = fakeState((view.b[1] + view.b[3]) / 2, (view.b[0] + view.b[2]) / 2); return st === "FL" ? { tags: ["atlantic"] } : { outside: true, state: st }; },
    fetch: async u => { fetched.push(u);
      if (opts.down && opts.down.test(u)) throw new Error("offline");
      let features = [];
      if (/water_lake_bathymetry/.test(u)) features = [line({ abs_depth: 15, lake_name: "Pine" }, -93.6, 46.2), line({ abs_depth: 20, lake_name: "Pine" }, -93.6, 46.21)];
      else if (/Lake_Bathymetry_Contours_in_New_Jersey/.test(u)) features = [line({ VAL2NUM: 36.576 }, -74.6, 40.9)];
      else if (/NCWRC_Public_Fishing_Areas/.test(u)) features = [{ type: "Feature", properties: { PFA_Name: "CRAWFORD LAKE", County: "SCOTLAND" }, geometry: { type: "Point", coordinates: [-79.5667, 34.8944] } }];
      else if (/Envr_admin_DFW_places_to_fish_wb/.test(u)) features = [{ type: "Feature", properties: { WATERBODY: "Dennisville Lake", NEAREST_TOWN: "Dennisville" }, geometry: { type: "Polygon", coordinates: [[[-74.8, 39.18], [-74.78, 39.18], [-74.78, 39.2], [-74.8, 39.18]]] } }];
      else if (/Fish_Management_Areas_Florida/.test(u)) features = [{ type: "Feature", properties: { OBJECTID: 1, NAME: "Lake Ida", COUNTY: "PALM BEACH" }, geometry: { type: "Polygon", coordinates: [[[-80.08, 26.46], [-80.07, 26.46], [-80.07, 26.48], [-80.08, 26.46]]] } }];
      const json = /f=json/.test(u) ? { features: features.map(f => ({ attributes: f.properties, geometry: null })) } : { type: "FeatureCollection", features };
      if (/Freshwater_Fish_Attractors/.test(u)) return { ok: true, json: async () => ({ features: [] }) };
      if (/Bathymetr.*Florida|Southeast_US/.test(u)) return { ok: true, json: async () => ({ features: /Florida/.test(u) ? [{ attributes: { DEPTHF: 7 } }] : [] }) };
      return { ok: true, json: async () => json }; }
  };
  vm.createContext(c);
  c.STATE_AGENCIES = null;
  vm.runInContext(files.join("\n") + "\nthis.api = { get pwOn() { return typeof pwOn !== 'undefined' && pwOn; }, set pwOnX(v) {}, " +
    "setPwOn: typeof setPwOn !== 'undefined' ? setPwOn : null, setDepOn: typeof setDepOn !== 'undefined' ? setDepOn : null, depTap: typeof depTap !== 'undefined' ? depTap : null, " +
    "depNote: typeof depNote !== 'undefined' ? depNote : null, pwAdd: typeof pwAdd !== 'undefined' ? pwAdd : null, pwNote: typeof pwNote !== 'undefined' ? pwNote : null, " +
    "usl: typeof uslDepthAsk !== 'undefined' ? { uslDepthAsk, uslDepthNote, uslWaterLoad, uslDepthDraw, uslStatesInView, get waterMsg() { return uslWaterMsg; }, get depLayer() { return uslDepLayer; }, get waterLayer() { return uslWaterLayer; } } : null };", c);
  return { c, api: c.api, notes, fetched, popups, map };
}
const wait = () => new Promise(r => setTimeout(r, 10));
const a54 = read("js/54-state-agencies.js"), n22 = read("js/22-public-water.js"), n23 = read("js/23-depth.js"), n59 = read("js/59-us-lakes.js");
const o22 = old("js/22-public-water.js"), o23 = old("js/23-depth.js");
const FL_VIEW = { b: [-80.12, 26.44, -80.04, 26.5], z: 14 }, MN_VIEW = { b: [-93.65, 46.18, -93.55, 46.24], z: 14 }, NJ_VIEW = { b: [-74.65, 40.88, -74.55, 40.94], z: 14 },
  NC_VIEW = { b: [-79.7, 34.8, -79.4, 35.0], z: 11 }, GA_VIEW = { b: [-84.45, 33.7, -84.35, 33.8], z: 14 };
const FWC = /gis\.myfwc\.com/;

(async () => {
  // ---------- 1) Florida: old and new code side by side ----------
  {
    const a = ctx([a54, o23, o22], FL_VIEW), b = ctx([a54, n23, n22, n59], FL_VIEW);
    for (const x of [a, b]) { x.api.setDepOn(true); x.api.setPwOn(true); }
    await wait();
    for (const x of [a, b]) { await x.api.depTap({ lat: 26.47, lng: -80.08 }); }
    await wait();
    ok(b.fetched.length > 0 && b.fetched.every(u => FWC.test(u)) && JSON.stringify(a.fetched) === JSON.stringify(b.fetched), "Florida: only FWC is asked, the very same questions as before (" + b.fetched.length + ")");
    ok(a.notes["dep-note"].textContent === b.notes["dep-note"].textContent && /FWC/.test(b.notes["dep-note"].textContent), "Florida: the depth note reads the same");
    ok(a.notes["pw-note"].textContent === b.notes["pw-note"].textContent && /FWC/.test(b.notes["pw-note"].textContent), "Florida: the public lakes note reads the same: " + b.notes["pw-note"].textContent);
    ok(a.popups.length === 1 && JSON.stringify(texts(a.popups[0])) === JSON.stringify(texts(b.popups[0])) && /FWC depth lines/.test(texts(b.popups[0]).join(" ")), "Florida: tapping a lake line gives the same popup: " + texts(b.popups[0]).join(" | "));
    ok(!b.api.usl.depLayer || b.api.usl.depLayer.items.length === 0, "Florida: no blue lines from other states");
    // + Add to my spots from an FWC lake: same form as before
    const g = { name: "Lake Ida", lat: 26.47, lng: -80.075 };
    a.api.pwAdd(g); b.api.pwAdd(g);
    ok(["f-notes", "loc-text", "form-msg"].every(id => a.notes[id].textContent + a.notes[id].value === b.notes[id].textContent + b.notes[id].value), "Florida: '+ Add to my spots' fills in the same form");
  }
  // ---------- 2) Minnesota: depth lines ----------
  {
    const b = ctx([a54, n23, n22, n59], MN_VIEW);
    b.api.setDepOn(true); await wait();
    const asked = b.fetched.filter(u => /water_lake_bathymetry/.test(u));
    ok(asked.length === 1 && /f=geojson/.test(asked[0]) && /geometry=-93\.6500,46\.1800,-93\.5500,46\.2400/.test(asked[0]) && /outFields=abs_depth/.test(asked[0]), "Minnesota: asks Minnesota DNR for the lines in view only");
    ok(b.api.usl.depLayer && b.api.usl.depLayer.items.length === 2 && b.api.usl.depLayer.items[0].o.style.color === "#1f6fb2", "Minnesota: 2 blue depth lines drawn");
    const note = b.notes["dep-note"].textContent;
    ok(/Lake depth lines from Minnesota DNR \(blue\)/.test(note) && /not for navigation/.test(note) && !/Palm Beach|FWC surveyed/.test(note), "Minnesota: the note names Minnesota DNR: " + note);
    await b.api.depTap({ lat: 46.21, lng: -93.6 }); await wait();
    const pop = texts(b.popups[0]).join(" | ");
    ok(/Lake depth line: ≈ 15 ft – 20 ft/.test(pop) && /Minnesota DNR depth lines/.test(pop), "Minnesota: tap reads the depth: " + pop);
    b.map.z = 12; b.api.depNote();
    ok(/Zoom in on a lake to see Minnesota DNR's depth lines/.test(b.notes["dep-note"].textContent), "Minnesota zoomed out: 'zoom in on a lake'");
  }
  // ---------- 3) New Jersey: meters become feet ----------
  {
    const b = ctx([a54, n23, n22, n59], NJ_VIEW);
    const r = await b.api.usl.uslDepthAsk("-74.61,40.89,-74.59,40.91", 14);
    ok(r && r.vals.length === 1 && Math.round(r.vals[0]) === 120 && r.who === "New Jersey DEP", "New Jersey: 36.576 m shows as 120 ft");
  }
  // ---------- 4) Georgia: no free lake lines → says so ----------
  {
    const b = ctx([a54, n23, n22, n59], GA_VIEW);
    b.api.setDepOn(true); await wait();
    ok(!b.fetched.some(u => /bathymetr|Contour/i.test(u) && !FWC.test(u)), "Georgia: no state depth server is asked");
    ok(/No free lake depth lines for Georgia yet/.test(b.notes["dep-note"].textContent), "Georgia: the note says there are no lake lines yet");
    b.api.setPwOn(true); await wait();
    ok(/No free public-lakes list for Georgia yet/.test(b.notes["pw-note"].textContent), "Georgia: the public lakes note says so too");
  }
  // ---------- 5) North Carolina: public fishing areas ----------
  {
    const b = ctx([a54, n23, n22, n59], NC_VIEW);
    b.api.setPwOn(true); await wait();
    const asked = b.fetched.find(u => /NCWRC_Public_Fishing_Areas/.test(u));
    ok(asked && /where=Site_Status%3D'OPEN'/.test(asked) && /f=geojson/.test(asked), "North Carolina: asks the Wildlife Resources Commission for open areas in view");
    const pins = (b.api.usl.waterLayer ? b.api.usl.waterLayer.items : []).flatMap(g => g.items).filter(x => x.ll);
    ok(pins.length === 1 && pins[0].o.a11y === "Public fishing area: Crawford Lake" && pins[0].o.fillColor === "#2e8b57", "North Carolina: one green pin, 'Crawford Lake' (not shouting capitals)");
    const pop = texts(pins[0].pop()).join(" | ");
    ok(/Public fishing area · Scotland County/.test(pop) && /Listed by NC Wildlife Resources Commission/.test(pop) && /NCWRC fishing rules ↗|fishing rules ↗/.test(pop) && /\+ Add to my spots/.test(pop), "North Carolina: popup: " + pop);
    ok(/🏞 1 public fishing place from NC Wildlife Resources Commission in view/.test(b.notes["pw-note"].textContent), "North Carolina: the note counts it: " + b.notes["pw-note"].textContent);
    // + Add to my spots
    const it = pins[0].pop; let item = null;
    b.api.pwAdd(Object.assign({ us: true, point: true, name: "Crawford Lake", lat: 34.8944, lng: -79.5667, note: "Public fishing area listed by NC Wildlife Resources Commission. Check the state's rules before you fish." }));
    ok(b.notes["f-notes"].value === "Public fishing area listed by NC Wildlife Resources Commission. Check the state's rules before you fish." && b.notes["loc-text"].textContent === "Set ✓ (the site)" && b.notes["form-msg"].textContent === "Check the details, then save.", "North Carolina: '+ Add' fills in the state's words, not FWC's");
    b.map.z = 8; await b.api.usl.uslWaterLoad();
    ok(b.api.usl.waterMsg === "Zoom in to see the state's public fishing water.", "North Carolina zoomed out: 'zoom in'");
    const d = ctx([a54, n23, n22, n59], NC_VIEW, { down: /NCWRC/ });
    d.api.setPwOn(true); await wait();
    ok(d.api.usl.waterMsg === "Couldn't load the state's public fishing water right now — try again later.", "North Carolina server down: a plain message");
  }
  // ---------- 6) New Jersey water: lake outline + middle pin ----------
  {
    const b = ctx([a54, n23, n22, n59], { b: [-74.85, 39.15, -74.75, 39.25], z: 12 });
    await (async () => { b.api.setPwOn(true); await wait(); })();
    const grp = b.api.usl.waterLayer.items[0];
    ok(grp.items.length === 2 && grp.items[0].o.style.color === "#2e8b57" && grp.items[1].o.a11y === "Great Fishing Close to Home water: Dennisville Lake" && Math.abs(grp.items[1].ll[0] - 39.19) < 0.001, "New Jersey: green outline + pin in the middle of the lake");
  }
  // ---------- 7) wiring + every source ----------
  const html = read("index.html"), sw = read("sw.js"), wn = read("js/13-groups-misc.js");
  ok(/<script src="js\/59-us-lakes\.js\?v=\d+"><\/script>(\s*<script src="js\/6[01]-[a-z-]+\.js\?v=\d+"><\/script>)*\s*<script src="js\/99-boot\.js/.test(html) && /"\.\/js\/59-us-lakes\.js"/.test(sw), "js/59 is loaded before boot and saved for offline");
  const hosts = [...new Set((n59.match(/https:\/\/[a-z0-9.-]+/g) || []).filter(h => !/google\.com/.test(h)))], csp = (/connect-src 'self'([^;"]*)/.exec(html) || [])[1] || "";
  ok(hosts.every(h => csp.split(/\s+/).includes(h)), "every state server is in the Content-Security-Policy");
  const cfg = {}; vm.createContext(cfg); vm.runInContext(n59 + "\nthis.D = USL_DEPTH; this.W = USL_WATER;", cfg);
  ok(Object.keys(cfg.D).sort().join() === "IN,MA,MI,MN,ND,NE,NH,NJ,WA,WV" && Object.keys(cfg.W).sort().join() === "IN,KY,MI,MN,MT,NC,NE,NJ,NM,VA,WV", "10 depth states and 11 public-water states, Florida not among them");
  ok(/id: "2026-10-2\d\w?", title: "〰 Lake depth and 🏞 public lakes in more states"/.test(wn), "What's new has the entry");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK");
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
