process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-rich";
const SPOTS = [
  { id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0 },
  { id: "s4", name: "Black Creek Canal", spot_type: "seawall", water_type: "brackish", lat: 25.55, lng: -80.35, created_by: ME, public_access: "yes", tide_offset_min: 75 },
  { id: "s2", name: "C-14 Canal", spot_type: "seawall", water_type: "freshwater", lat: 26.27, lng: -80.15, created_by: ME, public_access: "yes" },
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
  w.__db = { inserts: [], upserts: [], sessions: [] };
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, order: () => o, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new-" + Math.random().toString(36).slice(2) }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve({ data: { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved" }, error: null }) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "rich9267@gmail.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
    rpc: async () => ({ error: null }), storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    from: t => ({ select: () => chain((t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES : t === "sessions" ? w.__db.sessions : []),
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: row => { w.__db.upserts.push({ t, row }); return Promise.resolve({ error: null }); },
      update: row => chain(null) }) }) };
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
    return { ok: true, json: async () => ({ properties: {}, features: [], elements: [] }) };
  };
}});
const w = dom.window; w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(600);
  await w.eval("new Promise(r => setTimeout(r, 300))");
  [...d.querySelectorAll(".spot-cond")].forEach(n => console.log("COND", n.dataset.spot, "|", n.textContent));
  console.log("tideStageAt shift:", await w.eval(`(async () => { const t = new Date(); const low = (await stationTides("8722588")).find(x => !x.high && x.when > t).when; const q = new Date(low.getTime() + 20 * 60000); return "20 min after station low: no offset=" + await tideStageAt(q, "8722588", 0) + ", +75 min spot=" + await tideStageAt(q, "8722588", 75) + ", -120 min spot=" + await tideStageAt(q, "8722588", -120); })()`));
  w.eval("openForm(true, spots.find(x => x.id === 's1'))");
  d.getElementById("f-tide-low").click(); await w.eval("new Promise(r => setTimeout(r, 100))");
  console.log("LOW NOW:", d.getElementById("f-tide-offset").value, "|", d.getElementById("f-tide-msg").textContent);
  // --- trips ---
  const btn = () => [...d.querySelectorAll(".spot")].find(e => e.textContent.includes("Hillsboro Inlet")).querySelector(".catches button.btn.ghost.small:nth-of-type(1)");
  const tripBtn = () => [...[...d.querySelectorAll(".spot")].find(e => e.querySelector(".spot-name").textContent.includes("Hillsboro Inlet")).querySelectorAll("button")].find(b => /trip/.test(b.textContent));
  console.log("trip button:", tripBtn().textContent);
  tripBtn().click(); await w.eval("new Promise(r => setTimeout(r, 50))");
  console.log("bar:", d.getElementById("session-bar").hidden ? "hidden" : d.getElementById("session-text").textContent, "| upserts:", w.__db.upserts.length, "| btn now:", tripBtn().textContent);
  // log a catch through the form
  w.eval("erddapJson = async () => { throw new Error('no satellite in test'); }"); w.eval("openCatchForm('s1')"); d.querySelector("#c-species").value = "Snook";
  w.eval("catchForm.dispatchEvent(new Event('submit', { cancelable: true }))"); for (let i = 0; i < 40 && !w.__db.inserts.some(x => x.t === "catches"); i++) await w.eval("new Promise(r => setTimeout(r, 250))");
  const ci = w.__db.inserts.filter(x => x.t === "catches").pop();
  console.log("debug:", await w.eval("Promise.race([condPromise.then(() => 'cond done'), new Promise(r => setTimeout(() => r('cond pending'), 50))])"), w.eval("catchWhen().toISOString()"));
  console.log("catch inserts:", JSON.stringify(w.__db.inserts.map(x => [x.t, x.row.species, x.row.session_id])), "msg:", (d.querySelector("#c-msg") || {}).textContent);
  console.log("catch insert session_id matches trip:", !!ci && ci.row.session_id === JSON.parse(w.localStorage.getItem("fm-session-u-rich")).id);
  w.eval("renderSessionBar()"); console.log("bar after catch:", d.getElementById("session-text").textContent);
  // pretend 2 hours passed, then end
  const a = JSON.parse(w.localStorage.getItem("fm-session-u-rich")); a.started_at = new Date(Date.now() - 2 * 3600000).toISOString(); w.localStorage.setItem("fm-session-u-rich", JSON.stringify(a));
  d.getElementById("session-end").click(); await w.eval("new Promise(r => setTimeout(r, 200))");
  const end = w.__db.upserts.pop().row;
  console.log("end row:", JSON.stringify({ fish: end.fish, hours: end.hours.length, h0: end.hours[0], ended: !!end.ended_at }));
  console.log("toast:", d.getElementById("qc-toast").textContent, "| bar hidden:", d.getElementById("session-bar").hidden);
  // skunk trip toast
  tripBtn().click(); await w.eval("new Promise(r => setTimeout(r, 50))");
  d.getElementById("session-end").click(); await w.eval("new Promise(r => setTimeout(r, 200))");
  console.log("skunk toast:", d.getElementById("qc-toast").textContent);
  // stale trip auto-close
  w.localStorage.setItem("fm-session-u-rich", JSON.stringify({ id: "stale-1", spot_id: "s1", spotName: "Hillsboro Inlet", started_at: new Date(Date.now() - 20 * 3600000).toISOString() }));
  w.eval("closeStaleSession()"); await w.eval("new Promise(r => setTimeout(r, 200))");
  const st = w.__db.upserts.pop().row; console.log("stale closed:", Math.round((new Date(st.ended_at) - new Date(st.started_at)) / 3600000), "hrs |", st.notes, "| active now:", w.localStorage.getItem("fm-session-u-rich"));
  // scoring with trips: 4 trips at s1, Insights tiles, spot card line
  const mkTrip = (id, h0, len, fish, tide) => ({ id, spot_id: "s1", created_by: ME, started_at: new Date(Date.now() - h0 * 3600000).toISOString(), ended_at: new Date(Date.now() - (h0 - len) * 3600000).toISOString(), fish,
    hours: Array.from({ length: len }, () => ({ tide, tod: "6–9 AM", sol: "minor", moon: "waning crescent", wind: "6–10 mph", trend: "falling" })) });
  w.__db.sessions.push(mkTrip("t1", 30, 4, 0, "outgoing"), mkTrip("t2", 60, 4, 0, "outgoing"), mkTrip("t3", 90, 3, 2, "outgoing"), mkTrip("t4", 120, 4, 0, "incoming"));
  await w.eval("loadSessions()"); w.eval("renderSpots()");
  console.log("BEST with trips:", [...d.querySelectorAll("#best-list .best")].map(b => b.textContent).join("\n   "));
  const card = [...d.querySelectorAll(".spot")].find(e => e.querySelector(".spot-name").textContent.includes("Hillsboro Inlet"));
  console.log("spot trips line:", [...card.querySelectorAll(".spot-meta")].map(x => x.textContent).find(t => t.startsWith("🕑")));
  d.getElementById("tab-insights").click(); await w.eval("new Promise(r => setTimeout(r, 50))");
  console.log("tiles:", [...d.querySelectorAll("#ins-tiles .tile")].map(t => t.textContent).join(" | "));
  // ask prompt
  Object.defineProperty(w.navigator, "permissions", { value: { query: async () => ({ state: "granted" }) }, configurable: true });
  Object.defineProperty(w.navigator, "geolocation", { value: { getCurrentPosition: ok => ok({ coords: { latitude: 26.2572, longitude: -80.0812 } }) }, configurable: true });
  w.localStorage.removeItem("fm-session-u-rich"); d.getElementById("session-ask").hidden = true;
  await w.eval("maybeAskSession()"); await w.eval("new Promise(r => setTimeout(r, 20))");
  console.log("ask:", d.getElementById("session-ask").hidden ? "hidden" : d.getElementById("session-ask-text").textContent);
  d.getElementById("session-ask-no").click();
  await w.eval("maybeAskSession()"); await w.eval("new Promise(r => setTimeout(r, 20))");
  console.log("after Not now, ask again?:", !d.getElementById("session-ask").hidden);
  w.localStorage.removeItem("fm-ask-s1"); await w.eval("maybeAskSession()"); await w.eval("new Promise(r => setTimeout(r, 20))");
  d.getElementById("session-ask-yes").click(); await w.eval("new Promise(r => setTimeout(r, 30))");
  console.log("after Start:", d.getElementById("session-text").textContent, "| ask hidden:", d.getElementById("session-ask").hidden);
  process.exit(0);
})();
