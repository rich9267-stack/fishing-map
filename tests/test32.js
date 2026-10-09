process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = fs.readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8").replace(/<script src=[^>]+><\/script>\n?/g, "").replace(/<link [^>]+>/, "");
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
const mk = (id, spot, species, h, extra = {}) => ({ id, spot_id: spot, species, how_many: 1, caught_at: new Date(Date.now() - h * 3600000).toISOString(), created_by: ME,
  tide_stage: "outgoing", pressure_trend: "falling", moon_phase: "waning crescent", solunar: "minor", wind_mph: 8, water_temp_f: 81, ...extra });
const CATCHES = [mk("c1", "s1", "Snook", 30), mk("c2", "s1", "Snook", 54), mk("c3", "s1", "Snook", 78), mk("c4", "s1", "Jack crevalle", 100),
  mk("c5", "s3", "Mangrove snapper", 30), mk("c8", "s2", "Peacock bass", 40), mk("c6", "s3", "Mangrove snapper", 50), mk("c7", "s3", "Mangrove snapper", 70)];
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  w.__db = { inserts: [], upserts: [], sessions: [], deletes: [] };
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, gte: () => o, order: () => o, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new-" + Math.random().toString(36).slice(2) }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve({ data: { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved" }, error: null }) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "rich9267@gmail.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
    rpc: async fn => fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }, storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    from: t => ({ select: () => chain((t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES : t === "sessions" ? w.__db.sessions : t === "trip_plans" ? [{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { w.__db.deletes.push(t); return chain(null); },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
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
  await wait(800);
  await w.eval("new Promise(r => setTimeout(r, 300))");
  console.log("who:", d.getElementById("who").textContent);
  const card = n => [...d.querySelectorAll(".spot")].find(e => e.querySelector(".spot-name").textContent.includes(n));
  console.log("Mike Public:", card("Mike Public").querySelector(".spot-name").textContent, "|", [...card("Mike Public").querySelectorAll(".chip")].map(c => c.textContent).join(" | "));
  console.log("Hillsboro chips:", [...card("Hillsboro").querySelectorAll(".chip")].map(c => c.textContent).join(" | "));
  // spot form
  w.eval("openForm(true, spots.find(x => x.id === 's1'))");
  console.log("edit form vis:", d.getElementById("f-vis").value, "hide row hidden:", d.getElementById("f-hide-row").hidden);
  d.getElementById("f-vis").value = "private"; d.getElementById("f-vis").dispatchEvent(new w.Event("change"));
  console.log("private -> hide row hidden:", d.getElementById("f-hide-row").hidden);
  d.getElementById("f-vis").value = "public"; d.getElementById("f-vis").dispatchEvent(new w.Event("change")); d.getElementById("f-hide").checked = true;
  d.getElementById("spot-form").dispatchEvent(new w.Event("submit", { cancelable: true })); await w.eval("new Promise(r => setTimeout(r, 200))");
  console.log("spot update:", JSON.stringify((w.__db.updates || []).filter(x => x.t === "spots").map(x => ({ vis: x.row.visibility, priv: x.row.is_private, hide: x.row.hide_exact_from_friends }))));
  w.eval("openForm(true); "); d.getElementById("f-vis").value = "private"; d.getElementById("f-hide").checked = true; d.getElementById("f-name").value = "New"; d.getElementById("f-by").value = "R";
  w.eval("pickedLoc = {lat: 26.2, lng: -80.1}");
  d.getElementById("spot-form").dispatchEvent(new w.Event("submit", { cancelable: true })); await w.eval("new Promise(r => setTimeout(r, 200))");
  console.log("spot insert:", JSON.stringify(w.__db.inserts.filter(x => x.t === "spots").map(x => ({ vis: x.row.visibility, priv: x.row.is_private, hide: x.row.hide_exact_from_friends }))));
  // catch form default
  w.eval("openCatchForm('s1')"); console.log("catch vis default (s1 friends):", d.querySelector("#c-vis").value);
  w.eval("spots.find(x => x.id==='s1').visibility='public'; openCatchForm('s1')"); console.log("catch vis default (public spot):", d.querySelector("#c-vis").value);
  d.querySelector("#c-vis").value = "private"; d.querySelector("#c-species").value = "Snook";
  w.eval("erddapJson = async () => { throw new Error('x'); }; catchForm.dispatchEvent(new Event('submit', { cancelable: true }))");
  for (let i = 0; i < 40 && !w.__db.inserts.some(x => x.t === "catches"); i++) await w.eval("new Promise(r => setTimeout(r, 250))");
  console.log("catch insert vis:", w.__db.inserts.filter(x => x.t === "catches").map(x => x.row.visibility));
  // profile
  d.getElementById("profile-btn").click(); await w.eval("new Promise(r => setTimeout(r, 100))");
  console.log("profile fields:", d.getElementById("pf-name").value, d.getElementById("pf-handle").value, d.getElementById("pf-area").value);
  d.getElementById("pf-handle").value = "Bad Handle!";
  d.getElementById("profile-form").dispatchEvent(new w.Event("submit", { cancelable: true })); await w.eval("new Promise(r => setTimeout(r, 50))");
  console.log("bad handle msg:", d.getElementById("pf-msg").textContent);
  d.getElementById("pf-handle").value = "@RichFish"; d.getElementById("pf-bio").value = "Snook nut";
  d.getElementById("profile-form").dispatchEvent(new w.Event("submit", { cancelable: true })); await w.eval("new Promise(r => setTimeout(r, 100))");
  console.log("profile update:", JSON.stringify((w.__db.updates || []).filter(x => x.t === "profiles").map(x => x.row)), "| msg:", d.getElementById("pf-msg").textContent, "| who:", d.getElementById("who").textContent);
  process.exit(0);
})();
