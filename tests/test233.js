// test233: v251 — a planned trip that has started shows in Home's "On the water now" row (before, only Heading out check-ins did).
// One circle per started trip (named for the spot); friends going count toward "N friends fishing"; later trips don't show. Head copied from test232.
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
      from: t => ({ select: () => chain(t), delete: () => chain(t), insert: () => chain(t), upsert: () => Promise.resolve({ error: null }), update: () => chain(t) }) }) };
    w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], items: [] }) });
    w.__shared = null; w.__copied = null;
    if (withShare) w.navigator.share = async o => { w.__shared = o; };
    Object.defineProperty(w.navigator, "clipboard", { value: { writeText: async s => { w.__copied = s; } }, configurable: true });
  }});
  const w = dom.window; w.scrollTo = () => {}; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
  await wait(4000);
  return w;
}
const items = w => [...w.document.querySelectorAll("#plan-list .feed-item")];
const btn = (it, re) => [...it.querySelectorAll("button, a")].find(b => re.test(b.textContent));

const row = w => w.document.getElementById("hn-water");
(async () => {
  // 1) my own trip started 2 h ago, nobody else going
  PLANS = [{ id: "p1", spot_id: "s1", created_by: ME, author: "Sam", plan_at: new Date(STARTED).toISOString() }]; RSVPS = [];
  let w = await open(false);
  ok(row(w).querySelectorAll(".hn-plan").length === 1, "my trip that started 2 h ago gets a circle in On the water now");
  ok(/Hillsboro/.test(row(w).textContent) && /Your trip is on/.test(row(w).textContent), "…named for the spot, and says my trip is on");
  ok(/Heading out/.test(row(w).textContent), "Heading out is still first");
  // 2) a friend's started trip with Zed going too, plus a later trip that hasn't started
  PLANS = [{ id: "p2", spot_id: "s9", created_by: "other", author: "Mike", plan_at: new Date(STARTED).toISOString() },
    { id: "p3", spot_id: "s1", created_by: ME, author: "Sam", plan_at: new Date(LATER).toISOString() }];
  RSVPS = [{ plan_id: "p2", user_id: "u3", name: "Zed" }];
  w = await open(false);
  ok(row(w).querySelectorAll(".hn-plan").length === 1, "only the trip that has started shows (the one later today doesn't)");
  ok(/2 friends fishing/.test(row(w).textContent), "Mike + Zed count as 2 friends fishing");
  let went = false; w.document.getElementById("plan-line").addEventListener("click", () => went = true);
  row(w).querySelector(".hn-plan").click();
  ok(went, "tapping the trip circle opens the planned trips list");
  // 3) no trips = same as before
  PLANS = []; w = await open(false);
  ok(!row(w).querySelector(".hn-plan") && /No friends out right now/.test(row(w).textContent), "no started trips: row looks the same as before");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
