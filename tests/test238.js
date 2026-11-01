// test238: v257 — trip-lifecycle step 5. A trip that's on shows where it is now: the latest catch spot (by someone going, during the
// trip) that this phone can see; hidden-exact spots read "a spot nearby"; nothing visible = the meeting spot. Contest hints follow the
// boat / joined-Start-trip rule. (The database rules for contests + review are checked in setup/126 with pretend users.)
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
let PLANS = [], RSVPS = [], CATCHES = [];
const START = { member: { email: "sam@x.com", display_name: "Sam", is_admin: false, is_owner: false, status: "approved", terms_version: 1 }, me_extras: null, home_waters: null, app_prefs: null,
  tutorials: [], unread: 0, blocks: [], follows: [], notif_welcomed: { welcomed_at: "2026-01-01" }, hidden_spots: [], licenses: [], shares: [], picks: [],
  friendships: [{ user_a: ME, user_b: "u3", status: "accepted", requested_by: ME }], friends_accepted: [{ user_a: ME, user_b: "u3" }], float_plans: [], tackle: [], tournaments: [], tournament_members: [], hall_of_fame: [],
  notifications: [], get trip_plans() { return PLANS; }, get trip_plan_rsvps() { return RSVPS; }, rules_ver: "v1" };

async function open(withShare) {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/fishing-map/", beforeParse(w) {
    w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
    const rows = t => t === "spots_visible" || t === "spots" ? SPOTS : t === "trip_plans" ? PLANS : t === "trip_plan_rsvps" ? RSVPS : t === "catches" ? CATCHES : [];
    const chain = t => { const p = () => Promise.resolve({ data: rows(t), error: null, count: 0 });
      const o = {}; ["eq", "is", "in", "or", "ilike", "gte", "lte", "gt", "lt", "neq", "order", "select", "not", "contains", "match", "filter", "overlaps", "limit"].forEach(k => { o[k] = () => o; });
      o.range = () => p(); o.single = () => Promise.resolve({ data: null, error: null }); o.maybeSingle = () => Promise.resolve({ data: t === "members" ? START.member : t === "trip_plans" ? PLANS[0] : null, error: null });
      o.then = (a, b) => p().then(a, b); return o; };
    w.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
      rpc: async (fn, args) => { w.__rpc.push({ fn, args }); return fn === "trip_still_out" ? { data: { ...PLANS[0], back_by: new Date(Date.now() + 3600000).toISOString(), ended_at: args.p_answer === "done" ? new Date().toISOString() : null }, error: null } : fn === "ensure_profile" ? { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null } : fn === "app_start" ? { data: JSON.parse(JSON.stringify(START)), error: null } : { data: null, error: null }; },
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
const listText = w => w.document.getElementById("plan-list").textContent;
const circle = w => w.document.querySelector("#hn-water .hn-plan");
const C = (id, spot, by, ago, extra) => ({ id, spot_id: spot, created_by: by, species: "snook", caught_at: iso(-ago * H), visibility: "friends", how_many: 1, ...(extra || {}) });
(async () => {
  // Mike's boat trip from Hillsboro (s1), started 3 h ago; I'm in (Sam = me), Zed (u3) too
  PLANS = [{ id: "p1", spot_id: "s1", created_by: "other", author: "Mike", plan_at: iso(-3 * H), back_by: iso(3 * H), boat: true, started_at: iso(-3 * H) }];
  RSVPS = [{ plan_id: "p1", user_id: ME, name: "Sam" }, { plan_id: "p1", user_id: "u3", name: "Zed" }];
  // 1) no catches yet → meeting spot
  CATCHES = [];
  let w = await open(false);
  ok(w.eval(`planNowSpot(plans[0])`) === null && !/Latest catch at/.test(listText(w)), "no catches yet: no latest-catch line (the meeting spot shows)");
  ok(/Hillsboro/.test(circle(w).textContent), "…the On the water circle is named for the meeting spot");
  // 2) latest catch (by me) at Mike Public, 1 h ago; an older one at Hillsboro; one from before the trip; one by someone not going
  CATCHES = [C("c1", "s1", ME, 2), C("c2", "s9", ME, 1), C("c0", "s9", ME, 6), C("cx", "s1", "stranger", 0.2)];
  w = await open(false);
  ok(w.eval(`planNowSpot(plans[0]).spot.id`) === "s9", "latest catch during the trip by someone going = Mike Public");
  ok(/Latest catch at Mike Public/.test(listText(w)), "the trip card says 📍 Latest catch at Mike Public");
  ok(/Mike/.test(circle(w).textContent) && /latest catch at Mike Public/.test(circle(w).title), "…and the On the water circle follows it");
  // 3) Zed's newer catch at a spot whose exact place is hidden from me
  CATCHES = [C("c2", "s9", ME, 1), C("c3", "s5", "u3", 0.3)];
  w = await open(false);
  ok(w.eval(`planNowSpot(plans[0]).label`) === "a spot nearby" && /Latest catch at a spot nearby/.test(listText(w)), "hidden-exact spot reads \"a spot nearby\"");
  ok(/Nearby/.test(circle(w).textContent) && !/Secret Reef/.test(circle(w).title + listText(w)), "…the spot's name never shows");
  // 4) a catch at a spot I can't see at all (not loaded) is skipped
  CATCHES = [C("c2", "s9", ME, 1), C("c4", "s-unseen", "u3", 0.2)];
  w = await open(false);
  ok(w.eval(`planNowSpot(plans[0]).spot.id`) === "s9", "a catch at a spot I can't see doesn't move the trip (falls back to one I can see)");
  // 5) contest hint: boat trip → anywhere counts; shore trip → far spot doesn't, unless my Start trip is joined to the trip
  const TOUR = { id: "t1", title: "Trip contest", kind: "friends", plan_id: "p1", starts_at: iso(-4 * H), ends_at: iso(4 * H), boards: ["fish"] };
  const hint = async (w, spot) => { w.eval(`ctRows = [${JSON.stringify(TOUR)}]; ctMine = { t1: "joined" };`);
    w.eval(`openQuickCatch()`); await wait(300); w.eval(`qc.blob = null; qc.when = new Date(); showReview();`); await wait(300);
    const sel = w.document.getElementById("qc-spot"); sel.value = spot; w.eval("qcContestHint()");
    const t = w.document.getElementById("qc-contest-hint").textContent; w.eval("closeQuickCatch()"); return t; };
  let h = await hint(w, "s9");
  ok(/Trip contest: counts/.test(h), "boat trip contest: a catch at another spot counts (" + h.slice(0, 90) + ")");
  PLANS[0].boat = false; w = await open(false);
  h = await hint(w, "s9");
  ok(/only catches at Hillsboro Inlet count/.test(h), "shore trip contest: another spot doesn't count");
  await w.eval(`startSession(spots.find(x => x.id === "s9"), "p1")`); await wait(300);
  h = await hint(w, "s9");
  ok(/Trip contest: counts/.test(h) && /Part of your planned trip/.test(h), "…but it does while my ▶ Start trip is joined to the trip");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
