// test215: v227 — fishing score on spot cards and in Plan a trip (scoreCore, spotScoreAt, spotScoreLine).
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
const ADMIN = process.env.DEL_ADMIN === "1";
const SPOTS = [{ id: "s3", name: "Pier X", spot_type: "pier", water_type: "saltwater", lat: 26.1, lng: -80.1, created_by: ME, public_access: "yes", tide_offset_min: 0 }, { id: "s2", name: "Tybee Pier", spot_type: "pier", water_type: "saltwater", lat: 32.0, lng: -80.85, created_by: ME, public_access: "yes", tide_offset_min: 0 }, { id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0 }];
const T0 = Date.now() - 2 * 3600000, CATCHES = [{ id: "c1", spot_id: "s1", species: "Snook", how_many: 1, caught_at: new Date(T0 + 1800000).toISOString(), created_by: ME, length_in: 25, session_id: "ses1", moon_phase: "full", tide_stage: "incoming", pressure_trend: "falling" },
  { id: "c2", spot_id: "s1", species: "Redfish", how_many: 2, caught_at: new Date(T0 + 3000000).toISOString(), created_by: ME, session_id: "ses1", moon_phase: "full", tide_stage: "incoming", pressure_trend: "falling" }];
CATCHES.push({ id: "c9", spot_id: "s3", species: "Tarpon", how_many: 1, caught_at: new Date().toISOString(), created_by: "u-friend", caught_by: "Pat" }, { id: "c8", spot_id: "s3", species: "Jack", how_many: 1, caught_at: new Date().toISOString(), created_by: "u-nopic", caught_by: "Lee" });
const GEO = [{ catch_id: "c1", lat: 26.2575, lng: -80.0805, accuracy_m: 8 }];
const SESSIONS = [{ id: "ses3", spot_id: "s1", started_at: new Date(T0 - 3 * 86400000).toISOString(), ended_at: new Date(T0 - 3 * 86400000 + 2700000).toISOString(), created_by: ME, fish: 0 },
  { id: "ses1", spot_id: "s1", started_at: new Date(T0).toISOString(), ended_at: new Date(T0 + 5400000).toISOString(), created_by: ME, fish: 3 },
  { id: "ses2", spot_id: "s1", started_at: new Date(T0 - 86400000).toISOString(), ended_at: new Date(T0 - 86400000 + 3600000).toISOString(), created_by: "u-other", fish: 0 }];
