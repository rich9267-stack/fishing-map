process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-rich";
const SPOTS = [
  { id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0, faces_deg: 90 },
  { id: "s2", name: "C-14 Canal", spot_type: "seawall", water_type: "freshwater", lat: 26.27, lng: -80.15, created_by: ME, public_access: "yes" },
  { id: "s5", name: "My pier spot", spot_type: "pier", water_type: "saltwater", lat: 26.2381, lng: -80.0901, created_by: ME, public_access: "yes" },
  { id: "s3", name: "Lighthouse Point", spot_type: "inlet", water_type: "saltwater", lat: 26.28, lng: -80.08, created_by: ME, public_access: "yes" }
];
const OFFICIAL = [
  { id: 1, source: "fwc-ramp", name: "Hillsboro Inlet Park Ramp", kind: "ramp", lat: 26.2605, lng: -80.0830, water_type: null, county: "BROWARD", details: { lanes: 2, fee: "Yes", hours: "24 Hours", water: "Hillsboro Inlet", owner: "Broward County" } },
  { id: 2, source: "fl-fori", name: "Pompano Fishing Pier", kind: "pier", lat: 26.2380, lng: -80.0900, water_type: "saltwater", county: "BROWARD", details: { owner: "City of Pompano Beach" } },
  { id: 3, source: "fl-fori", name: "Tropical Park", kind: "park", lat: 26.30, lng: -80.30, water_type: null, county: "BROWARD", details: {} },
  { id: 10, source: "fwc-ramp", name: "Founders Park Boat Ramp", kind: "ramp", lat: 24.9380, lng: -80.6320, water_type: "saltwater", county: "MONROE", details: { lanes: 1 } },
  { id: 20, source: "fwc-ramp", name: "Ballast Point Boat Ramp", kind: "ramp", lat: 27.8830, lng: -82.4880, water_type: null, county: "HILLSBOROUGH", details: { lanes: 3, fee: "No" } },
  { id: 21, source: "fl-fori", name: "Skyway Fishing Pier State Park", kind: "pier", lat: 27.62, lng: -82.68, water_type: "saltwater", county: "MANATEE", details: {} },
  { id: 22, source: "fwc-ramp", name: "Bayshore Kayak Launch", kind: "ramp", lat: 27.80, lng: -82.60, water_type: null, county: "PINELLAS", details: { type: "Hand Launch Only" } },
  { id: 40, source: "admin", name: "Admin Dock", kind: "dock", lat: 26.2420, lng: -80.1200, water_type: "saltwater", county: "BROWARD", details: {} },
  { id: 30, source: "fl-fori", name: "Naples Pier", kind: "pier", lat: 26.1400, lng: -81.8000, water_type: "saltwater", county: "COLLIER", details: {} }
];
const OSM = [
  { type: "node", id: 101, lat: 26.2381, lon: -80.0902, tags: { man_made: "pier", name: "Pompano Beach Pier", fishing: "yes" } },
  { type: "node", id: 104, lat: 26.2606, lon: -80.0832, tags: { leisure: "slipway", name: "Hillsboro Inlet Boat Ramp" } },
  { type: "node", id: 102, lat: 26.31, lon: -80.20, tags: { leisure: "fishing", name: "Hidden Honey Hole" } },
  { type: "node", id: 103, lat: 27.81, lon: -82.61, tags: { leisure: "fishing", name: "Tampa Bay Flat" } }
];
const obs = (id, name, lat, lng, extra = {}) => ({ id, observed_on: "2026-10-0" + (id % 7 + 1), obscured: false, positional_accuracy: 20,
  geojson: { coordinates: [lng, lat] }, taxon: { name: "Sci " + name, preferred_common_name: name }, user: { login: "fisher" + id, name: "" },
  photos: [{ url: "https://inat/photos/" + id + "/square.jpg" }], uri: "https://www.inaturalist.org/observations/" + id, ...extra });
