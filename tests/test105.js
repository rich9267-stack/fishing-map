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
  const shown = id => w.getComputedStyle($(id)).display !== "none";
  const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event("input", { bubbles: true })); };
  const mc = $("me-card"), sc = $("settings-card"), fp = $("find-page");
  const rowsOf = k => [...$("find-out").querySelectorAll(".fp-it")];
  // ---- Me page ----
  check("Me page closed at start", mc.hidden && fp.hidden);
  check("picture button + 🔍 are in the top bar", !!$("me-btn") && !!$("find-btn"));
  click($("me-btn")); click($("pf-settings")); await wait(100);
  check("tapping the picture opens the Me page (not a dropdown)", !mc.hidden && $("me-menu").hidden);
  check("page is marked open on <body>", d.body.classList.contains("me-open"));
  check("header shows my name", $("me-name").textContent.length > 0);
  const rows = [...mc.querySelectorAll("[data-me]")].filter(b => !b.hidden).map(b => b.dataset.me);
  console.log("rows:", rows.join(","));
  check("all sections are listed", ["inbox", "alerts", "license", "privacy", "offline", "phone", "data", "whatsnew", "help", "invite"].every(k => rows.includes(k)));
  check("Refresh + Sign out buttons", !!$("me-refresh") && !!$("me-signout"));
  // each section opens alone
  const SECS = { alerts: "push-box", license: "lic-box", privacy: "settings-privacy", offline: "me-offline-go", phone: "save-pics", data: "export-catches", help: "bug-btn" };
  for (const [sec, inside] of Object.entries(SECS)) {
    click($("me-btn")); click($("pf-settings")); await wait(30);
    click(mc.querySelector(`[data-me="${sec}"]`)); await wait(150);
    const others = Object.entries(SECS).filter(([k]) => k !== sec).map(([, id]) => id);
    const target = $(inside).closest(".me-sec");
    check(`${sec}: opens Settings with just that section`, !sc.hidden && sc.dataset.show === sec && mc.hidden && shown(target.id || "settings-card") !== false && w.getComputedStyle(target).display !== "none"
      && others.every(id => { const s = $(id).closest(".me-sec"); return s === target || w.getComputedStyle(s).display === "none"; }));
    check(`${sec}: Back returns to the Me page`, (click($("settings-close")), await wait(50), !mc.hidden && sc.hidden && !sc.dataset.show));
    click($("me-close")); await wait(20);
  }
  click($("me-btn")); click($("pf-settings")); click(mc.querySelector('[data-me="alerts"]')); await wait(100);
  check("section title shown", /Phone alerts/.test($("settings-title").textContent) && $("settings-close").textContent.includes("Back"));
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(50);
  check("Escape goes back to the Me page", !mc.hidden && sc.hidden);
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(50);
  check("Escape closes the Me page", mc.hidden && !d.body.classList.contains("me-open"));
  // Edit → profile, closing returns to Me
  click($("me-btn")); click($("pf-settings")); click($("me-edit")); await wait(200);
  check("Edit opens the profile card and leaves the Me page", !$("profile-card").hidden && mc.hidden);
  check("Profile card holds only profile things (no alerts/photos/export)", !$("profile-card").querySelector("#push-box") && !$("profile-card").querySelector("#save-pics") && !$("profile-card").querySelector("#export-catches"));
  click($("profile-close")); await wait(50);
  check("closing the profile returns to the Me page", !mc.hidden);
  // other rows
  click(mc.querySelector('[data-me="whatsnew"]')); await wait(100);
  check("What's new opens the pop-up", !$("whatsnew").hidden); click($("wn-ok")); click($("me-close"));
  click($("me-btn")); click($("pf-settings")); click(mc.querySelector('[data-me="inbox"]')); await wait(200);
  check("Alerts inbox opens its card and closes the Me page", !$("inbox-card").hidden && mc.hidden); click($("inbox-close"));
  click($("me-btn")); click($("pf-settings")); click(mc.querySelector('[data-me="invite"]')); await wait(200);
  check("Invite (admin) opens the invite card", !$("invite-card").hidden && mc.hidden); click($("invite-close"));
  click($("me-btn")); click($("pf-settings")); click(mc.querySelector('[data-me="privacy"]')); await wait(100); click($("settings-blocked")); await wait(300);
  check("Blocked people goes to Friends", sc.hidden && !$("friends-card").hidden);
  click($("tab-list")); await wait(100);
  click($("me-btn")); click($("pf-settings")); click(mc.querySelector('[data-me="offline"]')); await wait(100); click($("me-offline-go")); await wait(700);
  check("Offline maps opens the map with the Layers sheet", !$("view-map").hidden && !$("layers-sheet").hidden && sc.hidden);
  check("picture is hidden on the Map page", w.getComputedStyle($("me-btn")).display === "none" && d.body.classList.contains("on-map"));
  click($("tab-list")); await wait(200);
  check("picture is back on Home", w.getComputedStyle($("me-btn")).display !== "none");
  // old links still work
  click($("settings-btn")); await wait(100);
  check("old ⚙️ Settings button still shows the WHOLE Settings page", !sc.hidden && !sc.dataset.show && /^⚙️ Settings/.test($("settings-title").textContent) && $("settings-close").textContent === "Close"
    && ["push-box", "lic-box", "save-pics", "export-catches", "bug-btn"].every(id => w.getComputedStyle($(id).closest(".me-sec")).display !== "none"));
  click($("settings-close")); check("old Close hides it", sc.hidden && mc.hidden);
  ev(`pendingGo = null; handleGo("?go=license")`); await wait(300);
  check("?go=license opens Settings", !sc.hidden && !!$("lic-box"));
  click($("settings-close"));
  click($("profile-btn")); await wait(100); check("old Profile button still opens the profile card", !$("profile-card").hidden); click($("profile-close"));
  check("closing the profile does not pop the Me page when it was not opened from there", mc.hidden);
  // ---- 🔍 Find anything ----
  click($("find-btn")); await wait(50);
  check("Find opens full screen", !fp.hidden && d.body.classList.contains("find-open"));
  check("empty search shows the Try chips", $("find-out").querySelectorAll(".fp-chip").length === 5);
  click($("find-out").querySelector(".fp-chip")); await wait(30);
  check("a chip fills the search", $("find-q").value === "license" && rowsOf().some(b => /Fishing license/.test(b.textContent)));
  type($("find-q"), "dep");
  check("'dep' finds Depth lines", rowsOf().some(b => /Depth lines/.test(b.textContent)));
  type($("find-q"), "hillsboro");
  check("a spot is found by name", rowsOf().some(b => /Hillsboro Inlet/.test(b.textContent) && /Your spot/.test(b.textContent)));
  type($("find-q"), "snook");
  const labs = [...$("find-out").querySelectorAll(".fp-lab")].map(x => x.textContent);
  console.log("groups for snook:", labs.join(","));
  check("'snook' shows Fish and Catches", labs.includes("Fish") && labs.includes("Catches"));
  ev(`friendProfiles["p9"] = { user_id: "p9", handle: "mikej", display_name: "Mike Jones", home_area: "Jupiter" }`);
  type($("find-q"), "mike");
  check("people are found by name or @username", rowsOf().some(b => /Mike Jones/.test(b.textContent) && /@mikej/.test(b.textContent)));
  type($("find-q"), "@mikej".replace("@", ""));
  check("username search works", rowsOf().some(b => /Mike Jones/.test(b.textContent)));
  type($("find-q"), "zzzzqq");
  check("nothing found says so", !!$("find-out").querySelector(".fp-empty"));
  // opening results
  type($("find-q"), "hillsboro"); click(rowsOf().find(b => /Hillsboro Inlet/.test(b.textContent))); await wait(200);
  check("tapping a spot closes Find and shows it on Home", fp.hidden && !$("view-list").hidden);
  click($("find-btn")); type($("find-q"), "snook"); click(rowsOf().find(b => /Species page/.test(b.textContent))); await wait(200);
  check("tapping a fish opens its species page", fp.hidden && !!d.getElementById("sp-sheet")); ev(`spClose()`);
  click($("find-btn")); type($("find-q"), "quiet hours"); click(rowsOf()[0]); await wait(200);
  check("tapping a feature jumps to it (quiet hours → Me › alerts)", !sc.hidden && sc.dataset.show === "alerts" && fp.hidden); click($("settings-close")); click($("me-close"));
  click($("find-btn")); type($("find-q"), "tank"); click(rowsOf()[0]); await wait(200);
  check("tapping Fish tank opens Play", !$("view-tank").hidden && fp.hidden);
  click($("tab-list")); await wait(100);
  click($("find-btn")); type($("find-q"), "license");
  $("find-q").dispatchEvent(new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); await wait(200);
  check("Enter opens the first result", fp.hidden && !sc.hidden); click($("settings-close")); click($("me-close"));
  click($("find-btn")); click($("find-cancel"));
  check("Cancel closes Find", fp.hidden && !d.body.classList.contains("find-open"));
  click($("find-btn")); d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); check("Escape closes Find", fp.hidden);
  // step 5 polish: recent searches, friendlier empty result, tap sizes
  click($("find-btn")); await wait(30);
  const recChips = () => [...$("find-out").querySelectorAll(".fp-chip")].map(b => b.textContent);
  check("Find remembers the last searches as chips", recChips().slice(0, 4).includes("license") && recChips().includes("hillsboro") && recChips().length > 5);
  click($("find-out").querySelector(".fp-clear")); await wait(20);
  check("Clear forgets them (only the 5 Try chips stay)", recChips().length === 5 && !$("find-out").querySelector(".fp-clear"));
  type($("find-q"), "zzzzqq");
  check("nothing found offers chips and a Clear search button", $("find-out").querySelectorAll(".fp-empty .fp-chip").length > 0 && [...$("find-out").querySelectorAll(".fp-empty button")].some(b => /Clear search/.test(b.textContent)));
  click([...$("find-out").querySelectorAll(".fp-empty button")].find(b => /Clear search/.test(b.textContent)));
  check("Clear search empties the box and shows Try again", $("find-q").value === "" && recChips().length === 5);
  click($("find-cancel"));
  const css = require("fs").readFileSync(require("path").join(__dirname, "..", "css", "app.css"), "utf8");
  check("Find chips are at least 44px tall", /\.fp-chip \{ min-height: 44px/.test(css));
  // service worker caches the new file
  check("sw.js caches js/27-me-find.js", require("fs").readFileSync(require("path").join(__dirname, "..", "sw.js"), "utf8").includes("./js/27-me-find.js"));
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
