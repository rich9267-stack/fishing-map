// test201: Home (redesign step 3): water row, one alerts line, tide line, one Start trip card, Plan/Learn buttons, Best spots rows.
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
  await wait(1000);
  let good = true; const check = (name, ok) => { console.log(name + ":", ok ? "yes" : "NO"); if (!ok) good = false; };
  const $ = id => d.getElementById(id);
  const vis = id => !!$(id) && !$(id).hidden && !$(id).closest("[hidden]");
  check("new Home pieces exist at the top of the list", !!$("hn") && $("view-list").firstElementChild.id === "hn" && ["hn-water", "hn-alerts", "hn-cond", "hn-start", "hn-graph"].every(i => !!$(i)));
  check("heading has no emoji", $("hdr-sub").parentElement.querySelector("h1").textContent === "Fishing Map");
  check("On the water row starts with Heading out and says no friends", /Heading out/.test($("hn-water").textContent) && /No friends out right now/.test($("hn-water").textContent));
  let rungOut = 0; $("ci-start").addEventListener("click", () => rungOut++); $("hn-water").querySelector(".hn-story").click();
  check("the + circle presses the real Heading out button", rungOut === 1);
  check("no alerts = no alerts line", $("hn-alerts-sec").hidden);
  $("wx-banner").innerHTML = '<div class="wx-item"><b>🌊 Rip Current Statement</b></div><div class="wx-item"><b>🌊 Flood Advisory</b></div>'; await wait(50);
  check("two weather alerts show ONE line with the count and names", !$("hn-alerts-sec").hidden && /2 alerts/.test($("hn-alerts").textContent) && /rip current statement/i.test($("hn-alerts").textContent));
  check("the full list is folded until View is tapped", $("hn-alerts-list").hidden && /View/.test($("hn-alerts").textContent));
  $("hn-alerts").click(); check("tapping shows the full list", !$("hn-alerts-list").hidden && /Hide/.test($("hn-alerts").textContent));
  const T = h => ({ when: new Date(Date.now() + h * 3600000), high: h % 12 === 4, ft: h % 12 === 4 ? 3 : 0.3 });
  w.homeTides = [T(-8), T(-2), T(4), T(10), T(16)].map((x, i) => ({ ...x, high: i % 2 === 0 ? false : true })); w.eval("homeCondRender()");
  check("tide words and countdown are filled", /Tide · (coming in|going out)/.test($("hn-tide-lab").textContent) && /(High|Low) at /.test($("hn-tide-big").textContent) && /^in /.test($("hn-tide-in").textContent));
  check("tide line has a curve", /<path d="M/.test($("hn-graph").innerHTML) && /6a/.test($("hn-graph").innerHTML) && /10p/.test($("hn-graph").innerHTML));
  $("ts-wind").textContent = "NE 17 mph"; $("ts-water").textContent = "84 °F"; $("ts-moon").textContent = "Full moon"; await wait(50);
  check("one line of wind · water · moon", /NE 17 wind · 84° water · Full moon/.test($("hn-line").textContent));
  check("ONE Start trip button on Home (the old ones are hidden)", /Start trip/.test($("hn-start").textContent) && $("hq-start").closest("#home-quick") && w.getComputedStyle($("home-quick")).display === "none" && w.getComputedStyle($("session-ask")).display === "none");
  let hq = 0; $("hq-start").addEventListener("click", () => hq++); $("hn-start").click();
  check("with no prompt it presses ▶ Start trip", hq === 1 && /Ready to fish/.test($("hn-loc-l").textContent));
  let yes = 0; $("session-ask-yes").addEventListener("click", () => yes++);
  $("session-ask-text").textContent = "📍 You're at Hillsboro Inlet — start a fishing trip here?"; $("session-ask").hidden = false; await wait(50);
  check("at a spot it says where", /You're at/.test($("hn-loc-l").textContent) && /Hillsboro Inlet/.test($("hn-loc-n").textContent) && !$("hn-loc-x").hidden);
  $("hn-start").click(); check("and Start trip presses the prompt's button", yes === 1);
  let pl = 0, ln = 0; $("plan-add").addEventListener("click", () => pl++); $("learn-card").addEventListener("click", () => ln++);
  const acts = [...d.querySelectorAll("#hn-act-sec .hn-act")]; acts[0].click(); acts[1].click();
  check("Plan a trip and Learn buttons press the real ones", acts.length === 2 && pl === 1 && ln === 1 && /Invite friends/.test(acts[0].textContent) && /Rules, fish, rigs, knots/.test(acts[1].textContent));
  check("Best spots has a How it's ranked link that opens the details", /How it's ranked/.test($("best-how").textContent) && (() => { $("best-how").click(); return $("best-card").classList.contains("how-open"); })());
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
