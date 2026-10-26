// test206: Weekly challenges on Compete (v212, setup/110): card, progress, coin and gem rewards, badges.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
const ADMIN = process.env.DEL_ADMIN === "1";
const SPOTS = [{ id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0 }];
const T0 = Date.now() - 2 * 3600000, CATCHES = [{ id: "c1", spot_id: "s1", species: "Snook", how_many: 1, caught_at: new Date(T0 + 1800000).toISOString(), created_by: ME, length_in: 25, session_id: "ses1" },
  { id: "c2", spot_id: "s1", species: "Redfish", how_many: 2, caught_at: new Date(T0 + 3000000).toISOString(), created_by: ME, session_id: "ses1" }];
const GEO = [{ catch_id: "c1", lat: 26.2575, lng: -80.0805, accuracy_m: 8 }];
const SESSIONS = [{ id: "ses3", spot_id: "s1", started_at: new Date(T0 - 3 * 86400000).toISOString(), ended_at: new Date(T0 - 3 * 86400000 + 2700000).toISOString(), created_by: ME, fish: 0 },
  { id: "ses1", spot_id: "s1", started_at: new Date(T0).toISOString(), ended_at: new Date(T0 + 5400000).toISOString(), created_by: ME, fish: 3 },
  { id: "ses2", spot_id: "s1", started_at: new Date(T0 - 86400000).toISOString(), ended_at: new Date(T0 - 86400000 + 3600000).toISOString(), created_by: "u-other", fish: 0 }];
