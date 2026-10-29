// test227: v244 people search: the 🔍 search finds anyone in the app (asks the database), admin list marks approved people who have not opened the app yet (setup/121).
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
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
let MSGS = [
  { id: "m1", created_at: new Date(Date.now() - 3600000).toISOString(), sender: "other", recipient: "u-rich", body: "Snook were biting at the inlet!", read_at: null },
  { id: "m2", created_at: new Date(Date.now() - 7200000).toISOString(), sender: "u-rich", recipient: "other", body: "Heading out Saturday", read_at: new Date().toISOString() }
];
const PUBC = [
  { id: "p1", spot_id: "s9", species: "Tarpon", how_many: 1, caught_at: new Date(Date.now() - 2 * 3600000).toISOString(), created_by: "str1", caught_by: "Stan", visibility: "public", length_in: 60 },
  { id: "p2", spot_id: "hidden-spot", species: "Snook", how_many: 1, caught_at: new Date(Date.now() - 5 * 3600000).toISOString(), created_by: "str1", caught_by: "Stan", visibility: "public" },
  { id: "p3", spot_id: "s1", species: "Redfish", how_many: 2, caught_at: new Date(Date.now() - 9 * 3600000).toISOString(), created_by: "u-rich", caught_by: "Richard", visibility: "public" }
];
const mk = (id, spot, species, h, extra = {}) => ({ id, spot_id: spot, species, how_many: 1, caught_at: new Date(Date.now() - h * 3600000).toISOString(), created_by: ME,
  tide_stage: "outgoing", pressure_trend: "falling", moon_phase: "waning crescent", solunar: "minor", wind_mph: 8, water_temp_f: 81, ...extra });
const CATCHES = [mk("c1", "s1", "Snook", 30), mk("c2", "s1", "Snook", 54), mk("c3", "s1", "Snook", 78), mk("c4", "s1", "Jack crevalle", 100),
  mk("c5", "s3", "Mangrove snapper", 30), mk("c8", "s2", "Peacock bass", 40), mk("c6", "s3", "Mangrove snapper", 50), mk("c7", "s3", "Mangrove snapper", 70)];
const HP_MINE = { id: "hm1", kind: "club", name: "Pompano Night Anglers", about: "Night fishing crew", area: "Pompano Beach", accent: null, avatar_path: null, status: "approved", owner: "u-rich", owner_name: "Richard", owner_handle: "richard", is_mine: true, followers: 2, following: false };
const HP_PUB1 = { id: "hp1", kind: "club", name: "Broward Fly Club", about: "Fly fishing meetups every month", area: "Fort Lauderdale", accent: null, avatar_path: null, status: "approved", owner: "other", owner_name: "Mike", owner_handle: "mike", is_mine: false, followers: 3, following: false };
const HP_PUB2 = { id: "hp2", kind: "business", name: "Hillsboro Bait & Tackle", about: "Live bait daily", area: "Pompano Beach", accent: null, avatar_path: null, status: "approved", owner: "str1", owner_name: "Stan the Man", owner_handle: "stan", is_mine: false, followers: 5, following: true };
Object.assign(HP_PUB2, { verified: true, hours: "Mon–Sat 5am–6pm", address: "1 Pier Rd, Pompano Beach", phone: "(954) 555-1234", website: "https://bait.example", lat: 26.257, lng: -80.081, services: [{ name: "Live shrimp", price: "$4/dz" }], photos: [] });
const HP_BIZ = { id: "hb1", kind: "business", name: "Richards Tackle", about: "Rods and reels", area: "Pompano Beach", accent: null, avatar_path: null, status: "approved", owner: "u-rich", owner_name: "Richard", owner_handle: "richard", is_mine: true, followers: 4, following: false, verified: false, paused: false, services: [], photos: [], lat: 26.26, lng: -80.09 };
const HOST = { business_allowed: 1, business_used: 1, extras_on: false, pages: [HP_MINE, HP_PUB1, HP_PUB2, HP_BIZ] };
const POSTS = { hp2: [{ id: "po1", created_at: new Date(Date.now() - 2 * 3600000).toISOString(), kind: "stock", body: "Live shrimp and pilchards in", alerted: true, hidden: false }], hb1: [] };
const OFFS = [{ id: 11, name: "Hillsboro Inlet Park", kind: "park", lat: 26.258, lng: -80.08 }, { id: 12, name: "Far Away Ramp", kind: "ramp", lat: 26.6, lng: -80.1 }, { id: 13, name: "Pompano Pier", kind: "pier", lat: 26.23, lng: -80.09 }];
const HP_ADMIN = [
  { id: "ha1", kind: "business", name: "Sunrise Charters", about: "Half-day trips", area: "Deerfield", status: "pending", note: "I run charters", owner: "u3", owner_name: "Sam", owner_handle: "sam", business_allowed: 1, business_used: 1, created_at: new Date().toISOString() },
  { id: "hp2", kind: "business", name: "Hillsboro Bait & Tackle", about: "Live bait daily", area: "Pompano Beach", status: "approved", phone: "(954) 555-1234", verified: false, paused: false, open_reports: 1, owner: "str1", owner_name: "Stan the Man", owner_handle: "stan", business_allowed: 1, business_used: 1, created_at: new Date().toISOString() }];