const calls = [];
const ST = process.env.ST || "admin";
let status = ST;
const MEMBER = () => ST === "admin" ? { data: { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved" }, error: null }
  : ST === "error" ? { data: null, error: { message: "boom" } } : ST === "none" ? { data: null, error: null } : { data: { email: "x@y.com", display_name: "Newbie", is_admin: false, status: ST }, error: null };
let PEND = [{ email: "new@x.com", display_name: "Newbie", is_admin: false, status: "pending", note: "Rico's cousin", requested_at: new Date().toISOString() },
  { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved" }, { email: "d@x.com", display_name: "Dee", status: "blocked" }];
const RPCS = [];
const NOW = Date.now(), H = 3600000;
const TOURS = [
  { id: "t1", kind: "official", title: "October Snook Slam", description: "Biggest snook wins", created_by: "u-rich", starts_at: new Date(NOW - 5 * H).toISOString(), ends_at: new Date(NOW + 48 * H).toISOString(), boards: ["length", "fish"], species: null, require_photo: true, require_length: true, geo_lat: null, geo_lng: null, geo_radius_mi: null, geo_label: null, cancelled_at: null },
  { id: "t2", kind: "friends", title: "Keys weekend showdown", description: null, created_by: "other", starts_at: new Date(NOW - 2 * H).toISOString(), ends_at: new Date(NOW + 20 * H).toISOString(), boards: ["length"], species: null, require_photo: false, require_length: true, geo_lat: 26.25, geo_lng: -80.08, geo_radius_mi: 5, geo_label: "Hillsboro Inlet", cancelled_at: null },
  { id: "t3", kind: "official", title: "Old Tournament", description: null, created_by: "u-rich", starts_at: new Date(NOW - 90 * H).toISOString(), ends_at: new Date(NOW - 60 * H).toISOString(), boards: ["species"], species: null, require_photo: true, require_length: true, geo_lat: null, geo_lng: null, geo_radius_mi: null, geo_label: null, cancelled_at: null }
];
let TMEM = [
  { tournament_id: "t1", user_id: "other", status: "joined" },
  { tournament_id: "t2", user_id: "other", status: "joined" }, { tournament_id: "t2", user_id: "u-rich", status: "invited" }
];
const STAND = [
  { user_id: "other", board: "length", value: 33, species: "Snook", caught_at: new Date(NOW - H).toISOString(), catch_id: "f2" },
  { user_id: "u-rich", board: "length", value: 36, species: "Snook", caught_at: new Date(NOW - 2 * H).toISOString(), catch_id: "c3" },
  { user_id: "other", board: "fish", value: 4, species: null, caught_at: new Date(NOW - H).toISOString(), catch_id: null }
];
const MYC = [{ catch_id: "c3", caught_at: new Date(NOW - 2 * H).toISOString(), species: "Snook", how_many: 1, length_in: 36, weight_lb: 17, ok: true, reason: null },
  { catch_id: "c1", caught_at: new Date(NOW - 3 * H).toISOString(), species: "Snook", how_many: 1, length_in: 31.5, weight_lb: 12, ok: false, reason: "Needs a photo" }];
let BLOCKS = [{ blocker: "u-rich", blocked: "str9" }];
const REPORTS = [{ id: "r1", created_at: new Date().toISOString(), reporter: "other", target_user: "str1", target_type: "catch", target_id: "p1", reason: "spam", details: "looks fake", snippet: "Tarpon — Stan", status: "open" },
  { id: "r2", created_at: new Date().toISOString(), reporter: "other", target_user: "str1", target_type: "profile", target_id: null, reason: "harassment", details: null, snippet: "Stan @stan", status: "open" }];
const PUBC = [
  { id: "p1", spot_id: "s9", species: "Tarpon", how_many: 1, caught_at: new Date(Date.now() - 2 * 3600000).toISOString(), created_by: "str1", caught_by: "Stan", visibility: "public" },
  { id: "p20", spot_id: "s20", species: "Snook", how_many: 1, caught_at: new Date(Date.now() - 3 * 3600000).toISOString(), created_by: "str2", caught_by: "Sam", visibility: "public" }
];
let MSGS = [
  { id: "m1", created_at: new Date(Date.now() - 3600000).toISOString(), sender: "other", recipient: "u-rich", body: "Snook were biting at the inlet!", read_at: null },
  { id: "m2", created_at: new Date(Date.now() - 7200000).toISOString(), sender: "u-rich", recipient: "other", body: "Heading out Saturday", read_at: new Date().toISOString() }
];
const mk = (id, spot, species, h, extra = {}) => ({ id, spot_id: spot, species, how_many: 1, caught_at: new Date(Date.now() - h * 3600000).toISOString(), created_by: ME,
  tide_stage: "outgoing", pressure_trend: "falling", moon_phase: "waning crescent", solunar: "minor", wind_mph: 8, water_temp_f: 81, ...extra });
const CATCHES = [mk("c1", "s1", "Snook", 30), mk("c2", "s1", "Snook", 54), mk("c3", "s1", "Snook", 78), mk("c4", "s1", "Jack crevalle", 100),
  mk("c5", "s3", "Mangrove snapper", 30), mk("c8", "s2", "Peacock bass", 40), mk("c6", "s3", "Mangrove snapper", 50), mk("c7", "s3", "Mangrove snapper", 70)];
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  Object.defineProperty(w.HTMLElement.prototype, "clientWidth", { get() { return 390; }, configurable: true });
  Object.defineProperty(w.HTMLElement.prototype, "clientHeight", { get() { return 700; }, configurable: true });
  Object.defineProperty(w.navigator, "geolocation", { value: { getCurrentPosition: (ok, bad) => { if (process.env.GPS === "tampa") setTimeout(() => ok({ coords: { latitude: 27.77, longitude: -82.63 } }), 5); else if (bad) bad({}); }, watchPosition: () => 1, clearWatch: () => {} }, configurable: true });
  Object.defineProperty(w.navigator, "permissions", { value: { query: async () => ({ state: process.env.GPS ? "granted" : "prompt" }) }, configurable: true });
  if (process.env.HOME_SET) w.localStorage.setItem("fm-home-waters", JSON.stringify({ name: "Pompano Beach / Fort Lauderdale", lat: 26.24, lng: -80.10 }));
  if (process.env.HOME_AT === "tampa") w.localStorage.setItem("fm-home-waters", JSON.stringify({ name: "Tampa Bay / St. Petersburg", lat: 27.70, lng: -82.65 }));
  if (process.env.HOME_AT === "fortmyers") w.localStorage.setItem("fm-home-waters", JSON.stringify({ name: "Fort Myers / Sanibel", lat: 26.55, lng: -82.00 }));
  w.__latest = { "8722670": 80.1, "8723214": 82.4, "8723970": 85.8, "8724580": 86.5, "8725520": 85.3, "8726384": 82.2, "8726520": 83.3, "8726724": 81.7, "8727520": 82.0 };
  w.__marine = () => 80.6; w.__failLookup = false; w.__sat = []; w.__satUrls = [];
  w.__urls = []; w.__offCalls = 0; w.__overpassFail = false; 
  w.__db = { inserts: [], upserts: [], sessions: [], deletes: [] };
  const chain = (data, tn) => { const fl = []; const rows = () => Array.isArray(data) ? data.filter(r => fl.every(f => f(r))) : data;
    const p = () => Promise.resolve({ data: rows(), error: null }); const o = {
      eq: (c, v) => { fl.push(r => r[c] === v); return o; }, in: (c, vs) => { fl.push(r => vs.includes(r[c])); return o; },
      is: () => o, or: () => o, ilike: () => o, gte: (c, v) => { if (tn === "official_spots") fl.push(r => r[c] >= v); return o; }, lt: (c, v) => { if (tn === "official_spots") fl.push(r => r[c] < v); return o; }, order: () => o, select: () => o, limit: () => p(),
      single: () => Promise.resolve({ data: { id: "new-" + Math.random().toString(36).slice(2) }, error: null }),
      then: (x, y) => p().then(x, y),
      maybeSingle: () => tn === "members" ? Promise.resolve(MEMBER()) : p().then(r => ({ data: (r.data || [])[0] || null, error: null })) }; return o; };
  const chainT = (t, d) => chain(d, t);
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "rich9267@gmail.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
    rpc: async (fn, a) => { RPCS.push([fn, a]); if (fn === 'trip_review') return { data: [{ catch_id: 'x1', user_id: 'u-rich', caught_at: new Date().toISOString(), species: 'Snook', how_many: 1, length_in: 30, weight_lb: 8, weight_est: true, spot_id: 's1', lat: 26.2571, lng: -80.0812, accuracy_m: 9 }, { catch_id: 'x2', user_id: 'other', caught_at: new Date().toISOString(), species: 'Tarpon', how_many: 2, length_in: null, weight_lb: null, weight_est: false, spot_id: 's1', lat: null, lng: null, accuracy_m: null }], error: null }; if (fn === 'tournament_standings') return { data: STAND, error: null }; if (fn === 'tournament_my_catches') return { data: MYC, error: null }; if (fn === 'create_tournament') { TOURS.push({ id: 't9', kind: a.p_kind, title: a.p_title, description: a.p_desc, created_by: 'u-rich', starts_at: a.p_starts, ends_at: a.p_ends, boards: a.p_boards, species: a.p_species || null, require_photo: a.p_photo, require_length: a.p_length, geo_lat: a.p_lat, geo_lng: a.p_lng, geo_radius_mi: a.p_radius, geo_label: a.p_geo_label, cancelled_at: null }); TMEM.push({ tournament_id: 't9', user_id: 'u-rich', status: 'joined' }); return { data: 't9', error: null }; } if (fn === 'join_tournament') { const m = TMEM.find(x => x.tournament_id === a.p_id && x.user_id === 'u-rich'); if (m) m.status = 'joined'; else TMEM.push({ tournament_id: a.p_id, user_id: 'u-rich', status: 'joined' }); return { error: null }; } if (fn === 'leave_tournament') { const m = TMEM.find(x => x.tournament_id === a.p_id && x.user_id === 'u-rich'); if (m) m.status = 'left'; return { error: null }; } if (fn === 'cancel_tournament') { TOURS.find(x => x.id === a.p_id).cancelled_at = new Date().toISOString(); return { error: null }; } if (fn === 'block_user') BLOCKS.push({ blocker: 'u-rich', blocked: a.p_user }); if (fn === 'mark_read') MSGS.forEach(m => { if (m.sender === a.p_other && m.recipient === 'u-rich') m.read_at = new Date().toISOString(); }); if (fn === 'request_access') { status = 'pending'; } if (fn === 'review_access') PEND = PEND.map(m => m.email === a.p_email ? { ...m, status: a.p_approve ? 'approved' : 'blocked' } : m); return fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }; }, storage: { from: () => ({ createSignedUrls: async paths => ({ data: paths.map(p => ({ path: p, signedUrl: 'https://img.test/' + p })) }) }) },
    from: t => ({ select: () => chainT(t, t === "official_spots" ? (w.__offCalls++, OFFICIAL) : t === "members" ? PEND : t === "messages" ? MSGS : t === "blocks" ? BLOCKS : t === "reports" ? REPORTS :  (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES.concat(PUBC) : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'str9',handle:'badguy',display_name:'Bad Guy'},{user_id:'str1',handle:'stan',display_name:'Stan the Man',home_area:'Stuart',bio:'Tarpon nut'},{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'pnow',spot_id:'s1',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()-30*60000).toISOString(),note:'now'},{id:'ppast',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()-48*3600000).toISOString(),note:'old'},{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "photos" ? [{ id: "ph1", catch_id: "x1", path: "u/x1.jpg", spot_id: "s1", created_by: "u-rich", created_at: new Date().toISOString() }] : t === "tournaments" ? TOURS : t === "tournament_members" ? TMEM : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'},{plan_id:'ppast',user_id:'u-rich',name:'Richard'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { const o = { eq: (c, v) => { w.__db.deletes.push(t + ":" + c + "=" + v); if (t === "blocks") BLOCKS = BLOCKS.filter(b => b.blocked !== v); return o; }, then: (x, y) => Promise.resolve({ error: null }).then(x, y) }; return o; },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "messages") { const m = { id: "mm" + MSGS.length, created_at: new Date().toISOString(), sender: "u-rich", read_at: null, ...row }; MSGS.push(m); return { select: () => ({ single: () => Promise.resolve({ data: m, error: null }) }) }; } if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: row => { w.__db.upserts.push({ t, row }); return Promise.resolve({ error: null }); },
      update: row => { w.__db.updates = (w.__db.updates || []).concat([{ t, row }]); return chain(t === 'profiles' ? { user_id: 'u-rich', ...row } : null); } }) }) };
  w.fetch = async url => {
    w.__urls.push(url);
    if (url.includes("overpass")) { if (w.__overpassFail) throw new Error("busy"); return { ok: true, json: async () => ({ elements: OSM }) }; }
    // ---- test115's own fakes (they win over the shared ones below) ----
    if (url.includes("tidepredstations")) { if (w.__failLookup) throw new Error("offline"); return { ok: true, json: async () => ({ stationList: [] }) }; }
    if (url.includes("product=water_temperature") && url.includes("date=latest")) {
      const v = w.__latest[/station=(\d+)/.exec(url)[1]];
      return { ok: true, json: async () => v ? { data: [{ t: "2026-10-14 23:54", v: String(v), f: "0,0,0" }] } : { error: { message: "No data was found." } } };
    }
    if (url.includes("marine-api.open-meteo.com")) return { ok: true, json: async () => ({ current: { sea_surface_temperature: w.__marine() } }) };
    if (url.includes("tidepredstations")) return { ok: true, json: async () => ({ stationList: [{ stationId: "8726520", stationName: "St. Petersburg", lat: 27.7606, lon: -82.6269 }] }) };
    if (url.includes("api.weather.gov/points/")) return { ok: true, json: async () => ({ properties: { forecastHourly: "https://api.weather.gov/gridpoints/X/hourly", observationStations: "https://api.weather.gov/gridpoints/X/stations" } }) };
    if (url.endsWith("/gridpoints/X/stations")) return { ok: true, json: async () => ({ features: [{ properties: { stationIdentifier: "KTPA" } }] }) };
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
const w = dom.window; w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
const J = s => JSON.parse(w.eval("JSON.stringify(" + s + ")"));

(async () => {
  await wait(1800);
  let bad = "";
  const need = (ok, msg) => { if (!ok) bad += " " + msg + ";"; };
  const $ = id => d.getElementById(id);
  const row = $("layers-body") && d.querySelector('#layers-body .lyr[data-for="mx-official"]');
  const pins = () => [...d.querySelectorAll("#map .ol-pin")];
  const note = () => $("mx-note").hidden ? "" : $("mx-note").textContent;
  const zoomTo = async z => { w.eval(`map.setZoom(${z})`); await wait(700); };

  // ---- the switch ----
  const fishing = [...d.querySelectorAll("#layers-body > *")];
  const firstSwitch = fishing.find(x => x.classList.contains("lyr"));
  need(fishing[0] && fishing[0].classList.contains("lyr-group") && fishing[0].textContent === "Fishing", "first group is Fishing");
  need(firstSwitch === row, "the ✅ Official public spots switch is the first one in the Fishing group");
  need(row && /Official public spots/.test(row.textContent) && /Boat ramps, piers, parks/.test(row.textContent), "switch has its name and its small line");
  need(row && row.getAttribute("role") === "switch" && row.getAttribute("aria-checked") === "false", "switch starts off");
  need($("layer-real").contains($("mx-official")), "the real button sits in the hidden box with the others");
  need(!!d.querySelector('#layers-body .lyr[data-for="mx-ramp"]'), "the old ⛵ Boat ramps layer is still there (it goes in step 6)");
  need(pins().length === 0, "no pins before the switch is on");

  // ---- switch on: pins for every kind ----
  $("map-layers-btn").click(); await wait(200);
  row.click(); await wait(900);
  need($("mx-official").classList.contains("on") && row.getAttribute("aria-checked") === "true", "switch on follows the real button");
  const inView = J(`officialSpots.filter(o => map.getBounds().pad(0.1).contains([o.lat, o.lng])).map(o => o.name)`);
  need(inView.length >= 3, "the test data has spots in view: " + inView.join(", "));
  need(pins().length === inView.length, "one pin per official spot in view (" + pins().length + " vs " + inView.length + ")");
  const titles = [...d.querySelectorAll("#map .leaflet-marker-icon")].map(x => x.getAttribute("title") || "");
  need(titles.some(t => /Hillsboro Inlet Park Ramp — Boat ramp/.test(t)), "ramp pin is named: " + titles.join(" | "));
  need(titles.some(t => /Pompano Fishing Pier — Pier/.test(t)), "pier pin is named");
  need(pins().some(p => p.classList.contains("ol-ramp") && /⛵/.test(p.textContent)), "ramp pins show ⛵");
  need(pins().some(p => p.classList.contains("ol-pier") && /🎣/.test(p.textContent)), "pier pins show 🎣");
  need(pins().some(p => p.classList.contains("ol-park") && /🌳/.test(p.textContent)), "park / admin-added pins show 🌳");
  need(pins().filter(p => p.querySelector(".ol-star")).length === 1, "exactly one pin (the admin-added place) carries a ⭐");
  need(note() === "", "no message while pins are showing: " + note());
  need(w.eval("Object.keys(officialCells).length") <= 10, "no more squares kept than the phone allows");
  need(!d.querySelector("#map .leaflet-popup"), "no card open before any tap");

  // ---- zoom out / in ----
  await zoomTo(8);
  need(pins().length === 0, "zoomed out to 8: no pins");
  need(/Zoom in to see official spots\./.test(note()), "zoomed out: the plain line says 'Zoom in to see official spots.': " + note());
  await zoomTo(9);
  need(!/Zoom in/.test(note()), "zoom 9 is the first level that shows pins: " + note());
  need(w.eval("Object.keys(officialCells).length") <= 10, "zoom 9: still no more squares kept than the phone allows");
  await zoomTo(12);
  need(pins().length === inView.length, "zoomed back in: the pins are back");

  // ---- a very busy view keeps the nearest ones and says so ----
  w.eval("OL.max = 2"); w.eval("olDraw(0)");
  need(pins().length === 2 && /nearest the middle/.test(note()), "busy view is capped and says so: " + pins().length + " / " + note());
  w.eval("OL.max = 400"); w.eval("olDraw(0)");
  need(pins().length === inView.length && note() === "", "cap lifted: all pins and no message");

  // ---- an area with nothing ----
  w.eval("map.setView([25.6, -81.9], 12)"); await wait(900);
  need(pins().length === 0 && /No official spots in this view/.test(note()), "empty area says so: " + note());
  w.eval("map.setView([LAT, LNG], 12)"); await wait(900);
  need(pins().length === inView.length, "back home: pins return");

  // ---- offline: an unreachable database never breaks the layer ----
  w.eval("var __from = db.from; db.from = () => { throw new Error('offline'); }");
  w.eval("map.setView([26.9, -80.2], 12)"); await wait(900);
  w.eval("db.from = __from");
  need(pins().length === 0, "offline in an unloaded area: no pins, no crash");
  w.eval("map.setView([LAT, LNG], 12)"); await wait(900);

  // ---- step 2: tap a pin -> the card ----
  // a pretend no-fishing zone around the Hillsboro ramp (the saved list is marked fresh so the app does not ask the database)
  w.eval(`zn.read = true; zn.t = Date.now(); zn.rows = [{ id: "z1", name: "Test Reserve", level: "no_take", rule: "", protection: "", agency: "", url: "", anchor: "", vessel: "", min_lat: 26.255, max_lat: 26.265, min_lng: -80.088, max_lng: -80.078,
    geom: { type: "Polygon", coordinates: [[[-80.088, 26.255], [-80.078, 26.255], [-80.078, 26.265], [-80.088, 26.265], [-80.088, 26.255]]] } }]`);
  const tap = async name => { w.eval(`(function(){ var m = null; OL.group.eachLayer(function(l){ if ((l.options.title || "").indexOf(${JSON.stringify(name)}) === 0) m = l; }); if (m) m.fire("click"); })()`); await wait(250); };
  const card = () => (d.querySelector("#map .leaflet-popup-content") || { textContent: "", querySelector: () => null });
  await tap("Hillsboro Inlet Park Ramp");
  let t = card().textContent;
  need(/⛵ Hillsboro Inlet Park Ramp/.test(t), "ramp card shows the name: " + t);
  need(/Boat ramp/.test(t) && /Broward County/.test(t), "ramp card shows the kind and the county: " + t);
  need(/2 lanes/.test(t) && /Fee/.test(t) && /24 Hours/.test(t) && /Hillsboro Inlet/.test(t) && /Broward County/.test(t), "ramp card shows lanes, fee, hours, water, owner: " + t);
  need(/Source: Florida Fish & Wildlife \(FWC\) boat ramp list/.test(t), "ramp card credits FWC: " + t);
  need(/Check before you go — reference only, not for navigation\./.test(t), "ramp card has the check-before-you-go line");
  need(/🚫 Test Reserve — fishing is not allowed/.test(t), "ramp inside a no-fishing zone shows the red 🚫 line: " + t);
  need(/Directions/.test(t) && /Start a trip here/.test(t), "the card has Directions and Start a trip here (step 5)");
  await tap("Pompano Fishing Pier");
  t = card().textContent;
  need(/🎣 Pompano Fishing Pier/.test(t) && /Pier/.test(t) && /Florida DEP outdoor recreation list/.test(t), "pier card: name, kind, DEP credit: " + t);
  need(!/🚫/.test(t), "a pier outside any zone has no 🚫 line: " + t);
  need(/Check before you go/.test(t), "pier card has the check-before-you-go line");
  await tap("Admin Dock");
  t = card().textContent;
  need(/⭐/.test(t) && /Added by an admin of this app/.test(t), "admin-added place card says so: " + t);
  need(/Fishing spot · Broward County/.test(t) && !/lane/.test(t), "park / dock card: right kind, no ramp facts: " + t);
  // empty saved list of closed areas: still opens, just no 🚫
  w.eval("zn.rows = []");
  await tap("Hillsboro Inlet Park Ramp");
  need(!/🚫/.test(card().textContent) && /Hillsboro Inlet Park Ramp/.test(card().textContent), "no zones saved: the card still opens without a 🚫 line");
  w.eval("map.closePopup()"); await wait(100);

  // ---- switch off ----
  row.click(); await wait(300);
  need(pins().length === 0 && note() === "", "switch off: pins and message gone");
  need(!$("mx-official").classList.contains("on") && row.getAttribute("aria-checked") === "false", "switch shows off");
  w.eval("map.setView([LAT, LNG], 13)"); await wait(900);
  need(pins().length === 0, "moving the map with the switch off draws nothing");
  row.click(); await wait(900);
  need(pins().length > 0, "switch on again: pins return");

  console.log(bad ? "FAIL:" + bad : "OK");
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log("TEST ERROR", e); process.exit(1); });
