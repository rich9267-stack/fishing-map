// test231: v249 — ⚡ one database call at app open (setup/122 app_start). The app asks app_start once and each startup loader takes its list from
// the answer (js/02 bootTake) instead of asking separately; if app_start fails, every loader asks as before. The rules list (~354 KB) is kept
// on the phone and only downloaded again when app_start's fingerprint (rules_ver) changes.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const RULE = { id: 1, species: "Snook", match: "snook", min_in: 28, max_in: 32, active: true, regions: ["atlantic"] };
const START = { member: { email: "sam@x.com", display_name: "Sam", is_admin: false, is_owner: false, status: "approved", terms_version: 1 }, me_extras: null, home_waters: null, app_prefs: null,
  tutorials: [], unread: 3, blocks: [{ blocked: "u-pest" }], follows: [], notif_welcomed: { welcomed_at: "2026-01-01" }, hidden_spots: [], licenses: [], shares: [], picks: [],
  friendships: [], friends_accepted: [], float_plans: [], tackle: [{ id: "t1", name: "Penn reel", created_at: "2026-10-01" }], tournaments: [], tournament_members: [], hall_of_fame: [],
  notifications: [], trip_plans: [], trip_plan_rsvps: [], rules_ver: "v1" };

async function open(mode, seed) {
  const LOG = [];
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
    w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
    if (seed) w.localStorage.setItem("fm-rules-copy", JSON.stringify(seed));
    const rows = t => t === "fish_rules" ? [RULE] : [];
    const chain = (t, how) => { const q = [how]; const p = () => { LOG.push(t + " " + q.join(" ")); return Promise.resolve({ data: rows(t), error: null, count: 0 }); };
      const o = {}; ["eq", "is", "in", "or", "ilike", "gte", "lte", "gt", "lt", "neq", "order", "select", "not", "contains", "match", "filter", "overlaps"].forEach(k => { o[k] = (...a) => { q.push(k + "(" + a.map(x => String(x).slice(0, 30)).join(",") + ")"); return o; }; });
      o.range = () => p(); o.limit = n => { q.push("limit(" + n + ")"); return o; };
      o.single = () => { LOG.push(t + " " + q.join(" ")); return Promise.resolve({ data: null, error: null }); };
      o.maybeSingle = () => { LOG.push(t + " " + q.join(" ")); return Promise.resolve({ data: t === "members" ? START.member : null, error: null }); };
      o.then = (a, b) => p().then(a, b); return o; };
    w.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
      rpc: async fn => { LOG.push("RPC " + fn);
        if (fn === "ensure_profile") return { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null };
        if (fn === "app_start") return mode === "fail" ? { data: null, error: { message: "Could not find the function public.app_start" } } : { data: JSON.parse(JSON.stringify(Object.assign({}, START, mode === "newrules" ? { rules_ver: "v2" } : {}))), error: null };
        return { data: null, error: null }; },
      channel: () => { const c = { on: () => c, subscribe: () => c }; return c; }, removeChannel: () => {},
      storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }), createSignedUrl: async () => ({ data: null }), list: async () => ({ data: [] }) }) },
      from: t => ({ select: (s, o) => chain(t, "select(" + String(s || "*").slice(0, 40) + (o && o.head ? ",HEAD" : "") + ")"), delete: () => chain(t, "delete"), insert: () => chain(t, "insert"), upsert: () => Promise.resolve({ error: null }), update: () => chain(t, "update") }) }) };
    w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], items: [] }) });
  }});
  const w = dom.window; w.scrollTo = () => {}; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
  await wait(4000);
  return { LOG, w, asked: t => LOG.filter(l => l.startsWith(t + " ")).length };
}

const SMALL = ["members", "profile_extras", "home_waters", "app_prefs", "tutorials_seen", "messages", "blocks", "spot_follows", "notif_prefs", "fishing_licenses", "spot_shares",
  "suggestion_picks", "friendships", "float_plans", "tackle", "tournaments", "tournament_members", "notifications", "trip_plans", "trip_plan_rsvps"];

(async () => {
  // 1) app_start answers: none of the small lists is asked separately
  const a = await open("ok");
  ok(a.LOG[0] === "RPC app_start", "the first database call is app_start");
  const still = SMALL.filter(t => a.asked(t) && !(t === "messages" && !a.LOG.some(l => /^messages .*HEAD/.test(l))));   // 3 unread → the messages themselves load (as before)
  ok(!still.length, "none of the ~20 small lists is asked separately" + (still.length ? ": " + still.join(", ") : ""));
  ok(!a.LOG.includes("RPC my_hidden_spots") && !a.LOG.includes("RPC hall_of_fame"), "my_hidden_spots and hall_of_fame come from app_start too");
  const n = a.LOG.length;
  ok(n <= 18, "about 16 database calls at app open (was ~40): " + n);
  ok(!a.LOG.some(l => /^messages .*HEAD/.test(l)) && a.asked("messages") === 1, "the unread count comes from app_start (3 unread → the messages themselves load, as before)");
  ok(a.w.eval("blockedIds.has('u-pest')") === true, "blocks come from app_start");
  ok(a.asked("fish_rules") === 1, "first open: the rules are downloaded once (no copy on the phone yet)");
  const saved = JSON.parse(a.w.localStorage.getItem("fm-rules-copy") || "null");
  ok(saved && saved.v === "v1" && saved.rows.length === 1, "…and kept on the phone with the fingerprint");

  // 2) next open, same fingerprint: the rules are not downloaded
  const b = await open("ok", saved);
  ok(b.asked("fish_rules") === 0 && b.w.eval("fishRules.length") === 1, "next open with the same fingerprint: rules come from the phone, not downloaded");

  // 3) the rules changed: downloaded again
  const c = await open("newrules", saved);
  ok(c.asked("fish_rules") === 1 && JSON.parse(c.w.localStorage.getItem("fm-rules-copy")).v === "v2", "when the fingerprint changes, the rules are downloaded again and the copy updated");

  // 4) app_start missing / failing: every loader asks as before
  const d = await open("fail");
  const missing = SMALL.filter(t => !d.asked(t) && !["profile_extras", "trip_plans", "trip_plan_rsvps", "tournaments", "tournament_members", "notifications", "fishing_licenses", "suggestion_picks", "spot_shares", "float_plans", "home_waters", "app_prefs", "tutorials_seen"].includes(t));
  ok(d.asked("members") >= 1 && !missing.length, "if app_start fails, the app asks the normal questions (sign-in still works)" + (missing.length ? "; not asked: " + missing.join(", ") : ""));
  ok(d.LOG.length > 30, "…the full ~40 questions as before: " + d.LOG.length);
  ok(d.asked("fish_rules") === 1, "…and the rules are downloaded (no fingerprint to compare)");

  const sql = fs.readFileSync(path.join(__dirname, "..", "setup/122-app-start.sql"), "utf8");
  ok(/security invoker/.test(sql) && /revoke all on function public\.app_start\(\) from public, anon/.test(sql), "setup/122: runs as the person (same privacy rules) and signed-out visitors can't call it");
  ok(/v249/.test(fs.readFileSync(path.join(__dirname, "..", "docs/build_history.md"), "utf8")), "build history has v249");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
