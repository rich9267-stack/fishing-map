// test237: v256 — trip-lifecycle step 4. Plan a trip has "Back by about" (2/4/6 h, all day, overnight; default 4 h) and a 🚤 Boat trip box,
// saved as back_by / boat. The "🎣 Still out?" box (opened by the back-by phone alert) offers ▶ Start trip / +1 hour / Done to anyone going.
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
const box = w => w.document.querySelector(".still-out-box");
const btns = w => box(w) ? [...box(w).querySelectorAll("button")] : [];
(async () => {
  PLANS = [{ id: "p1", spot_id: "s1", created_by: ME, author: "Sam", plan_at: iso(-5 * H), back_by: iso(-0.2 * H), note: "due back" }]; RSVPS = [];
  let w = await open(false);
  // 1) the form
  w.document.getElementById("plan-add").click(); await wait(200);
  const back = w.document.getElementById("pl-back"), boat = w.document.getElementById("pl-boat");
  ok(back && back.value === "4" && [...back.options].map(o => o.value).join() === "2,4,6,day,night", "Back by about: 2 / 4 (default) / 6 hours, all day, overnight");
  ok(boat && !boat.checked && /Boat trip/.test(boat.parentNode.textContent), "🚤 Boat trip box, unticked");
  const d = new Date(Date.now() + 2 * H); d.setMinutes(0, 0, 0);
  const pad = n => String(n).padStart(2, "0");
  w.document.getElementById("pl-date").value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  w.document.getElementById("pl-time").value = `${pad(d.getHours())}:00`;
  back.value = "6"; boat.checked = true;
  w.confirm = () => true;
  w.document.getElementById("plan-form").dispatchEvent(new w.Event("submit", { cancelable: true })); await wait(500);
  const ins = w.__ins.filter(x => x.t === "trip_plans").map(x => x.row)[0];
  ok(ins && ins.boat === true && new Date(ins.back_by) - new Date(ins.plan_at) === 6 * H, "posting saves boat: yes and back by = start + 6 h");
  // 2) back-by choices
  ok(w.eval(`backByFrom(new Date(2026, 9, 31, 19, 0), "night").toString()`) === new Date(2026, 10, 1, 8, 0).toString(), "overnight from 7 PM = back 8 AM next morning");
  ok(w.eval(`backByFrom(new Date(2026, 9, 31, 6, 0), "day") - new Date(2026, 9, 31, 6, 0)`) === 10 * H && w.eval(`backByFrom(new Date(2026, 9, 31, 6, 0), "2") - new Date(2026, 9, 31, 6, 0)`) === 2 * H, "all day = 10 h, 2 hours = 2 h");
  // 3) the card shows boat + back by
  PLANS = [{ id: "p2", spot_id: "s1", created_by: ME, author: "Sam", plan_at: iso(1 * H), back_by: iso(7 * H), boat: true, note: "boat day" }];
  w = await open(false);
  const card = w.document.getElementById("plan-list").textContent;
  ok(/🚤 Boat trip/.test(card) && /Back by about/.test(card), "the trip card says 🚤 Boat trip · Back by about …");
  // 4) Still out? box (the alert link): due-back trip I'm on
  PLANS = [{ id: "p1", spot_id: "s1", created_by: ME, author: "Sam", plan_at: iso(-5 * H), back_by: iso(-0.2 * H), note: "due back" }];
  w = await open(false);
  await w.eval(`openStillOut("p1")`); await wait(200);
  ok(box(w) && /Still out\?/.test(box(w).textContent) && /Your trip at Hillsboro Inlet/.test(box(w).textContent), "Still out? box names the trip");
  ok(btns(w).map(b => b.textContent).join("|") === "▶ Start trip|+1 hour|Done — we're back|Not now", "…▶ Start trip / +1 hour / Done / Not now");
  btns(w)[1].click(); await wait(300);
  ok(w.__rpc.some(r => r.fn === "trip_still_out" && r.args.p_plan === "p1" && r.args.p_answer === "more") && !box(w), "+1 hour asks the database to move back by an hour");
  await w.eval(`openStillOut("p1")`); await wait(200);
  btns(w)[2].click(); await wait(300);
  ok(w.__rpc.some(r => r.fn === "trip_still_out" && r.args.p_answer === "done"), "Done ends the trip");
  await w.eval(`openStillOut("p1")`); await wait(200);
  btns(w)[0].click(); await wait(500);
  ok(w.eval("activeSession() && activeSession().plan_id") === "p1", "▶ Start trip starts a Start trip linked to the trip");
  await w.eval("endSession(true)"); await wait(200);
  // 5) a friend's trip I'm not going on: no box
  PLANS = [{ id: "p3", spot_id: "s9", created_by: "other", author: "Mike", plan_at: iso(-5 * H), back_by: iso(-0.2 * H) }]; RSVPS = [];
  w = await open(false);
  await w.eval(`openStillOut("p3")`); await wait(200);
  ok(!box(w), "someone not going gets no Still out? box");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
