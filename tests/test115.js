process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-rich";
const SPOTS = [
  { id: "s20", name: "Tampa Pier", spot_type: "pier", water_type: "saltwater", lat: 27.77, lng: -82.63, created_by: "str2", visibility: "public", is_exact: false },
  { id: "s10", name: "Stan Flats", spot_type: "flat", water_type: "saltwater", lat: 27.2, lng: -80.2, created_by: "str1", visibility: "public", is_exact: false, notes: null },
  { id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0, faces_deg: 90 },
  { id: "s4", name: "Black Creek Canal", spot_type: "seawall", water_type: "brackish", lat: 25.55, lng: -80.35, created_by: ME, public_access: "yes", tide_offset_min: 75 },
  { id: "s2", name: "C-14 Canal", spot_type: "seawall", water_type: "freshwater", lat: 26.27, lng: -80.15, created_by: ME, public_access: "yes" },
  { id: "s9", name: "Mike Public", spot_type: "pier", water_type: "saltwater", lat: 26.30, lng: -80.09, created_by: "other", public_access: "yes", visibility: "public", is_exact: false },
  { id: "s3", name: "Jupiter Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.945, lng: -80.07, created_by: ME, public_access: "yes" }
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
  Object.defineProperty(w.navigator, "geolocation", { value: { getCurrentPosition: (ok, bad) => { if (process.env.GPS === "tampa") setTimeout(() => ok({ coords: { latitude: 27.77, longitude: -82.63 } }), 5); else if (bad) bad({}); }, watchPosition: () => 1, clearWatch: () => {} }, configurable: true });
  Object.defineProperty(w.navigator, "permissions", { value: { query: async () => ({ state: process.env.GPS ? "granted" : "prompt" }) }, configurable: true });
  if (process.env.HOME_SET) w.localStorage.setItem("fm-home-waters", JSON.stringify({ name: "Pompano Beach / Fort Lauderdale", lat: 26.24, lng: -80.10 }));
  if (process.env.HOME_AT === "tampa") w.localStorage.setItem("fm-home-waters", JSON.stringify({ name: "Tampa Bay / St. Petersburg", lat: 27.70, lng: -82.65 }));
  if (process.env.HOME_AT === "fortmyers") w.localStorage.setItem("fm-home-waters", JSON.stringify({ name: "Fort Myers / Sanibel", lat: 26.55, lng: -82.00 }));
  w.__latest = { "8722670": 80.1, "8723214": 82.4, "8723970": 85.8, "8724580": 86.5, "8725520": 85.3, "8726384": 82.2, "8726520": 83.3, "8726724": 81.7, "8727520": 82.0 };
  w.__marine = () => 80.6; w.__failLookup = false; w.__sat = []; w.__satUrls = [];
  w.__urls = [];
  w.__db = { inserts: [], upserts: [], sessions: [], deletes: [] };
  const chain = (data, tn) => { const fl = []; const rows = () => Array.isArray(data) ? data.filter(r => fl.every(f => f(r))) : data;
    const p = () => Promise.resolve({ data: rows(), error: null }); const o = {
      eq: (c, v) => { fl.push(r => r[c] === v); return o; }, in: (c, vs) => { fl.push(r => vs.includes(r[c])); return o; },
      is: () => o, or: () => o, ilike: () => o, gte: () => o, lt: () => o, order: () => o, select: () => o, limit: () => p(),
      single: () => Promise.resolve({ data: { id: "new-" + Math.random().toString(36).slice(2) }, error: null }),
      then: (x, y) => p().then(x, y),
      maybeSingle: () => tn === "members" ? Promise.resolve(MEMBER()) : p().then(r => ({ data: (r.data || [])[0] || null, error: null })) }; return o; };
  const chainT = (t, d) => chain(d, t);
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "rich9267@gmail.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
    rpc: async (fn, a) => { RPCS.push([fn, a]); if (fn === 'trip_review') return { data: [{ catch_id: 'x1', user_id: 'u-rich', caught_at: new Date().toISOString(), species: 'Snook', how_many: 1, length_in: 30, weight_lb: 8, weight_est: true, spot_id: 's1', lat: 26.2571, lng: -80.0812, accuracy_m: 9 }, { catch_id: 'x2', user_id: 'other', caught_at: new Date().toISOString(), species: 'Tarpon', how_many: 2, length_in: null, weight_lb: null, weight_est: false, spot_id: 's1', lat: null, lng: null, accuracy_m: null }], error: null }; if (fn === 'tournament_standings') return { data: STAND, error: null }; if (fn === 'tournament_my_catches') return { data: MYC, error: null }; if (fn === 'create_tournament') { TOURS.push({ id: 't9', kind: a.p_kind, title: a.p_title, description: a.p_desc, created_by: 'u-rich', starts_at: a.p_starts, ends_at: a.p_ends, boards: a.p_boards, species: a.p_species || null, require_photo: a.p_photo, require_length: a.p_length, geo_lat: a.p_lat, geo_lng: a.p_lng, geo_radius_mi: a.p_radius, geo_label: a.p_geo_label, cancelled_at: null }); TMEM.push({ tournament_id: 't9', user_id: 'u-rich', status: 'joined' }); return { data: 't9', error: null }; } if (fn === 'join_tournament') { const m = TMEM.find(x => x.tournament_id === a.p_id && x.user_id === 'u-rich'); if (m) m.status = 'joined'; else TMEM.push({ tournament_id: a.p_id, user_id: 'u-rich', status: 'joined' }); return { error: null }; } if (fn === 'leave_tournament') { const m = TMEM.find(x => x.tournament_id === a.p_id && x.user_id === 'u-rich'); if (m) m.status = 'left'; return { error: null }; } if (fn === 'cancel_tournament') { TOURS.find(x => x.id === a.p_id).cancelled_at = new Date().toISOString(); return { error: null }; } if (fn === 'block_user') BLOCKS.push({ blocker: 'u-rich', blocked: a.p_user }); if (fn === 'mark_read') MSGS.forEach(m => { if (m.sender === a.p_other && m.recipient === 'u-rich') m.read_at = new Date().toISOString(); }); if (fn === 'request_access') { status = 'pending'; } if (fn === 'review_access') PEND = PEND.map(m => m.email === a.p_email ? { ...m, status: a.p_approve ? 'approved' : 'blocked' } : m); return fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }; }, storage: { from: () => ({ createSignedUrls: async paths => ({ data: paths.map(p => ({ path: p, signedUrl: 'https://img.test/' + p })) }) }) },
    from: t => ({ select: () => chainT(t, t === "members" ? PEND : t === "messages" ? MSGS : t === "blocks" ? BLOCKS : t === "reports" ? REPORTS :  (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES.concat(PUBC) : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'str9',handle:'badguy',display_name:'Bad Guy'},{user_id:'str1',handle:'stan',display_name:'Stan the Man',home_area:'Stuart',bio:'Tarpon nut'},{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'pnow',spot_id:'s1',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()-30*60000).toISOString(),note:'now'},{id:'ppast',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()-48*3600000).toISOString(),note:'old'},{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "photos" ? [{ id: "ph1", catch_id: "x1", path: "u/x1.jpg", spot_id: "s1", created_by: "u-rich", created_at: new Date().toISOString() }] : t === "tournaments" ? TOURS : t === "tournament_members" ? TMEM : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'},{plan_id:'ppast',user_id:'u-rich',name:'Richard'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { const o = { eq: (c, v) => { w.__db.deletes.push(t + ":" + c + "=" + v); if (t === "blocks") BLOCKS = BLOCKS.filter(b => b.blocked !== v); return o; }, then: (x, y) => Promise.resolve({ error: null }).then(x, y) }; return o; },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "messages") { const m = { id: "mm" + MSGS.length, created_at: new Date().toISOString(), sender: "u-rich", read_at: null, ...row }; MSGS.push(m); return { select: () => ({ single: () => Promise.resolve({ data: m, error: null }) }) }; } if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: row => { w.__db.upserts.push({ t, row }); return Promise.resolve({ error: null }); },
      update: row => { w.__db.updates = (w.__db.updates || []).concat([{ t, row }]); return chain(t === 'profiles' ? { user_id: 'u-rich', ...row } : null); } }) }) };
  w.fetch = async url => {
    w.__urls.push(url);
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
  await wait(1500);
  // the page's JSONP helper can't load scripts here: fake the NOAA satellite answers (one value per call, in °C; null = land / no data)
  w.erddapJson = async u => { w.__satUrls.push(u); const v = w.__sat.shift(); return { table: { rows: [["2026-10-14T09:00:00Z", 25, -80, v == null ? null : v]] } }; };
  const mode = process.env.HOME_AT || (process.env.HOME_SET ? (process.env.GPS ? "away" : "home") : "fresh");
  let bad = "";
  const need = (ok, msg) => { if (!ok) bad += " " + msg + ";"; };
  const hiloUrls = () => w.__urls.filter(u => /interval=hilo/.test(u));

  // ---- A. the station lists ----
  const T = J("TIDE_STATIONS");
  const ids = T.map(t => t.id);
  need(new Set(ids).size === ids.length, "tide station ids are unique");
  need(T.every(t => /^\d{7}$/.test(t.id) && t.name && t.lat > 24 && t.lat < 31.1 && t.lng > -87.8 && t.lng < -79.8), "every tide station has a 7-digit id, a name and a Florida position");
  need(T.length >= 150, "150+ tide stations built in (got " + T.length + ")");
  const near = (lat, lng) => J(`stationFor({ lat: ${lat}, lng: ${lng} })`);
  const presets = J("HOME_PRESETS");
  const rows = presets.map(p => { const s = near(p.lat, p.lng); return `${p.name} → ${s.name} (${s.dist.toFixed(1)} mi)`; });
  console.log(rows.join("\n"));
  presets.forEach(p => { const s = near(p.lat, p.lng); need(s.dist <= 12, `${p.name}: a tide station within 12 miles (got ${s.dist.toFixed(1)})`); });
  need(near(24.56, -81.80).name === "Key West", "Key West spot → Key West");
  need(near(27.785, -82.78).name === "Johns Pass", "Johns Pass spot → Johns Pass");
  need(near(24.71, -81.10).name === "Vaca Key, Florida Bay", "Marathon spot → Vaca Key");
  need(near(26.55, -82.19).name === "Redfish Pass, Captiva", "Captiva spot → Redfish Pass");
  need(["8722859", "8722861", "8722862", "8722854"].includes(near(26.257, -80.081).id), "Hillsboro Inlet still uses a Hillsboro station");

  // ---- B. water-temperature stations ----
  const src = (lat, lng) => J(`wtSourceFor(${lat}, ${lng})`);
  need(src(24.71, -81.10) && src(24.71, -81.10).name === "Vaca Key", "Marathon → Vaca Key water station");
  need(src(24.56, -81.80) && src(24.56, -81.80).name === "Key West", "Key West → Key West water station");
  need(src(27.77, -82.63) && src(27.77, -82.63).name === "St. Petersburg", "Tampa pier → St. Petersburg");
  need(src(27.98, -82.80) && src(27.98, -82.80).name === "Clearwater Beach", "Clearwater → Clearwater Beach");
  need(src(29.13, -83.03) && src(29.13, -83.03).name === "Cedar Key", "Cedar Key → Cedar Key");
  need(src(26.65, -81.87) && src(26.65, -81.87).name === "Fort Myers", "Fort Myers town → Fort Myers station");
  need(src(26.45, -81.95) === null, "Fort Myers Beach is 14 mi from the river station → not used (river water isn't Gulf water)");
  need(src(26.13, -81.80) === null, "Naples has no water station nearby → model/satellite");
  need(src(26.24, -80.10) === null, "Pompano (25 mi from Lake Worth Pier) → model, same as before");
  need(src(25.09, -80.45) === null, "Key Largo → model");
  const nn = (lat, lng) => J(`wtNearest(${lat}, ${lng}, 2, 60)`).map(s => s.name).join(" | ");
  need(nn(26.24, -80.10) === "Lake Worth Pier | Virginia Key", "Pompano compares with Lake Worth Pier and Virginia Key (as before): " + nn(26.24, -80.10));
  need(/^St\. Petersburg \| Port Manatee$/.test(nn(27.77, -82.63)), "Tampa compares with St. Petersburg and Port Manatee: " + nn(27.77, -82.63));
  need(nn(30.5, -87.2) === "", "nothing within 60 miles of Pensacola → no comparison");
  need(w.eval("okTemp(95)") === true && w.eval("okTemp(96.5)") === false && w.eval("okTemp(44)") === false, "believable range is 45–96°F");

  // ---- C. what you actually get (fake NOAA / ocean model / satellite) ----
  const wtn = async (lat, lng) => { try { return await w.eval(`waterTempNow(${lat}, ${lng})`); } catch (e) { return { error: e.message }; } };
  let r = await wtn(27.77, -82.63);
  need(r.f === 83.3 && r.source === "St. Petersburg station" && /^St\. Petersburg, \d+ mi$/.test(r.label), "Tampa pier uses the St. Petersburg station: " + JSON.stringify(r));
  r = await wtn(26.45, -81.95);
  need(r.f === 80.6 && r.source === "ocean model", "Fort Myers Beach uses the ocean model: " + JSON.stringify(r));
  w.__latest["8723970"] = 94.5;
  r = await wtn(24.711, -81.1065);
  need(r.f === 94.5, "a real 94.5°F summer reading at Vaca Key is kept: " + JSON.stringify(r));
  w.__latest["8723970"] = 97.5; w.eval('delete wtNowCache["8723970"]');   // readings are remembered per station for the session
  r = await wtn(24.712, -81.1065);
  need(r.source === "ocean model", "a 97.5°F reading is thrown out as a bad sensor");
  // satellite backup: ocean model blank → tries the spot, then four points around it
  w.__marine = () => null;
  w.__satUrls = []; w.__sat = [null, 29.0];
  r = await wtn(25.0, -80.75);
  need(r.source === "satellite" && r.label === "satellite estimate" && Math.abs(r.f - 84.2) < 0.05, "blank ocean model → satellite 29.0°C = 84.2°F: " + JSON.stringify(r));
  need(w.__satUrls.length === 2 && /\(25\.000\)\]\[\(-80\.750\)/.test(w.__satUrls[0]) && /\(25\.020\)\]\[\(-80\.750\)/.test(w.__satUrls[1]), "satellite: first the spot, then 1½ miles north: " + w.__satUrls.join(" , "));
  need(/jplMURSST41\.json\?analysed_sst\[\(last\)\]/.test(w.__satUrls[0]), "satellite asks MUR for the latest day");
  w.__satUrls = []; w.__sat = [null, null, null, null, null];
  r = await wtn(25.3, -80.9);
  need(r.error && /No water temperature here/.test(r.error) && w.__satUrls.length === 5, "everything blank → a clear 'no water temperature' after 5 tries: " + JSON.stringify(r) + " " + w.__satUrls.length);
  w.__satUrls = []; w.__sat = [36.5, 36.5, 36.5, 36.5, 36.5];   // 97.7°F: not believable
  r = await wtn(25.4, -80.9);
  need(r.error && w.__satUrls.length === 5, "a 97.7°F satellite value is ignored");
  w.__marine = () => 80.6;

  // ---- D. a NOAA lookup that fails is tried again after a minute ----
  const lookups = () => w.__urls.filter(u => u.includes("tidepredstations") && u.includes("lat=24.6300&lon=-82.8700")).length;
  w.__failLookup = true;
  const n0 = lookups();
  w.eval("lookupStationsNear(24.63, -82.87)"); await wait(50);
  need(lookups() === n0 + 1, "first lookup asked NOAA");
  w.eval("lookupStationsNear(24.63, -82.87)"); await wait(50);
  need(lookups() === n0 + 1, "a failed lookup is not repeated within a minute");
  w.eval("stationLookups['24.6,-82.9'] = Date.now() - 61000");
  w.eval("lookupStationsNear(24.63, -82.87)"); await wait(50);
  need(lookups() === n0 + 2, "…but is tried again after a minute");
  w.__failLookup = false;
  w.eval("stationLookups['24.6,-82.9'] = Date.now() - 61000");
  w.eval("lookupStationsNear(24.63, -82.87)"); await wait(50);
  w.eval("lookupStationsNear(24.63, -82.87)"); await wait(50);
  need(lookups() === n0 + 3, "once NOAA answers, it isn't asked again");

  // ---- E. the app itself, by where you are ----
  const wx = () => (d.getElementById("wx-water") || {}).textContent || "";
  const stage = () => (d.getElementById("stage") || {}).textContent || "";
  console.log("mode:", mode, "| water line:", wx(), "| tide:", stage());
  if (mode === "fresh" || mode === "home") {
    need(/Water 81°F \(ocean estimate\)/.test(wx()), "Pompano water line: ocean estimate: " + wx());
    need(/Lake Worth Pier 80°F · Virginia Key 82°F/.test(wx()), "Pompano compares with Lake Worth Pier and Virginia Key: " + wx());
  } else if (mode === "tampa" || mode === "away") {
    need(/Water 83°F \(St\. Petersburg, \d+ mi\)/.test(wx()), "Tampa water line comes from the St. Petersburg station: " + wx());
    need(/St\. Petersburg 83°F · Port Manatee 82°F/.test(wx()) && !/Lake Worth|Virginia Key/.test(wx()), "Tampa compares with Tampa Bay stations, not the East Coast: " + wx());
    need(/Next (high|low) tide/.test((d.getElementById("next") || {}).textContent || ""), "Tampa shows a next tide: " + stage());
    if (mode === "tampa") need(hiloUrls().some(u => u.includes("station=8726454")), "Tampa area now (27.70, -82.65) loads tides for Point Pinellas");
  } else if (mode === "fortmyers") {
    const id = near(26.55, -82.00).id;
    need(hiloUrls().some(u => u.includes("station=" + id)), "Fort Myers area now loads tides for station " + id + " (" + near(26.55, -82.00).name + ")");
    need(!w.__urls.some(u => u.includes("tidepredstations") && u.includes("lat=26.5")), "Fort Myers needs no NOAA station lookup — the stations are built in");
    need(!/No tide station/.test(stage()) && /Next (high|low) tide/.test((d.getElementById("next") || {}).textContent || ""), "Fort Myers shows a next tide: " + stage());
    need(/Water 81°F \(ocean estimate\)/.test(wx()), "Fort Myers water line (bay is outside the river station's 8 miles): " + wx());
  }
  console.log(bad ? "FAIL:" + bad : "OK");
  process.exit(bad ? 1 : 0);
})();