const ORDER = [], RPCS = [], REMOVED = [], STATE = { missing: false, fail: false, signedOut: false, chErr: true, ch: null };
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, lte: () => o, neq: () => o, order: () => o, range: () => p, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new" }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve({ data: { email: "sam@x.com", display_name: "Sam", is_admin: ADMIN, status: "approved" }, error: null }) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => { STATE.signedOut = true; } },
    rpc: async (fn, a) => {
      RPCS.push([fn, a]); ORDER.push(fn);
      if (fn === "claim_challenges") return STATE.chErr ? { data: null, error: { message: "Could not find the function" } } : { data: JSON.parse(JSON.stringify(STATE.ch)), error: null };
      if (fn === "ensure_profile") return { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null };
      if (/^delete_my_account/.test(fn) && STATE.missing) return { data: null, error: { message: "Could not find the function public." + fn + " in the schema cache" } };
      if (fn === "delete_my_account_preview") return { data: { spots: 1, catches: 1, photos: 2, messages: 5, friends: 3, groups: 1, admin: ADMIN }, error: null };
      if (fn === "delete_my_account") return STATE.fail ? { data: null, error: { message: "network" } } : { data: { ok: true, spots_handed_over: 0 }, error: null };
      return { data: null, error: null };
    },
    storage: { from: b => ({ createSignedUrls: async () => ({ data: [] }), createSignedUrl: async () => ({ data: null }),
      list: async folder => ({ data: b === "avatars" && folder === ME ? [{ name: "me.jpg" }] : b === "group-avatars" && folder === "g1" ? [{ name: "pic.jpg" }] : [], error: null }),
      remove: async paths => { REMOVED.push([b, paths]); ORDER.push("remove:" + b); return { data: paths, error: null }; } }) },
    from: t => ({ select: () => chain(t === "spots" || t === "spots_visible" ? SPOTS : t === "catches" ? CATCHES : t === "sessions" ? SESSIONS : t === "catch_geo" ? GEO : t === "photos" ? [{ path: ME + "/a.jpg" }, { path: ME + "/b.jpg" }] : t === "groups" ? [{ id: "g1" }] : t === "profiles" ? [{ user_id: ME, handle: "sam", display_name: "Sam" }] : []),
      delete: () => chain(null), insert: () => chain(null), upsert: () => Promise.resolve({ error: null }), update: () => chain(null) }) }) };
  w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], predictions: [] }) });
}});
const w = dom.window; w.scrollTo = () => {}; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(1200);
  let good = true; const check = (name, ok) => { console.log(name + ":", ok ? "yes" : "NO"); if (!ok) good = false; };
  const $ = id => d.getElementById(id), ev = c => w.eval(c);
  const toasts = []; w.toast = t => toasts.push(t);
  const card = $("ch-card");
  check("the challenges card sits at the top of Compete, above contests", !!card && card.nextElementSibling && card.nextElementSibling.id === "contests");
  $("tab-compete").click(); await wait(300);
  check("database step missing / offline: the card stays hidden", card.hidden);
  const ends = new Date(Date.now() + 2 * 86400000 + 5 * 3600000).toISOString();
  const items = [{ key: "fish3", title: "Catch 3 fish", goal: 3, progress: 3, done: true, coins: 30 },
    { key: "kinds2", title: "Catch 2 different kinds of fish", goal: 2, progress: 1, done: false, coins: 30 },
    { key: "trip", title: "Finish a trip with Start trip (30 minutes or more)", goal: 1, progress: 0, done: false, coins: 25 }];
  STATE.chErr = false;
  STATE.ch = { week: "2026-10-26", ends_at: ends, items, week_gems: 2, weeks_done: 0, wallet: { coins: 130, gems: 1, today: 0, cap: 50, collections: [], recent: [] }, added: [{ reason: "challenge", coins: 30, note: "Catch 3 fish" }] };
  await ev("chClaim(true)");
  check("with data the card shows 3 challenges", !card.hidden && card.querySelectorAll(".ch-row").length === 3);
  const rows = [...card.querySelectorAll(".ch-row")];
  check("a finished one shows a tick and 'Paid'", rows[0].classList.contains("done") && rows[0].querySelector(".ch-tick").textContent === "✓" && rows[0].querySelector(".ch-pay").textContent === "Paid");
  check("an open one shows progress (1/2) and its coin reward", rows[1].querySelector(".ch-tick").textContent === "1/2" && /🪙 30/.test(rows[1].querySelector(".ch-pay").textContent) && rows[1].querySelector(".ch-bar span").style.width === "50%");
  check("time left is shown (2d 5h left)", /^2d [45]h left$/.test($("ch-left").textContent));
  check("the gem bonus line says finish all 3 for 💎 2 (1 of 3 done)", /Finish all 3 before Sunday night: 💎 2/.test($("ch-bonus").textContent) && /1 of 3 done/.test($("ch-bonus").textContent));
  check("new coins pop up as a message (weekly challenge)", toasts.some(t => /🪙 \+30/.test(t) && /weekly challenge/.test(t)));
  check("the wallet shows the new total from the database", /130/.test(($("wallet-box") || d.body).textContent));
  check("no challenge badge yet", !ev("BADGES.filter(b => b.n(badgeCtx()) >= b.goal).map(b => b.id)").includes("wk1"));
  STATE.ch.items = items.map(x => Object.assign({}, x, { progress: x.goal, done: true }));
  STATE.ch.weeks_done = 1; STATE.ch.added = [{ reason: "challenge", coins: 30, note: "x" }, { reason: "challenge", coins: 25, note: "y" }, { reason: "challenge_week", gems: 2, note: "Week of 2026-10-26" }];
  toasts.length = 0; await ev("chClaim(true)");
  check("all done: the bonus line says the gems are earned", $("ch-bonus").classList.contains("done") && /💎 2 earned/.test($("ch-bonus").textContent));
  check("the message adds up coins and gems (🪙 +55 · 💎 +2)", toasts.some(t => /🪙 \+55 · 💎 \+2/.test(t)));
  check("the 'Challenge accepted' badge is earned after one full week", ev("BADGES.filter(b => b.n(badgeCtx()) >= b.goal).map(b => b.id)").includes("wk1") && !ev("BADGES.filter(b => b.n(badgeCtx()) >= b.goal).map(b => b.id)").includes("wk4"));
  check("coin help explains weekly challenges", /Weekly challenges/.test(fs.readFileSync(require("path").join(__dirname, "../js/14-tank.js"), "utf8")));
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
