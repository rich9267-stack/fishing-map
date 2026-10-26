// test209: Good days month calendar (v215): a Home button opens a month of 0–10 day scores from moon + tide; tap a day for the times.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
const ADMIN = process.env.DEL_ADMIN === "1";
const SPOTS = [{ id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0 }];
const T0 = Date.now() - 2 * 3600000, CATCHES = [{ id: "c1", spot_id: "s1", species: "Snook", how_many: 1, caught_at: new Date(T0 + 1800000).toISOString(), created_by: ME, length_in: 25, session_id: "ses1" },
  { id: "c2", spot_id: "s1", species: "Redfish", how_many: 2, caught_at: new Date(T0 + 3000000).toISOString(), created_by: ME, session_id: "ses1" }];
const GEO = [{ catch_id: "c1", lat: 26.2575, lng: -80.0805, accuracy_m: 8 }];
const SESSIONS = [{ id: "ses3", spot_id: "s1", started_at: new Date(T0 - 3 * 86400000).toISOString(), ended_at: new Date(T0 - 3 * 86400000 + 2700000).toISOString(), created_by: ME, fish: 0 },
  { id: "ses1", spot_id: "s1", started_at: new Date(T0).toISOString(), ended_at: new Date(T0 + 5400000).toISOString(), created_by: ME, fish: 3 },
  { id: "ses2", spot_id: "s1", started_at: new Date(T0 - 86400000).toISOString(), ended_at: new Date(T0 - 86400000 + 3600000).toISOString(), created_by: "u-other", fish: 0 }];
