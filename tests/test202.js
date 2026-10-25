// test202: Community (redesign step 4): header icons, My circle | Public tabs, Who's going circles, flat catch posts.
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
  const $ = id => d.getElementById(id), ev = c => w.eval(c);
  const nav = k => d.querySelector(`#bnav [data-nav="${k}"]`);
  nav("community").click(); await wait(500);
  check("Community has its own header with title and five icons", !!$("cm-head") && $("cm-head").textContent.includes("Community") && ["cm-search", "cm-friends", "cm-messages", "cm-help", "cm-me"].every(i => !!$(i)));
  check("the big shared header is hidden here", d.body.classList.contains("on-community"));
  check("tabs read My circle | Public, no emoji", [...d.querySelectorAll("#com-seg button")].map(b => b.textContent).join("|") === "My circle|Public");
  let q = 0; $("find-btn").addEventListener("click", () => q++); $("cm-search").click();
  check("search icon presses the real search", q === 1);
  $("cm-friends").click(); await wait(300);
  check("friends icon opens Friends (the old pill bar shows so you can get back)", !$("friends-card").hidden && w.getComputedStyle($("com-sw")).display !== "none");
  d.querySelector('#com-sw [data-sub="feed"]').click(); await wait(300);
  check("back on the feed the pill bar is hidden again", $("friends-card").hidden && w.getComputedStyle($("com-sw")).display === "none");
  const st = [...d.querySelectorAll("#cm-stories .hn-story")];
  check("circles: Plan a trip first, Past trips last", st.length >= 2 && /Plan a trip/.test(st[0].textContent) && /Past trips/.test(st[st.length - 1].textContent));
  let pa = 0; $("plan-add").addEventListener("click", () => pa++); st[0].click();
  check("Plan a trip circle presses the real button", pa === 1);
  st[st.length - 1].click(); await wait(400);
  check("Past trips circle opens the trips list", !$("feed-trips-card").hidden);
  d.querySelector('#com-sw [data-sub="feed"]').click(); await wait(300);
  const posts = [...d.querySelectorAll("#feed-list .feed-post")];
  check("catch posts are flat rows with avatar, name, catch line, detail line", posts.length >= 2 && !!posts[0].querySelector(".feed-av") && !!posts[0].querySelector(".feed-name") && /Snook|Redfish/.test(posts[0].querySelector(".feed-what").textContent) && !!posts[0].querySelector(".spot-meta"));
  const like = posts[0].querySelector(".feed-actions button");
  check("first action is the cheer heart, second is comments", /❤️/.test(like.textContent) && /💬/.test(posts[0].querySelectorAll(".feed-actions button")[1].textContent));
  like.click(); await wait(200);
  check("cheering still works (count goes up)", /1/.test(d.querySelector("#feed-list .feed-post .feed-actions button").textContent));
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
