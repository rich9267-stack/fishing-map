// test203: My Profile (redesign step 5): the picture opens it, Settings & edit opens the Me page, counts, best catches, tabs.
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
const ORDER = [], RPCS = [], REMOVED = [], STATE = { missing: false, fail: false, signedOut: false };
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, lte: () => o, neq: () => o, order: () => o, range: () => p, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new" }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve({ data: { email: "sam@x.com", display_name: "Sam", is_admin: ADMIN, status: "approved" }, error: null }) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => { STATE.signedOut = true; } },
    rpc: async (fn, a) => {
      RPCS.push([fn, a]); ORDER.push(fn);
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
  const root = $("view-profile");
  check("the Profile view exists and is hidden at first", !!root && root.hidden);
  $("me-btn").click(); await wait(300);
  check("the top-right picture opens my Profile (not the Me page)", !root.hidden && $("me-card").hidden && d.body.classList.contains("on-profile"));
  check("name and handle shown", /Sam/.test(root.querySelector(".pf-name").textContent) && /@sam/.test(root.querySelector(".pf-handle").textContent));
  const counts = root.querySelector(".pf-counts").textContent;
  check("counts: fish, trips, friends", /3 fish/.test(counts) && /2 trips/.test(counts) && /friend/.test(counts));
  check("Home waters and Mostly lines", /Home waters:/.test(root.textContent) && /Mostly: /.test(root.textContent));
  check("Best catches row ends with My tank", /Best catches/.test(root.textContent) && /My tank/.test(root.querySelector(".pf-best").lastElementChild.textContent));
  check("four tabs, Catches first and active", [...root.querySelectorAll(".pf-tabs button")].map(b => b.textContent).join("|") === "Catches|Spots|Trips|Badges" && root.querySelector(".pf-tabs button.on").textContent === "Catches");
  check("Catches grid has my catches with species names", root.querySelectorAll(".pf-tile").length === 2 && /Snook|Redfish/.test(root.querySelector(".pf-tile-l").textContent));
  [...root.querySelectorAll(".pf-tabs button")][1].click();
  check("Spots tab lists my spot", /Hillsboro Inlet/.test(root.querySelector(".pf-pane").textContent));
  [...root.querySelectorAll(".pf-tabs button")][2].click();
  check("Trips tab lists my trips", root.querySelectorAll(".pf-pane .pf-row").length === 2);
  [...root.querySelectorAll(".pf-tabs button")][3].click();
  check("Badges tab shows the badge grid", /earned/.test(root.querySelector(".pf-pane").textContent) && root.querySelectorAll(".pf-pane .badge").length > 5);
  check("header image: camera button and a hidden file picker are on the cover", !!root.querySelector(".pf-cover #pf-cover-btn") && root.querySelector("#pf-cover-file").type === "file" && root.querySelector("#pf-cover-rm").hidden);
  check("no header image yet: the cover is the colour band (no picture)", !root.querySelector(".pf-cover").classList.contains("has-img"));
  w.eval("db.storage.from = b => ({ upload: async () => ({ error: null }), remove: async p => { window.__removed = [b, p]; return { error: null }; } })");
  w.eval('pfCoverPath = "u-sam/cover-old.jpg"'); await w.eval("pfSetCover(null)");
  const removed = w.__removed; check("removing the header image deletes the old file from the avatars bucket", !!removed && removed[0] === "avatars" && /cover-old/.test(removed[1][0]));
  const css = fs.readFileSync(require("path").join(__dirname, "../css/app.css"), "utf8");
  check("iPhone Home Screen apps get fixed room under (52px) and beside (43px) the bottom bar", /--bn-safe: env\(safe-area-inset-bottom/.test(css) && /standalone[\s\S]{0,200}-webkit-touch-callout[\s\S]{0,200}52px[\s\S]{0,200}43px/.test(css) && !/--bn-corner|--bn-add|--bn-side/.test(css));
  check("the 'Bottom bar room' option is gone (the bar sizes itself)", !$("bar-room") && !/Bottom bar room/.test(d.getElementById("settings-card").textContent));
  $("pf-settings").click(); await wait(200);
  check("Settings & edit opens the Me page", !$("me-card").hidden);
  $("me-close").click(); await wait(100);
  check("closing it returns to my Profile", !root.hidden && $("me-card").hidden);
  root.querySelector(".pf-back").click(); await wait(300);
  check("back arrow leaves the Profile", root.hidden && !d.body.classList.contains("on-profile"));
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
