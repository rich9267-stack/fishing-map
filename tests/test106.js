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
const calls = [];
const ST = process.env.ST || "admin";
let status = ST;
const MEMBER = () => ST === "admin" ? { data: { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved" }, error: null }
  : ST === "error" ? { data: null, error: { message: "boom" } } : ST === "none" ? { data: null, error: null } : { data: { email: "x@y.com", display_name: "Newbie", is_admin: false, status: ST }, error: null };
let PEND = [{ email: "new@x.com", display_name: "Newbie", is_admin: false, status: "pending", note: "Rico's cousin", requested_at: new Date().toISOString() },
  { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved" }, { email: "d@x.com", display_name: "Dee", status: "blocked" }];
const RPCS = [];
const mk = (id, spot, species, h, extra = {}) => ({ id, spot_id: spot, species, how_many: 1, caught_at: new Date(Date.now() - h * 3600000).toISOString(), created_by: ME,
  tide_stage: "outgoing", pressure_trend: "falling", moon_phase: "waning crescent", solunar: "minor", wind_mph: 8, water_temp_f: 81, ...extra });
const CATCHES = [mk("c1", "s1", "Snook", 30, { length_in: 30 }), mk("c2", "s1", "Snook", 54, { length_in: 24 }), mk("c3", "s1", "Snook", 78), mk("c4", "s1", "Jack crevalle", 100, { length_in: 28 }),
  mk("c5", "s3", "Mangrove snapper", 30, { length_in: 14 }), mk("c8", "s2", "Peacock bass", 40), mk("c6", "s3", "Mangrove snapper", 50), mk("c7", "s3", "Mangrove snapper", 70)];
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  w.localStorage.setItem("fm-sugg-hidden", JSON.stringify(["node/old1"]));
  w.localStorage.setItem("fm-sugg-want", JSON.stringify([{ key: "node/oldw", name: "Old Wanted Pier", kind: "pier", label: "Pier", trust: "likely", lat: 26.2, lng: -80.1 }]));
  w.__picks = [{ key: "node/dev2", status: "hidden", updated_at: "2026-10-13T10:00:00Z" }, { key: "node/w2", status: "want", name: "Other Phone Spot", kind: "pier", label: "Pier", trust: "public", lat: 26.21, lng: -80.11, updated_at: "2026-10-13T11:00:00Z" }];
  w.__db = { inserts: [], upserts: [], sessions: [], deletes: [] };
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, order: () => o, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new-" + Math.random().toString(36).slice(2) }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve(MEMBER()) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "rich9267@gmail.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
    rpc: async (fn, a) => { RPCS.push([fn, a]); if (fn === 'request_access') { status = 'pending'; } if (fn === 'review_access') PEND = PEND.map(m => m.email === a.p_email ? { ...m, status: a.p_approve ? 'approved' : 'blocked' } : m); return fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }; }, storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    from: t => ({ select: () => chain(t === "catch_ranks" ? (w.__ranks || []) : t === "members" ? PEND : t === "suggestion_picks" ? (w.__picks || []) : (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { w.__db.deletes.push(t); return chain(null); },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: (row, opts) => { w.__db.upserts.push({ t, row, opts });
        if (t === "suggestion_picks") { if (w.__upErr) return Promise.resolve({ error: { message: "offline" } }); w.__picks = w.__picks || [];
          [].concat(row).forEach(r => { const i = w.__picks.findIndex(x => x.key === r.key); if (i < 0) w.__picks.push({ ...r }); else if (!(opts && opts.ignoreDuplicates)) w.__picks[i] = { ...r }; }); }
        return Promise.resolve({ error: null }); },
      update: row => { w.__db.updates = (w.__db.updates || []).concat([{ t, row }]); return chain(t === 'profiles' ? { user_id: 'u-rich', ...row } : null); } }) }) };
  w.fetch = async url => {
    if (url.includes("Fish_Management_Areas")) {
      w.__fwc = (w.__fwc || 0) + 1;
      if (w.__fwcDown) return { ok: false, json: async () => ({}) };
      const sq = (id, name, county, lat, lng, d = 0.004) => ({ type: "Feature", properties: { OBJECTID: id, NAME: name, COUNTY: county, TYPE: "FMA" },
        geometry: { type: "Polygon", coordinates: [[[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]]] } });
      return { ok: true, json: async () => ({ type: "FeatureCollection", features: [sq(1, "Plantation Heritage Park Lake FMA", "BROWARD", 26.115, -80.236),
        sq(2, "Lake Okeeheelee FMA", "PALM BEACH", 26.655, -80.12, 0.01), sq(3, "Tropical Park Lake FMA", "MIAMI-DADE", 25.735, -80.33), sq(4, "Lake Talquin FMA", "LEON", 30.43, -84.55, 0.05), sq(6, "Caloosa Park Lake FMA", "PALM BEACH", 26.52, -80.10),
        sq(5, "Jupiter Pond FMA", "PALM BEACH", 26.9452, -80.0702, 0.001)] }) };
    }
    if (url.includes("Freshwater_Fish_Attractors")) {
      w.__att = (w.__att || 0) + 1;
      return { ok: true, json: async () => ({ features: [{ attributes: { OBJECTID_1: 9, NAME: "Okeeheelee Brush Pile 1", WATERBODY: "LAKE OKEEHEELEE", MATERIAL: "Christmas trees", COUNTY: "PALM BEACH", BLT_REFURB: "2021", Type: "Brush" }, geometry: { x: -80.121, y: 26.656 } }] }) };
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
  await wait(1000);
  const ev = c => w.eval(c);
  let good = true; const check = (name, ok) => { console.log(name + ":", ok ? "yes" : "NO"); if (!ok) good = false; };
  const $ = id => d.getElementById(id), click = e => e.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const shown = id => w.getComputedStyle($(id)).display !== "none";
  const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event("input", { bubbles: true })); };
  const ups = () => w.__db.upserts.filter(u => u.t === "suggestion_picks");
  const rowsFlat = () => ups().flatMap(u => [].concat(u.row));
  const S = [{ key: "node/1", name: "Pompano Pier", kind: "pier", label: "Pier", trust: "public", lat: 26.24, lng: -80.09 },
    { key: "node/2", name: "Cove Jetty", kind: "jetty", label: "Jetty", trust: "likely", lat: 26.26, lng: -80.07 },
    { key: "node/3", name: "Quiet Dock", kind: "dock", label: "Dock", trust: "likely", lat: 26.28, lng: -80.05 }];
  const wantKeys = () => ev(`suggWant.map(x => x.key)`).slice().sort().join(",");
  // ---- first time on this phone: what it already remembered goes up (without overwriting), and the other device's picks come down ----
  check("old phone-only picks were sent up, never overwriting", ups().some(u => u.opts && u.opts.ignoreDuplicates && [].concat(u.row).some(r => r.key === "node/old1" && r.status === "hidden") && [].concat(u.row).some(r => r.key === "node/oldw" && r.status === "want")));
  check("this phone's copy is now tied to my account", w.localStorage.getItem("fm-sugg-owner") === ev(`me.id`));
  check("not-interested from the other device arrived", ev(`suggHidden.has("node/dev2")`) && ev(`suggHidden.has("node/old1")`));
  check("want-to-try from the other device arrived with its details", wantKeys() === "node/oldw,node/w2" && ev(`suggWant.find(x => x.key === "node/w2").name`) === "Other Phone Spot");
  // ---- tapping saves to the database ----
  ev(`suggestions = ${JSON.stringify(S)}; renderSuggestions();`);
  const rows = () => [...$("sugg-list").querySelectorAll(".sugg-row")];
  const openRow = async name => { const b = rows().find(x => x.textContent.includes(name)); if (b && b.getAttribute("aria-expanded") !== "true") { click(b); await wait(30); } };
  const act = re => click([...$("sugg-list").querySelectorAll(".sugg-acts button")].find(b => re.test(b.textContent)));
  const before = rowsFlat().length;
  await openRow("Pompano Pier"); act(/Want to try/); await wait(60);
  let last = rowsFlat().slice(before).find(r => r.key === "node/1");
  check("☆ Want to try is saved (status want + details)", !!last && last.status === "want" && last.name === "Pompano Pier" && last.lat === 26.24);
  await openRow("Pompano Pier"); act(/On my want-to-try list/); await wait(60);
  last = rowsFlat().filter(r => r.key === "node/1").pop();
  check("taking it off the list is saved as none", last.status === "none" && last.name === null && !ev(`isWanted({key:"node/1"})`));
  await openRow("Pompano Pier"); act(/Not interested/); await wait(60);
  last = rowsFlat().filter(r => r.key === "node/1").pop();
  check("✕ Not interested is saved as hidden", last.status === "hidden" && ev(`suggHidden.has("node/1")`));
  check("every row sent belongs to me and nobody else", rowsFlat().every(r => r.user_id === ev(`me.id`)));
  check("the database copy matches", w.__picks.find(x => x.key === "node/1").status === "hidden");
  // ---- offline: change waits in the queue, then is sent later ----
  w.__upErr = true;
  await openRow("Cove Jetty"); act(/Not interested/); await wait(60);
  check("offline: hidden here and waiting in the queue", ev(`suggHidden.has("node/2")`) && JSON.parse(w.localStorage.getItem("fm-sugg-queue") || "[]").some(q => q.key === "node/2" && q.status === "hidden"));
  ev(`loadSuggPicks()`); await wait(80);
  check("offline: a refresh does not lose the waiting change", ev(`suggHidden.has("node/2")`));
  w.__upErr = false; ev(`loadSuggPicks()`); await wait(120);
  check("back online: queue is sent and emptied", JSON.parse(w.localStorage.getItem("fm-sugg-queue") || "[]").length === 0 && w.__picks.find(x => x.key === "node/2").status === "hidden");
  // ---- another device changed things: a refresh picks it up ----
  w.__picks.push({ key: "node/3", status: "want", name: "Quiet Dock", kind: "dock", label: "Dock", trust: "likely", lat: 26.28, lng: -80.05, updated_at: new Date().toISOString() });
  w.__picks.find(x => x.key === "node/dev2").status = "none";
  ev(`loadSuggPicks()`); await wait(120);
  check("changes from another device show up after a refresh", ev(`isWanted({key:"node/3"})`) && !ev(`suggHidden.has("node/dev2")`));
  // ---- someone else signs in on this same phone: their lists are not mixed in ----
  w.localStorage.setItem("fm-sugg-owner", "someone-else"); ev(`suggHidden.add("node/leak")`);
  const n1 = rowsFlat().length;
  ev(`loadSuggPicks()`); await wait(120);
  check("a different account's phone copy is not sent up or shown", !rowsFlat().slice(n1).some(r => r.key === "node/leak") && !ev(`suggHidden.has("node/leak")`) && w.localStorage.getItem("fm-sugg-owner") === ev(`me.id`));
  check("sw.js still lists every script (no new file needed)", require("fs").readFileSync(require("path").join(__dirname, "..", "sw.js"), "utf8").includes("./js/09-map-forecast.js"));
  // ---- names are tappable on the species page records and photo captions ----
  const mine = ev(`me.id`);
  ev(`catchesBySpot = { s1: [{ id: "cx1", spot_id: "s1", species: "Snook", how_many: 1, length_in: 41, weight_lb: 22, caught_at: new Date().toISOString(), created_by: "u-mike", caught_by: "Mike" }, { id: "cx2", spot_id: "s1", species: "Snook", how_many: 1, length_in: 20, caught_at: new Date().toISOString(), created_by: me.id }] };
    profileNames = typeof profileNames === "undefined" ? undefined : profileNames;`);
  ev(`openSpecies("Snook")`); await wait(100);
  const sheet = d.getElementById("sp-sheet");
  const lines = sheet ? [...sheet.querySelectorAll(".sp-list li")].filter(li => /Longest|Heaviest|Strongest/.test(li.textContent)) : [];
  console.log("records:", lines.map(l => l.textContent).join(" | "));
  check("species page shows the records", lines.length > 0);
  check("a friend's name in the records is a tappable button", lines.some(li => li.querySelector("button.who-link")));
  const btn = sheet && sheet.querySelector(".sp-list button.who-link");
  if (btn) { ev(`window.__prof = null; showProfile = id => { window.__prof = id; }`); click(btn); await wait(50); }
  check("tapping it closes the page and opens that person's profile", !d.getElementById("sp-sheet") && w.__prof === "u-mike");
  ev(`spots = (spots || []).concat([]); photoUrls["p/x.jpg"] = "x.jpg"; openViewer({ id: "ph1", path: "p/x.jpg", spot_id: "s1", catch_id: "cx1", created_at: new Date().toISOString(), created_by: "u-mike" })`);
  const cap = $("viewer-cap");
  console.log("caption:", cap.textContent);
  check("photo caption still reads the same", /Snook/.test(cap.textContent) && /by /.test(cap.textContent));
  const cb = cap.querySelector("button.who-link");
  check("the name in the photo caption is tappable", !!cb);
  ev(`window.__prof = null`); if (cb) click(cb); await wait(30);
  check("tapping it closes the photo and opens the profile", $("viewer").hidden && w.__prof === "u-mike");
  ev(`openViewer({ id: "ph2", path: "p/x.jpg", spot_id: "s1", catch_id: "cx2", created_at: new Date().toISOString(), created_by: me.id })`);
  check("my own photo caption shows 'by you' as plain text", /by you/.test($("viewer-cap").textContent) && !$("viewer-cap").querySelector("button.who-link"));
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
