// test240: v259 — What's New only shows updates you haven't seen (kept on the phone AND the account: app_prefs.wn_seen, setup/128),
// brand-new people skip it, ✕ / Escape close it; Home "Your spots" + Best spots today = only your own spots, friends' in a folded
// "👥 Friends' spots" group with "by <name>"; other people's profiles no longer list spots.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const SPOTS = [{ id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, visibility: "friends", added_by: "Sam" },
  { id: "s5", name: "Zed Reef", spot_type: "reef", water_type: "saltwater", lat: 26.40, lng: -80.00, created_by: "u3", visibility: "public", added_by: "Zed" }];
const STARTED = Date.now() - 2 * 3600000, LATER = Date.now() + 5 * 3600000;
let PLANS = [], RSVPS = [], SESSIONS = [], SUMS = [];
const ck = (id, sp, by) => ({ id, spot_id: sp, created_by: by, species: "Snook", how_many: 1, caught_at: new Date(Date.now() - 86400000).toISOString(), moon_phase: "full", tide_stage: "rising", pressure_trend: "steady", visibility: "friends" });
const CATCHES = [ck("c1", "s1", ME), ck("c2", "s1", ME), ck("c3", "s1", ME), ck("c4", "s5", "u3"), ck("c5", "s5", "u3"), ck("c6", "s5", "u3")];
const START = { member: { email: "sam@x.com", display_name: "Sam", is_admin: false, is_owner: false, status: "approved", terms_version: 1 }, me_extras: null, home_waters: null, get app_prefs() { return PREFS; },
  tutorials: [], unread: 0, blocks: [], follows: [], get notif_welcomed() { return WELCOMED; }, hidden_spots: [], licenses: [], shares: [], picks: [],
  friendships: [{ user_a: ME, user_b: "u3", status: "accepted", requested_by: ME }], friends_accepted: [{ user_a: ME, user_b: "u3" }], float_plans: [], tackle: [], tournaments: [], tournament_members: [], hall_of_fame: [],
  notifications: [], get trip_plans() { return PLANS; }, get trip_plan_rsvps() { return RSVPS; }, rules_ver: "v1" };

let PREFS = null, WELCOMED = { welcomed_at: "2026-01-01" };
async function open(withShare, localSeen) {
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
    if (localSeen) w.localStorage.setItem("fm-wn", localSeen);
    w.__ups = []; w.__rpc = []; w.__ins = []; w.__shared = null; w.__copied = null;
    if (withShare) w.navigator.share = async o => { w.__shared = o; };
    Object.defineProperty(w.navigator, "clipboard", { value: { writeText: async s => { w.__copied = s; } }, configurable: true });
  }});
  const w = dom.window; w.scrollTo = () => {}; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
  await wait(4000);
  return w;
}
const vis = w => !w.document.getElementById("whatsnew").hidden;
const titles = w => [...w.document.querySelectorAll("#wn-body h3")].map(h => h.textContent);
const wnUps = w => w.__ups.filter(u => u.t === "app_prefs" && u.row.wn_seen);
(async () => {
  let w = await open(false);
  const NEWEST = w.eval("WHATS_NEW[0].id"), OLD = w.eval("WHATS_NEW[3].id");
  // (c) no record anywhere (existing member, new phone) → only the newest update
  ok(vis(w) && titles(w).length === 1 && titles(w)[0] === w.eval("WHATS_NEW[0].title"), "no record anywhere: only the newest update shows (" + titles(w).length + ")");
  // (d) ✕ closes it and saves on the phone + the account
  const x = w.document.getElementById("wn-x");
  ok(x && x.getAttribute("aria-label") === "Close" && x.closest(".wn-head"), "✕ (Close) sits in the popup's top bar");
  x.click(); await wait(100);
  ok(!vis(w), "✕ closes the popup");
  ok(w.localStorage.getItem("fm-wn") === NEWEST && wnUps(w).some(u => u.row.wn_seen === NEWEST && u.row.user_id === ME), "…and saves it as seen on the phone and the account");
  // (e) Your spots: only mine; Friends' spots folded below with "by Zed"
  const list = w.document.getElementById("spot-list");
  const names = () => [...list.querySelectorAll(".spot .spot-name")].map(n => n.textContent);
  ok(names().some(n => /Hillsboro/.test(n)) && !names().some(n => /Zed Reef/.test(n)), "Your spots lists only my spot (" + names().join(", ") + ")");
  const fg = list.querySelector(".spot-group-friends");
  ok(fg && /Friends' spots/.test(fg.textContent) && /1/.test(fg.querySelector(".spot-group-n").textContent) && fg.getAttribute("aria-expanded") === "false", "👥 Friends' spots (1) is below, folded by default");
  fg.click(); await wait(100);
  const fr = [...list.querySelectorAll(".spot")].find(s => /Zed Reef/.test(s.textContent));
  ok(fr && /by Zed/.test(fr.querySelector(".spot-by").textContent), "opened: Zed's spot shows with 'by Zed'");
  ok(w.document.querySelector(".spot-group-friends").getAttribute("aria-expanded") === "true" && w.localStorage.getItem("fm-friend-spots-open") === "true", "…and stays open (remembered)");
  // (f) Best spots today: no friend's spot
  w.eval("renderBest()"); await wait(100);
  const best = w.document.getElementById("best-list").textContent;
  ok(/Hillsboro/.test(best) && !/Zed Reef/.test(best), "Best spots today ranks only my own spots");
  // (g) someone else's profile: no spot list, no spot count
  w.document.getElementById("tab-feed").click(); await wait(300); w.document.getElementById("feed-mode-public").click(); await wait(300);
  w.eval("openProfile('u3')"); await wait(900);
  const pf = w.document.getElementById("pub-profile-body").textContent;
  ok(pf.length > 0 && !/Public spots/.test(pf) && !/public spot/.test(pf) && /public catches/.test(pf), "a profile has no 'Public spots' list or count (catches count stays)");

  // (b) a member whose account says they saw an older update → only the newer ones, even on a new phone
  PREFS = { palette: "original", wn_seen: OLD };
  w = await open(false);
  ok(vis(w) && titles(w).length === 3, "account seen = 4th newest: the 3 newer updates show (" + titles(w).length + ")");
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" })); await wait(100);
  ok(!vis(w) && wnUps(w).some(u => u.row.wn_seen === NEWEST), "Escape closes it too and saves");
  // this phone already saw everything but the account doesn't know yet → no popup, account updated quietly
  w = await open(false, NEWEST);
  ok(!vis(w) && wnUps(w).some(u => u.row.wn_seen === NEWEST), "seen on this phone: no popup, and the account is told");
  // account says newest → no popup on a new phone, no extra save
  PREFS = { palette: "original", wn_seen: NEWEST };
  w = await open(false);
  ok(!vis(w) && !wnUps(w).length, "account already up to date: no popup on a new phone");
  // (a) brand-new member with the welcome tour → never sees What's New, and it's saved to the account
  PREFS = null; WELCOMED = null;
  w = await open(false);
  ok(!w.document.getElementById("welcome").hidden && !vis(w), "brand-new member: welcome tour, no What's New");
  ok(wnUps(w).some(u => u.row.wn_seen === NEWEST), "…and the newest update is saved as seen on the account");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
