// test239: v258 — trip-lifecycle step 6. Past trips (Community → Trips) for everyone who went: date, spot, who went, how long
// (first Start trip to end, or "about" start → back by), fish, other spots fished (only ones you can see; hidden = "a spot nearby").
// Solo Start trips stay listed; a Start trip joined to a planned trip shows under that trip, not twice. (setup/127 checked with pretend users.)
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const SPOTS = [{ id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, visibility: "public" },
  { id: "s9", name: "Mike Public", spot_type: "pier", water_type: "saltwater", lat: 26.30, lng: -80.09, created_by: ME, visibility: "public" },
  { id: "s5", name: "Secret Reef", spot_type: "reef", water_type: "saltwater", lat: 26.40, lng: -80.00, created_by: "u3", visibility: "friends", is_exact: false }];
const STARTED = Date.now() - 2 * 3600000, LATER = Date.now() + 5 * 3600000;
let PLANS = [], RSVPS = [], CATCHES = [], SESSIONS = [], SUMS = [];
const START = { member: { email: "sam@x.com", display_name: "Sam", is_admin: false, is_owner: false, status: "approved", terms_version: 1 }, me_extras: null, home_waters: null, app_prefs: null,
  tutorials: [], unread: 0, blocks: [], follows: [], notif_welcomed: { welcomed_at: "2026-01-01" }, hidden_spots: [], licenses: [], shares: [], picks: [],
  friendships: [{ user_a: ME, user_b: "u3", status: "accepted", requested_by: ME }], friends_accepted: [{ user_a: ME, user_b: "u3" }], float_plans: [], tackle: [], tournaments: [], tournament_members: [], hall_of_fame: [],
  notifications: [], get trip_plans() { return PLANS; }, get trip_plan_rsvps() { return RSVPS; }, rules_ver: "v1" };

