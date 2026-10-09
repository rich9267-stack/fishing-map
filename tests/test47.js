process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = fs.readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8").replace(/<script src=[^>]+><\/script>\n?/g, "").replace(/<link [^>]+>/, "");
const ME = "u-rich";
const SPOTS = [
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
const GM = [{ id: "g1", scope: "trip", scope_id: "pnow", sender: "other", body: "Bring shrimp!", created_at: new Date().toISOString() }, { id: "g2", scope: "contest", scope_id: "t2", sender: "other", body: "Game on", created_at: new Date().toISOString() }];
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
  { id: "p1", spot_id: "s9", species: "Tarpon", how_many: 1, caught_at: new Date(Date.now() - 2 * 3600000).toISOString(), created_by: "str1", caught_by: "Stan", visibility: "public" }
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
  Object.defineProperty(w.navigator, "geolocation", { value: { getCurrentPosition: () => {}, watchPosition: () => 1, clearWatch: () => {} }, configurable: true });
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
    from: t => ({ select: () => chainT(t, t === "members" ? PEND : t === "messages" ? MSGS : t === "blocks" ? BLOCKS : t === "reports" ? REPORTS :  (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES.concat(PUBC) : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'str9',handle:'badguy',display_name:'Bad Guy'},{user_id:'str1',handle:'stan',display_name:'Stan the Man',home_area:'Stuart',bio:'Tarpon nut'},{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'pnow',spot_id:'s1',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()-30*60000).toISOString(),note:'now'},{id:'ppast',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()-48*3600000).toISOString(),note:'old'},{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "photos" ? [{ id: "ph1", catch_id: "x1", path: "u/x1.jpg", spot_id: "s1", created_by: "u-rich", created_at: new Date().toISOString() }] : t === "group_messages" ? GM : t === "tournaments" ? TOURS : t === "tournament_members" ? TMEM : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'},{plan_id:'ppast',user_id:'u-rich',name:'Richard'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { const o = { eq: (c, v) => { w.__db.deletes.push(t + ":" + c + "=" + v); if (t === "blocks") BLOCKS = BLOCKS.filter(b => b.blocked !== v); return o; }, then: (x, y) => Promise.resolve({ error: null }).then(x, y) }; return o; },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "group_messages") GM.push({ id: "g" + GM.length, sender: "u-rich", created_at: new Date().toISOString(), ...row }); if (t === "messages") { const m = { id: "mm" + MSGS.length, created_at: new Date().toISOString(), sender: "u-rich", read_at: null, ...row }; MSGS.push(m); return { select: () => ({ single: () => Promise.resolve({ data: m, error: null }) }) }; } if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: row => { w.__db.upserts.push({ t, row }); return Promise.resolve({ error: null }); },
      update: row => { w.__db.updates = (w.__db.updates || []).concat([{ t, row }]); return chain(t === 'profiles' ? { user_id: 'u-rich', ...row } : null); } }) }) };
  w.fetch = async url => {
    if (/myfwc\.com/.test(url)) {
      calls.push(url);
      if (/Boat_Ramp/.test(url)) return { ok: true, json: async () => ({ features: [{ attributes: { RampName: "Hillsboro Inlet Ramp", WaterBodyName: "Intracoastal", TotalLanes: 2, isFeeRequired: "Yes", FeeAmount: "$10", Hours: "Sunrise-sunset", Status: "Open" }, geometry: { x: -80.08, y: 26.26 } }] }) };
      return { ok: true, json: async () => ({ features: [{ attributes: { Name: "Bill Boyd Reef", MatDescrip: "Concrete culverts", Depth: 60, Relief: 8, County: "Broward", DeployDate: Date.UTC(2005, 5, 1) }, geometry: { x: -80.05, y: 26.25 } },
        { attributes: { Name: "Two", Depth: 90 }, geometry: { x: -80.04, y: 26.2 } }], exceededTransferLimit: false }) };
    }
    if (/Marine_Protected_Areas__MPAIs_/.test(url)) { calls.push(url); if (process.env.ZONEFAIL) return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => ({ type: "FeatureCollection", features: [{ type: "Feature", properties: { Site_Name: "Test No-Take Zone", Fishing_Restriction: "No Take" }, geometry: { type: "Polygon", coordinates: [[[-80.1, 26.2], [-80.0, 26.2], [-80.0, 26.3], [-80.1, 26.3], [-80.1, 26.2]]] } }] }) }; }
    if (/oceandata\.rad/.test(url)) { calls.push(url); throw new Error("down"); }
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
process.on("unhandledRejection", e => console.log("UNHANDLED", e && e.stack));
(async () => { try {
  await wait(1200);
  d.getElementById("tab-map").click(); await wait(600);
  const note = () => d.getElementById("mx-note").textContent;
  const onc = id => d.getElementById(id).classList.contains("on");
  console.log("buttons:", ["mx-chart","mx-reef","mx-ramp","mx-zone"].map(id => d.getElementById(id).textContent).join(" | "));
  d.getElementById("mx-chart").click(); await wait(200);
  const imgs = [...d.querySelectorAll("#map img.leaflet-tile")].map(i => i.src).filter(u => /NOAAChartDisplay/.test(u));
  console.log("chart on:", onc("mx-chart"), "tiles:", imgs.length > 0, /bboxSR=3857/.test(imgs[0] || ""), "note:", note());
  d.getElementById("mx-reef").click(); await wait(900);
  console.log("zoom:", "reef calls:", calls.filter(u => /Artificial_Reef/.test(u)).length, "note:", JSON.stringify(note()));
  const mk = () => d.querySelectorAll("#map path.leaflet-interactive");
  console.log("markers after reef:", mk().length);
  d.getElementById("mx-ramp").click(); await wait(900);
  console.log("markers after ramp:", mk().length);
  // open a ramp popup
  [...mk()].forEach(p => p.dispatchEvent(new w.MouseEvent("click", { bubbles: true })));
  await wait(200);
  const pop = d.querySelector(".leaflet-popup-content");
  console.log("popup:", pop && pop.textContent.replace(/\s+/g, " "));
  d.getElementById("mx-zone").click(); await wait(1000);
  console.log("zone note:", JSON.stringify(note()), "zone calls:", calls.filter(u => /MPAIs|oceandata/.test(u)).length);
  console.log("polygons:", d.querySelectorAll("#map path.leaflet-interactive").length);
  d.getElementById("mx-reef").click(); await wait(100);
  console.log("reef off:", !onc("mx-reef"), "markers:", mk().length);
  d.getElementById("mx-chart").click(); await wait(100);
  console.log("chart off:", !onc("mx-chart"));
  // ---- Boat mode ----
  let watchCb = null, wakeReq = 0; w.eval("conditionsFor = async () => ({ tide_stage: null })");
  w.navigator.geolocation.watchPosition = cb => { watchCb = cb; return 7; };
  w.navigator.geolocation.clearWatch = () => { watchCb = "cleared"; };
  Object.defineProperty(w.navigator, "wakeLock", { value: { request: async () => { wakeReq++; return { release() { wakeReq = -99; } }; } }, configurable: true });
  d.getElementById("boat-open").click(); await wait(300);
  console.log("boat open:", !d.getElementById("boat").hidden, "wake requested:", wakeReq === 1, "foot:", d.getElementById("boat-foot").textContent);
  console.log("chips:", [...d.querySelectorAll("#boat-species button")].map(b => b.textContent).join(","), "on:", d.querySelector("#boat-species .on").textContent);
  console.log("before fix:", d.getElementById("boat-speed").textContent, d.getElementById("boat-gps").textContent);
  d.getElementById("boat-catch").click(); await wait(100);
  console.log("catch w/o fix:", d.getElementById("boat-msg").textContent);
  const fix = (lat, lng, speed, heading) => watchCb({ coords: { latitude: lat, longitude: lng, accuracy: 5, speed, heading } });
  fix(26.2572, -80.0810, 11.2, 90); await wait(50);
  console.log("speed mph:", d.getElementById("boat-speed").textContent, "heading:", d.getElementById("boat-head").textContent, d.getElementById("boat-card").textContent);
  d.getElementById("boat-units").click();
  console.log("knots:", d.getElementById("boat-speed").textContent, d.getElementById("boat-unit").textContent);
  fix(26.2572, -80.0810, null, null); await wait(50);
  console.log("no speed, no move:", d.getElementById("boat-speed").textContent);
  d.getElementById("boat-species").querySelectorAll("button")[1].click();
  console.log("dbg state:", w.eval("JSON.stringify({busy:boat.busy,pos:boat.pos,now:Date.now()})"));
  console.log("dbg disabled:", d.getElementById("boat-catch").disabled, d.getElementById("boat-gps").textContent);
  d.getElementById("boat-catch").click(); await wait(800);
  const ci = w.__db.inserts.filter(x => x.t === "catches");
  console.log("catch inserted:", ci.length, ci[0] && ci[0].row.species, "msg:", d.getElementById("boat-msg").textContent);
  console.log("geo saved:", w.__db.upserts.filter(x => x.t === "catch_geo").length + w.__db.inserts.filter(x => x.t === "catch_geo").length);
  await wait(1300);
  d.getElementById("boat-mark").click(); await wait(500);
  const si = w.__db.inserts.filter(x => x.t === "spots");
  console.log("spot marked:", si.length, si[0] && si[0].row.is_private, si[0] && si[0].row.name, "msg:", d.getElementById("boat-msg").textContent);
  d.getElementById("boat-close").click();
  console.log("closed:", d.getElementById("boat").hidden, "watch cleared:", watchCb === "cleared", "wake released:", wakeReq === -99);
  console.log("DONE");
} catch (e) { console.log("TEST ERROR", e); process.exit(1); } process.exit(0); })();
