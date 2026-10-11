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
let TK = [{ id: "k1", name: "Live shrimp", kind: "bait", created_by: "u-rich", created_at: new Date().toISOString() }, { id: "k2", name: "Fly rod 8wt", kind: "rod", created_by: "u-rich", created_at: new Date().toISOString() }];
const HOF = [
  { tournament_id: 't3', title: 'September Slam', ends_at: new Date(Date.now() - 20 * 86400000).toISOString(), series_month: null, board: 'length', rank: 1, user_id: 'u-rich', value: 33.5, species: 'Snook' },
  { tournament_id: 't3', title: 'September Slam', ends_at: new Date(Date.now() - 20 * 86400000).toISOString(), series_month: null, board: 'length', rank: 2, user_id: 'other', value: 31, species: 'Snook' },
  { tournament_id: 't3', title: 'September Slam', ends_at: new Date(Date.now() - 20 * 86400000).toISOString(), series_month: null, board: 'fish', rank: 1, user_id: 'other', value: 7, species: null }
];
const NOTIFS = [
  { id: 'n1', user_id: 'u-rich', kind: 'social', title: 'Mike messaged you', body: 'Snook at the inlet!', url: '?go=chat&with=other', created_at: new Date(Date.now() - 5 * 60000).toISOString(), result: null },
  { id: 'n2', user_id: 'u-rich', kind: 'weather', title: '🌊 Small Craft Advisory', body: 'until 8 PM', url: '?go=weather', created_at: new Date(Date.now() - 3 * 3600000).toISOString(), result: 'quiet hours' }
];
const RULES = [
  { id: "r1", species: "Snook", match: ["snook"], min_in: 28, max_in: 32, measure: "total", one_over: false, bag: "1 per person", release_only: false, closed: [["12-15","01-31"],["06-01","08-31"]], open_only: null, note: null, verified_on: "2026-10-09", active: true },
  { id: "r2", species: "Spotted seatrout", match: ["seatrout","spotted trout"], min_in: 15, max_in: 19, measure: "total", one_over: true, bag: "3 per person", release_only: false, closed: null, open_only: null, note: null, verified_on: "2026-10-09", active: true },
  { id: "r3", species: "Florida pompano", match: ["pompano"], min_in: 11, max_in: null, measure: "fork", one_over: false, bag: "6 per person", release_only: false, closed: null, open_only: null, note: null, verified_on: "2026-10-09", active: true },
  { id: "r4", species: "Tarpon", match: ["tarpon"], min_in: null, max_in: null, measure: "total", one_over: false, bag: null, release_only: true, closed: null, open_only: null, note: "Catch-and-release only", verified_on: "2026-10-09", active: true },
  { id: "r5", species: "Red snapper", match: ["red snapper"], min_in: null, max_in: null, measure: "total", one_over: false, bag: "1", release_only: false, closed: null, open_only: [["2026-10-09","2026-10-22"]], note: null, verified_on: "2026-10-09", active: true }
];
let FP = [];
let WXLIST = (process.env.WX === 'none') ? [] : [{ properties: { event: 'Special Marine Warning', areaDesc: 'Coastal waters from Jupiter to Deerfield; more', ends: new Date(Date.now()+3600000).toISOString(), description: 'Waterspouts possible.\n\nMove to safe harbor.', messageType: 'Alert' } }, { properties: { event: 'Small Craft Advisory', areaDesc: 'Jupiter Inlet to Deerfield Beach', ends: new Date(Date.now()+7200000).toISOString(), description: 'Seas 6 to 8 feet.', messageType: 'Alert' } }, { properties: { event: 'Air Quality Alert', areaDesc: 'x', description: 'ignore me', messageType: 'Alert' } }];
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
const CATCHES = [mk("c1", "s1", "Snook", 30, { bait: "Live shrimp", length_in: 30 }), mk("c2", "s1", "Snook", 54, { bait: "live shrimp", length_in: 26 }), mk("c3", "s1", "Snook", 78, { bait: "White jig" }), mk("c4", "s1", "Jack crevalle", 100),
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
    rpc: async (fn, a) => { RPCS.push([fn, a]); if (fn === 'admin_stats') return { data: { members_approved: 4, members_pending: 1, members_blocked: 0, spots: 9, catches: 8, catches_7d: 5, active_7d: 2, open_reports: 3, push_users: 3, top_species: [{ species: 'Snook', n: 4 }], hidden: [{ id: 'h1', type: 'catch', target_id: 'cx', hidden_at: new Date().toISOString(), reports: 3, snippet: 'Blue Runner' }] }, error: null }; if (fn === 'review_flagged') return { data: null, error: null }; if (fn === 'hall_of_fame') return { data: HOF, error: null }; if (fn === 'start_float_plan') { FP = [{ id: 'fp1', user_id: 'u-rich', place: a.p_place, note: a.p_note, due_at: a.p_due, grace_min: a.p_grace, buddies: a.p_buddies, status: 'active', last_lat: a.p_lat, last_lng: a.p_lng, last_at: new Date().toISOString() }]; return { data: 'fp1', error: null }; } if (fn === 'end_float_plan') { FP = FP.filter(x => x.user_id !== 'u-rich'); return { error: null }; } if (fn === 'extend_float_plan') { FP.forEach(x => { x.due_at = new Date(new Date(x.due_at).getTime() + a.p_minutes * 60000).toISOString(); }); return { error: null }; } if (fn === 'trip_review') return { data: [{ catch_id: 'x1', user_id: 'u-rich', caught_at: new Date().toISOString(), species: 'Snook', how_many: 1, length_in: 30, weight_lb: 8, weight_est: true, spot_id: 's1', lat: 26.2571, lng: -80.0812, accuracy_m: 9 }, { catch_id: 'x2', user_id: 'other', caught_at: new Date().toISOString(), species: 'Tarpon', how_many: 2, length_in: null, weight_lb: null, weight_est: false, spot_id: 's1', lat: null, lng: null, accuracy_m: null }], error: null }; if (fn === 'tournament_standings') return { data: STAND, error: null }; if (fn === 'tournament_my_catches') return { data: MYC, error: null }; if (fn === 'create_tournament') { TOURS.push({ id: 't9', kind: a.p_kind, title: a.p_title, description: a.p_desc, created_by: 'u-rich', starts_at: a.p_starts, ends_at: a.p_ends, boards: a.p_boards, species: a.p_species || null, require_photo: a.p_photo, require_length: a.p_length, geo_lat: a.p_lat, geo_lng: a.p_lng, geo_radius_mi: a.p_radius, geo_label: a.p_geo_label, cancelled_at: null }); TMEM.push({ tournament_id: 't9', user_id: 'u-rich', status: 'joined' }); return { data: 't9', error: null }; } if (fn === 'join_tournament') { const m = TMEM.find(x => x.tournament_id === a.p_id && x.user_id === 'u-rich'); if (m) m.status = 'joined'; else TMEM.push({ tournament_id: a.p_id, user_id: 'u-rich', status: 'joined' }); return { error: null }; } if (fn === 'leave_tournament') { const m = TMEM.find(x => x.tournament_id === a.p_id && x.user_id === 'u-rich'); if (m) m.status = 'left'; return { error: null }; } if (fn === 'cancel_tournament') { TOURS.find(x => x.id === a.p_id).cancelled_at = new Date().toISOString(); return { error: null }; } if (fn === 'block_user') BLOCKS.push({ blocker: 'u-rich', blocked: a.p_user }); if (fn === 'mark_read') MSGS.forEach(m => { if (m.sender === a.p_other && m.recipient === 'u-rich') m.read_at = new Date().toISOString(); }); if (fn === 'request_access') { status = 'pending'; } if (fn === 'review_access') PEND = PEND.map(m => m.email === a.p_email ? { ...m, status: a.p_approve ? 'approved' : 'blocked' } : m); return fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }; }, storage: { from: () => ({ createSignedUrls: async paths => ({ data: paths.map(p => ({ path: p, signedUrl: 'https://img.test/' + p })) }) }) },
    functions: { invoke: async () => ({ data: { fish_visible: true, suggestions: [{ name: "Snook", confidence: "high", clue: "dark stripe" }, { name: "Tarpon", confidence: "low" }] }, error: null }) },
    from: t => ({ select: () => chainT(t, t === "tackle" ? TK : t === "members" ? PEND : t === "messages" ? MSGS : t === "blocks" ? BLOCKS : t === "reports" ? REPORTS :  (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES.concat(PUBC) : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'str9',handle:'badguy',display_name:'Bad Guy'},{user_id:'str1',handle:'stan',display_name:'Stan the Man',home_area:'Stuart',bio:'Tarpon nut'},{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rico',handle:'rico',display_name:'Rico'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u-rico',status:'accepted',requested_by:'u-rich'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'pnow',spot_id:'s1',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()-30*60000).toISOString(),note:'now'},{id:'ppast',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()-48*3600000).toISOString(),note:'old'},{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "notifications" ? NOTIFS : t === "fish_rules" ? RULES : t === "spot_follows" ? [] : t === "float_plans" ? FP : t === "photos" ? [{ id: "ph1", catch_id: "x1", path: "u/x1.jpg", spot_id: "s1", created_by: "u-rich", created_at: new Date().toISOString() }] : t === "group_messages" ? GM : t === "tournaments" ? TOURS : t === "tournament_members" ? TMEM : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'},{plan_id:'ppast',user_id:'u-rich',name:'Richard'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { const o = { eq: (c, v) => { w.__db.deletes.push(t + ":" + c + "=" + v); if (t === "blocks") BLOCKS = BLOCKS.filter(b => b.blocked !== v); return o; }, then: (x, y) => Promise.resolve({ error: null }).then(x, y) }; return o; },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "group_messages") GM.push({ id: "g" + GM.length, sender: "u-rich", created_at: new Date().toISOString(), ...row }); if (t === "messages") { const m = { id: "mm" + MSGS.length, created_at: new Date().toISOString(), sender: "u-rich", read_at: null, ...row }; MSGS.push(m); return { select: () => ({ single: () => Promise.resolve({ data: m, error: null }) }) }; } if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: row => { w.__db.upserts.push({ t, row }); return Promise.resolve({ error: null }); },
      update: row => { w.__db.updates = (w.__db.updates || []).concat([{ t, row }]); return chain(t === 'profiles' ? { user_id: 'u-rich', ...row } : null); } }) }) };
  w.fetch = async url => {
    if (/api\.weather\.gov/.test(url)) { calls.push(url); return { ok: true, json: async () => ({ features: WXLIST }) }; }
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
  await wait(1500);
  const $ = id => d.getElementById(id), txt = id => $(id).textContent.replace(/\s+/g, " ").trim();
  const click = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const ev = (el, t) => el.dispatchEvent(new w.Event(t, { bubbles: true }));
  const sleep = wait; 
  w.URL.createObjectURL = () => "blob:x";
  const FR = ["u-brit", "u-rico"];
  let GR = [{ id: "G1", name: "Pompano Posse", description: "Dock rats", accent: "#0b6e99", avatar_path: null, created_by: ME, created_at: new Date().toISOString(), deleted_at: null },
    { id: "G2", name: "Reef Runners", description: null, accent: null, avatar_path: null, created_by: "u-brit", created_at: new Date().toISOString(), deleted_at: null }];
  let GMEM = [
    { group_id: "G1", user_id: ME, role: "owner", status: "joined", invited_by: ME }, { group_id: "G1", user_id: "u-brit", role: "member", status: "joined", invited_by: ME },
    { group_id: "G1", user_id: "u-rico", role: "member", status: "invited", invited_by: ME },
    { group_id: "G2", user_id: "u-brit", role: "owner", status: "joined", invited_by: "u-brit" }, { group_id: "G2", user_id: ME, role: "member", status: "invited", invited_by: "u-brit" }];
  let TM = [{ id: "tm1", group_id: "G1", sender: "u-brit", body: "Tomorrow at dawn?", created_at: new Date().toISOString() }];
  const calls2 = [], tmIns = [];
  w.__gr = { rows: t => t === "groups" ? GR : t === "group_members" ? GMEM : TM, ins: r => { tmIns.push(r); TM.push({ id: "tm" + TM.length, sender: ME, created_at: new Date().toISOString(), ...r }); } };
  w.__call = (fn, a) => { calls2.push([fn, a]); return fn === "group_board" ? [{ user_id: ME, fish: 5, catches: 3, longest: 31, species: 2, last_at: null }, { user_id: "u-brit", fish: 9, catches: 4, longest: 28, species: 3, last_at: null }] : fn === "create_group" ? "G3" : null; };
  w.eval(`{ const _f = db.from.bind(db), _r = db.rpc.bind(db);
    db.from = t => { if (!["groups", "group_members", "team_messages"].includes(t)) return _f(t);
      const mkq = () => { const fl = []; const q = { eq: (c, v) => { fl.push(r => r[c] === v); return q; }, in: (c, vs) => { fl.push(r => vs.includes(r[c])); return q; }, order: () => q, limit: () => q, select: () => q,
        then: (x, y) => Promise.resolve({ data: window.__gr.rows(t).filter(r => fl.every(f => f(r))), error: null }).then(x, y) }; return q; };
      return { select: () => mkq(), insert: r => { window.__gr.ins(r); return Promise.resolve({ error: null }); }, delete: () => ({ eq: () => Promise.resolve({ error: null }) }) }; };
    db.rpc = (fn, a) => ["group_board", "create_group", "invite_to_group", "respond_group", "leave_group", "remove_from_group", "update_group", "delete_group"].includes(fn) ? Promise.resolve({ data: window.__call(fn, a), error: null }) : _r(fn, a); }`);
  w.eval("me.friendIds = new Set(['u-brit','u-rico','u-andy']); friendProfiles['u-andy'] = { user_id:'u-andy', display_name:'Andrew', handle:'andy' }; friendProfiles['u-brit'] = { user_id:'u-brit', display_name:'Brit', handle:'brit' }; friendProfiles['u-rico'] = { user_id:'u-rico', display_name:'Rico', handle:'rico' };");
  w.eval("window.confirm = () => true;");


  const C = (id, sp, spot, extra) => ({ id, species: sp, spot_id: spot, created_by: ME, how_many: 1, caught_at: new Date(Date.now() - 3600000 * (+id.slice(1) + 1)).toISOString(), ...extra });
  w.__c1 = [C("c1", "Snook", "s1", { weight_lb: 12, length_in: 31 }), C("c2", "Redfish", "s1", { length_in: 27 }), C("c3", "Sheepshead", "s1", { weight_lb: 4, length_in: 15 })];
  w.__c2 = [C("c4", "Peacock bass", "s2", { weight_lb: 3.5, length_in: 20 })];
  w.eval("catchesBySpot = { s1: window.__c1, s2: window.__c2 }");
  const chk = (sp, wt, ln) => w.eval(`JSON.stringify(tankCheck({ id: "new1", species: ${JSON.stringify(sp)}, how_many: 1, caught_at: new Date().toISOString(), spot_id: "s1", weight_lb: ${wt}, length_in: ${ln} }))`);
  console.log("bigger snook:", chk("snook", 15, 34));
  console.log("smaller snook (no celebration):", chk("Snook", 8, 28));
  console.log("same size snook (tie, no celebration):", chk("Snook", 12, 31));
  console.log("same weight but longer:", chk("Snook", 12, 33));
  console.log("brand new species, salt:", chk("Cobia", 20, 38));
  console.log("brand new species, fresh:", chk("Bluegill", 1, 8));
  console.log("bigger peacock bass (fresh):", chk("Peacock bass", 5, 22));
  console.log("redfish longer:", chk("redfish", null, 29));
  console.log("redfish shorter:", chk("Redfish", null, 20));
  console.log("no size at all, existing species:", chk("Snook", null, null));
  console.log("no size at all, new species:", chk("Jack crevalle", null, null));
  console.log("blank species:", chk("  ", 3, 3));
  const pop = r => { w.eval(`tankPop(${r})`); };
  pop(`tankCheck({ id: "new1", species: "Snook", how_many: 1, caught_at: new Date().toISOString(), spot_id: "s1", weight_lb: 15, length_in: 34 })`);
  await sleep(50);
  const p1 = d.querySelector(".best-pop");
  console.log("popup shown:", !!p1, "| text:", p1 && p1.textContent.replace(/\s+/g, " ").trim(), "| fish drawn:", p1 && !!p1.querySelector("svg"), "| confetti:", p1 && p1.querySelectorAll(".confetti").length);
  console.log("OK button focused:", d.activeElement && d.activeElement.textContent);
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await sleep(30);
  console.log("Esc closes it:", !d.querySelector(".best-pop"));
  pop(`tankCheck({ id: "new2", species: "Cobia", how_many: 1, caught_at: new Date().toISOString(), spot_id: "s1", weight_lb: 20, length_in: 38 })`); await sleep(50);
  console.log("first-fish popup:", d.querySelector(".best-pop").textContent.replace(/\s+/g, " ").trim());
  click([...d.querySelectorAll(".best-pop button")].find(b => /See my tank/.test(b.textContent))); await sleep(200);
  console.log("See my tank: popup gone", !d.querySelector(".best-pop"), "| tank view shown:", !d.getElementById("view-tank").hidden);
  w.eval("tankPop(null)"); console.log("null does nothing:", !d.querySelector(".best-pop"));
  // saving a real catch from the full form path: quick-catch save returns the check
  w.eval("catchesBySpot = { s1: window.__c1, s2: window.__c2 }");
  console.log("collection:", w.eval("JSON.stringify(tankCollection(Object.values(catchesBySpot).flat()).map(g => g.key + ' ' + g.got.length + '/' + g.total + ' [' + g.got.join(',') + ']'))"));
  console.log("first Permit goal:", JSON.parse(chk("Permit", 9, 24)).goal, "| first cobia goal:", JSON.parse(chk("Cobia", 9, 24)).goal);
  console.log("beach list has no mullet run:", !w.eval("tankCollection([]).find(g => g.key==='beach').missing.join()").match(/mullet run/i));
  w.eval("tankMode='tanks'"); click($("tab-tank")); await sleep(200);
  const rows = [...d.querySelectorAll("#tank-body .col-row")];
  console.log("collection rows:", rows.map(r => r.textContent.replace(/\s+/g," ").trim()).join(" ; "));
  click(rows[0]); console.log("tap opens list:", !rows[0].nextSibling.hidden, "| chips:", rows[0].nextSibling.textContent.replace(/\s+/g," ").trim().slice(0,120), "| aria:", rows[0].getAttribute("aria-expanded"));
  click(rows[0]); console.log("tap again closes:", rows[0].nextSibling.hidden);
  click(d.querySelector("#tank-sw button[data-mode='tanks']")); await sleep(50);
  console.log("decor line:", [...d.querySelectorAll("#tank-body .tank-card > .spot-meta")].map(x => x.textContent).join(" | "), "| decor drawn salt:", d.querySelectorAll("#tank-body .tank-salt .decor").length);
  const lf = d.querySelector("#tank-body .tfish svg");
  console.log("fish has moving parts:", !!lf && lf.classList.contains("fish-live"), "| parts:", ["fs-rig","fs-tail","fs-fin","fs-fin2","fs-body","fs-eye","fs-gill"].map(c => c + "=" + (lf ? lf.querySelectorAll("." + c).length : 0)).join(" "), "| own speed set:", !!(lf && lf.style.getPropertyValue("--fd")));
  console.log("pond/collection fish stay still:", !d.querySelector("#pond-body svg.fish-live") && !d.querySelector(".col-chip svg.fish-live"));
  // ---- swimming engine + full screen ----
  w.__c1.push(C("y1", "Snook", "s1", { weight_lb: 2 }), C("y2", "Snook", "s1", { weight_lb: 1 })); w.__c2.push(C("y3", "Peacock bass", "s2", { weight_lb: 1 })); w.eval("catchesBySpot = { s1: window.__c1, s2: window.__c2 }");
  w.eval("window.requestAnimationFrame = () => 1; tankMode='tanks'; renderTank()"); // no real animation clock in this fake browser: the test steps time by hand
  const simInfo = () => JSON.parse(w.eval(`JSON.stringify({ sims: TANK_SIMS.size, scenes: [...document.querySelectorAll('.tank')].map(s => !!s.__sim) })`));
  console.log("swimming scenes registered:", JSON.stringify(simInfo()), "| roaming fish:", d.querySelectorAll("#tank-body .tfish.sim").length, "| each has a turn wrapper:", [...d.querySelectorAll("#tank-body .tfish.sim")].every(b => b.querySelector(".tf-turn svg")));
  const run = w.eval(`(() => { const sim = [...TANK_SIMS].find(s => s.scene.classList.contains("tank-salt")); sim.W = 366; sim.H = 300; sim.scale = 1;
    let out = 0, flips = 0, minT = 9, maxT = -9, moved = 0; const start = sim.fish.map(f => [f.x, f.y]);
    const lastFace = sim.fish.map(f => Math.sign(f.turn));
    for (let n = 0; n < 1800; n++) { tankStep(sim, 1 / 30);
      sim.fish.forEach((f, i) => { const w = f.w * (0.8 + 0.2 * f.depth), h = f.h * (0.8 + 0.2 * f.depth);
        if (f.x < -0.5 || f.x > sim.W - w + 0.5 || f.y < 0 || f.y > sim.H - sim.floor - h + 0.5) out++;
        minT = Math.min(minT, f.turn); maxT = Math.max(maxT, f.turn);
        const sg = Math.sign(f.turn); if (sg && sg !== lastFace[i]) { flips++; lastFace[i] = sg; } }); }
    sim.fish.forEach((f, i) => { if (Math.hypot(f.x - start[i][0], f.y - start[i][1]) > 40) moved++; });
    return JSON.stringify({ fish: sim.fish.length, outOfWater: out, turnedAround: flips > 0, turnRange: [minT.toFixed(2), maxT.toFixed(2)], movedFar: moved }); })()`);
  console.log("60 seconds of swimming:", run);
  console.log("turn is a smooth squash, not a jump (a fish mid-turn exists):", w.eval(`(() => { const sim = [...TANK_SIMS][0]; const f = sim.fish[0]; f.vx = 40; f.turn = -1; let mid = false; for (let i = 0; i < 20; i++) { tankStep(sim, 1/30); if (Math.abs(f.turn) < 0.5) mid = true; } return mid; })()`));
  console.log("depth layers: back fish dimmer than front:", w.eval(`(() => { const f = [...TANK_SIMS][0].fish; const b = e => parseFloat(/brightness\\(([\\d.]+)\\)/.exec(e.el.style.filter)[1]); return Math.min(...f.map(b)) < Math.max(...f.map(b)); })()`));
  // full screen
  const salt = d.querySelector("#tank-body .tank-salt"), home = salt.parentNode, fbtn = [...d.querySelectorAll("#tank-body .full-btn")][0];
  click(fbtn); await sleep(100);
  const ov = d.querySelector(".tank-full");
  console.log("full screen opens:", !!ov, "| tank moved inside:", !!ov && ov.contains(salt), "| title:", ov && ov.querySelector(".tf-bar b").textContent, "| feed button there:", !!(ov && ov.querySelector(".feed-btn")), "| page scroll locked:", d.body.style.overflow);
  click(salt.querySelector(".tfish")); console.log("fish info shows in the full-screen bar:", ov.querySelector(".tf-info").hidden === false, "|", ov.querySelector(".tf-info").textContent.replace(/\s+/g, " ").slice(0, 60));
  click(ov.querySelector(".tf-bar button")); await sleep(50);
  console.log("close puts the tank back:", !d.querySelector(".tank-full") && salt.parentNode === home && home.contains(salt) && salt.style.height !== "100%", "| scroll unlocked:", d.body.style.overflow === "");
  click(fbtn); await sleep(50); d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await sleep(50);
  console.log("Esc closes full screen:", !d.querySelector(".tank-full") && salt.parentNode === home);
  click(d.querySelector("#tank-sw button[data-mode='lagoon']")); await sleep(50);
  const lag = d.querySelector("#lagoon-body .pond-scene"), lfb = d.querySelector("#lagoon-body .full-btn");
  console.log("lagoon fish roam:", d.querySelectorAll("#lagoon-body .pfish.sim").length, "| full-screen button on lagoon:", !!lfb, "| no feed button in lagoon full screen:", (() => { click(lfb); const o = d.querySelector(".tank-full"); const r = !!o && !o.querySelector(".feed-btn") && o.contains(lag); click(o.querySelector(".tf-bar button")); return r; })());
  click(d.querySelector("#tank-sw button[data-mode='tanks']")); await sleep(50);
  w.eval("renderTank(); renderTank()"); await sleep(20);
  console.log("old scenes dropped after redraw (no leftover sims in the list after a tick):", w.eval("(() => { tankTick(performance.now()); return TANK_SIMS.size; })()"), "of", d.querySelectorAll(".tank, .pond-scene").length, "scenes on screen");
  w.eval("window.matchMedia = () => ({ matches: true })"); w.eval("renderTank()");
  console.log("reduced motion: fish placed, none registered to move:", d.querySelectorAll("#tank-body .tfish.sim").length > 0 && w.eval("[...TANK_SIMS].every(s => !s.still)") , "| still tanks flagged:", w.eval("[...document.querySelectorAll('.tank')].every(s => s.__sim.still)"), "| fish have positions:", /translate/.test(d.querySelector("#tank-body .tfish.sim").style.transform));
  // ---- fish-to-fish behaviour (step 3) ----
  const beh = JSON.parse(w.eval(`(() => {
    const mkScene = (n, kinds, sizes, depths, chase, seed) => { const sc = document.createElement("div"); document.body.appendChild(sc);
      const items = []; for (let i = 0; i < n; i++) { const el = document.createElement("button"), te = document.createElement("span"); el.appendChild(te); sc.appendChild(el); items.push({ el, turnEl: te, w: sizes[i % sizes.length], h: Math.round(sizes[i % sizes.length] * 68 / 128), depth: depths[i % depths.length], kind: kinds[i % kinds.length] }); }
      const sim = tankSwim(sc, items, { chase, seed }); sim.W = 366; sim.H = 300; sim.scale = 1; sim.still = true; TANK_SIMS.delete(sim); return sim; };
    const res = {};
    // 1) personal space: same layer, mixed kinds -> fish should rarely overlap
    let sim = mkScene(8, ["a","b","c","d","e","f","g","h"], [60, 44, 52], [0.6], false, 11), tight = 0, frames = 0, minGap = 999;
    for (let s = 0; s < 1800; s++) { tankStep(sim, 1/30); if (s > 150) { frames++; for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const a = sim.fish[i], b = sim.fish[j]; const d = Math.hypot((a.x + a.w/2) - (b.x + b.w/2), (a.y + a.h/2) - (b.y + b.h/2)); minGap = Math.min(minGap, d); if (d < 14) tight++; } } }
    res.space = { framesPairsTooClose: tight, of: frames * 28, closest: +minGap.toFixed(1) };
    // 2) layers: front and back fish may cross (no pushing), so they are allowed closer than same-layer fish
    sim = mkScene(2, ["a","b"], [60], [0.25, 1], false, 5); let cross = 0; for (let s = 0; s < 3000; s++) { tankStep(sim, 1/30); const a = sim.fish[0], b = sim.fish[1]; if (Math.hypot(a.x - b.x, a.y - b.y) < 35) cross++; }
    res.layerPass = cross > 0;
    // 3) schooling: 6 snook + 6 redfish -> each kind clusters
    sim = mkScene(12, ["snook","redfish"], [30], [0.3, 0.65, 1], false, 3); const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y); let within = 0, across = 0, cw = 0, ca = 0;
    for (let s = 0; s < 1800; s++) { tankStep(sim, 1/30); if (s > 300) for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) { const d = dist(sim.fish[i], sim.fish[j]); if (sim.fish[i].kind === sim.fish[j].kind) { within += d; cw++; } else { across += d; ca++; } } }
    res.school = { avgDistSameKind: Math.round(within / cw), avgDistOtherKind: Math.round(across / ca), followersOfLeader: sim.fish.filter(f => f.follow).length };
    // 4) chasing: one big fish among small ones; run 10 minutes
    sim = mkScene(5, ["big","s1","s2","s3","s4"], [90, 40, 44, 38, 42], [0.6], true, 7); let chases = 0, flees = 0, maxSpeedBig = 0, maxFlee = 0, normal = 0, nn = 0, chasing = false, bad = 0, darts = 0;
    for (let s = 0; s < 18000; s++) { tankStep(sim, 1/30); const bigF = sim.fish[0]; if (bigF.mode === "chase" && !chasing) chases++; chasing = bigF.mode === "chase";
      sim.fish.forEach((f, i) => { if (i && f.mode === "flee") { flees++; maxFlee = Math.max(maxFlee, Math.hypot(f.vx, f.vy)); } else if (i) { normal += Math.hypot(f.vx, f.vy); nn++; } if (f.x < -1 || f.x > sim.W - f.w + 1) bad++; if (f.turnEl.classList.contains("dart")) darts++; }); }
    res.chase = { chaseStarts: chases, fleeFrames: flees, fleeTopSpeed: Math.round(maxFlee), normalAvgSpeed: Math.round(normal / nn), stayedInWater: bad === 0, dartLookSet: darts > 0 };
    // 5) equal-size fish never chase
    sim = mkScene(5, ["a","b","c","d","e"], [50], [0.6], true, 9); let any = 0; for (let s = 0; s < 9000; s++) { tankStep(sim, 1/30); if (sim.fish.some(f => f.mode !== "swim")) any++; }
    res.noChaseWhenEqual = any === 0;
    return JSON.stringify(res); })()`));
  console.log("personal space:", JSON.stringify(beh.space), "| layers pass through each other:", beh.layerPass);
  console.log("schooling:", JSON.stringify(beh.school), "| same kind closer together:", beh.school.avgDistSameKind < beh.school.avgDistOtherKind);
  console.log("chase:", JSON.stringify(beh.chase));
  console.log("equal sizes never chase:", beh.noChaseWhenEqual);
  // ---- hand feeding (step 4) ----
  w.eval("window.matchMedia = () => ({ matches: false }); tankMode = 'tanks'; renderTank()");
  const tankEl = d.querySelector("#tank-body .tank-salt"), fb = d.querySelector("#tank-body .feed-btn"), sim0 = tankEl.__sim;
  console.log("feed button starts off:", fb.textContent, "| pressed:", fb.getAttribute("aria-pressed"), "| tank in feeding mode:", tankEl.classList.contains("feeding-mode"));
  click(fb); await sleep(20);
  console.log("feeding mode on:", fb.textContent, "|", tankEl.classList.contains("feeding-mode"), "| hint shown:", !!d.querySelector("#tank-body .feed-hint"), "| fish ignore taps while feeding (css class):", tankEl.classList.contains("feeding-mode"));
  const ptr = (type, x, y) => { const e = new w.MouseEvent(type, { bubbles: true, clientX: x, clientY: y }); tankEl.dispatchEvent(e); };
  sim0.W = 366; sim0.H = 300; sim0.scale = 1; tankEl.getBoundingClientRect = () => ({ left: 0, top: 0, width: 366, height: 300 });
  ptr("pointerdown", 180, 120); console.log("touch holds food:", !!sim0.feed, "| pinch drawn:", !!tankEl.querySelector(".food"), "| flakes drawn:", tankEl.querySelectorAll(".food-flakes i").length, "| position:", sim0.feed && [sim0.feed.x, sim0.feed.y].join(","));
  ptr("pointermove", 220, 150); console.log("dragging moves it:", sim0.feed && [sim0.feed.x, sim0.feed.y].join(","));
  ptr("pointermove", 9999, 9999); console.log("kept inside the water:", sim0.feed && sim0.feed.x <= 362 && sim0.feed.y <= 300 - sim0.floor);
  const feedRun = JSON.parse(w.eval(`(() => {
    const sim = [...document.querySelectorAll('.tank-salt')][0].__sim; sim.fish.forEach((f, i) => { f.x = 20 + i * 90; f.y = 180; f.vx = f.vy = 0; f.mode = "swim"; f.fullT = 0; f.bites = 0; });
    tankFeedMove(sim, 180, 120); const start = sim.fish.map(f => Math.hypot(f.x - 180, f.y - 120)); let nearest = 1e9, eatenAtHold = 0, minSupply = 6;
    for (let s = 0; s < 900; s++) { tankStep(sim, 1/30); minSupply = Math.min(minSupply, sim.feed.supply); sim.fish.forEach(f => nearest = Math.min(nearest, Math.hypot(f.x + f.w * 0.9 - 180, f.y + f.h / 2 - 120))); }
    eatenAtHold = sim.eaten; const supplyHeld = sim.feed.supply; const crumbsWhileHolding = sim.crumbs.length;
    return JSON.stringify({ came: nearest < 40, nearestMouthPx: Math.round(nearest), ate: eatenAtHold, bitesUsedSupply: minSupply < 6, someFull: sim.fish.filter(f => f.fullT > 0).length, crumbsWhileHolding, hungryDistStart: Math.round(start.reduce((a, b) => a + b) / start.length) }); })()`));
  console.log("fish come and eat from the pinch:", JSON.stringify(feedRun));
  ptr("pointerup", 0, 0); console.log("letting go sprinkles flakes:", sim0.crumbs.length, "| pinch gone:", !tankEl.querySelector(".food"), "| holding:", !!sim0.feed);
  const after = JSON.parse(w.eval(`(() => { const sim = [...document.querySelectorAll('.tank-salt')][0].__sim; sim.fish.forEach(f => { f.fullT = 0; f.bites = 0; }); const eatenBefore = sim.eaten, c0 = sim.crumbs.length; for (let s = 0; s < 1500; s++) tankStep(sim, 1/30); return JSON.stringify({ crumbsStart: c0, eatenFromCrumbs: sim.eaten - eatenBefore, crumbsLeft: sim.crumbs.length, crumbEls: sim.scene.querySelectorAll('.crumb').length }); })()`));
  console.log("flakes get eaten or fade away:", JSON.stringify(after));
  const fullRun = JSON.parse(w.eval(`(() => { const sim = [...document.querySelectorAll('.tank-salt')][0].__sim; tankFeedBegin(sim, 100, 100); sim.fish.forEach(f => { f.fullT = 0; f.bites = 0; f.biteCd = 0; f.x = 90; f.y = 95; f.mode = "swim"; });
    for (let s = 0; s < 3000; s++) { tankStep(sim, 1/30); sim.feed.x = 100; sim.feed.y = 100; } const full = sim.fish.every(f => f.fullT > 0 || f.bites > 0); const r = JSON.stringify({ allFedAndFull: sim.fish.filter(f => f.fullT > 0).length, of: sim.fish.length, anyStillHungry: sim.fish.some(f => f.fullT <= 0) }); tankFeedEnd(sim); return r; })()`));
  console.log("fish get full and stop crowding the food:", JSON.stringify(fullRun));
  click(fb); await sleep(20);
  console.log("Done feeding:", fb.textContent, "| class off:", !tankEl.classList.contains("feeding-mode"), "| hint gone:", !d.querySelector("#tank-body .feed-hint"), "| touching now does nothing:", (() => { ptr("pointerdown", 50, 50); return !sim0.feed; })());
  // feeding in full screen shares the same mode and buttons
  click(d.querySelector("#tank-body .full-btn")); await sleep(30);
  const fsBtn = d.querySelector(".tank-full .feed-btn"); click(fsBtn); await sleep(10);
  console.log("full screen feed button turns it on:", tankEl.classList.contains("feeding-mode"), "|", fsBtn.textContent, "| card button follows:", fb.textContent, "| no hint squeezed into full screen:", !d.querySelector(".tank-full .feed-hint"));
  click(d.querySelector(".tank-full .tf-bar button")); await sleep(30);
  console.log("after closing full screen, mode still on, button synced:", tankEl.classList.contains("feeding-mode"), fb.textContent); click(fb); await sleep(10);
  w.eval("window.matchMedia = () => ({ matches: true }); renderTank()");
  const rb = d.querySelector("#tank-body .feed-btn"); console.log("reduced motion: feeding button disabled with a reason:", rb.disabled, "|", rb.textContent);
  w.eval("window.matchMedia = () => ({ matches: false })");
  w.eval("catchesBySpot = {}"); console.log("empty tanks, first catch:", chk("Snook", 3, 20));
  console.log("DONE");
} catch (e) { console.log("TEST ERROR", e && e.stack); } process.exit(0); })();
