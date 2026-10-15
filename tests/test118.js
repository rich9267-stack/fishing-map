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
// ---- the fake FWC red tide feed (real FWC wording: "Oct  8 2026 " dates, "medium (100,000-1,000,000)" categories) ----
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fwcDate = daysAgo => { const t = new Date(Date.now() - daysAgo * 86400000); return MON[t.getMonth()] + " " + String(t.getDate()).padStart(2, " ") + " " + t.getFullYear() + " "; };
const ABUN = ["not present/background (0-1,000)", "very low (>1,000-10,000)", "low (>10,000-100,000)", "medium (>100,000-1,000,000)", "high (>1,000,000)"];
const smp = (id, lat, lng, lvl, daysAgo, where) => ({ HAB_ID: id, SampleDate_t: fwcDate(daysAgo), LOCATION: where, LATITUDE: lat, LONGITUDE: lng, SAMPLE_DEPTH: 0.5, Abundance: ABUN[lvl] });
const FWC = mode => {
  if (mode === "clear") return [smp("c1", 26.25, -80.11, 0, 1, "Pompano Beach pier"), smp("c2", 26.20, -80.10, 1, 2, "Lauderdale-by-the-Sea")];
  const pompano = [smp("p1", 26.25, -80.11, 0, 1, "Pompano Beach pier"), smp("p2", 26.20, -80.10, 2, 2, "Lauderdale-by-the-Sea"),
    smp("p3", 26.30, -80.08, 3, 2, "Hillsboro Inlet; off"), smp("p4", 26.36, -80.09, 4, 3, "Boca Raton; 2 mi E of the inlet"),
    smp("p5", 26.60, -80.05, 4, 1, "Too far north (more than 15 mi)")];
  const tampa = [smp("t1", 27.77, -82.63, 3, 4, "Tampa Bay; mid-bay"), smp("t2", 27.80, -82.70, 0, 1, "Gandy Bridge")];
  return pompano.concat(tampa);
};
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
  Object.defineProperty(w.navigator, "geolocation", { value: { getCurrentPosition: (ok, bad) => { if (process.env.GPS === "tampa") setTimeout(() => ok({ coords: { latitude: 27.77, longitude: -82.63 } }), 5); else if (bad) bad({}); }, watchPosition: () => 1, clearWatch: () => {} }, configurable: true });
  Object.defineProperty(w.navigator, "permissions", { value: { query: async () => ({ state: process.env.GPS ? "granted" : "prompt" }) }, configurable: true });
  if (process.env.HOME_SET) w.localStorage.setItem("fm-home-waters", JSON.stringify({ name: "Pompano Beach / Fort Lauderdale", lat: 26.24, lng: -80.10 }));
  if (process.env.HOME_AT === "tampa") w.localStorage.setItem("fm-home-waters", JSON.stringify({ name: "Tampa Bay / St. Petersburg", lat: 27.70, lng: -82.65 }));
  if (process.env.HOME_AT === "fortmyers") w.localStorage.setItem("fm-home-waters", JSON.stringify({ name: "Fort Myers / Sanibel", lat: 26.55, lng: -82.00 }));
  w.__latest = { "8722670": 80.1, "8723214": 82.4, "8723970": 85.8, "8724580": 86.5, "8725520": 85.3, "8726384": 82.2, "8726520": 83.3, "8726724": 81.7, "8727520": 82.0 };
  w.__marine = () => 80.6; w.__failLookup = false; w.__sat = []; w.__satUrls = [];
  w.__fwcCalls = []; w.__fwcDown = process.env.FWC_DOWN === '1'; w.__fwc = () => FWC(process.env.FWC_MODE || 'bloom'); w.__urls = []; w.__offCalls = 0; w.__overpassFail = false; w.localStorage.setItem("fm-official-v1", JSON.stringify({ t: Date.now(), items: [{ id: 99, name: "OLD COPY", lat: 26.2, lng: -80.1 }] }));
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
    if (url.includes("HAB_forDEP_Dashboard")) {
      w.__fwcCalls.push(url);
      if (w.__fwcDown) throw new Error("FWC offline");
      const q = new URL(url), [we, so, ea, no] = (q.searchParams.get("geometry") || "-180,-90,180,90").split(",").map(Number);
      const feats = w.__fwc().filter(a => a.LONGITUDE >= we && a.LONGITUDE <= ea && a.LATITUDE >= so && a.LATITUDE <= no).map(a => ({ attributes: a }));
      return { ok: true, json: async () => ({ features: feats, exceededTransferLimit: false }) };
    }
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

