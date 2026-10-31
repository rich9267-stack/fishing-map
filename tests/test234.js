// test234: v253 — trip-lifecycle step 1. ▶ Start trip is saved to the database when it starts (not only when it ends),
// and a Start trip linked to a planned trip keeps that link (plan_id) at the start and at the end. Head copied from test233.
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
  { id: "s9", name: "Mike Public", spot_type: "pier", water_type: "saltwater", lat: 26.30, lng: -80.09, created_by: "other", visibility: "public", is_exact: false }];
const STARTED = Date.now() - 2 * 3600000, LATER = Date.now() + 5 * 3600000;
let PLANS = [], RSVPS = [];
const START = { member: { email: "sam@x.com", display_name: "Sam", is_admin: false, is_owner: false, status: "approved", terms_version: 1 }, me_extras: null, home_waters: null, app_prefs: null,
  tutorials: [], unread: 0, blocks: [], follows: [], notif_welcomed: { welcomed_at: "2026-01-01" }, hidden_spots: [], licenses: [], shares: [], picks: [],
  friendships: [], friends_accepted: [], float_plans: [], tackle: [], tournaments: [], tournament_members: [], hall_of_fame: [],
  notifications: [], get trip_plans() { return PLANS; }, get trip_plan_rsvps() { return RSVPS; }, rules_ver: "v1" };

async function open(withShare) {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/fishing-map/", beforeParse(w) {
    w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
    const rows = t => t === "spots_visible" || t === "spots" ? SPOTS : [];
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
const ses = w => w.__ups.filter(u => u.t === "sessions").map(u => u.row);
(async () => {
  PLANS = [{ id: "p1", spot_id: "s1", created_by: ME, author: "Sam", plan_at: new Date(STARTED).toISOString() }]; RSVPS = [];
  let w = await open(false);
  // 1) a plain Start trip: saved at the start, no link
  await w.eval(`startSession(spots.find(x => x.id === "s1"), null)`); await wait(300); // null = just me (v254 would otherwise join p1)
  let r = ses(w);
  ok(r.length === 1 && !r[0].ended_at && r[0].spot_id === "s1", "Start trip is saved to the database right when it starts");
  ok(!("plan_id" in r[0]), "…a plain Start trip has no planned-trip link");
  await w.eval(`endSession(true)`); await wait(300);
  r = ses(w);
  ok(r.length === 2 && r[1].ended_at && !("plan_id" in r[1]), "ending it saves the end, still no link");
  // 2) a Start trip linked to planned trip p1
  w.__ups.length = 0;
  await w.eval(`startSession(spots.find(x => x.id === "s1"), "p1")`); await wait(300);
  r = ses(w);
  ok(r.length === 1 && r[0].plan_id === "p1" && !r[0].ended_at, "a Start trip for a planned trip is saved at the start with its link");
  ok(w.eval("activeSession().plan_id") === "p1", "…the phone remembers the link while the trip is running");
  await w.eval(`endSession(true)`); await wait(300);
  r = ses(w);
  ok(r.length === 2 && r[1].plan_id === "p1" && r[1].ended_at, "…and the end keeps the link");
  ok(!w.eval("activeSession()"), "the trip is over on the phone");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