const HP_FAIL = {};
let NEWN = 0;
const iso = h => new Date(Date.now() + h * 3600000).toISOString();
let TOURS = [
  { id: "t-admin", kind: "official", title: "Admin Snook Slam", starts_at: iso(-5), ends_at: iso(48), boards: ["length"], created_by: "str1", require_photo: true, require_length: true, series_id: null, team_mode: "singles" },
  { id: "t-other", kind: "official", title: "Fly Club Cup", starts_at: iso(-5), ends_at: iso(48), boards: ["fish"], created_by: "other", require_photo: true, require_length: true, series_id: null, team_mode: "singles", host_page_id: "hp1", host_page_name: "Broward Fly Club" }
];
let TMEMBERS = [{ tournament_id: "t-other", user_id: "u3", status: "joined", joined_at: iso(-3) }];
const SGS = [{ id: "sg1", species: "rude word", how_many: 3, seen_at: new Date().toISOString(), who: "Stan", photo_path: null, hidden_at: null },
  { id: "sg2", species: "manatee", how_many: 1, seen_at: new Date().toISOString(), who: "Mike", photo_path: "x/y.jpg", hidden_at: new Date().toISOString() }];
const hostRpc = (fn, a) => {
  if (fn === "admin_public_sightings") return { data: SGS, error: null };
  if (fn === "hide_sighting" || fn === "unhide_sighting") return { data: null, error: null };
  if (fn === "create_host_tournament" || fn === "create_host_tournament_series") {
    if (HP_FAIL[fn]) return { data: null, error: { message: HP_FAIL[fn] } };
    const nid = "t-new-" + (++NEWN);
    TOURS.push({ id: nid, kind: "official", title: a.p_title, starts_at: a.p_starts || iso(-1), ends_at: a.p_ends || iso(700), boards: a.p_boards, created_by: ME, require_photo: true, require_length: true,
      series_id: fn === "create_host_tournament_series" ? "ser1" : null, team_mode: "singles", host_page_id: a.p_page, host_page_name: "Pompano Night Anglers" });
    TMEMBERS.push({ tournament_id: nid, user_id: "other", status: "joined", joined_at: iso(-2) }, { tournament_id: nid, user_id: "u3", status: "joined", joined_at: iso(-1) });
    return { data: nid, error: null };
  }
  if (fn === "create_tournament") return { data: "t-adm", error: null };
  if (fn === "cancel_tournament") { const t = TOURS.find(x => x.id === a.p_id); if (t) t.cancelled_at = new Date().toISOString(); return { data: null, error: null }; }
  if (HP_FAIL[fn]) return { data: null, error: { message: HP_FAIL[fn] } };
  if (fn === "host_pages_list") return { data: HOST, error: null };
  if (fn === "host_page_posts_list") return { data: POSTS[a.p_page] || [], error: null };
  if (fn === "post_host_page") { (POSTS[a.p_page] = POSTS[a.p_page] || []).unshift({ id: "pn" + RPCS.length, created_at: new Date().toISOString(), kind: a.p_kind, body: a.p_body, alerted: false, hidden: false }); return { data: { id: "pn", alerted: 0, note: a.p_alert ? "Posted. Phone alerts are for ✔ verified pages only." : null }, error: null }; }
  if (fn === "host_page_stats") return { data: { followers: 4, new_7: 1, new_30: 3, posts_30: 2, alerts_30: 0 }, error: null };
  if (fn === "host_page_reports_admin") return { data: [{ id: "r1", page_id: "hp2", page_name: "Hillsboro Bait & Tackle", reason: "fake", details: "Not a real shop", reporter_name: "Mike", created_at: new Date().toISOString() }], error: null };
  if (fn === "host_page_claims_admin" || fn === "host_page_reviews_admin") return { data: [], error: null };
  if (fn === "host_page_for_spot") return { data: a.p_spot === 11 ? { id: "hp2", name: "Hillsboro Bait & Tackle", verified: true } : null, error: null };
  if (["update_host_page_details", "update_host_page_photos", "report_host_page", "set_host_page_verified", "set_host_page_paused", "resolve_host_page_report", "delete_host_page_post", "hide_host_page_post", "request_host_page_claim"].includes(fn)) return { data: null, error: null };
  if (fn === "host_pages_admin") return { data: HP_ADMIN, error: null };
  if (["follow_host_page", "unfollow_host_page", "request_host_page", "review_host_page", "set_business_allowance", "update_host_page", "close_host_page"].includes(fn)) return { data: "ok", error: null };
  return null;
};
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  w.__db = { inserts: [], upserts: [], sessions: [], deletes: [] };
  const chain = (data, tn) => { const fl = []; const rows = () => Array.isArray(data) ? data.filter(r => fl.every(f => f(r))) : data;
    const p = () => Promise.resolve({ data: rows(), error: null }); const o = {
      eq: (c, v) => { fl.push(r => r[c] === v); return o; }, in: (c, vs) => { fl.push(r => vs.includes(r[c])); return o; },
      is: () => o, or: () => o, ilike: () => o, gte: () => o, lte: () => o, order: () => o, select: () => o, limit: () => p(),
      single: () => Promise.resolve({ data: { id: "new-" + Math.random().toString(36).slice(2) }, error: null }),
      then: (x, y) => p().then(x, y),
      maybeSingle: () => tn === "members" ? Promise.resolve(MEMBER()) : p().then(r => ({ data: (r.data || [])[0] || null, error: null })) }; return o; };
  const chainT = (t, d) => chain(d, t);
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "rich9267@gmail.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
    rpc: async (fn, a) => { RPCS.push([fn, a]); if (fn === "clear_my_alerts") { (w.__NOTES || []).forEach(r => { if (!a.p_id || r.id === a.p_id) r.cleared_at = "now"; }); return { data: 1, error: null }; } const hpr = hostRpc(fn, a); if (hpr) return hpr; if (fn === 'mark_read') MSGS.forEach(m => { if (m.sender === a.p_other && m.recipient === 'u-rich') m.read_at = new Date().toISOString(); }); if (fn === 'request_access') { status = 'pending'; } if (fn === 'review_access') PEND = PEND.map(m => m.email === a.p_email ? { ...m, status: a.p_approve ? 'approved' : 'blocked' } : m); return fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }; }, storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    from: t => ({ select: () => chainT(t, t === "notifications" ? (w.__NOTES || []).filter(r => !r.cleared_at) : t === "official_spots" ? OFFS : t === "tournaments" ? TOURS : t === "tournament_members" ? TMEMBERS : t === "host_pages" ? [{ id: "ha1", status: "pending" }] : t === "members" ? PEND : t === "messages" ? MSGS : (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES.concat(PUBC) : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'str1',handle:'stan',display_name:'Stan the Man',home_area:'Stuart',bio:'Tarpon nut'},{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u9',handle:'derricksilly',display_name:'DerrickSILLY'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { w.__db.deletes.push(t); return chain(null); },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "messages") { const m = { id: "mm" + MSGS.length, created_at: new Date().toISOString(), sender: "u-rich", read_at: null, ...row }; MSGS.push(m); return { select: () => ({ single: () => Promise.resolve({ data: m, error: null }) }) }; } if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: row => { w.__db.upserts.push({ t, row }); return Promise.resolve({ error: null }); },
      update: row => { w.__db.updates = (w.__db.updates || []).concat([{ t, row }]); return chain(t === 'profiles' ? { user_id: 'u-rich', ...row } : null); } }) }) };
  w.fetch = async url => {
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
  await wait(900);
  let bad = 0;
  const check = (name, ok) => { console.log((ok ? "ok   " : "FAIL ") + name); if (!ok) bad = 1; };
  const $ = id => d.getElementById(id);
  w.requestAnimationFrame = f => setTimeout(f, 0);

  // ---- 🔍 search finds a new member nobody has loaded yet
  check("Derrick isn't loaded before searching", !w.eval("friendProfiles['u9']") && !w.eval("(pubProfiles || {})['u9']"));
  $("find-btn").click(); await wait(100);
  const q = $("find-q"); q.value = "derr"; q.dispatchEvent(new w.Event("input")); await wait(700);
  const its = [...d.querySelectorAll("#find-out .fp-it")];
  const dr = its.find(b => /DerrickSILLY/.test(b.textContent));
  check("search shows DerrickSILLY under People", !!dr && /@derricksilly/.test(dr.textContent));
  check("it says how to add him", !!dr && /Tap to see their page and add them/.test(dr.textContent));
  const mk = its.find(b => /^.?Mike/.test(b.querySelector("b").textContent));
  check("people search ignores names that don't match", !its.some(b => /Zed/.test(b.textContent)));
  q.value = "@derr"; q.dispatchEvent(new w.Event("input")); await wait(700);
  check("@ in front works too", [...d.querySelectorAll("#find-out .fp-it")].some(b => /DerrickSILLY/.test(b.textContent)));
  q.value = "mike"; q.dispatchEvent(new w.Event("input")); await wait(700);
  check("a friend shows as Friend", [...d.querySelectorAll("#find-out .fp-it")].some(b => /Mike/.test(b.textContent) && /Friend$/.test(b.querySelector("small").textContent)));
  q.value = "derr"; q.dispatchEvent(new w.Event("input")); await wait(700);
  [...d.querySelectorAll("#find-out .fp-it")].find(b => /DerrickSILLY/.test(b.textContent)).click(); await wait(1500);
  check("tapping him opens his page with Add friend", [...d.querySelectorAll("button")].some(b => b.textContent.trim() === "Add friend" && b.offsetParent !== undefined));

  // ---- admin list: approved people who haven't opened the app yet
  PEND.length = 0;
  PEND.push({ email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved", first_opened_at: "2026-01-01T00:00:00Z" },
    { email: "mike@x.com", display_name: "Mike", status: "approved", first_opened_at: "2026-02-01T00:00:00Z" },
    { email: "dd@x.com", display_name: "DerrickSILLY", status: "approved", first_opened_at: null },
    { email: "new@x.com", display_name: "Newbie", status: "pending", requested_at: new Date().toISOString() });
  await w.eval("loadMembers()"); await wait(200);
  const txt = $("member-list").textContent;
  check("admin list says 1 person hasn't opened the app yet", /1 approved person hasn't opened the app yet/.test(txt));
  const rows = [...d.querySelectorAll("#member-list li")].filter(li => li.querySelector(".sugg-name"));
  const dRow = rows.find(li => /DerrickSILLY/.test(li.textContent)), mRow = rows.find(li => /Mike/.test(li.textContent));
  check("Derrick is marked 📵 and listed before other members", !!dRow && /hasn't opened the app yet/.test(dRow.textContent) && rows.indexOf(dRow) < rows.indexOf(mRow));
  check("people who opened the app aren't marked", !/hasn't opened/.test(mRow.textContent));
  check("waiting requests aren't counted", !/Newbie[^]*hasn't opened/.test(txt.split("Members")[0] || ""));

  // ---- database + messages
  const sql = require("fs").readFileSync(__dirname + "/../setup/121-profile-at-approval.sql", "utf8");
  check("approval makes the profile (setup/121)", /review_access[\s\S]*private\.start_profile\(u, p_email\)/.test(sql) && /first_opened_at = now\(\)/.test(sql));
  check("Friends search explains when nobody is found", /Someone who hasn't joined yet won't show up/.test(require("fs").readFileSync(__dirname + "/../js/11-accounts-social.js", "utf8")));
  process.exit(bad);
})();
