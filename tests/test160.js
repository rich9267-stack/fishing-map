// 📊 Leaderboards tab (plans/ui-review.md item 3B, js/12 lbList): one card per live / starting-soon race, top 3, your place, chips, Join. Head copied from test155.
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
const NOW = Date.now(), H = 3600000;
const T = (id, kind, title, sH, eH, boards, extra = {}) => ({ id, kind, title, description: null, created_by: "other", starts_at: new Date(NOW + sH * H).toISOString(), ends_at: new Date(NOW + eH * H).toISOString(), boards, species: null, require_photo: true, require_length: true, geo_lat: null, geo_lng: null, geo_radius_mi: null, geo_label: null, cancelled_at: null, team_mode: "singles", ...extra });
let TOURS = [
  T("tA", "official", "Fall Snook Classic", -5, 48, ["length", "weight"]),
  T("tB", "official", "Pier Rat Open", -1, 5, ["length"]),
  T("tC", "official", "Weekend Bass Bash", 24, 72, ["length", "fish"]),
  T("tD", "official", "Old Ended One", -90, -60, ["length"]),
  T("tE", "official", "Cancelled Cup", -2, 20, ["length"], { cancelled_at: new Date(NOW - H).toISOString() }),
  T("tF", "friends", "Keys weekend showdown", -2, 20, ["length"]),
  T("tG", "friends", "Invite Only Fun", -2, 20, ["length"]),
  T("tT", "official", "Team Tarpon Tussle", -3, 30, ["length"], { team_mode: "teams" }),
  T("tX", "official", "Both Ways Derby", -3, 10, ["length"], { team_mode: "both", host_page_id: "hp1", host_page_name: "Bait Shop" })
];
for (let i = 0; i < 9; i++) TOURS.push(T("tz" + i, "official", "Filler " + i, -1, 60 + i, ["length"]));
let TMEM = [
  { tournament_id: "tA", user_id: "u-rich", status: "joined" }, { tournament_id: "tA", user_id: "other", status: "joined" }, { tournament_id: "tA", user_id: "u3", status: "joined" },
  { tournament_id: "tC", user_id: "other", status: "joined" },
  { tournament_id: "tF", user_id: "u-rich", status: "joined" }, { tournament_id: "tF", user_id: "other", status: "joined" },
  { tournament_id: "tG", user_id: "u-rich", status: "invited" },
  { tournament_id: "tT", user_id: "u-rich", status: "joined" }
];
const SR = (user_id, board, value, h) => ({ user_id, board, value, species: "Snook", caught_at: new Date(NOW - h * H).toISOString(), catch_id: "x" + h });
const STANDS = {
  tA: [SR("u4", "length", 29, 1), SR("other", "length", 34, 3), SR("u3", "length", 34, 2), SR("u-rich", "length", 25, 4), SR("u4", "weight", 10, 1), SR("u-rich", "weight", 8, 2)],
  tF: [SR("other", "length", 22, 1)],
  tX: [SR("u3", "length", 31, 1)]
};
const TEAMB = { tT: [{ group_id: "g2", name: "Reef Dogs", board: "length", value: 35, joined_n: 2, total_n: 3 }, { group_id: "g1", name: "Inlet Rats", board: "length", value: 30, joined_n: 1, total_n: 4 }],
  tX: [{ group_id: "g3", name: "Dock Hands", board: "length", value: 31, joined_n: 1, total_n: 2 }] };