const ORDER = [], RPCS = [], REMOVED = [], STATE = { missing: false, fail: false, signedOut: false };
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, lte: () => o, neq: () => o, order: () => o, range: () => p, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new" }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve({ data: { email: "sam@x.com", display_name: "Sam", is_admin: ADMIN, status: "approved" }, error: null }) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => { STATE.signedOut = true; } },
    rpc: async (fn, a) => {
      RPCS.push([fn, a]); ORDER.push(fn);
      if (fn === "ensure_profile") return { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null };
      if (/^delete_my_account/.test(fn) && STATE.missing) return { data: null, error: { message: "Could not find the function public." + fn + " in the schema cache" } };
      if (fn === "delete_my_account_preview") return { data: { spots: 1, catches: 1, photos: 2, messages: 5, friends: 3, groups: 1, admin: ADMIN }, error: null };
      if (fn === "delete_my_account") return STATE.fail ? { data: null, error: { message: "network" } } : { data: { ok: true, spots_handed_over: 0 }, error: null };
      return { data: null, error: null };
    },
    storage: { from: b => ({ createSignedUrls: async () => ({ data: [] }), createSignedUrl: async () => ({ data: null }),
      list: async folder => ({ data: b === "avatars" && folder === ME ? [{ name: "me.jpg" }] : b === "group-avatars" && folder === "g1" ? [{ name: "pic.jpg" }] : [], error: null }),
      remove: async paths => { REMOVED.push([b, paths]); ORDER.push("remove:" + b); return { data: paths, error: null }; } }) },
    from: t => ({ select: () => chain(t === "spots" || t === "spots_visible" ? SPOTS : t === "catches" ? CATCHES : t === "sessions" ? SESSIONS : t === "catch_geo" ? GEO : t === "photos" ? [{ path: ME + "/a.jpg" }, { path: ME + "/b.jpg" }] : t === "groups" ? [{ id: "g1" }] : t === "profiles" ? [{ user_id: ME, handle: "sam", display_name: "Sam" }] : []),
      delete: () => chain(null), insert: () => chain(null), upsert: () => Promise.resolve({ error: null }), update: () => chain(null) }) }) };
  w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], predictions: [] }) });
}});
const w = dom.window; w.scrollTo = () => {}; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(1200);
  let good = true; const check = (name, ok) => { console.log(name + ":", ok ? "yes" : "NO"); if (!ok) good = false; };
  const $ = id => d.getElementById(id), ev = c => w.eval(c);
  check("Home has a Good days button next to Plan a trip and Learn", !!$("fcal-open") && $("fcal-open").parentNode.classList.contains("hn-acts"));
  $("fcal-open").click(); await wait(600);
  check("the Good days page opens and Home hides", !$("view-fcal").hidden && $("view-list").hidden);
  const days = () => [...d.querySelectorAll("#fcal-body .fc-day")];
  const now = ev("(() => { const p = tzParts(new Date(), areaTz()); return [p.y, p.m, p.d]; })()");
  const dim = new Date(Date.UTC(now[0], now[1], 0)).getUTCDate();
  check("one box per day of this month, each with a number from 0 to 10", days().length === dim && days().every(b => { const n = +b.querySelector(".fc-s").textContent; return n >= 0 && n <= 10; }));
  check("today is marked", d.querySelectorAll("#fcal-body .fc-day.today").length === 1);
  check("scores differ between days (not all the same)", new Set(days().map(b => b.querySelector(".fc-s").textContent)).size >= 3);
  check("today's details show by default, with the 'moon and tide only' note", /Moon and tide only/.test($("fcal-body").textContent) && d.querySelector("#fcal-body .fc-detail h3"));
  // a new-moon / full-moon day scores better than a quarter-moon day
  const sc = ev(`(() => { const out = []; for (let i = 1; i <= 28; i++) { const r = fcDayScore(${now[0]}, ${now[1] - 1}, i, null); out.push([i, SunCalc.getMoonIllumination(fcNoon(${now[0]}, ${now[1] - 1}, i)).phase, r.score]); } return out; })()`);
  const spring = sc.filter(x => Math.abs(Math.cos(2 * Math.PI * x[1])) > 0.95).map(x => x[2]), neap = sc.filter(x => Math.abs(Math.cos(2 * Math.PI * x[1])) < 0.2).map(x => x[2]);
  const all = sc.map(x => x[2]); check("new/full moon days are labelled bigger tides and score above the month average", spring.length && neap.length && spring.reduce((a, b) => a + b) / spring.length > all.reduce((a, b) => a + b) / all.length && ev(`fcDayScore(${now[0]}, ${now[1] - 1}, ${sc.find(x => Math.abs(Math.cos(2 * Math.PI * x[1])) > 0.95)[0]}, null).why[0]`).includes("bigger tides") && ev(`fcDayScore(${now[0]}, ${now[1] - 1}, ${sc.find(x => Math.abs(Math.cos(2 * Math.PI * x[1])) < 0.2)[0]}, null).why[0]`).includes("small tides"));
  days()[9].click(); await wait(500);
  check("tapping a day shows that day's details", /^.*(10|1[0-9]|\d)/.test(d.querySelector("#fcal-body .fc-detail h3").textContent) && /\/10 ·/.test(d.querySelector("#fcal-body .fc-detail h3").textContent));
  const t1 = $("fcal-body").querySelector(".fc-title").textContent;
  d.querySelectorAll("#fcal-body .fc-nav")[1].click(); await wait(500);
  check("the arrow moves to next month", $("fcal-body").querySelector(".fc-title").textContent !== t1 && days().length >= 28);
  d.querySelectorAll("#fcal-body .fc-nav")[0].click(); await wait(500);
  check("and back again", $("fcal-body").querySelector(".fc-title").textContent === t1);
  // tides make a difference when they load
  const withT = ev(`(() => { const t = []; const st = tzDayStart(fcNoon(${now[0]}, ${now[1] - 1}, 10), areaTz()); [0, 6, 12, 18].forEach((h, i) => t.push({ when: new Date(+st + h * 3600000), ft: i % 2 ? 3 : 0, high: !!(i % 2) })); t.swingMax = 3; return [fcDayScore(${now[0]}, ${now[1] - 1}, 10, t), fcDayScore(${now[0]}, ${now[1] - 1}, 10, null)].map(r => [r.score, r.why.join("|")]); })()`);
  check("a big tide swing adds to the score and is explained", withT[0][0] >= withT[1][0] && /Big tide swing \(3\.0 ft\)/.test(withT[0][1]));
  $("fcal-back").click();
  check("Back returns to Home", $("fcal-body") && $("fcal-body").closest("#view-fcal").hidden && !$("view-list").hidden);
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
