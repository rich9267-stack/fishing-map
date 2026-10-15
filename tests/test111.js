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
const HP_MINE = { id: "hm1", kind: "club", name: "Pompano Night Anglers", about: "Night fishing crew", area: "Pompano Beach", accent: null, avatar_path: null, status: "approved", owner: "u-rich", owner_name: "Richard", owner_handle: "richard", is_mine: true };
const HP_PUB1 = { id: "hp1", kind: "club", name: "Broward Fly Club", about: "Fly fishing meetups every month", area: "Fort Lauderdale", accent: null, avatar_path: null, status: "approved", owner: "other", owner_name: "Mike", owner_handle: "mike", is_mine: false };
const HP_PUB2 = { id: "hp2", kind: "business", name: "Hillsboro Bait & Tackle", about: "Live bait daily", area: "Pompano Beach", accent: null, avatar_path: null, status: "approved", owner: "str1", owner_name: "Stan the Man", owner_handle: "stan", is_mine: false };
const HOST = { business_allowed: 1, business_used: 1, pages: [HP_MINE, HP_PUB1, HP_PUB2] };
const HP_ADMIN = [
  { id: "ha1", kind: "business", name: "Sunrise Charters", about: "Half-day trips", area: "Deerfield", status: "pending", note: "I run charters", owner: "u3", owner_name: "Sam", owner_handle: "sam", business_allowed: 1, business_used: 1, created_at: new Date().toISOString() },
  { id: "hp2", kind: "business", name: "Hillsboro Bait & Tackle", about: "Live bait daily", area: "Pompano Beach", status: "approved", owner: "str1", owner_name: "Stan the Man", owner_handle: "stan", business_allowed: 1, business_used: 1, created_at: new Date().toISOString() }];
