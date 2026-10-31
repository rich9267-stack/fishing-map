// test235: v254 — trip-lifecycle step 2. ▶ Start trip joins a planned trip: at the meeting spot it joins with no question; elsewhere it asks
// "Joining Sam's trip?" Yes / No, just me; more than 1 h early or not going = solo. The trip card gets ▶ Start trip. Head copied from test234.
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
const SOON = Date.now() - 30 * 60000, LATE = Date.now() + 3 * 3600000;
(async () => {
  // 1) my trip at Hillsboro started 30 min ago: Start trip at Hillsboro joins it with no question
  PLANS = [{ id: "p1", spot_id: "s1", created_by: ME, author: "Sam", plan_at: new Date(SOON).toISOString() }]; RSVPS = [];
  let w = await open(false), asked = 0;
  w.confirm = () => { asked++; return true; };
  await w.eval(`startSession(spots.find(x => x.id === "s1"))`); await wait(300);
  ok(w.eval("activeSession().plan_id") === "p1" && asked === 0, "at the meeting spot: joins my planned trip with no question");
  ok(ses(w)[0].plan_id === "p1", "…saved at the start with the link");
  ok(/part of your trip/.test(w.document.body.textContent), "…the message says it's part of your trip");
  await w.eval(`endSession(true)`); await wait(200);
  // 2) starting somewhere else asks; Yes joins, No = just me
  await w.eval(`startSession(spots.find(x => x.id === "s9"))`); await wait(300);
  ok(asked === 1 && w.eval("activeSession().plan_id") === "p1", "at another spot it asks, and Yes joins the trip (spot hopping)");
  ok(w.eval("activeSession().spot_id") === "s9", "…the Start trip is at the spot I'm really at");
  await w.eval(`endSession(true)`); await wait(200);
  w.confirm = () => { asked++; return false; };
  await w.eval(`startSession(spots.find(x => x.id === "s9"))`); await wait(300);
  ok(asked === 2 && !w.eval("activeSession().plan_id"), "No, just me = a solo trip");
  await w.eval(`endSession(true)`); await wait(200);

  // 3) the real question box (no test answer): text, Yes / No, just me
  w = await open(false);
  let p = w.eval(`startSession(spots.find(x => x.id === "s9"))`); await wait(200);
  const box = w.document.querySelector(".trip-join-box");
  ok(box && /Joining your trip \(meeting at Hillsboro Inlet\)\?/.test(box.textContent), "question box: Joining your trip (meeting at Hillsboro Inlet)?");
  const bs = [...box.querySelectorAll("button")].map(b => b.textContent);
  ok(bs.join("|") === "Yes|No, just me", "…buttons Yes / No, just me");
  [...box.querySelectorAll("button")].find(b => b.textContent === "No, just me").click(); await p; await wait(200);
  ok(!w.document.querySelector(".trip-join-box") && w.eval("activeSession()") && !w.eval("activeSession().plan_id"), "…No, just me starts a solo trip");
  await w.eval(`endSession(true)`); await wait(200);
  p = w.eval(`startSession(spots.find(x => x.id === "s9"))`); await wait(200);
  w.document.querySelector(".trip-join-box").parentNode.click(); await p; await wait(200);
  ok(!w.eval("activeSession()"), "tapping outside the box starts nothing");

  // 4) the trip card: ▶ Start trip, then "You're on this trip"
  let st = w.document.querySelector("#plan-list .plan-start");
  ok(st && /Start trip/.test(st.textContent), "the trip card has ▶ Start trip once the trip is near");
  st.click(); await wait(400);
  ok(w.eval("activeSession() && activeSession().plan_id") === "p1" && w.eval("activeSession().spot_id") === "s1", "…tapping it starts a trip linked to the plan, at the meeting spot");
  ok(!w.document.querySelector("#plan-list .plan-start") && /You're on this trip/.test(w.document.getElementById("plan-list").textContent), "…then the card says You're on this trip");

  // 5) a trip more than 1 h away, and a friend's trip I'm not going on: solo, no question, no card button
  PLANS = [{ id: "p2", spot_id: "s1", created_by: ME, author: "Sam", plan_at: new Date(LATE).toISOString() },
    { id: "p3", spot_id: "s9", created_by: "other", author: "Mike", plan_at: new Date(SOON).toISOString() }];
  w = await open(false); asked = 0; w.confirm = () => { asked++; return true; };
  await w.eval(`startSession(spots.find(x => x.id === "s1"))`); await wait(300);
  ok(asked === 0 && !w.eval("activeSession().plan_id"), "3 h early or not going: a solo trip, no question");
  ok(!w.document.querySelector("#plan-list .plan-start"), "…and no ▶ Start trip on those cards");
  await w.eval(`endSession(true)`); await wait(200);

  // 6) two trips on: I'm in on Mike's too → the box lists both
  RSVPS = [{ plan_id: "p3", user_id: ME, name: "Sam" }];
  PLANS = [{ id: "p1", spot_id: "s1", created_by: ME, author: "Sam", plan_at: new Date(SOON).toISOString() }, PLANS[1]];
  w = await open(false);
  p = w.eval(`startSession(spots.find(x => x.id === "s1"))`); await wait(200);
  const b2 = w.document.querySelector(".trip-join-box");
  const labels = b2 ? [...b2.querySelectorAll("button")].map(b => b.textContent) : [];
  ok(labels.length === 3 && /Your trip · Hillsboro/.test(labels[0]) && /Mike's trip · Mike Public/.test(labels[1]) && labels[2] === "No, just me", "two trips on: the box lists both + No, just me (" + labels.join(" | ") + ")");
  b2.querySelectorAll("button")[1].click(); await p; await wait(200);
  ok(w.eval("activeSession().plan_id") === "p3", "…picking Mike's trip joins it");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
