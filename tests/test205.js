// test205: Today score on Home (v211): one 0–10 number from tide, wind, pressure, moon; tap for the why list.
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
  const sec = $("ts-sec");
  check("the Today score card is on Home, above the tide card", !!sec && sec.parentNode.id === "hn" && sec.nextElementSibling && sec.nextElementSibling.id === "hn-cond-sec");
  const now = Date.now(), H = 3600000;
  // good: mid-way between low and high, nice breeze, falling pressure
  ev(`window.homeTides = [{ when: new Date(${now - 3 * H}), ft: 0.2, high: false }, { when: new Date(${now + 3 * H}), ft: 2.6, high: true }]; cond.windMph = 10; cond.pressureTrend = "falling"`);
  const g = ev("todayScore()");
  // bad: slack tide, very windy, rising pressure
  ev(`window.homeTides = [{ when: new Date(${now - 10 * 60000}), ft: 2.6, high: true }, { when: new Date(${now + 6 * H}), ft: 0.2, high: false }]; cond.windMph = 28; cond.pressureTrend = "rising"`);
  const b = ev("todayScore()");
  check("scores are whole numbers from 0 to 10", [g, b].every(r => Number.isInteger(r.score) && r.score >= 0 && r.score <= 10));
  check("moving tide + breeze + falling pressure scores well (7+)", g.score >= 7 && /Tide coming in/.test(g.why.map(x => x.text).join("|")) && /Pressure falling/.test(g.why.map(x => x.text).join("|")));
  check("slack tide + 28 mph wind + rising pressure scores low (4 or less, and well under the good case)", b.score <= 4 && g.score - b.score >= 5 && /Too windy \(28 mph\)/.test(b.why.map(x => x.text).join("|")) && /Slack tide/.test(b.why.map(x => x.text).join("|")));
  check("words match the number", ev("(() => { const r = todayScore(); return r.score >= 8 ? r.word === 'Great' : r.score >= 6 ? r.word === 'Good' : r.score >= 4 ? r.word === 'Fair' : r.word === 'Slow'; })()"));
  ev("window.homeTides = null; cond.windMph = null; cond.pressureTrend = null");
  const n = ev("todayScore()");
  check("no tide or weather yet (e.g. a lake, or still loading): still gives a number", Number.isInteger(n.score) && !n.why.some(x => /Tide|wind|Pressure/i.test(x.text)));
  ev(`window.homeTides = [{ when: new Date(${now - 3 * H}), ft: 0.2, high: false }, { when: new Date(${now + 3 * H}), ft: 2.6, high: true }]; cond.windMph = 10; cond.pressureTrend = "falling"; todayScoreRender()`);
  check("the card shows the number, the word and a short reason", $("ts-num").textContent === String(g.score) && new RegExp("^" + g.score + "/10 · " + g.word + "$").test($("ts-word").textContent) && $("ts-top").textContent.length > 3);
  check("the why list is folded at first", $("ts-why").hidden);
  $("ts-btn").click();
  check("tapping the card opens the why list with the 'not a promise' note", !$("ts-why").hidden && $("ts-why").querySelectorAll(".ts-row").length >= 3 && /not a promise/.test($("ts-why").textContent));
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