const HP_FAIL = {};
let NEWN = 0;
const iso = h => new Date(Date.now() + h * 3600000).toISOString();
let TOURS = [
  { id: "t-admin", kind: "official", title: "Admin Snook Slam", starts_at: iso(-5), ends_at: iso(48), boards: ["length"], created_by: "str1", require_photo: true, require_length: true, series_id: null, team_mode: "singles" },
  { id: "t-other", kind: "official", title: "Fly Club Cup", starts_at: iso(-5), ends_at: iso(48), boards: ["fish"], created_by: "other", require_photo: true, require_length: true, series_id: null, team_mode: "singles", host_page_id: "hp1", host_page_name: "Broward Fly Club" }
];
let TMEMBERS = [{ tournament_id: "t-other", user_id: "u3", status: "joined", joined_at: iso(-3) }];
const hostRpc = (fn, a) => {
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
  if (fn === "host_pages_admin") return { data: HP_ADMIN, error: null };
  if (["request_host_page", "review_host_page", "set_business_allowance", "update_host_page", "close_host_page"].includes(fn)) return { data: "ok", error: null };
  return null;
};
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
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
    rpc: async (fn, a) => { RPCS.push([fn, a]); const hpr = hostRpc(fn, a); if (hpr) return hpr; if (fn === 'mark_read') MSGS.forEach(m => { if (m.sender === a.p_other && m.recipient === 'u-rich') m.read_at = new Date().toISOString(); }); if (fn === 'request_access') { status = 'pending'; } if (fn === 'review_access') PEND = PEND.map(m => m.email === a.p_email ? { ...m, status: a.p_approve ? 'approved' : 'blocked' } : m); return fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }; }, storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    from: t => ({ select: () => chainT(t, t === "tournaments" ? TOURS : t === "tournament_members" ? TMEMBERS : t === "host_pages" ? [{ id: "ha1", status: "pending" }] : t === "members" ? PEND : t === "messages" ? MSGS : (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES.concat(PUBC) : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'str1',handle:'stan',display_name:'Stan the Man',home_area:'Stuart',bio:'Tarpon nut'},{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
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
  const rp = fn => RPCS.filter(r => r[0] === fn);
  w.confirm = () => true;
  const ADMIN = ST === "admin";
  const chips = () => [...d.querySelectorAll("#ct-hostas .fchip")];
  const chip = re => chips().find(c => re.test(c.textContent));
  const KEY = "fm-host-as:" + ME;

  // ---- open 🏁 Compete → 🏆 Tournaments: the "Hosting as" switch appears once my approved page is known
  w.openTournamentsTab(); await wait(900);
  check("Tournaments tab is showing", !!$("ct-tab-tournaments") && $("ct-tab-tournaments").classList.contains("on"));
  check("Hosting-as switch shown for a person with an approved page", chips().length === 2 && /^Me$/.test(chips()[0].textContent) && /Pompano Night Anglers/.test(chips()[1].textContent));
  check("page list loaded through host_pages_list", rp("host_pages_list").length >= 1);
  check("starts acting as me", chips()[0].getAttribute("aria-pressed") === "true" && chips()[1].getAttribute("aria-pressed") === "false");
  check(ADMIN ? "admin still sees + Create a tournament as himself" : "non-admin has no create button until a page is picked", ADMIN ? (!!$("ct-new") && !/ as /.test($("ct-new").textContent)) : !$("ct-new"));
  check("tournament cards show who runs them", /Broward Fly Club/.test($("ct-body").textContent));

  // ---- switch into the page
  chip(/Pompano Night Anglers/).click(); await wait(200);
  check("choice remembered on this phone", w.localStorage.getItem(KEY) === "hm1");
  check("page chip is now pressed", chip(/Pompano/).getAttribute("aria-pressed") === "true" && chip(/^Me$/).getAttribute("aria-pressed") === "false");
  check("create button now names the page", !!$("ct-new") && /as Pompano Night Anglers/.test($("ct-new").textContent));
  check("my page's own section is shown (empty for now)", /Run by Pompano Night Anglers/.test($("ct-body").textContent));

  // ---- create a one-off tournament as the page
  $("ct-new").click(); await wait(300);
  check("form says it is run by the page and that the owner isn't entered", !!$("ctf-hostnote") && /Pompano Night Anglers/.test($("ctf-hostnote").textContent) && /aren't entered automatically/.test($("ctf-hostnote").textContent));
  check("form is the tournament form (photo + length forced, no friend invites)", /Create a tournament/.test($("ct-body").textContent) && $("ctf-photo").checked && $("ctf-photo").disabled && $("ctf-inv-wrap").hidden === true);
  $("ctf-title").value = "Night Snook Showdown";
  $("ctf-save").click(); await wait(700);
  const c1 = rp("create_host_tournament")[0];
  check("create_host_tournament called with the page, title, times and board", !!c1 && c1[1].p_page === "hm1" && c1[1].p_title === "Night Snook Showdown" && !!c1[1].p_starts && !!c1[1].p_ends && c1[1].p_boards.join() === "length" && !("p_kind" in c1[1]));
  check("the old admin function was NOT used", rp("create_tournament").length === 0);
  check("lands on the new tournament's page", /Night Snook Showdown/.test($("ct-body").textContent) && !!$("ctd-back"));
  const runby = $("ctd-runby");
  check("detail says Run by the page (a link)", !!runby && /Pompano Night Anglers/.test(runby.textContent) && /run by/.test($("ct-body").textContent));
  check("organiser sees the entrants list with names", !!$("ctd-entrants") && /Entrants \(2\)/.test($("ctd-entrants").textContent) && /Mike/.test($("ctd-entrants").textContent) && /Sam/.test($("ctd-entrants").textContent));
  check("organiser is not auto-entered (no Leave button, Join offered)", !$("ctd-leave") && !!$("ctd-join"));
  check("organiser can cancel", !!$("ctd-cancel"));

  // ---- "Run by" opens the page, and closing it does NOT jump to the Me page
  runby.click(); await wait(500);
  check("Run by opened that page's screen", $("hp-page").hidden === false && /Pompano Night Anglers/.test($("hp-body").textContent) && !!$("hp-save"));
  check("page screen offers 'Run tournaments as this page'", !!$("hp-run-as"));
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(100); // detail -> list
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(150); // list -> close
  check("closing returns to the tournament, not the Me page", $("hp-page").hidden === true && $("me-card").hidden === true && !!$("ctd-back"));

  // ---- cancel it
  $("ctd-cancel").click(); await wait(500);
  check("cancel_tournament called for the new tournament", rp("cancel_tournament").length === 1 && rp("cancel_tournament")[0][1].p_id === "t-new-1");

  // ---- repeating tournament as the page
  $("ctd-back").click(); await wait(200);
  $("ct-new").click(); await wait(300);
  $("ctf-title").value = "Monthly Slam"; $("ctf-repeat").value = "monthly"; $("ctf-repeat").dispatchEvent(new w.Event("change"));
  check("repeat note mentions the tournaments tab (not 'everyone is told')", /Players find each new round/.test($("ctf-repnote").textContent) && !/Everyone is told/.test($("ctf-repnote").textContent));
  d.querySelector('#ctf-months .fchip[data-m="12"]').classList.remove("on");
  $("ctf-save").click(); await wait(700);
  const c2 = rp("create_host_tournament_series")[0];
  check("create_host_tournament_series called with page, cadence and 11 months", !!c2 && c2[1].p_page === "hm1" && c2[1].p_cadence === "monthly" && c2[1].p_months.length === 11 && !c2[1].p_months.includes(12) && c2[1].p_title === "Monthly Slam");
  check("repeating one opens its page", /Monthly Slam/.test($("ct-body").textContent));
  $("ctd-back").click(); await wait(200);

  // ---- a database refusal is shown, not swallowed
  HP_FAIL.create_host_tournament = "This page already has 5 tournaments open. Let one finish or cancel one first.";
  $("ct-new").click(); await wait(300); $("ctf-title").value = "Sixth one"; $("ctf-save").click(); await wait(500);
  check("refusal shown in the form", /already has 5 tournaments open/.test($("ctf-msg").textContent) && !!$("ctf-save"));
  delete HP_FAIL.create_host_tournament;
  $("ctf-back").click(); await wait(200);

  // ---- someone else's page tournament: no entrants list for a non-admin
  [...d.querySelectorAll("#ct-body .feed-item")].find(r => /Fly Club Cup/.test(r.textContent)).click(); await wait(500);
  check("someone else's page tournament shows its page name", /Broward Fly Club/.test($("ctd-runby").textContent));
  check(ADMIN ? "admin sees the entrants of any page tournament" : "non-admin does NOT see another page's entrants", ADMIN ? !!$("ctd-entrants") : !$("ctd-entrants"));
  check("nobody but creator/admin gets a cancel button", ADMIN ? !!$("ctd-cancel") : !$("ctd-cancel"));
  $("ctd-back").click(); await wait(200);

  // ---- "Run tournaments as this page" from the page screen
  chip(/^Me$/).click(); await wait(200);
  check("switching back to me removes the page marker", w.localStorage.getItem(KEY) === null && chip(/^Me$/).getAttribute("aria-pressed") === "true");
  check(ADMIN ? "admin acting as himself creates normal tournaments" : "non-admin acting as me can't create", ADMIN ? (!!$("ct-new") && /^\+ Create a tournament$/.test($("ct-new").textContent)) : !$("ct-new"));
  w.openHostPages(); await wait(500);
  [...d.querySelectorAll("#hp-body .hp-row")].find(r => /Pompano Night Anglers/.test(r.textContent)).click(); await wait(200);
  $("hp-run-as").click(); await wait(800);
  check("button switched into the page and opened the Tournaments tab", $("hp-page").hidden === true && w.localStorage.getItem(KEY) === "hm1" && !!$("ct-tab-tournaments") && $("ct-tab-tournaments").classList.contains("on"));
  check("page chip pressed after jumping in", !!chip(/Pompano/) && chip(/Pompano/).getAttribute("aria-pressed") === "true");

  if (ADMIN) { // admin regression: as himself the original function is still used
    chip(/^Me$/).click(); await wait(200);
    $("ct-new").click(); await wait(300);
    check("admin form has no page note", !$("ctf-hostnote") && /Everyone is told|Create a tournament/.test($("ct-body").textContent));
    $("ctf-title").value = "Admin Open"; $("ctf-save").click(); await wait(600);
    const a1 = rp("create_tournament")[0];
    check("admin as himself still calls create_tournament (official)", !!a1 && a1[1].p_kind === "official" && a1[1].p_title === "Admin Open");
  }
  process.exit(bad);
})();