let running = 0, maxRunning = 0;
const IOS = [];
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
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {}; w.scrollTo = () => {};
  w.IntersectionObserver = class { constructor(cb) { this.cb = cb; this.n = []; IOS.push(this); } observe(n) { this.n.push(n); } unobserve(n) { this.n = this.n.filter(x => x !== n); } disconnect() { this.n = []; } fire() { this.cb(this.n.map(target => ({ target, isIntersecting: true }))); } };
  w.__db = { inserts: [], upserts: [], sessions: [], deletes: [] };
  const chain = (data, tn) => { const fl = []; const rows = () => Array.isArray(data) ? data.filter(r => fl.every(f => f(r))) : data;
    const p = () => Promise.resolve({ data: rows(), error: null }); const o = {
      eq: (c, v) => { fl.push(r => r[c] === v); return o; }, in: (c, vs) => { fl.push(r => vs.includes(r[c])); return o; },
      is: () => o, or: () => o, ilike: () => o, gte: () => o, order: () => o, select: () => o, limit: () => p(),
      single: () => Promise.resolve({ data: { id: "new-" + Math.random().toString(36).slice(2) }, error: null }),
      then: (x, y) => p().then(x, y),
      maybeSingle: () => tn === "members" ? Promise.resolve(MEMBER()) : p().then(r => ({ data: (r.data || [])[0] || null, error: null })) }; return o; };
  const chainT = (t, d) => chain(d, t);
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "rich9267@gmail.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
    rpc: async (fn, a) => { RPCS.push([fn, a]); if (fn === 'tournament_standings' || fn === 'tournament_team_board') { running++; maxRunning = Math.max(maxRunning, running); await new Promise(r => setTimeout(r, 30)); running--; return { data: ((fn === 'tournament_standings' ? STANDS : TEAMB)[a.p_id]) || [], error: null }; } if (fn === 'tournament_my_catches') return { data: MYC, error: null }; if (fn === 'create_tournament') { TOURS.push({ id: 't9', kind: a.p_kind, title: a.p_title, description: a.p_desc, created_by: 'u-rich', starts_at: a.p_starts, ends_at: a.p_ends, boards: a.p_boards, species: a.p_species || null, require_photo: a.p_photo, require_length: a.p_length, geo_lat: a.p_lat, geo_lng: a.p_lng, geo_radius_mi: a.p_radius, geo_label: a.p_geo_label, cancelled_at: null }); TMEM.push({ tournament_id: 't9', user_id: 'u-rich', status: 'joined' }); return { data: 't9', error: null }; } if (fn === 'join_tournament') { const m = TMEM.find(x => x.tournament_id === a.p_id && x.user_id === 'u-rich'); if (m) m.status = 'joined'; else TMEM.push({ tournament_id: a.p_id, user_id: 'u-rich', status: 'joined' }); return { error: null }; } if (fn === 'leave_tournament') { const m = TMEM.find(x => x.tournament_id === a.p_id && x.user_id === 'u-rich'); if (m) m.status = 'left'; return { error: null }; } if (fn === 'cancel_tournament') { TOURS.find(x => x.id === a.p_id).cancelled_at = new Date().toISOString(); return { error: null }; } if (fn === 'block_user') BLOCKS.push({ blocker: 'u-rich', blocked: a.p_user }); if (fn === 'mark_read') MSGS.forEach(m => { if (m.sender === a.p_other && m.recipient === 'u-rich') m.read_at = new Date().toISOString(); }); if (fn === 'request_access') { status = 'pending'; } if (fn === 'review_access') PEND = PEND.map(m => m.email === a.p_email ? { ...m, status: a.p_approve ? 'approved' : 'blocked' } : m); return fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }; }, storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    from: t => ({ select: () => chainT(t, t === "members" ? PEND : t === "messages" ? MSGS : t === "blocks" ? BLOCKS : t === "reports" ? REPORTS :  (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES.concat(PUBC) : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'str9',handle:'badguy',display_name:'Bad Guy'},{user_id:'str1',handle:'stan',display_name:'Stan the Man',home_area:'Stuart',bio:'Tarpon nut'},{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "tournaments" ? TOURS : t === "tournament_members" ? TMEM : t === "group_members" ? [{ group_id: "g1", user_id: "u-rich", status: "joined" }, { group_id: "g9", user_id: "u-rich", status: "invited" }] : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { const o = { eq: (c, v) => { w.__db.deletes.push(t + ":" + c + "=" + v); if (t === "blocks") BLOCKS = BLOCKS.filter(b => b.blocked !== v); return o; }, then: (x, y) => Promise.resolve({ error: null }).then(x, y) }; return o; },
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
  let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
  const $ = id => d.getElementById(id), tx = n => n ? n.textContent.replace(/\s+/g, " ").trim() : "";
  $("tab-feed").click(); await wait(300);
  $("feed-mode-contests").click(); await wait(400);
  const tabs = [...d.querySelectorAll("#ct-body .fchips")[0].querySelectorAll(".fchip")].map(b => b.textContent);
  ok(tabs.join("|") === "🎣 Contests|🏆 Tournaments|📊 Leaderboards", "tab order: " + tabs.join(" · "));
  $("ct-tab-boards").click(); await wait(400);
  ok($("ct-tab-boards").classList.contains("on"), "Leaderboards tab is picked");
  const labels = [...d.querySelectorAll("#ct-body > .label")].map(x => x.textContent);
  ok(labels.join("|") === "🏆 Tournaments|🎣 Your contests", "two groups: " + labels.join(" · "));
  const ids = [...d.querySelectorAll("#ct-body .lb-card")].map(c => c.id.slice(3));
  ok(ids.slice(0, 5).join(",") === "tT,tA,tB,tX,tz0" && ids[13] === "tC" && ids[14] === "tF" && ids.length === 15, "order: yours first, then live ending soonest, then starting soon; friend contest in its own group: " + ids.join(","));
  ok(!ids.includes("tD") && !ids.includes("tE"), "ended and cancelled ones are not here");
  ok(!ids.includes("tG"), "a friend contest you were only invited to is not here");
  ok(maxRunning <= 10, "at most 10 boards load at once: " + maxRunning);
  const card = id => $("lb-" + id);
  // live card I'm in, with ties
  const A = card("tA");
  ok(/🔴 LIVE/.test(tx(A.querySelector(".feed-top"))) && /^Ends .* · 3 in$/.test(tx(A.querySelector(".feed-top + .spot-meta"))), "live card: LIVE + 'Ends … · 3 in'");
  const top = [...A.querySelectorAll(".lb-top li")].map(tx);
  ok(top.join(" | ") === "1 Mike 34″ | 1 Sam 34″ | 3 Zed 29″", "top 3 with a tie sharing 1st: " + top.join(" | "));
  ok(tx(A.querySelector(".lb-you")) === "▶ You: 4th · 25″", "your place: " + tx(A.querySelector(".lb-you")));
  ok(!A.querySelector(".lb-join"), "no Join on a card you're in");
  const chips = [...A.querySelectorAll("[data-board]")];
  ok(chips.length === 2 && chips[0].getAttribute("aria-checked") === "true" && chips[0].classList.contains("on"), "board chips, the first board picked");
  chips[1].click(); await wait(50);
  ok(/^1 Zed 10/.test(tx(A.querySelector(".lb-top li"))) && /^▶ You: 2nd · 8/.test(tx(A.querySelector(".lb-you"))), "Heaviest chip swaps this card's board: " + tx(A.querySelector(".lb-top")));
  ok(d.activeElement === chips[1] && chips[1].getAttribute("aria-checked") === "true", "focus stays on the picked chip");
  ok(card("tB").querySelectorAll(".lb-top").length === 0, "the chip changed only that card");
  // live, not in, nobody scored
  const B = card("tB");
  ok(/No qualifying catches yet/.test(tx(B)) && /You're not in this one/.test(tx(B)) && !!B.querySelector(".lb-join"), "not-joined card: empty board + Join");
  // teams only
  const Tt = card("tT");
  ok(/👥 Teams · Longest fish/.test(tx(Tt)) && [...Tt.querySelectorAll(".lb-top li")].map(tx).join(" | ") === "1 Reef Dogs 35″ | 2 Inlet Rats 30″", "teams-only: team top 3: " + tx(Tt.querySelector(".lb-top")));
  ok(tx(Tt.querySelector(".lb-you")) === "▶ Your team Inlet Rats: 2nd · 30″" && Tt.querySelector(".lb-top li:nth-child(2)").classList.contains("me"), "teams-only: your team's place");
  ok(RPCS.some(r => r[0] === "tournament_team_board" && r[1].p_id === "tT") && !RPCS.some(r => r[0] === "tournament_standings" && r[1].p_id === "tT"), "teams-only reads only the team board");
  // both: individual board + a Teams chip
  const X = card("tX");
  const tchip = X.querySelector("[data-teams]");
  ok(!!tchip && !X.querySelector("[data-board]") && /1 Sam 31″/.test(tx(X)), "'both': individual board with a 👥 Teams chip (one board → no board chips)");
  tchip.click(); await wait(120);
  ok(tchip.getAttribute("aria-pressed") === "true" && /1 Dock Hands 31″/.test(tx(X)), "Teams chip shows the team board");
  tchip.click(); await wait(20);
  ok(/1 Sam 31″/.test(tx(X)), "tap again: back to individuals");
  // starting soon
  const C = card("tC");
  ok(/Starts /.test(tx(C.querySelector(".feed-top"))) && /1 joined · Longest fish, Most fish · no scores yet/.test(tx(C)) && !C.querySelector(".lb-top") && !C.querySelector("[data-board]"), "starting-soon card: no scores yet, no top 3, no chips");
  ok(!!C.querySelector(".lb-join"), "starting-soon card you're not in has Join");
  // friend contest
  ok(/1 Mike 22″/.test(tx(card("tF"))) || /Open to see the board/.test(tx(card("tF"))), "friend contest card");
  // lazy loading past 10
  ok(/Open to see the board/.test(tx(card("tz8"))) && /Open to see the board/.test(tx(card("tF"))), "cards past the first 10 wait until scrolled to");
  const io = IOS.find(o => o.n.length); ok(!!io && io.n.length === 4, "4 cards watched for scrolling");
  io.fire(); await wait(150);
  ok(/1 Mike 22″/.test(tx(card("tF"))) && /You: |You're in/.test(tx(card("tF"))), "scrolled to: the friend contest's board loads");
  ok(/No qualifying catches yet/.test(tx(card("tz8"))), "scrolled to: filler board loads");
  ok(maxRunning <= 10, "still at most 10 at once: " + maxRunning);
  // Join on a card = the page's Join
  const before = RPCS.length;
  card("tB").querySelector(".lb-join").click(); await wait(400);
  ok(RPCS.slice(before).some(r => r[0] === "join_tournament" && r[1].p_id === "tB"), "Join calls join_tournament, same as the page");
  ok($("ct-tab-boards").classList.contains("on") && !card("tB").querySelector(".lb-join") && /▶ You're in, no catch counted yet/.test(tx(card("tB"))), "after Join: still on Leaderboards, card says you're in");
  ok([...d.querySelectorAll("#ct-body .lb-card")].map(c => c.id.slice(3)).slice(0, 3).join(",") === "tB,tT,tA", "joined card moves up with yours (ends soonest first)");
  // tap a card → its page; Back → Leaderboards
  card("tA").querySelector(".spot-meta").click(); await wait(400);
  ok(!!$("ctd-board") && /Fall Snook Classic/.test(tx($("ct-body"))), "tapping a card opens the tournament page");
  $("ctd-back").click(); await wait(50);
  ok($("ct-tab-boards").classList.contains("on") && !!card("tA"), "Back returns to Leaderboards");
  // empty
  TOURS = TOURS.filter(t => t.id === "tD" || t.id === "tE");
  w.eval("openContests()"); await wait(400);
  ok(/No live tournaments or contests right now\./.test(tx($("ct-body"))) && !!$("lb-see") && !!$("lb-start"), "empty tab: message + See tournaments + Start a contest");
  $("lb-see").click(); await wait(50);
  ok($("ct-tab-tournaments").classList.contains("on"), "See tournaments opens the Tournaments tab");
  $("ct-tab-boards").click(); await wait(50);
  $("lb-start").click(); await wait(100);
  ok(!!d.querySelector("#ctf-title") && /Start a contest/.test(tx($("ct-body"))), "Start a contest opens the contest form");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
