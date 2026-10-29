// test228: v245 — spot score: catches at the spot, season / water temperature, night, lakes and canals (js/67 spotExtraLines, scoreCore).
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
  const J = x => JSON.parse(w.eval(`JSON.stringify(${x})`));
  const has = (r, re) => r.why.some(x => re.test(x.text));

  // ---- the recipe: night and lakes
  const nt = J(`scoreCore({ night: true })`);
  check("dark costs a point", nt.score === 4 && has(nt, /^Dark/));
  check("around sunset is not counted as dark", J(`scoreCore({ sun: "sunset", night: true })`).score === 6);
  const lk = J(`scoreCore({ noTide: true })`);
  check("a lake isn't held at 5 for having no tide", lk.score === 6 && has(lk, /No tide here/));
  check("extra lines are added", J(`scoreCore({ extra: [{ n: 2, text: "Like when fish were caught here" }] })`).score === 7);

  // ---- catches at the spot: s1 has 3 fish, all on an incoming tide with falling pressure
  const s1 = "spots.find(s => s.id === 's1')", T = `new Date(${T0 + 1800000})`;
  w.eval(`window.__fa = factorsAt; factorsAt = (s, t, fh) => Object.assign(__fa(s, t, fh), window.__now || {})`);
  w.eval(`window.__now = { tide: "incoming", trend: "falling" }`);
  const like = J(`spotScoreAt(${s1}, ${T}, null)`);
  const ln = like.why.find(x => /caught here/.test(x.text));
  check("now like the catches here: score goes up and Why? says so", !!ln && ln.n > 0 && /Like when fish were caught here/.test(ln.text));
  w.eval(`window.__now = { tide: "outgoing", trend: "rising" }`);
  const unlike = J(`spotScoreAt(${s1}, ${T}, null)`);
  const un = unlike.why.find(x => /caught here/.test(x.text));
  check("now unlike the catches here: score goes down", !!un && un.n < 0 && unlike.score < like.score);
  check("the catches line is capped (−1.5 to +2)", ln.n <= 2 && un.n >= -1.5);

  // ---- no catches to go on: plain water temperature for salt water; nothing for lakes
  w.eval(`historyFor = () => null; waterTempNow = () => ({ done: { f: 61 } })`);
  const cold = J(`spotScoreAt({ id: "zz", name: "Cold pier", water_type: "saltwater", lat: 26.1, lng: -80.1 }, ${T}, null)`);
  check("cold water costs a point", has(cold, /Cold water \(61°F\)/) && cold.why.find(x => /Cold water/.test(x.text)).n === -1);
  w.eval(`waterTempNow = () => ({ done: { f: 78 } })`);
  check("comfortable water says nothing", !has(J(`spotScoreAt({ id: "zz", name: "Pier", water_type: "saltwater", lat: 26.1, lng: -80.1 }, ${T}, null)`), /water/i));
  const lake = J(`spotScoreAt({ id: "lk", name: "Lake", water_type: "freshwater", lat: 26.5, lng: -80.2 }, ${T}, null)`);
  check("a lake gets the no-tide line and no water-temperature line", has(lake, /No tide here/) && !has(lake, /water \(/));

  // ---- night at the spot
  const two = new Date(); two.setDate(two.getDate() + 1); two.setHours(2, 0, 0, 0);
  check("2 AM at the spot is marked dark", has(J(`spotScoreAt({ id: "zz", name: "Pier", water_type: "saltwater", lat: 26.1, lng: -80.1 }, new Date(${+two}), null)`), /^Dark/));
  const noon = new Date(two); noon.setHours(12);
  check("noon is not dark", !has(J(`spotScoreAt({ id: "zz", name: "Pier", water_type: "saltwater", lat: 26.1, lng: -80.1 }, new Date(${+noon}), null)`), /^Dark/));
  console.log(good ? "ALL OK" : "FAIL"); process.exit(good ? 0 : 1);
})();
