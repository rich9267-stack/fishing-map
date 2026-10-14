// test93: 🐟 species pages — open from Seasons and My fish, sections, our-catch stats, race stats, close/Esc/focus, charts link, edge cases.
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
  await wait(800);
  const ev = c => w.eval(c);
  let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
  ev(`photosBySpot = { s1: [{ catch_id: "c1" }, { catch_id: "c2" }, { catch_id: "c4" }], s3: [{ catch_id: "c5" }] }`);
  ev(`window.__ranks = Object.values(catchesBySpot).flat().filter(catchHasPhoto).map(c => { const r = fishRank(c, true); return r && { catch_id: c.id, species: c.species, power: r.power, tier: r.tier, strength: r.stats.strength, speed: r.stats.speed, stamina: r.stats.stamina, size_pct: r.size }; }).filter(Boolean)`);
  // Seasons name opens the page
  ev(`showView("seasons")`); await wait(300);
  const snookBtn = [...d.querySelectorAll("#sea-list .sea-name")].find(b => b.textContent === "Snook");
  ok("Seasons fish names are buttons", !!snookBtn && snookBtn.tagName === "BUTTON");
  snookBtn.focus(); snookBtn.click(); await wait(50);
  const sh = () => d.getElementById("sp-sheet");
  ok("tapping Snook opens its page as a dialog", !!sh() && sh().getAttribute("role") === "dialog" && /Snook/.test(sh().querySelector(".sp-title").textContent));
  const txt = sh().textContent;
  console.log("page:", txt.replace(/\s+/g, " ").slice(0, 900));
  ok("when-to-catch section with a 12-month strip", /When to catch it/.test(txt) && sh().querySelectorAll(".sp-months span").length === 12);
  ok("rules section", /Rules/.test(txt));
  ok("our catches: 3 snook logged, by you", /3 logged — 3 by you/.test(txt));
  ok("best tide and time from our snook", /Most on: outgoing tide \(3\)/.test(txt) && /Most at:/.test(txt));
  ok("biggest snook: 30″ by you", /Longest: 30″ by you/.test(txt));
  ok("strongest shows Power", /Strongest: Power \d+/.test(txt));
  ok("race stats with class", /A big one is about 34″/.test(txt) && /races in (⚡ )?Class [SABC]/.test(txt));
  ok("Log one and charts buttons", /Log one/.test(txt) && /All charts for this fish/.test(txt));
  ok("focus moves to Close", d.activeElement && /Close/.test(d.activeElement.textContent));
  d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" })); await wait(20);
  ok("Esc closes it and focus goes back", !sh() && d.activeElement === snookBtn);
  // charts button → insights filtered to snook
  snookBtn.click(); await wait(30);
  [...sh().querySelectorAll("button")].find(b => /All charts/.test(b.textContent)).click(); await wait(300);
  ok("charts opens Stats filtered to Snook", !sh() && !d.getElementById("view-insights").hidden && d.getElementById("ins-species").value === "Snook");
  // a fish nobody caught
  ev(`openSpecies("Tarpon")`); await wait(30);
  ok("tarpon page: nobody logged one yet", /Nobody in your group has logged one yet/.test(sh().textContent) && !/All charts/.test(sh().textContent));
  ev(`spClose()`);
  // a far-away fish
  ev(`openSpecies("Blue catfish")`); await wait(30);
  ok("blue catfish page says where it lives", /Not in S\. Florida/.test(sh().textContent) && /Lives in:/.test(sh().textContent));
  ev(`spClose()`);
  // My fish card → About
  ev(`showView("insights")`); await wait(300); ev(`renderMyFish()`);
  const card = [...d.querySelectorAll("#fk-body .fk-card")].find(c => /Snook/.test(c.textContent)); card.click(); await wait(30);
  const about = [...d.querySelectorAll("#fk-body .fk-about")][0];
  ok("open My fish card has an About button", !!about && /About Snook/.test(about.textContent));
  about.click(); await wait(30);
  ok("About opens the species page", !!sh() && /Snook/.test(sh().querySelector(".sp-title").textContent));
  ev(`spClose()`);
  // a species with no Seasons entry still gets a page
  ev(`openSpecies("Gulf toadfish")`); await wait(30);
  ok("unknown-to-Seasons fish still opens a simple page", !!sh() && /Gulf toadfish/.test(sh().textContent) && /In our catches/.test(sh().textContent));
  console.log(bad ? "test93 FAILED" : "test93 OK");
  process.exit(bad ? 1 : 0);
})();