const SIGHTS = [{ id: "sg1", created_by: "u-friend", spot_id: "s9", species: "manatee", how_many: 2, seen_at: new Date().toISOString(), visibility: "public", area_lat: 26.26, area_lng: -80.08 }];
const INS = [], ORDER = [], RPCS = [], REMOVED = [], STATE = { missing: false, fail: false, signedOut: false };
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, lte: () => o, neq: () => o, order: () => o, range: () => p, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new" }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve({ data: { email: "sam@x.com", display_name: "Sam", is_admin: ADMIN, status: "approved" }, error: null }) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => { STATE.signedOut = true; } },
    rpc: async (fn, a) => {
      RPCS.push([fn, a]); ORDER.push(fn);
      if (fn === "claim_sighting_coins") return { data: { added: [{ reason: "sighting", coins: 1, note: "Manatee" }] }, error: null };
      if (fn === "ensure_profile") return { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null };
      if (/^delete_my_account/.test(fn) && STATE.missing) return { data: null, error: { message: "Could not find the function public." + fn + " in the schema cache" } };
      if (fn === "delete_my_account_preview") return { data: { spots: 1, catches: 1, photos: 2, messages: 5, friends: 3, groups: 1, admin: ADMIN }, error: null };
      if (fn === "delete_my_account") return STATE.fail ? { data: null, error: { message: "network" } } : { data: { ok: true, spots_handed_over: 0 }, error: null };
      return { data: null, error: null };
    },
    storage: { from: b => ({ createSignedUrls: async () => ({ data: [] }), createSignedUrl: async p => ({ data: { signedUrl: "https://pics.test/" + p } }),
      list: async folder => ({ data: b === "avatars" && folder === ME ? [{ name: "me.jpg" }] : b === "group-avatars" && folder === "g1" ? [{ name: "pic.jpg" }] : [], error: null }),
      remove: async paths => { REMOVED.push([b, paths]); ORDER.push("remove:" + b); return { data: paths, error: null }; } }) },
    from: t => ({ select: () => chain(t === "spots" || t === "spots_visible" ? SPOTS : t === "catches" ? CATCHES : t === "sessions" ? SESSIONS : t === "catch_geo" ? GEO : t === "sightings" ? SIGHTS : t === "profile_extras" ? [{ user_id: "u-friend", avatar_path: "u-friend/me.jpg" }] : t === "photos" ? [{ path: ME + "/a.jpg" }, { path: ME + "/b.jpg" }] : t === "groups" ? [{ id: "g1" }] : t === "profiles" ? [{ user_id: ME, handle: "sam", display_name: "Sam" }] : []),
      delete: () => chain(null), insert: row => { INS.push([t, row]); return chain(null); }, upsert: () => Promise.resolve({ error: null }), update: () => chain(null) }) }) };
  w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], predictions: [] }) });
}});
const w = dom.window; w.scrollTo = () => {}; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(2500);
  let good = true; const check = (name, ok) => { console.log(name + ":", ok ? "yes" : "NO"); if (!ok) good = false; };
  // the shared recipe: Home's number is unchanged and a spot at a moment gets a score
  const r = JSON.parse(w.eval(`JSON.stringify(scoreCore({ flow: "in", mph: 8, trend: "falling", sol: "major", sun: "sunrise" }))`));
  check("good conditions score high", r.score >= 9 && r.word === "Great");
  const q = JSON.parse(w.eval(`JSON.stringify(scoreCore({ slack: "high", mph: 25, trend: "rising" }))`));
  check("bad conditions score low", q.score <= 2 && q.word === "Slow");
  check("nothing known = 5 Fair", w.eval(`scoreCore({}).score`) === 5);
  const t = w.eval(`todayScore()`); check("Home score still works", t && t.score >= 0 && t.score <= 10);
  // spot score now, and far ahead (no forecast = moon/tide/light only)
  const now = JSON.parse(w.eval(`JSON.stringify(spotScoreAt(spots[0], new Date(), null))`));
  const far = JSON.parse(w.eval(`JSON.stringify(spotScoreAt(spots[0], new Date(Date.now() + 10 * 86400000), null))`));
  check("spot score now is 0–10", now.score >= 0 && now.score <= 10 && !now.partial);
  check("10 days ahead is marked partial and has no wind line", far.partial === true && !far.why.some(x => /wind|breeze/i.test(x.text)));
  // spot card line, opens its reasons
  w.eval(`renderSpots()`); await wait(300);
  const line = d.querySelector(".ts-spot .ts-spot-btn");
  check("a spot card shows the Fishing here now line", !!line && /Fishing here now: \d+\/10/.test(line.textContent));
  line.click();
  check("tapping Why? opens the reasons", !!d.querySelector(".ts-spot .ts-why:not([hidden])"));
  // Plan a trip: the chosen spot's score appears even with a spot that has no ranking
  w.eval(`$("plan-add").click()`); await wait(200);
  const day = new Date(Date.now() + 86400000), pad = n => String(n).padStart(2, "0");
  w.eval(`$("pl-date").value = "${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}"; $("pl-time").value = "07:00"; $("pl-spot").value = "s2"; $("pl-spot").dispatchEvent(new Event("change"))`);
  await wait(1200);
  const txt = d.querySelector("#pl-sugg-body").textContent;
  check("Plan a trip shows the chosen spot's score", /Tybee Pier then: \d+\/10/.test(txt));
  console.log(good ? "ALL OK" : "SOME FAILED"); process.exit(good ? 0 : 1);
})();
