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
  w.__db = { inserts: [], upserts: [], sessions: [], deletes: [] };
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, order: () => o, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new-" + Math.random().toString(36).slice(2) }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve(MEMBER()) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "rich9267@gmail.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
    rpc: async (fn, a) => { RPCS.push([fn, a]); if (fn === 'request_access') { status = 'pending'; } if (fn === 'review_access') PEND = PEND.map(m => m.email === a.p_email ? { ...m, status: a.p_approve ? 'approved' : 'blocked' } : m); return fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }; }, storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    from: t => ({ select: () => chain(t === "catch_ranks" ? (w.__ranks || []) : t === "members" ? PEND : (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { w.__db.deletes.push(t); return chain(null); },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: row => { w.__db.upserts.push({ t, row }); return Promise.resolve({ error: null }); },
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
  // ---- Home ----
  const order = [...d.querySelectorAll("#view-list > *")].map(e => e.id || e.tagName.toLowerCase());
  console.log("Home order:", order.join(" > "));
  check("Home is short: strip > quick > best > my spots (> hidden details)", order.filter(x => ["today-strip", "home-quick", "best-card", "spots-card"].includes(x)).join(">") === "today-strip>home-quick>best-card>spots-card");
  check("Suggested spots + Public lakes are NOT on Home", !$("view-list").querySelector("#sugg-card") && !$("view-list").querySelector("#pw-card"));
  check("they live in the Find new water sheet on the Map", !!$("find-sheet").querySelector("#sugg-card") && !!$("find-sheet").querySelector("#pw-card") && !!$("find-sheet").querySelector("#map-sugg"));
  check("quick buttons: Start trip, Heading out, Plan a trip", !!$("home-quick").querySelector("#hq-start") && !!$("home-quick").querySelector("#ci-start") && !!$("home-quick").querySelector("#plan-add"));
  check("What's new is not on Home/footer, still opens from Settings", !d.querySelector("footer #wn-open") && !!$("settings-card").querySelector("#settings-wn"));
  click($("settings-btn")); await wait(200); click($("settings-wn")); await wait(100);
  check("Settings > What's new opens the popup", !$("whatsnew").hidden); click($("wn-ok")); click($("settings-close"));
  // conditions strip -> full details sheet
  check("details start closed and out of sight", $("cond-more").open === false && !$("cond-more").classList.contains("as-sheet"));
  click(d.querySelector("#today-strip .tile[data-more='weather']")); await wait(50);
  check("tap the strip: weather, tides & moon open as a page", $("cond-more").open && $("cond-more").classList.contains("as-sheet") && d.body.classList.contains("cond-open"));
  check("the page holds weather + moon + tide times", !!$("cond-more").querySelector("#weather") && !!$("cond-more").querySelector("#moon-card") && !!$("cond-more").querySelector("#days"));
  click($("cond-close")); await wait(50);
  check("Close puts it away", !$("cond-more").open && !d.body.classList.contains("cond-open"));
  // start trip chooser
  click($("hq-start")); await wait(100);
  check("Start trip opens the chooser with spots", !$("trip-sheet").hidden && $("tr-spot").options.length === SPOTS.length);
  $("tr-spot").value = "s1"; $("trip-form").dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true })); await wait(300);
  const act = ev(`activeSession()`);
  check("trip started at the chosen spot", !!act && act.spot_id === "s1" && /Hillsboro/.test(act.spotName));
  check("chooser closed, trip bar shown, Start button hidden", $("trip-sheet").hidden && !$("session-bar").hidden && $("hq-start").hidden);
  click($("session-end")); await wait(400);
  check("after End trip the Start button is back", !$("hq-start").hidden);
  // ---- Map: Layers sheet ----
  click($("tab-map")); await wait(300);
  check("old row of layer buttons is gone from view (they sit in a hidden box)", $("layer-real").hidden && ["mx-official","map-bite","map-pub","map-sight","mx-reef","mx-water","mx-chart","mx-depth","mx-redtide","map-sst","map-chl","map-layer","mx-zone"].every(id => $("layer-real").contains($(id))));
  check("toolbar has Layers + Find new water + Add + Show me + List + Boat", ["map-layers-btn","map-find-btn","map-add","map-me","map-list","boat-open"].every(id => $("map-main-tools").contains($(id))));
  check("sheets start closed", $("layers-sheet").hidden && $("find-sheet").hidden);
  click($("map-layers-btn")); await wait(100);
  check("Layers opens, button says expanded", !$("layers-sheet").hidden && $("map-layers-btn").getAttribute("aria-expanded") === "true" && d.body.classList.contains("sheet-open"));
  const groups = [...d.querySelectorAll("#layers-body .lyr-group")].map(x => x.textContent);
  console.log("groups:", groups.join(" | "));
  check("grouped Fishing / On the water / Getting there & rules", groups[0] === "Fishing" && groups[1] === "On the water" && /Getting there/.test(groups[2]));
  const rows = [...d.querySelectorAll("#layers-body .lyr")];
  check("every layer has a switch row (13, with ✅ Official public spots)", rows.length === 13 && rows.every(r => r.getAttribute("role") === "switch" && r.getAttribute("aria-checked") === "false"));
  // each switch works the real layer, and reflects it
  const row = id => d.querySelector(`#layers-body .lyr[data-for="${id}"]`);
  click(row("mx-chart")); await wait(250);
  check("Nautical chart switch -> real button on, switch on", $("mx-chart").classList.contains("on") && row("mx-chart").getAttribute("aria-checked") === "true" && ev(`!!map`));
  click(row("mx-chart")); await wait(100);
  check("switch off again", !$("mx-chart").classList.contains("on") && row("mx-chart").getAttribute("aria-checked") === "false");
  click(row("map-layer")); await wait(100);
  check("Satellite photos switch swaps base map", ev(`satellite`) === true && row("map-layer").getAttribute("aria-checked") === "true");
  click(row("map-layer")); await wait(50);
  check("and back to street map", ev(`satellite`) === false && row("map-layer").getAttribute("aria-checked") === "false");
  click(row("map-sst")); await wait(300);
  check("Water temp on; clarity off", row("map-sst").getAttribute("aria-checked") === "true" && row("map-chl").getAttribute("aria-checked") === "false");
  click(row("map-chl")); await wait(300);
  check("switching to clarity turns temp switch off (one at a time, as before)", row("map-chl").getAttribute("aria-checked") === "true" && row("map-sst").getAttribute("aria-checked") === "false");
  click(row("map-chl")); await wait(100);
  for (const id of ["mx-official", "mx-reef", "mx-zone", "mx-depth", "mx-water", "map-sight", "map-pub", "map-bite"]) {
    click(row(id)); await wait(250);
    check(id + " switch on follows real button", row(id).getAttribute("aria-checked") === "true" && ($(id).classList.contains("on") || $(id).getAttribute("aria-pressed") === "true"));
    click(row(id)); await wait(150);
  }
  // a real button changed by other code (e.g. "Show on map" from a profile) moves the switch too
  $("map-pub").classList.add("on"); await wait(30);
  check("switch follows changes made elsewhere", row("map-pub").getAttribute("aria-checked") === "true"); $("map-pub").classList.remove("on"); await wait(30);
  check("Save map for offline stays reachable in the sheet", $("layers-sheet").contains($("map-offline")));
  click($("layers-done")); await wait(50);
  check("Done closes it", $("layers-sheet").hidden && !d.body.classList.contains("sheet-open"));
  // ---- Find new water ----
  click($("map-find-btn")); await wait(100);
  check("Find new water opens (Layers closed)", !$("find-sheet").hidden && $("layers-sheet").hidden);
  check("suggestions + lakes lists loaded in it", $("sugg-list").children.length > 0 && $("pw-list").children.length > 0);
  click($("map-sugg")); await wait(100);
  check("Show suggestions on the map still works", /Hide suggestions/.test($("map-sugg").textContent) && ev(`suggOnMap`) === true);
  click($("map-sugg")); await wait(50);
  // suggestions: trust label, details card, want-to-try, not interested, one-tap add
  const rowsS = () => [...$("sugg-list").querySelectorAll(".sugg-row")];
  w.localStorage.removeItem("fm-sugg-hidden"); w.localStorage.removeItem("fm-sugg-want");
  ev(`suggHidden = new Set(); suggWant = []; suggestions = [
    { key: "node/1", name: "Pompano Pier", kind: "pier", label: "Pier", trust: "public", lat: 26.24, lng: -80.09 },
    { key: "node/2", name: "Boat ramp (unnamed)", kind: "ramp", label: "Boat ramp", trust: "unclear", lat: 26.30, lng: -80.10 },
    { key: "node/3", name: "Cove Jetty", kind: "jetty", label: "Jetty", trust: "likely", lat: 26.26, lng: -80.07 }]; renderSuggestions();`);
  const n0 = rowsS().length;
  check("every suggestion shows how sure we are", n0 > 0 && rowsS().every(b => /Public|Likely|Check access/.test(b.textContent)));
  click(rowsS()[0]); await wait(30);
  check("tapping a suggestion opens its details card", !!$("sugg-list").querySelector(".sugg-detail") && rowsS()[0].getAttribute("aria-expanded") === "true");
  click([...$("sugg-list").querySelectorAll(".sugg-acts button")].find(b => /Want to try/.test(b.textContent))); await wait(30);
  check("☆ Want to try puts it on the want-to-try tab", /\(1\)/.test($("sugg-tabs").querySelector('[data-t="want"]').textContent));
  click($("sugg-tabs").querySelector('[data-t="want"]')); await wait(30);
  check("the want-to-try tab lists it", rowsS().length === 1);
  click($("sugg-tabs").querySelector('[data-t="near"]')); await wait(30);
  click(rowsS()[0]); click([...$("sugg-list").querySelectorAll(".sugg-acts button")].find(b => /Not interested/.test(b.textContent))); await wait(30);
  check("✕ Not interested hides it for good (and from want-to-try)", rowsS().length === n0 - 1 && !$("sugg-tabs").querySelector('[data-t="want"]').textContent.includes("("));
  check("hidden suggestions are remembered on the phone", JSON.parse(w.localStorage.getItem("fm-sugg-hidden") || "[]").length === 1);
  
  check("Map page has one Boat mode button and no leftover duplicate ids", d.querySelectorAll("#boat-open").length === 1 && d.querySelectorAll("#mx-chart").length === 1 && !d.getElementById("mx-tools"));
  check("names open profiles (others) but your own stays plain", ev(`personLink("someone-else", "Mike").tagName`) === "BUTTON" && ev(`personLink(me.id, "You").tagName`) === "SPAN");
  const mapBtn = [...$("pw-list").querySelectorAll(".btn")].find(b => b.textContent === "Map"); click(mapBtn); await wait(300);
  check("tapping Map on a lake closes the sheet and shows the lake layer", $("find-sheet").hidden && $("mx-water").classList.contains("on"));
  click($("map-find-btn")); await wait(100);
  [...$("pw-list").querySelectorAll(".btn")].find(b => b.textContent === "+ Add").click(); await wait(200);
  check("+ Add on a lake goes to the spot form on Home and closes the sheet", $("find-sheet").hidden && !$("view-list").hidden && !!$("f-name").value);
  ev(`closeSpotForm()`);
  // leaving the map closes an open sheet
  click($("tab-map")); await wait(200); click($("map-layers-btn")); await wait(50);
  click($("tab-list")); await wait(100);
  check("sheet closes when you leave the map", $("layers-sheet").hidden && !d.body.classList.contains("sheet-open"));
  // old deep link still lands on Home with the safety strip
  ev(`pendingGo = null; handleGo("?go=weather")`); await wait(300);
  check("?go=weather still works", !$("view-list").hidden);
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