async function open(withShare) {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/fishing-map/", beforeParse(w) {
    w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
    const rows = t => t === "spots_visible" || t === "spots" ? SPOTS : t === "trip_plans" ? PLANS : t === "trip_plan_rsvps" ? RSVPS : t === "catches" ? CATCHES : t === "sessions" ? SESSIONS : [];
    const chain = t => { const p = () => Promise.resolve({ data: rows(t), error: null, count: 0 });
      const o = {}; ["eq", "is", "in", "or", "ilike", "gte", "lte", "gt", "lt", "neq", "order", "select", "not", "contains", "match", "filter", "overlaps", "limit"].forEach(k => { o[k] = () => o; });
      o.range = () => p(); o.single = () => Promise.resolve({ data: null, error: null }); o.maybeSingle = () => Promise.resolve({ data: t === "members" ? START.member : t === "trip_plans" ? PLANS[0] : null, error: null });
      o.then = (a, b) => p().then(a, b); return o; };
    w.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
      rpc: async (fn, args) => { w.__rpc.push({ fn, args }); return fn === "past_trip_summaries" ? { data: SUMS, error: null } : fn === "trip_still_out" ? { data: { ...PLANS[0], back_by: new Date(Date.now() + 3600000).toISOString(), ended_at: args.p_answer === "done" ? new Date().toISOString() : null }, error: null } : fn === "ensure_profile" ? { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null } : fn === "app_start" ? { data: JSON.parse(JSON.stringify(START)), error: null } : { data: null, error: null }; },
      channel: () => { const c = { on: () => c, subscribe: () => c }; return c; }, removeChannel: () => {},
      storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }), createSignedUrl: async () => ({ data: null }), list: async () => ({ data: [] }) }) },
      from: t => ({ select: () => chain(t), delete: () => chain(t), insert: row => { w.__ins.push({ t, row }); const c = chain(t); c.select = () => c; c.single = () => Promise.resolve({ data: { id: "new1", ...row }, error: null }); return c; }, upsert: row => { w.__ups.push({ t, row: JSON.parse(JSON.stringify(row)) }); return Promise.resolve({ error: null }); }, update: () => chain(t) }) }) };
    w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], items: [] }) });
    w.__ups = []; w.__rpc = []; w.__ins = []; w.__shared = null; w.__copied = null;
    if (withShare) w.navigator.share = async o => { w.__shared = o; };
    Object.defineProperty(w.navigator, "clipboard", { value: { writeText: async s => { w.__copied = s; } }, configurable: true });
  }});
  const w = dom.window; w.scrollTo = () => {}; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
  await wait(4000);
  return w;
}
const H = 3600000, iso = ms => new Date(Date.now() + ms).toISOString();
const items = w => [...w.document.querySelectorAll("#feed-trips-list .feed-item")];
(async () => {
  PLANS = [
    { id: "p1", spot_id: "s1", created_by: "other", author: "Mike", plan_at: iso(-8 * H), started_at: iso(-8 * H), ended_at: iso(-5 * H), boat: true, created_at: iso(-30 * H) },
    { id: "p2", spot_id: "s9", created_by: ME, author: "Sam", plan_at: iso(-30 * H), created_at: iso(-40 * H) },          // nobody pressed Start trip: ended at back by
    { id: "p3", spot_id: "s1", created_by: ME, author: "Sam", plan_at: iso(1 * H), created_at: iso(-2 * H) }               // still planned: not in Past trips
  ];
  RSVPS = [{ plan_id: "p1", user_id: ME, name: "Sam" }, { plan_id: "p1", user_id: "u3", name: "Zed" }];
  SUMS = [{ plan_id: "p1", fish: 5, catches: 3, spot_ids: ["s1", "s9", "s5", "s-unseen"] }, { plan_id: "p2", fish: 0, catches: 0, spot_ids: [] }];
  SESSIONS = [
    { id: "x1", spot_id: "s9", created_by: ME, started_at: iso(-50 * H), ended_at: iso(-49 * H), fish: 2 },                // solo
    { id: "x2", spot_id: "s9", created_by: ME, started_at: iso(-7 * H), ended_at: iso(-6 * H), fish: 1, plan_id: "p1" }    // joined to Mike's trip
  ];
  let w = await open(false);
  await w.eval("loadPastTrips()"); await wait(400);
  const its = items(w), txt = its.map(i => i.textContent);
  ok(its.length === 3, "Past trips: Mike's boat trip, my no-Start-trip trip, and my solo trip (" + its.length + ")");
  const t1 = txt.find(t => /Hillsboro/.test(t)) || "";
  ok(/✋ Mike, You, Zed/.test(t1) && /🚤 Boat trip/.test(t1), "who went: Mike, You, Zed · 🚤 Boat trip");
  ok(/🕑 3 hr · 🐟 5 fish/.test(t1), "how long (first Start trip → end) and fish: 3 hr · 5 fish");
  ok(/Also fished: Mike Public, a spot nearby/.test(t1) && !/Secret Reef/.test(t1), "other spots: only ones I can see; hidden-exact = a spot nearby");
  const t2 = txt.find(t => /Mike Public/.test(t) && /You/.test(t) && !/Hillsboro/.test(t)) || "";
  ok(/🕑 about 4 hr · 🐟 0 fish/.test(t2), "a trip nobody started: about 4 hr (start → back by) · 0 fish");
  const solo = txt.filter(t => /Your own trip/.test(t));
  ok(solo.length === 1 && /🕑 1 hr · 🐟 2 fish/.test(solo[0]), "the solo Start trip stays, with 1 hr · 2 fish; the joined one isn't listed twice");
  ok(!txt.some(t => /Today/.test(t) && /Hillsboro/.test(t) && !/Mike/.test(t)), "a trip that's still planned isn't in Past trips");
  // the review page header repeats who went + how long
  its.find(i => /Hillsboro/.test(i.textContent)).click(); await wait(400);
  const rv = w.document.getElementById("trip-review-body").textContent;
  ok(/✋ Mike, You, Zed/.test(rv) && /🕑 3 hr/.test(rv), "trip review shows who went and how long");
  ok(/🚤 Boat trip: counts catches anywhere/.test(rv), "…and the boat-trip counting rule");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
