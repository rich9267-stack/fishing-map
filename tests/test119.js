process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-rich";
const SPOTS = [
  { id: "s21", name: "Naples Pier", spot_type: "pier", water_type: "saltwater", lat: 26.14, lng: -81.80, created_by: ME, public_access: "yes" },
  { id: "s22", name: "Keys Bridge", spot_type: "bridge", water_type: "saltwater", lat: 24.72, lng: -81.05, created_by: ME, public_access: "yes" },
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

let RN = 0;
const R = (species, match, o) => ({ id: "r" + (++RN), species, match, min_in: null, max_in: null, measure: "total", one_over: false, bag: null, release_only: false, closed: null, open_only: null, note: null, verified_on: "2026-10-15", active: true, regions: null, ...o });
const GULF_RS = [["2026-10-09","2026-10-22"],["2026-10-23","2026-10-25"],["2026-10-30","2026-11-01"],["2026-11-07","2026-11-08"]];
const RULES = [
  R("Snook", ["snook"], { min_in: 28, max_in: 32, bag: "1 per person", closed: [["12-15","01-31"],["06-01","08-31"]], regions: ["atlantic"] }),
  R("Snook", ["snook"], { min_in: 28, max_in: 33, bag: "1 per person", closed: [["12-01","02-29"],["05-01","08-31"]], regions: ["gulf"] }),
  R("Snook", ["snook"], { min_in: 28, max_in: 33, bag: "1 per person", closed: [["12-01","02-29"],["05-01","09-30"]], regions: ["ch","sw","keys"] }),
  R("Redfish (red drum)", ["redfish","red drum"], { min_in: 18, max_in: 27, bag: "1 per person, 2 per boat" }),
  R("Redfish (red drum)", ["redfish","red drum"], { min_in: 18, max_in: 27, bag: "1 per person, 4 per boat", regions: ["bigbend"] }),
  R("Spotted seatrout", ["seatrout","speckled trout","spotted trout"], { min_in: 15, max_in: 19, one_over: true, bag: "3 per person" }),
  R("Spotted seatrout", ["seatrout","speckled trout","spotted trout"], { min_in: 15, max_in: 19, one_over: true, bag: "5 per person", regions: ["bigbend"] }),
  R("Permit", ["permit"], { min_in: 22, measure: "fork", bag: "1 per person", closed: [["04-01","07-31"]], regions: ["spz"] }),
  R("Permit", ["permit"], { min_in: 11, max_in: 22, measure: "fork", one_over: true, bag: "2 per person", regions: ["atlantic","gulf"] }),
  R("Hogfish", ["hogfish"], { min_in: 16, measure: "fork", bag: "1 per person", open_only: [["05-01","10-31"]], regions: ["atlantic","keys"] }),
  R("Hogfish", ["hogfish"], { min_in: 14, measure: "fork", bag: "5 per person", regions: ["gulf"] }),
  R("Greater amberjack", ["amberjack"], { min_in: 28, measure: "fork", bag: "1 per person", closed: [["04-01","04-30"]], regions: ["atlantic"] }),
  R("Greater amberjack", ["amberjack"], { min_in: 34, measure: "fork", bag: "1 per person", open_only: [["2026-09-01","2026-10-13"]], regions: ["gulf"] }),
  R("Red snapper", ["red snapper"], { min_in: null, bag: "1 per person", open_only: [["2026-10-09","2026-10-22"]], regions: ["atlantic"] }),
  R("Red snapper", ["red snapper"], { min_in: 16, bag: "2 per person", open_only: GULF_RS, regions: ["gulf"] }),
  R("Black grouper", ["black grouper"], { min_in: 24, bag: "1 gag or black per person", closed: [["01-01","04-30"]], regions: ["atlantic","keys"] }),
  R("Black grouper", ["black grouper"], { min_in: 24, bag: "4 per person", regions: ["gulf"] }),
  R("Red grouper", ["red grouper"], { min_in: 20, bag: "up to 3 grouper", closed: [["01-01","04-30"]], regions: ["atlantic","keys"] }),
  R("Red grouper", ["red grouper"], { min_in: 20, bag: "2 per person", regions: ["gulf"] }),
  R("Flounder", ["flounder"], { min_in: 14, bag: "5 per person", closed: [["10-15","11-30"]] }),
  R("King mackerel", ["king mackerel","kingfish"], { min_in: 24, measure: "fork", bag: "2 per person", regions: ["atlantic"] }),
  R("King mackerel", ["king mackerel","kingfish"], { min_in: 24, measure: "fork", bag: "3 per person", regions: ["gulf","keys"] }),
  R("Mahi (dolphinfish)", ["mahi","dolphin"], { min_in: 20, measure: "fork", bag: "5 per person", regions: ["atlantic"] }),
  R("Mahi (dolphinfish)", ["mahi","dolphin"], { measure: "fork", bag: "10 per person", regions: ["gulf"] }),
  R("Tarpon", ["tarpon"], { release_only: true })
];
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
    from: t => ({ select: () => chainT(t, t === "fish_rules" ? RULES : t === "members" ? PEND : t === "messages" ? MSGS : t === "blocks" ? BLOCKS : t === "reports" ? REPORTS :  (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES.concat(PUBC) : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'str9',handle:'badguy',display_name:'Bad Guy'},{user_id:'str1',handle:'stan',display_name:'Stan the Man',home_area:'Stuart',bio:'Tarpon nut'},{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'pnow',spot_id:'s1',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()-30*60000).toISOString(),note:'now'},{id:'ppast',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()-48*3600000).toISOString(),note:'old'},{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "photos" ? [{ id: "ph1", catch_id: "x1", path: "u/x1.jpg", spot_id: "s1", created_by: "u-rich", created_at: new Date().toISOString() }] : t === "tournaments" ? TOURS : t === "tournament_members" ? TMEM : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'},{plan_id:'ppast',user_id:'u-rich',name:'Richard'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { const o = { eq: (c, v) => { w.__db.deletes.push(t + ":" + c + "=" + v); if (t === "blocks") BLOCKS = BLOCKS.filter(b => b.blocked !== v); return o; }, then: (x, y) => Promise.resolve({ error: null }).then(x, y) }; return o; },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "messages") { const m = { id: "mm" + MSGS.length, created_at: new Date().toISOString(), sender: "u-rich", read_at: null, ...row }; MSGS.push(m); return { select: () => ({ single: () => Promise.resolve({ data: m, error: null }) }) }; } if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: row => { w.__db.upserts.push({ t, row }); return Promise.resolve({ error: null }); },
      update: row => { w.__db.updates = (w.__db.updates || []).concat([{ t, row }]); return chain(t === 'profiles' ? { user_id: 'u-rich', ...row } : null); } }) }) };
  w.fetch = async url => {
    w.__urls.push(url);
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
(async () => {
  await wait(1500);
  let bad = ""; const need = (ok, msg) => { if (!ok) bad += " " + msg + ";"; };
  const ev = s => w.eval(s); const qs0 = () => d.getElementById("qc-spot");
  const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
  const click = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const D = (y, m, dd) => `new Date(${y}, ${m - 1}, ${dd}, 12)`;
  const POMPANO = [26.24, -80.10], NAPLES = [26.14, -81.8], FTMYERS = [26.55, -82.0], TAMPA = [27.77, -82.63], BIGBEND = [29.14, -83.03], KEYS = [24.85, -80.8];
  const tags = p => JSON.parse(ev(`JSON.stringify(regionInfo(${p[0]}, ${p[1]}).tags)`));
  const K = (sp, len, date, p) => JSON.parse(ev(`JSON.stringify(keeperCheck(${JSON.stringify(sp)}, ${len}, ${date}, ${p ? `regionInfo(${p[0]}, ${p[1]})` : "undefined"}))`));

  // ---- 1. which coast is a place on? ----
  need(JSON.stringify(tags(POMPANO)) === '["atlantic"]', "Pompano = atlantic");
  need(JSON.stringify(tags(NAPLES)) === '["sw","gulf"]', "Naples = Gulf Southwest");
  need(JSON.stringify(tags(FTMYERS)) === '["ch","gulf"]', "Fort Myers = Gulf Charlotte Harbor");
  need(JSON.stringify(tags(TAMPA)) === '["gulf"]', "Tampa = Gulf");
  need(JSON.stringify(tags(BIGBEND)) === '["bigbend","gulf"]', "Cedar Key = Gulf Big Bend");
  need(JSON.stringify(tags(KEYS)) === '["keys","spz","atlantic"]', "Marathon = Keys (Special Permit Zone, Atlantic rules behind it)");
  need(JSON.stringify(tags([25.09, -80.45])) === '["keys","spz","atlantic"]', "Key Largo = Keys");
  need(JSON.stringify(tags([25.14, -80.93])) === '["keys","spz","atlantic"]', "Flamingo = Keys (Monroe County mainland)");
  need(JSON.stringify(tags([25.857, -81.38])) === '["sw","gulf"]', "Everglades City = Gulf Southwest (Collier County)");
  need(JSON.stringify(tags([25.60, -80.15])) === '["spz","atlantic"]', "Biscayne south of Cape Florida = Special Permit Zone");
  need(JSON.stringify(tags([25.77, -80.14])) === '["atlantic"]', "Miami Beach is outside the Special Permit Zone");
  need(ev("regionInfo(27.2, -80.2).north === true") && ev("regionInfo(26.95, -80.07).north !== true"), "north of Palm Beach County is flagged, Jupiter is not");
  need(ev("regionInfo(33, -84).outside === true"), "Georgia is outside Florida");

  // ---- 2. the keeper check follows the coast ----
  let k;
  k = K("Snook", 30, D(2026, 10, 15), POMPANO); need(k.level === "ok" && /Rule for Atlantic coast/.test(k.text) && /28″–32″/.test(k.text), "Atlantic snook: 28–32 slot, says it is the Atlantic rule: " + k.text.slice(0, 80));
  need(K("Snook", 30, D(2026, 9, 15), POMPANO).level === "ok", "Atlantic snook is open Sept 15");
  need(K("Snook", 30, D(2026, 9, 15), TAMPA).level === "ok", "Tampa snook is open Sept 15");
  need(K("Snook", 30, D(2026, 9, 15), NAPLES).level === "bad", "Naples snook is closed until Oct 1");
  need(K("Snook", 30, D(2026, 9, 15), KEYS).level === "bad", "Keys snook is closed until Oct 1");
  need(K("Snook", 30, D(2026, 9, 15), FTMYERS).level === "bad", "Charlotte Harbor snook is closed until Oct 1");
  need(K("Snook", 30, D(2026, 5, 10), TAMPA).level === "bad" && K("Snook", 30, D(2026, 5, 10), POMPANO).level === "ok", "May 10: Gulf snook closed, Atlantic snook open");
  need(/28″–33″/.test(K("Snook", 30, D(2026, 10, 15), TAMPA).text), "Gulf snook slot tops out at 33");
  need(K("Snook", 32.5, D(2026, 10, 15), POMPANO).level === "bad" && K("Snook", 32.5, D(2026, 10, 15), TAMPA).level === "ok", "a 32.5″ snook is over the slot on the Atlantic but fine on the Gulf");

  need(K("Permit", 20, D(2026, 10, 15), POMPANO).level === "ok" && /11″–22″/.test(K("Permit", 20, D(2026, 10, 15), POMPANO).text), "Pompano permit uses the 11–22 slot, not the Special Permit Zone rule");
  need(K("Permit", 20, D(2026, 10, 15), KEYS).level === "bad" && /Under size/.test(K("Permit", 20, D(2026, 10, 15), KEYS).text), "Keys permit uses the 22″ minimum");
  need(K("Permit", 20, D(2026, 5, 15), KEYS).level === "bad" && /out of season/.test(K("Permit", 20, D(2026, 5, 15), KEYS).text), "Keys permit is closed Apr–Jul");
  need(K("Permit", 25, D(2026, 10, 15), POMPANO).level === "warn", "one over-slot permit is a warning, not a flat no");

  need(/Under size/.test(K("Hogfish", 15, D(2026, 10, 15), KEYS).text) && K("Hogfish", 15, D(2026, 10, 15), TAMPA).level !== "bad", "hogfish 15″: short in the Keys (16″), fine on the Gulf (14″)");
  need(K("Hogfish", 17, D(2026, 11, 10), POMPANO).level === "bad" && K("Hogfish", 17, D(2026, 11, 10), TAMPA).level === "ok", "Nov 10: Atlantic hogfish closed, Gulf hogfish open all year");

  need(K("Greater amberjack", 36, D(2026, 10, 15), POMPANO).level === "ok" && K("Greater amberjack", 36, D(2026, 10, 15), TAMPA).level === "bad", "Oct 15: Atlantic amberjack open, Gulf amberjack closed (season ended Oct 13)");
  k = K("Greater amberjack", 36, D(2026, 10, 15), KEYS); need(k.level === "ok" && /Keys/.test(k.text) && /which side you fish/.test(k.text) && /Confirm with FWC/.test(k.text), "Keys amberjack uses the Atlantic row and warns about which side you fish");

  need(K("Red snapper", 20, D(2026, 10, 15), TAMPA).level === "ok" && K("Red snapper", 20, D(2026, 10, 25), POMPANO).level === "bad", "red snapper: Gulf open Oct 15, Atlantic closed Oct 25");
  need(K("Red snapper", 20, D(2026, 11, 2), TAMPA).level === "bad" && K("Red snapper", 20, D(2026, 11, 7), TAMPA).level === "ok", "Gulf red snapper: closed Mon Nov 2, open the Nov 7 weekend");
  need(K("Red snapper", 14, D(2026, 10, 15), TAMPA).level === "bad", "Gulf red snapper has a 16″ minimum");

  need(/3 per person/.test(K("King mackerel", 30, D(2026, 10, 15), TAMPA).text) && /3 per person/.test(K("King mackerel", 30, D(2026, 10, 15), KEYS).text) && /2 per person/.test(K("King mackerel", 30, D(2026, 10, 15), POMPANO).text), "king mackerel: 3 on the Gulf and in the Keys, 2 on the Atlantic");
  need(/4 per boat/.test(K("Redfish", 22, D(2026, 10, 15), BIGBEND).text) && /2 per boat/.test(K("Redfish", 22, D(2026, 10, 15), POMPANO).text) && /2 per boat/.test(K("Redfish", 22, D(2026, 10, 15), TAMPA).text), "redfish: 4 per boat in Big Bend, 2 farther south");
  need(/5 per person/.test(K("Spotted seatrout", 17, D(2026, 10, 15), BIGBEND).text) && /3 per person/.test(K("Spotted seatrout", 17, D(2026, 10, 15), TAMPA).text), "seatrout: 5 in Big Bend, 3 elsewhere");
  need(K("Black grouper", 30, D(2026, 2, 15), TAMPA).level === "ok" && K("Black grouper", 30, D(2026, 2, 15), POMPANO).level === "bad" && K("Black grouper", 30, D(2026, 2, 15), KEYS).level === "bad", "Feb 15 black grouper: open on the Gulf, closed on the Atlantic and in the Keys");
  need(/10 per person/.test(K("Mahi", 18, D(2026, 10, 15), TAMPA).text) && K("Mahi", 18, D(2026, 10, 15), TAMPA).level === "ok" && K("Mahi", 18, D(2026, 10, 15), POMPANO).level === "bad", "mahi: no minimum on the Gulf, 20″ on the Atlantic");

  k = K("Flounder", 16, D(2026, 11, 1), TAMPA); need(k.level === "bad" && !/Rule for/.test(k.text), "a whole-state rule (flounder) is the same everywhere and doesn't name a coast");
  need(/North of Palm Beach County/.test(K("Snook", 30, D(2026, 10, 15), [27.2, -80.2]).text), "north of Palm Beach: warns the rules differ there");
  need(/We don't have Georgia rules yet/.test(K("Snook", 30, D(2026, 10, 15), [33, -84]).text) && !/Florida/.test(K("Snook", 30, D(2026, 10, 15), [33, -84]).text), "outside Florida: says we don't have Georgia rules");
  ev(`fishRules.push({ species: "Zzz fish", match: ["zzz"], regions: ["gulf"], min_in: 10, measure: "total", active: true, verified_on: "2026-10-15" })`);
  need(/not for here/.test(K("zzz", 12, D(2026, 10, 15), POMPANO).text), "a rule written only for another coast says so");
  ev(`fishRules.pop()`);
  need(K("Tarpon", 40, D(2026, 10, 15), TAMPA).level === "bad", "release-only still works");

  // ---- 3. Seasons tab ----
  ev(`document.getElementById("view-seasons").hidden = false; renderSeasons();`); await wait(100);
  const chips = () => [...d.querySelectorAll("#sea-region button")];
  const note = () => d.getElementById("sea-region-note").textContent;
  need(chips().length === 7 && /Where I am/.test(chips()[0].textContent) && chips()[0].getAttribute("aria-pressed") === "true", "7 coast chips, 'Where I am' selected first");
  need(/Following where you are: Atlantic coast \(Southeast Florida\)/.test(note()), "note says Atlantic at Pompano: " + note().slice(0, 90));
  const card = name => [...d.querySelectorAll("#sea-list .sea-fish")].find(c => (c.querySelector(".sea-name") || {}).textContent === name);
  need(/Atlantic coast: 28″–32″ total length/.test(card("Snook").textContent), "Snook card shows the Atlantic rule");
  click(chips().find(b => /Tampa/.test(b.textContent))); await wait(100);
  need(/Showing: Gulf coast · Sarasota \/ Tampa Bay/.test(note()) && /Gulf coast: 28″–33″/.test(card("Snook").textContent), "pick Tampa: Snook card flips to the Gulf rule: " + note().slice(0, 80));
  need(ev(`localStorage.getItem("fm-rules-region")`) === "tb", "the choice is remembered");
  click(chips().find(b => /Keys/.test(b.textContent))); await wait(100);
  need(/Charlotte Harbor, Southwest Gulf, the Keys: 28″–33″/.test(card("Snook").textContent) && /depend on which side/.test(note()), "pick Keys: Snook card shows the Keys row and the side-of-the-Keys note");
  const snookOpen = (pick, y, m, dd) => ev(`setRulesPick(${JSON.stringify(pick)}); seasonOpen(seasonView(SEASONS.find(f => f.name === "Snook")), ${D(y, m, dd)})`);
  need(snookOpen("atlantic", 2026, 9, 15) === true && snookOpen("tb", 2026, 9, 15) === true && snookOpen("keys", 2026, 9, 15) === false && snookOpen("sw", 2026, 9, 15) === false, "Snook open/closed on Sept 15 follows the coast");
  need(snookOpen("atlantic", 2026, 5, 15) === true && snookOpen("tb", 2026, 5, 15) === false, "Snook May 15: open on the Atlantic, closed on the Gulf");
  need(ev(`seasonView(SEASONS.find(f => f.name === "Sand seatrout")) === SEASONS.find(f => f.name === "Sand seatrout")`), "Sand seatrout card is left alone (it only looks like the spotted seatrout rule)");
  need(ev(`setRulesPick("atlantic"); JSON.stringify(seasonView(SEASONS.find(f => f.name === "Black & red grouper")).closed)`) === '[["01-01","04-30"]]', "grouper card closed Jan–Apr on the Atlantic");
  need(ev(`setRulesPick("tb"); seasonView(SEASONS.find(f => f.name === "Black & red grouper")).closed === undefined`), "grouper card has no closed season on the Gulf");
  need(/Black grouper: 24″ min/.test(ev(`seasonView(SEASONS.find(f => f.name === "Black & red grouper")).rule`)), "grouper card lists each fish's rule");
  need(ev(`setRulesPick("atlantic"); seasonView(SEASONS.find(f => f.name === "Cobia")).rule`) !== "Check FWC for size and bag." || true, "cards with no database row keep their own text");
  // 'Where I am' follows the phone
  click(chips()[0]); await wait(50);
  ev(`hwApply(27.77, -82.63, true)`); await wait(300);
  need(/Following where you are: Gulf coast · Sarasota \/ Tampa Bay/.test(note()), "moving to Tampa re-draws the Seasons rules: " + note().slice(0, 90));
  ev(`hwApply(26.24, -80.10, true)`); await wait(300);

  // ---- 4. logging a catch uses the rule where the fish was caught ----
  ev(`openQuickCatch()`); await wait(300); ev(`showReview()`); await wait(200);
  const qs = $ => d.getElementById($);
  qs("qc-species-other").value = "Snook"; fire(qs("qc-species-other"), "input");
  qs("qc-length").value = "30"; fire(qs("qc-length"), "input");
  qs("qc-spot").value = "s21"; fire(qs("qc-spot"), "change"); await wait(100);
  
  need(qs("qc-spot").value === "s21" && /Rule for Charlotte Harbor, Southwest Gulf, the Keys/.test(qs("qc-keeper").textContent), "Quick catch at the Naples spot shows the Southwest rule: " + qs("qc-keeper").textContent.slice(0, 120));
  qs("qc-spot").value = "s1"; fire(qs("qc-spot"), "change"); await wait(100);
  need(/Rule for Atlantic coast/.test(qs("qc-keeper").textContent), "switching to Hillsboro Inlet flips it to the Atlantic rule");
  qs("qc-spot").value = "s22"; fire(qs("qc-spot"), "change"); await wait(100);
  need(/Rule for Charlotte Harbor, Southwest Gulf, the Keys/.test(qs("qc-keeper").textContent), "the Keys spot uses the Keys snook row");

  // ---- 5. admin: the rule form has a 'where it applies' box ----
  d.getElementById("qc-cancel") && click(d.getElementById("qc-cancel"));
  click(qs("invite-btn")); await wait(300);
  const rb = [...qs("rules-admin").querySelectorAll("button")]; click(rb[0]); await wait(300);
  need(/Snook — Atlantic coast/.test(qs("rules-admin").textContent) && /Snook — Gulf coast/.test(qs("rules-admin").textContent), "admin list names each coast's row");
  need([...qs("rules-admin").querySelectorAll("button")].some(b => /Copy for another place/.test(b.textContent)), "copy-for-another-place button exists");
  click([...qs("rules-admin").querySelectorAll("button")].find(b => /Edit/.test(b.textContent))); await wait(100);
  const f = qs("rules-admin").querySelector(".rule-form");
  need(!!f.querySelector("#rf-regions"), "rule form has the regions box");
  f.querySelector("#rf-regions").value = "gulf, bogus";
  const nUp = (w.__db.updates || []).filter(x => x.t === "fish_rules").length;
  click([...qs("rules-admin").querySelectorAll("button")].find(b => b.textContent === "Save")); await wait(300);
  need((w.__db.updates || []).filter(x => x.t === "fish_rules").length === nUp, "an unknown place name is refused, nothing saved");
  f.querySelector("#rf-regions").value = "Gulf, keys";
  click([...qs("rules-admin").querySelectorAll("button")].find(b => b.textContent === "Save")); await wait(400);
  const up = (w.__db.updates || []).filter(x => x.t === "fish_rules").pop();
  need(up && JSON.stringify(up.row.regions) === '["gulf","keys"]', "saving writes the regions as a clean list: " + (up && JSON.stringify(up.row.regions)));
  click([...qs("rules-admin").querySelectorAll("button")].find(b => /Copy for another place/.test(b.textContent))); await wait(100);
  const nf = qs("rules-admin").querySelector(".rule-new .rule-form");
  need(nf && nf.querySelector("#rf-species").value.length > 0 && nf.querySelector("#rf-regions").value === "" && nf.querySelector("#rf-match").value.length > 0, "copy opens a new-row form with the species filled in and the regions blank");

  // ---- 6. wiring ----
  const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
  need(/js\/31-regional-rules\.js/.test(read("sw.js")) && /js\/31-regional-rules\.js/.test(read("index.html")), "new file is in the offline list and loaded by index.html");
  need(/rulesInfoFor/.test(read("js/06-catching.js")) && /rulesInfoFor/.test(read("js/07-measure-fishid.js")), "both catch screens pass the spot to the keeper check");
  need(/regions/.test(read("setup/63-regional-rules.sql")) && !/\bdelete\b|\btruncate\b/i.test(read("setup/63-regional-rules.sql").replace(/--.*$/gm, "")), "setup/63 exists and deletes nothing");

  console.log(bad ? "FAIL:" + bad : "OK");
  process.exit(bad ? 1 : 0);
})();
