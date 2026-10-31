// test232: v250 — 📤 Share a planned trip by text, email, WhatsApp or any chat. Every trip has 📤 Share (also at blurred spots, which get no
// Directions line); phones use their own share menu; where there is none (computers) a small menu offers 💬 Text, ✉️ Email, WhatsApp, 📋 Copy.
// Right after posting a plan, "📤 Share it" sits next to "Plan posted". Head copied from test231.
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
const T = Date.now() + 86400000;
const PLANS = [{ id: "p1", spot_id: "s1", created_by: ME, author: "Sam", plan_at: new Date(T).toISOString(), note: "Bring live shrimp" },
  { id: "p2", spot_id: "s9", created_by: "other", author: "Mike", plan_at: new Date(T + 86400000).toISOString(), note: null }];
const START = { member: { email: "sam@x.com", display_name: "Sam", is_admin: false, is_owner: false, status: "approved", terms_version: 1 }, me_extras: null, home_waters: null, app_prefs: null,
  tutorials: [], unread: 0, blocks: [], follows: [], notif_welcomed: { welcomed_at: "2026-01-01" }, hidden_spots: [], licenses: [], shares: [], picks: [],
  friendships: [], friends_accepted: [], float_plans: [], tackle: [], tournaments: [], tournament_members: [], hall_of_fame: [],
  notifications: [], trip_plans: PLANS, trip_plan_rsvps: [{ plan_id: "p2", user_id: "other", name: "Mike" }, { plan_id: "p2", user_id: "u3", name: "Zed" }], rules_ver: "v1" };

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

(async () => {
  // 1) phone with a share menu
  const a = await open(true);
  const [i1, i2] = items(a);
  ok(i1 && i2, "both planned trips are listed");
  ok(btn(i1, /Share/) && btn(i2, /Share/), "every trip has 📤 Share (also at a blurred spot)");
  ok(btn(i1, /Directions/) && !btn(i2, /Directions/), "Directions only for an exact pin");
  btn(i1, /Share/).click(); await wait(200);
  const t1 = a.__shared && a.__shared.text || "";
  ok(/Fishing trip: .* at Hillsboro Inlet/.test(t1) && /Bring live shrimp/.test(t1) && /1 going/.test(t1), "share text: when, where, the note and how many are going");
  ok(/https:\/\/example\.org\/fishing-map\/\?go=trip&id=p1/.test(t1) && /google\.com\/maps\/dir\/.*26\.257,-80\.081/.test(t1), "…a join link that opens the trip + directions");
  ok(t1.split("\n").length >= 4, "…on separate lines");
  a.__shared = null; btn(i2, /Share/).click(); await wait(200);
  const t2 = a.__shared && a.__shared.text || "";
  ok(/^🎣 Fishing trip: \S/.test(t2) && /2 going/.test(t2) && /id=p2/.test(t2) && !/maps\/dir/.test(t2), "a spot without an exact pin (or one you can't see): shared with the join link but no directions");

  // 2) no share menu (computer): Text / Email / WhatsApp / Copy
  const b = await open(false);
  btn(items(b)[0], /Share/).click(); await wait(200);
  const box = b.document.querySelector(".plan-share-box");
  ok(!!box, "without a phone share menu a small Share menu opens");
  const href = re => { const x = box && btn(box, re); return x ? decodeURIComponent(x.getAttribute("href") || "") : ""; };
  ok(/^sms:\?&body=🎣 Fishing trip/.test(href(/Text/)), "💬 Text opens a text message with the trip");
  ok(/^mailto:\?subject=Fishing trip&body=.*id=p1/s.test(href(/Email/)), "✉️ Email opens an email with a subject and the trip");
  ok(/^https:\/\/wa\.me\/\?text=.*Hillsboro Inlet/s.test(href(/WhatsApp/)), "WhatsApp opens with the trip");
  btn(box, /Copy/).click(); await wait(200);
  ok(/id=p1/.test(b.__copied || "") && !b.document.querySelector(".plan-share-box"), "📋 Copy puts the trip text on the clipboard (paste into any chat) and closes the menu");
  btn(items(b)[0], /Share/).click(); await wait(100);
  btn(b.document.querySelector(".plan-share-box"), /Close/).click();
  ok(!b.document.querySelector(".plan-share-box"), "Close shuts the menu");

  const src = fs.readFileSync(path.join(__dirname, "..", "js/08-feed-plans.js"), "utf8");
  ok(/plan-share-new[^\n]*Share it[^\n]*sharePlan/.test(src), "after posting a plan, '📤 Share it' shares it straight away");
  ok(/v250/.test(fs.readFileSync(path.join(__dirname, "..", "docs/build_history.md"), "utf8")), "build history has v250");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
