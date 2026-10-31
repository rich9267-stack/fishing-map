// test236: v255 — trip-lifecycle step 3. Planned trips follow their real status: on while a linked ▶ Start trip runs (started_at) or from the
// start until back by (default 4 h); gone from the planned list once ended (ended_at, or back by passed) and listed in Past trips. No 3-hour rule.
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
  { id: "s9", name: "Mike Public", spot_type: "pier", water_type: "saltwater", lat: 26.30, lng: -80.09, created_by: ME, visibility: "public" }];
const STARTED = Date.now() - 2 * 3600000, LATER = Date.now() + 5 * 3600000;
let PLANS = [], RSVPS = [];
const START = { member: { email: "sam@x.com", display_name: "Sam", is_admin: false, is_owner: false, status: "approved", terms_version: 1 }, me_extras: null, home_waters: null, app_prefs: null,
  tutorials: [], unread: 0, blocks: [], follows: [], notif_welcomed: { welcomed_at: "2026-01-01" }, hidden_spots: [], licenses: [], shares: [], picks: [],
  friendships: [], friends_accepted: [], float_plans: [], tackle: [], tournaments: [], tournament_members: [], hall_of_fame: [],
  notifications: [], get trip_plans() { return PLANS; }, get trip_plan_rsvps() { return RSVPS; }, rules_ver: "v1" };

async function open(withShare) {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/fishing-map/", beforeParse(w) {
    w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
    const rows = t => t === "spots_visible" || t === "spots" ? SPOTS : t === "trip_plans" ? PLANS : t === "trip_plan_rsvps" ? RSVPS : [];
    const chain = t => { const p = () => Promise.resolve({ data: rows(t), error: null, count: 0 });
      const o = {}; ["eq", "is", "in", "or", "ilike", "gte", "lte", "gt", "lt", "neq", "order", "select", "not", "contains", "match", "filter", "overlaps", "limit"].forEach(k => { o[k] = () => o; });
      o.range = () => p(); o.single = () => Promise.resolve({ data: null, error: null }); o.maybeSingle = () => Promise.resolve({ data: t === "members" ? START.member : null, error: null });
      o.then = (a, b) => p().then(a, b); return o; };
    w.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
      rpc: async fn => fn === "ensure_profile" ? { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null } : fn === "app_start" ? { data: JSON.parse(JSON.stringify(START)), error: null } : { data: null, error: null },
      channel: () => { const c = { on: () => c, subscribe: () => c }; return c; }, removeChannel: () => {},
      storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }), createSignedUrl: async () => ({ data: null }), list: async () => ({ data: [] }) }) },
      from: t => ({ select: () => chain(t), delete: () => chain(t), insert: () => chain(t), upsert: row => { w.__ups.push({ t, row: JSON.parse(JSON.stringify(row)) }); return Promise.resolve({ error: null }); }, update: () => chain(t) }) }) };
    w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], items: [] }) });
    w.__ups = []; w.__shared = null; w.__copied = null;
    if (withShare) w.navigator.share = async o => { w.__shared = o; };
    Object.defineProperty(w.navigator, "clipboard", { value: { writeText: async s => { w.__copied = s; } }, configurable: true });
  }});
  const w = dom.window; w.scrollTo = () => {}; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
  await wait(4000);
  return w;
}
const H = 3600000, iso = ms => new Date(Date.now() + ms).toISOString();
const listText = w => w.document.getElementById("plan-list").textContent;
const row = w => w.document.getElementById("hn-water");
const waterPlans = w => row(w).querySelectorAll(".hn-plan").length;
(async () => {
  PLANS = [
    { id: "a", spot_id: "s1", created_by: ME, author: "Sam", plan_at: iso(-5 * H), note: "old no back-by" },                          // over (4 h default passed)
    { id: "b", spot_id: "s1", created_by: ME, author: "Sam", plan_at: iso(-5 * H), back_by: iso(1 * H), note: "long boat day" },     // on until back by
    { id: "c", spot_id: "s9", created_by: ME, author: "Sam", plan_at: iso(-7 * H), started_at: iso(-6 * H), note: "still fishing" },  // on: a Start trip running
    { id: "d", spot_id: "s1", created_by: ME, author: "Sam", plan_at: iso(-1 * H), started_at: iso(-1 * H), ended_at: iso(-0.2 * H), note: "done early" }, // ended
    { id: "e", spot_id: "s9", created_by: ME, author: "Sam", plan_at: iso(2 * H), note: "later today" }                               // planned
  ]; RSVPS = [];
  let w = await open(false);
  const st = id => w.eval(`planStatus(${JSON.stringify(PLANS.find(p => p.id === id))})`);
  ok(st("a") === "ended" && st("b") === "on" && st("c") === "on" && st("d") === "ended" && st("e") === "planned", "planStatus: a ended, b on, c on, d ended, e planned");
  ok(!/old no back-by/.test(listText(w)) && !/done early/.test(listText(w)), "ended trips are not in the planned list");
  ok(/long boat day/.test(listText(w)), "a trip 5 h in with back by in 1 h is still listed (no more 3-hour rule)");
  ok(/still fishing/.test(listText(w)), "a trip 7 h in with a Start trip running is still listed");
  ok(/later today/.test(listText(w)), "a later trip is listed as planned");
  ok(waterPlans(w) === 2, "On the water now shows the 2 trips that are on (got " + waterPlans(w) + ")");
  ok(!/old no back-by|done early/.test(w.document.getElementById("plan-line").textContent), "\"Already planned\" leaves out ended trips");
  ok(w.eval(`planStatus({ plan_at: "${iso(-3 * H)}" })`) === "on" && w.eval(`planStatus({ plan_at: "${iso(-4.1 * H)}" })`) === "ended", "with no back by, a trip is on for 4 h after its start");
  ok(w.eval(`planStatus({ plan_at: "${iso(-2 * H)}", back_by: "${iso(1 * H)}", cancelled_at: "${iso(-1 * H)}" })`) === "ended", "a cancelled trip is ended");
  // Past trips: ended ones are there as soon as they end; trips still on are not
  await w.eval("loadPastTrips()"); await wait(300);
  const past = w.document.getElementById("feed-trips-list").textContent;
  ok((past.match(/Tap to review/g) || []).length === 2, "Past trips lists the 2 ended trips (a, d), not the ones still on or planned");
  // joining: an ended trip can't be joined; one that's on can
  ok(w.eval("joinablePlans().map(p => p.id).sort().join()") === "b,c", "only trips that are on (or start within an hour) can be joined");
  // my linked Start trip ends and the trip ended with me: the list reloads and it's gone
  await w.eval(`startSession(spots.find(x => x.id === "s1"), "b")`); await wait(300);
  PLANS.find(p => p.id === "b").ended_at = iso(0);
  await w.eval("endSession(true)"); await wait(600);
  ok(!/long boat day/.test(listText(w)), "after my linked Start trip ends (and the database ends the trip) it leaves the list");
  // starting a linked trip before the start time turns it "on" right away
  ok(w.eval(`planStatus(plans.find(p => p.id === "e"))`) === "planned", "the later trip is planned");
  PLANS.find(p => p.id === "e").plan_at = iso(0.5 * H); w = await open(false);
  await w.eval(`startSession(spots.find(x => x.id === "s9"), "e")`); await wait(300);
  ok(w.eval(`planStatus(plans.find(p => p.id === "e"))`) === "on" && waterPlans(w) >= 1, "pressing ▶ Start trip 30 min early puts the trip on the water now");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
