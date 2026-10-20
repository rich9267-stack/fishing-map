// Full-screen map: floating buttons, ⋯ More menu, notes in the Layers sheet, 🔍 Search the map (plans/ui-review.md item 2A, js/50-map-full.js). Head copied from test157.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-rich";
const SPOTS = [
  { id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0, faces_deg: 90 },
  { id: "s4", name: "Black Creek Canal", spot_type: "seawall", water_type: "brackish", lat: 25.55, lng: -80.35, created_by: ME, public_access: "yes", tide_offset_min: 75 },
  { id: "s2", name: "C-14 Canal", spot_type: "seawall", water_type: "freshwater", lat: 26.27, lng: -80.15, created_by: ME, public_access: "yes" },
  { id: "s9", name: "Mike Public", spot_type: "pier", water_type: "saltwater", lat: 26.30, lng: -80.09, created_by: "other", public_access: "yes", visibility: "public", is_exact: false },
  { id: "s3", name: "Jupiter Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.945, lng: -80.07, created_by: ME, public_access: "yes" }
];
const obs = (id, name, lat, lng, extra = {}) => ({ id, observed_on: "2026-10-0" + (id % 7 + 1), obscured: false, positional_accuracy: 20,
  geojson: { coordinates: [lng, lat] }, taxon: { name: "Sci " + name, preferred_common_name: name }, user: { login: "fisher" + id, name: "" },
  photos: [{ url: "https://inat/photos/" + id + "/square.jpg" }], uri: "https://www.inaturalist.org/observations/" + id, ...extra });
const calls = [], PHOTON = [];
const ST = process.env.ST || "admin";
let status = ST;
const MEMBER = () => ST === "admin" ? { data: { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved" }, error: null }
  : ST === "error" ? { data: null, error: { message: "boom" } } : ST === "none" ? { data: null, error: null } : { data: { email: "x@y.com", display_name: "Newbie", is_admin: false, status: ST }, error: null };
let PEND = [{ email: "new@x.com", display_name: "Newbie", is_admin: false, status: "pending", note: "Rico's cousin", requested_at: new Date().toISOString() },
  { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved" }, { email: "d@x.com", display_name: "Dee", status: "blocked" }];
const RPCS = [];
const mk = (id, spot, species, h, extra = {}) => ({ id, spot_id: spot, species, how_many: 1, caught_at: new Date(Date.now() - h * 3600000).toISOString(), created_by: ME,
  tide_stage: "outgoing", pressure_trend: "falling", moon_phase: "waning crescent", solunar: "minor", wind_mph: 8, water_temp_f: 81, ...extra });
const PUBC = (id, spot, species, h, extra = {}) => ({ id, spot_id: spot, species, how_many: 1, visibility: "public", caught_at: new Date(Date.now() - h * 3600000).toISOString(), created_by: "other", ...extra });
const CATCHES = [PUBC("p1", "s9", "Snook", 5, { length_in: 28 }), PUBC("p2", "s3", "Snook", 72), PUBC("p3", "s-hidden", "Tarpon", 1), PUBC("p4", "s4", "Peacock bass", 20 * 24),
  PUBC("p5", "s2", "Largemouth bass", 40 * 24), mk("c1", "s1", "Snook", 30, { length_in: 30 }), mk("c2", "s1", "Snook", 54, { length_in: 24 }), mk("c3", "s1", "Snook", 78), mk("c4", "s1", "Jack crevalle", 100, { length_in: 28 }),
  mk("c5", "s3", "Mangrove snapper", 30, { length_in: 14 }), mk("c8", "s2", "Peacock bass", 40), mk("c6", "s3", "Mangrove snapper", 50), mk("c7", "s3", "Mangrove snapper", 70)];
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  w.__db = { inserts: [], upserts: [], sessions: [], deletes: [] };
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: (k, v) => k === "visibility" && Array.isArray(data) ? chain(data.filter(r => r.visibility === v)) : o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, order: () => o, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new-" + Math.random().toString(36).slice(2) }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve(MEMBER()) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "rich9267@gmail.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
    rpc: async (fn, a) => { RPCS.push([fn, a]); if (fn === 'request_access') { status = 'pending'; } if (fn === 'review_access') PEND = PEND.map(m => m.email === a.p_email ? { ...m, status: a.p_approve ? 'approved' : 'blocked' } : m); return fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }; }, storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    from: t => ({ select: () => chain(t === "catch_ranks" ? (w.__ranks || []) : t === "members" ? PEND : (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { w.__db.deletes.push(t); return chain(null); },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: row => { w.__db.upserts.push({ t, row }); return Promise.resolve({ error: null }); },
      update: row => { w.__db.updates = (w.__db.updates || []).concat([{ t, row }]); return chain(t === 'profiles' ? { user_id: 'u-rich', ...row } : null); } }) }) };
  w.fetch = async url => {
    if (url.includes("photon.komoot.io")) {
      PHOTON.push(url);
      if (url.includes("fail")) throw new Error("offline");
      return { ok: true, json: async () => ({ features: [
        { geometry: { coordinates: [-80.0866, 26.2326] }, properties: { name: "Pompano Beach Pier", osm_value: "pier", city: "Pompano Beach", county: "Broward County", state: "Florida" } },
        { geometry: { coordinates: [-80.12, 26.24] }, properties: { name: "Pompano Beach", osm_value: "city", county: "Broward County", state: "Florida" } }] }) };
    }
    if (url.includes("inaturalist")) {
      calls.push(url);
      const u = new URL(url);
      const lat = +u.searchParams.get("lat");
      const results = lat < 26.5 ? [
        obs(1, "Common Snook", 26.26, -80.085), obs(2, "Common Snook", 26.25, -80.09), obs(3, "Tarpon", 26.24, -80.1),
        obs(4, "Sergeant Major", 26.255, -80.08), obs(5, "Peacock Bass", 26.262, -80.10), obs(6, "Gray Snapper", 26.3, -80.09, { obscured: true }),
        obs(7, "Butterfly Peacock Bass", 26.272, -80.152), obs(8, "Bar Jack", 26.2, -80.08), obs(9, "Jackknife-fish", 26.25, -80.08),
        obs(10, "Florida Gar", 26.27, -80.16), obs(11, "Common Dolphinfish", 26.4, -80.0)
      ] : [obs(20, "Common Snook", 26.95, -80.07), obs(21, "Atlantic Tarpon", 26.94, -80.075)];
      return { ok: true, json: async () => ({ total_results: results.length, results }) };
    }
    if (url.includes("tidesandcurrents") && url.includes("hilo")) {
      const base = new Date(); base.setHours(0, 0, 0, 0); base.setDate(base.getDate() - 1);
      const preds = []; for (let i = 0; i < 16; i++) { const t = new Date(base.getTime() + (3 + i * 6.2) * 3600000); const pad = n => String(n).padStart(2, "0");
        preds.push({ t: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`, type: i % 2 ? "L" : "H" }); }
      return { ok: true, json: async () => ({ predictions: preds }) };
    }
    if (url.includes("waterservices") && url.includes("00480")) {
      const ts = (code, name, lat, lng, vals) => ({ variable: { variableCode: [{ value: code }] }, sourceInfo: { siteName: name, geoLocation: { geogLocation: { latitude: lat, longitude: lng } } },
        values: [{ value: vals.map((v, i) => ({ value: String(v), dateTime: new Date(Date.now() - (vals.length - i) * 3600000).toISOString() })) }] });
      const lat = +new URL(url).searchParams.get("bBox").split(",")[1];
      return { ok: true, json: async () => ({ value: { timeSeries: lat < 26 ? [ts("00480", "BLACK CREEK CANAL UPSTREAM OF S-21 AT MIAMI, FL", 25.542, -80.347, [5.1, 6.3]), ts("00060", "BLACK CREEK CANAL AT S-21 NR GOULDS, FL", 25.54, -80.34, [20, 140])] : [] } }) };
    }
    if (url.includes("open-meteo") && url.includes("forecast_hours=76")) {
      const t0 = Math.floor(Date.now() / 3600000) * 3600 - 3 * 3600, time = [], sp = [], dr = [], pr = [];
      for (let i = 0; i < 79; i++) { time.push(t0 + i * 3600); sp.push(5 + (i % 12)); dr.push(i < 40 ? 90 : 270); pr.push(1015 - i * 0.2); }
      return { ok: true, json: async () => ({ hourly: { time, wind_speed_10m: sp, wind_direction_10m: dr, pressure_msl: pr } }) };
    }
    return { ok: true, json: async () => ({ properties: {}, features: [], elements: [] }) };
  };
}});
const w = dom.window; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(800);
  const ev = c => w.eval(c);
  let good = true; const check = (name, ok) => { console.log(name + ":", ok ? "yes" : "NO"); if (!ok) good = false; };
  Object.defineProperty(w.navigator, "geolocation", { value: { getCurrentPosition: ok => ok({ coords: { latitude: 26.2572, longitude: -80.0812 } }) }, configurable: true });
  let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
  const $ = id => d.getElementById(id);
  const tools = $("map-main-tools");
  ok(["ms-q", "map-layers-btn", "map-me", "map-more-btn", "map-add", "map-find-btn", "map-list", "boat-open", "map-key-btn", "map-offline"].every(id => tools.contains($(id))), "all map buttons float on the map");
  ok(["map-find-btn", "map-list", "boat-open", "map-key-btn", "map-offline"].every(id => $("map-more").contains($(id)) && $(id).getAttribute("role") === "menuitem"), "⋯ More holds Find new water, List, Boat mode, Map key, Save for offline");
  const lb = $("layers-body");
  ok(["map-notes", "map-filter-note", "mx-note", "pw-note", "dep-note", "rt-note", "sat-note", "bite-chips", "bite-note", "map-key", "unplaced-card"].every(id => lb.contains($(id))), "notes, map key and spots without a location are in the Layers sheet");
  ok(!lb.contains($("sat-legend")) && tools.contains($("sat-legend")), "the satellite color scale floats on the map");
  ev(`showView("map")`); await wait(200);
  ok(d.body.classList.contains("on-map") && !!ev(`map`), "map page is on");
  const attr = d.querySelector(".leaflet-control-attribution");
  ok(attr && /Photon/.test(attr.textContent) && /OpenStreetMap contributors/.test(attr.textContent), "credit line names Photon and OpenStreetMap: " + (attr && attr.textContent));
  ok(!!d.querySelector(".leaflet-bottom.leaflet-right .leaflet-control-zoom") && !d.querySelector(".leaflet-top.leaflet-left .leaflet-control-zoom"), "zoom buttons moved to the bottom right (search is top left)");
  // ⋯ More menu
  const more = $("map-more"), mb = $("map-more-btn");
  ok(more.hidden && mb.getAttribute("aria-expanded") === "false", "More menu starts closed");
  mb.click();
  ok(!more.hidden && mb.getAttribute("aria-expanded") === "true" && d.activeElement === $("map-find-btn"), "More opens and focuses its first item");
  more.dispatchEvent(new w.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  ok(d.activeElement === $("map-list"), "arrow keys move in the menu");
  more.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  ok(more.hidden && d.activeElement === mb, "Escape closes it and focus goes back to More");
  mb.click(); d.body.click();
  ok(more.hidden, "tapping elsewhere closes it");
  mb.click(); $("map-find-btn").click(); await wait(50);
  ok(more.hidden && !$("find-sheet").hidden, "Find new water opens its sheet and closes the menu");
  $("find-done").click();
  ok($("find-sheet").hidden && d.activeElement === mb, "Done on Find new water returns focus to More");
  mb.click(); $("map-key-btn").click(); await wait(50);
  ok(!$("layers-sheet").hidden && $("map-key").open && more.hidden, "Map key opens the Layers sheet with the key open");
  $("layers-done").click();
  // notes dot on Layers
  const dot = $("map-notes-dot");
  ok(dot.hidden, "no notes → no dot on Layers");
  $("mx-note").textContent = "Loading reefs…"; $("mx-note").hidden = false; await wait(20);
  ok(!dot.hidden, "a note → dot on Layers");
  $("mx-note").hidden = true; await wait(20);
  ok(dot.hidden, "note gone → dot gone");
  // 🔍 search: your spots first
  const q = $("ms-q"), box = $("ms-results"), type = v => { q.value = v; q.dispatchEvent(new w.Event("input", { bubbles: true })); };
  const key = k => q.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  type("hills");
  const labels = () => [...box.querySelectorAll("li")].map(l => l.textContent);
  ok(!box.hidden && q.getAttribute("aria-expanded") === "true" && labels()[0] === "Your spots" && /Hillsboro Inlet/.test(labels()[1]), "typing shows your matching spots first: " + labels().join(" | "));
  ok(/Search places for “hills”/.test(labels().slice(-1)[0]) && PHOTON.length === 0, "a 'Search places' row, and nothing is sent while typing");
  key("ArrowDown");
  ok(q.getAttribute("aria-activedescendant") === box.querySelector("[role=option]").id && box.querySelector("[role=option]").getAttribute("aria-selected") === "true", "arrow down highlights the first result");
  $("map-search").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); await wait(50);
  const c1 = ev(`map.getCenter()`);
  ok(box.hidden && q.value === "Hillsboro Inlet" && Math.abs(c1.lat - 26.257) < 0.001 && Math.abs(c1.lng + 80.081) < 0.001, "Enter flies the map to the spot");
  // places (Photon)
  type("Pompano pier");
  key("Escape");
  ok(box.hidden, "Escape closes the results");
  $("map-search").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); await wait(100);
  ok(PHOTON.length === 1 && /photon\.komoot\.io\/api\/\?q=Pompano%20pier&limit=6&lang=en&lat=26\.\d+&lon=-80\.\d+/.test(PHOTON[0]), "Search sends one place search near the map: " + PHOTON[0]);
  ok(labels().includes("Places") && labels().some(t => /Pompano Beach Pier/.test(t) && /Pier · Pompano Beach, Florida/.test(t)), "place results listed with type and town: " + labels().join(" | "));
  [...box.querySelectorAll("[role=option]")].find(o => /Pompano Beach Pier/.test(o.textContent)).click(); await wait(50);
  const c2 = ev(`map.getCenter()`);
  ok(box.hidden && q.value === "Pompano Beach Pier" && Math.abs(c2.lat - 26.2326) < 0.01 && Math.abs(c2.lng + 80.0866) < 0.01, "tapping a place flies there");
  ok(/\+ Add a spot here/.test((d.querySelector(".leaflet-popup-content") || {}).textContent || ""), "the place shows a pop-up with + Add a spot here");
  type("Pompano pier"); $("map-search").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); await wait(100);
  ok(PHOTON.length === 1 && labels().some(t => /Pompano Beach Pier/.test(t)), "the same search again is remembered (not sent twice)");
  [...box.querySelectorAll("[role=option]")].find(o => /Pompano Beach Pier/.test(o.textContent)).click(); await wait(50);
  const addBtn = d.querySelector(".leaflet-popup-content button");
  addBtn.click(); await wait(100);
  ok(!$("spot-form").hidden && /Set on map/.test($("loc-text").textContent) && ev(`pickedLoc && Math.abs(pickedLoc.lat - 26.2326) < 0.001`), "+ Add a spot here opens the new-spot form with that place");
  ev(`showView("map")`); await wait(100);
  type("fail town"); $("map-search").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); await wait(1300);
  ok(/isn't working right now/.test(labels().join(" ")), "a failed place search says so: " + labels().join(" | "));
  type("");
  ok(box.hidden && !d.querySelector(".ms-hit"), "clearing the box closes results and removes the place marker");
  ev(`showView("list")`); await wait(50);
  ok(!d.body.classList.contains("on-map") && more.hidden, "leaving the map turns the full-screen layout off");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