// test118: red tide (Gulf expansion step 5): FWC samples as a map layer, a heads-up banner (Home / Map / Boat mode), the Settings switch and the alert link.
//   modes:  pompano (default)  ·  GPS=tampa HOME_SET=1 (away on the Gulf coast)  ·  FWC_MODE=clear (no red tide)  ·  FWC_DOWN=1 (FWC not answering)
const path = require("path");
(async () => {
  await wait(1800);
  const mode = process.env.FWC_DOWN === "1" ? "down" : process.env.FWC_MODE === "clear" ? "clear" : process.env.GPS === "tampa" ? "tampa" : "pompano";
  let bad = "";
  const need = (ok, msg) => { if (!ok) bad += " " + msg + ";"; };
  const banner = d.getElementById("rt-banner"), boatRt = d.getElementById("boat-rt");
  const text = e => e.textContent.replace(/\s+/g, " ").trim();
  const NOW = Date.now();

  // ---- A. the app and the alert function read FWC the same way (js/30 vs supabase/functions/red-tide-watch/core.mjs) ----
  const core = await import(require("url").pathToFileURL(path.join(__dirname, "../supabase/functions/red-tide-watch/core.mjs")).href);
  const words = ["not present/background (0-1,000)", "very low (>1,000-10,000)", "low (>10,000-100,000)", "medium (>100,000-1,000,000)", "high (>1,000,000)", "Medium", "HIGH", "", null, "weird", "Very Low"];
  need(JSON.stringify(words.map(core.rtLevel)) === JSON.stringify(words.map(x => w.eval("rtLevel")(x))), "rtLevel gives the same answers in the app and on the server");
  need(JSON.stringify(words.slice(0, 5).map(core.rtLevel)) === "[0,1,2,3,4]", "FWC's five wordings map to levels 0-4: " + JSON.stringify(words.map(core.rtLevel)));
  const dates = ["Oct  8 2026 ", "Oct 14, 2026", "10/14/2026", "2026-10-14", "", null, "junk"];
  need(JSON.stringify(dates.map(core.rtDate)) === JSON.stringify(dates.map(x => w.eval("rtDate")(x))), "rtDate gives the same answers in the app and on the server");
  need(core.rtDate("Oct  8 2026 ") != null && core.rtDate("junk") === null, "FWC's double-space date is readable; junk is not");
  const samples = FWC("bloom").map(a => ({ lat: +a.LATITUDE, lng: +a.LONGITUDE, level: core.rtLevel(a.Abundance), ms: core.rtDate(a.SampleDate_t), place: a.LOCATION.trim() }));
  const pick = r => r && ({ level: r.level, mi: +r.mi.toFixed(3), ms: r.ms, place: r.place, n: r.n, counts: r.counts });
  [[26.24, -80.10, "Pompano"], [27.77, -82.63, "Tampa"], [24.0, -83.0, "open water"]].forEach(([la, ln, name]) => {
    const a = JSON.parse(w.eval(`JSON.stringify(rtSummary(${JSON.stringify(samples)}, ${la}, ${ln}, ${NOW}))`)), b = core.rtSummary(samples, la, ln, NOW);
    need(JSON.stringify(pick(a)) === JSON.stringify(pick(b)), `rtSummary agrees for ${name}: app ${JSON.stringify(pick(a))} vs server ${JSON.stringify(pick(b))}`);
  });
  const sp = core.rtSummary(samples, 26.24, -80.10, NOW);
  need(sp && sp.level === 4 && sp.n === 4 && JSON.stringify(sp.counts) === "[1,0,1,1,1]" && sp.mi > 7 && sp.mi < 10, "Pompano: worst = High ~8 mi away, 4 samples inside 15 mi (the one 25 mi north is left out): " + JSON.stringify(pick(sp)));
  const st = core.rtSummary(samples, 27.77, -82.63, NOW);
  need(st && st.level === 3 && st.n === 2, "Tampa: Medium, 2 samples: " + JSON.stringify(pick(st)));
  need(core.rtSummary([{ lat: 26.24, lng: -80.10, level: 4, ms: NOW - 12 * 86400000, place: "old" }], 26.24, -80.10, NOW) === null, "a sample older than 8 days is not used");
  need(core.rtSummary([{ lat: 26.24, lng: -80.10, level: 4, ms: null, place: "no date" }], 26.24, -80.10, NOW).level === 4, "a sample with an unreadable date is still used");
  need(core.rtSummary([{ lat: 26.24, lng: -80.10, level: -1, ms: NOW, place: "?" }], 26.24, -80.10, NOW) === null, "a sample with an unknown level is ignored");

  // ---- B. the banner (Home / Map / Boat mode) ----
  const calls0 = w.__fwcCalls.slice();
  if (mode === "down") need(calls0.length >= 1, "the app tried to ask FWC");
  else need(calls0.length >= 1, "the app asked FWC for the area you are in at start-up (" + calls0.length + " calls)");
  need(calls0.every(u => /HAB_forDEP_Dashboard\/MapServer\/0\/query/.test(u) && /returnGeometry=false/.test(u) && /outFields=HAB_ID,SampleDate_t,LOCATION,LATITUDE,LONGITUDE,SAMPLE_DEPTH,Abundance/.test(u) && /geometry=/.test(u)), "FWC is asked only for the dots near you: " + (calls0[0] || "").slice(0, 160));
  await w.eval("wxRefresh()"); await wait(300);
  need(w.__fwcCalls.length === calls0.length, "the weather check running again does not call FWC again (20-minute memory): " + calls0.length + " → " + w.__fwcCalls.length);
  const item = () => banner.querySelector(".rt-item");
  if (mode === "pompano" || mode === "tampa") {
    const hot = mode === "pompano";
    need(!banner.hidden && item(), mode + ": the red tide banner shows");
    const t = item() ? text(item()) : "";
    need(new RegExp((hot ? "High" : "Medium") + " red tide reported nearby").test(t), mode + ": banner names the level: " + t);
    need(/about \d+ mi away/.test(t) && (hot ? /3 days ago/.test(t) : /4 days ago/.test(t)), mode + ": banner says how far and how old: " + t);
    need(!!item() && item().classList.contains("urgent") === hot, mode + ": High is the red style, Medium is not");
    need(!!item() && item().getAttribute("role") === "button" && item().tabIndex === 0 && item().getAttribute("aria-expanded") === "false", "the banner can be reached and opened from the keyboard");
    need(!boatRt.hidden && new RegExp((hot ? "High" : "Medium") + " red tide ~\\d+ mi away").test(text(boatRt)) && (boatRt.className === "urgent") === hot, "Boat mode shows the same heads-up: " + text(boatRt));
    // open it
    item().click();
    const more = item() && item().querySelector(".wx-more"), mt = more ? text(more) : "";
    need(!!more && /Worst sample: (High|Medium) \(/.test(mt) && /cells per litre/.test(mt), "tapping opens the details: " + mt.slice(0, 160));
    need(hot ? /4 samples within 15 miles in the last 8 days/.test(mt) && /Boca Raton; 2 mi E of the inlet/.test(mt) : /2 samples within 15 miles/.test(mt) && /Tampa Bay; mid-bay/.test(mt), "details name the samples and the place: " + mt.slice(0, 260));
    need(/discolour the water, kill fish/.test(mt) && /one spot on one day/.test(mt) && /Source: FWC-FWRI/.test(mt), "details explain it plainly and credit FWC");
    const fw = item() && [...item().querySelectorAll("a")].find(a => /FWC's red tide map/.test(a.textContent));
    need(!!fw && fw.href === "https://gis.myfwc.com/redtidecurrentstatus/" && fw.target === "_blank" && /noopener/.test(fw.rel), "there is a link to FWC's own red tide map");
    need(item().getAttribute("aria-expanded") === "true", "the banner says it is open");
    // hide for today
    const hideBtn = [...banner.querySelectorAll("button")].find(b => /Hide for today/.test(b.textContent));
    need(!!hideBtn, "there is a Hide for today button");
    if (hideBtn) hideBtn.click();
    need(banner.hidden && !item() && boatRt.hidden, "Hide for today hides the banner and the Boat mode line");
    const stored = JSON.parse(w.localStorage.getItem("fm-rt-hide") || "null");
    need(stored && stored.level === (hot ? 4 : 3) && stored.day === new Date().toLocaleDateString("en-CA"), "the hide is remembered for today on this phone: " + JSON.stringify(stored));
    w.eval("rtRender()"); need(banner.hidden, "it stays hidden when the screen redraws");
    w.localStorage.setItem("fm-rt-hide", JSON.stringify({ day: new Date().toLocaleDateString("en-CA"), level: hot ? 3 : 2 })); w.eval("rtRender()");
    need(!banner.hidden, "if it gets worse than what you hid, it comes back");
    w.localStorage.setItem("fm-rt-hide", JSON.stringify({ day: "2020-01-01", level: 4 })); w.eval("rtRender()");
    need(!banner.hidden, "yesterday's hide does not count");
    w.localStorage.removeItem("fm-rt-hide"); w.eval("rtRender()");
  } else {
    need(banner.hidden && !item(), mode + ": no red tide banner");
    need(boatRt.hidden, mode + ": no Boat mode line");
  }

  // ---- C. the map layer ----
  const btn = d.getElementById("mx-redtide"), row = d.querySelector('.lyr[data-for="mx-redtide"]'), note = d.getElementById("rt-note"), key = d.getElementById("rt-key");
  need(!!btn && btn.getAttribute("aria-pressed") === "false" && !!row && row.getAttribute("aria-checked") === "false", "the 🔴 Red tide layer is off at start, in the hidden button and the Layers sheet");
  need(note.hidden && key.hidden, "no red tide note or key until the layer is on");
  Object.defineProperty(d.getElementById("map"), "clientWidth", { value: 900, configurable: true });   // jsdom has no screen: give the map a size
  Object.defineProperty(d.getElementById("map"), "clientHeight", { value: 700, configurable: true });
  btn.click(); await wait(300);
  w.eval("map.invalidateSize(); map.setView([LAT, LNG], 10)"); await wait(900);
  need(w.eval("rt.on") === true && btn.getAttribute("aria-pressed") === "true" && btn.classList.contains("on"), "the layer button turns on");
  need(row.getAttribute("aria-checked") === "true", "the Layers sheet switch follows it");
  need(!key.hidden && !note.hidden, "the map key and note appear");
  const b = J("(function(){const b=map.getBounds();return [b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];})()");
  const inView = FWC(process.env.FWC_MODE || "bloom").filter(a => a.LONGITUDE >= b[0] && a.LONGITUDE <= b[2] && a.LATITUDE >= b[1] && a.LATITUDE <= b[3]);
  const nMarkers = w.eval("rt.layer ? rt.layer.getLayers().length : -1");
  if (mode === "down") {
    need(/Couldn't load red tide samples right now/.test(note.textContent) && nMarkers === -1, "FWC down: a plain 'couldn't load' message and no dots: " + note.textContent);
  } else {
    need(nMarkers === inView.length && nMarkers > 0, "one dot for each sample in view: " + nMarkers + " vs " + inView.length);
    need(/Red tide samples from the last 8 days \(FWC-FWRI\)/.test(note.textContent) && /doesn't prove the whole area is clear/.test(note.textContent), "the note explains the colours and the limits: " + note.textContent.slice(0, 120));
    const labels = J("rt.layer.getLayers().map(m => [m.options.a11y, m.options.fillColor, m.options.radius])");
    const hasLevel = (n, color) => labels.some(l => l[0].startsWith("Red tide sample, " + n) && l[1] === color);
    if (mode === "pompano") {
      need(hasLevel("High", "#b3261e") && hasLevel("Medium", "#e55d2b") && hasLevel("Low", "#f39c12") && hasLevel("Not present", "#9aa5b1"), "dots are coloured by level, each with a screen-reader label: " + JSON.stringify(labels));
      need(labels.find(l => /High/.test(l[0]))[2] > labels.find(l => /Not present/.test(l[0]))[2], "worse samples are drawn bigger (not colour alone)");
      need(/3 days ago/.test(labels.find(l => /High/.test(l[0]))[0]), "the label says how old the sample is: " + labels.find(l => /High/.test(l[0]))[0]);
      const lastFill = w.eval("rt.layer.getLayers()[rt.layer.getLayers().length - 1].options.fillColor");
      need(lastFill === "#b3261e", "the worst dot is drawn on top: " + lastFill);
      let pop = "";
      try { pop = w.eval("(function(){ const ms = rt.layer.getLayers(); const m = ms.find(x => Math.abs(x.getLatLng().lat - 26.36) < 0.001); m.openPopup(); const p = document.querySelector('.leaflet-popup-content'); return p ? p.textContent : ''; })()"); } catch (e) { pop = "ERR " + e.message; }
      need(/Red tide sample: High/.test(pop) && /100,000|over 1,000,000/.test(pop) && /Boca Raton/.test(pop) && /Source: FWC-FWRI/.test(pop) && /0\.5 m/.test(pop), "tapping a dot opens its details: " + pop.slice(0, 200));
    }
  }
  const urlsNow = w.__fwcCalls.length;
  // zooming out too far asks for a closer look instead of loading the whole state
  w.eval("map.setZoom(5)"); await wait(900);
  need(/Zoom in a little to see red tide samples/.test(note.textContent) && w.eval("rt.layer") === null, "zoomed far out: 'Zoom in a little' and no dots");
  w.eval("map.setZoom(10)"); await wait(900);
  if (mode !== "down") need(w.eval("rt.layer") !== null, "zoomed back in: the dots come back");
  // off again
  btn.click(); await wait(200);
  need(w.eval("rt.on") === false && w.eval("rt.layer") === null && btn.getAttribute("aria-pressed") === "false" && note.hidden && key.hidden && row.getAttribute("aria-checked") === "false", "turning it off clears the dots, the note and the key");

  // ---- D. Settings → Phone alerts has the switch, and it is saved ----
  const cb = d.getElementById("push-p-rt");
  need(!!cb && cb.type === "checkbox" && !!d.querySelector('label[for="push-p-rt"]') && /Red tide/.test(d.querySelector('label[for="push-p-rt"]').textContent), "Settings has a 🔴 Red tide alert switch");
  if (cb) { cb.checked = false; await w.eval("pushSavePrefs()"); }
  const up = w.__db.upserts.filter(x => x.t === "notif_prefs").pop();
  need(up && up.row.red_tide === false, "saving Settings sends red_tide: false when it is switched off: " + JSON.stringify(up && up.row.red_tide));
  if (cb) { cb.checked = true; await w.eval("pushSavePrefs()"); }
  need(w.__db.upserts.filter(x => x.t === "notif_prefs").pop().row.red_tide === true, "…and true when it is on");

  // ---- E. tapping the phone alert opens the map with the layer on ----
  w.eval('showView("list")');
  w.eval('handleGo("go=redtide")'); await wait(900);
  need(!d.getElementById("view-map").hidden && w.eval("rt.on") === true, "the alert's ?go=redtide link opens the map with the red tide layer on");
  w.eval("setRtOn(false)");

  // ---- F. files and database ----
  const read = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  need(/js\/30-red-tide\.js/.test(read("sw.js")) && /js\/30-red-tide\.js/.test(read("index.html")), "the new file is in the offline list and loaded by index.html");
  const sql = read("setup/62-red-tide.sql");
  need(/notif_prefs add column if not exists red_tide boolean not null default true/.test(sql) && /when 'red_tide' then coalesce\(pr\.red_tide, true\)/.test(sql) && /notifications_kind_check2/.test(sql) && /'red_tide'\]/.test(sql) && /cron\.schedule\('red-tide-watch'/.test(sql), "setup/62 has the switch, the alert kind, the new rule and the daily schedule");
  const fn = read("supabase/functions/red-tide-watch/index.ts");
  need(/p_kind: "red_tide"/.test(fn) && /p_url: "\?go=redtide"/.test(fn) && /x-hook-secret/.test(fn) && /RT_ALERT_LEVEL/.test(fn) && /dry_run/.test(fn) && /rt:\$\{t\.user_id\}:\$\{s\.level\}/.test(fn), "the alert function sends kind red_tide, links to the map, needs the secret, only Medium and up, once per level per 3 days");
  need(/red_tide === false/.test(fn), "people who switched it off are skipped");

  console.log(bad ? "FAIL (" + mode + "):" + bad : "OK (" + mode + ")");
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log("TEST ERROR", e); process.exit(1); });
