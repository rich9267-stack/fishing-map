// 🧭 UX v2 step 1: 6-tab bottom bar, floating ＋ Log button, 🎮 Play (Tank · My fish · Fish race) and 🏆 Compete pages.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
const ADMIN = process.env.DEL_ADMIN === "1";
const SPOTS = [{ id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0 }];
const CATCHES = [{ id: "c1", spot_id: "s1", species: "Snook", how_many: 1, caught_at: new Date(Date.now() - 3600000).toISOString(), created_by: ME, length_in: 25 }];
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
    from: t => ({ select: () => chain(t === "spots" || t === "spots_visible" ? SPOTS : t === "catches" ? CATCHES : t === "photos" ? [{ path: ME + "/a.jpg" }, { path: ME + "/b.jpg" }] : t === "groups" ? [{ id: "g1" }] : t === "profiles" ? [{ user_id: ME, handle: "sam", display_name: "Sam" }] : []),
      delete: () => chain(null), insert: () => chain(null), upsert: () => Promise.resolve({ error: null }), update: () => chain(null) }) }) };
  w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], predictions: [] }) });
}});
const w = dom.window; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(1000);
  let good = true; const check = (name, ok) => { console.log(name + ":", ok ? "yes" : "NO"); if (!ok) good = false; };
  const $ = id => d.getElementById(id), ev = c => w.eval(c);
  const tabs = [...d.querySelectorAll("#bnav [data-nav]")].map(b => b.dataset.nav);
  console.log("bar:", tabs.join(" · "));
  check("bar has the 6 tabs in order", tabs.join(",") === "home,map,play,compete,community,stats");
  check("＋ Log button shows when signed in", !$("bn-log").hidden);
  let logged = 0; $("qc-fab").addEventListener("click", () => logged++);
  $("bn-log").click(); check("＋ opens Quick catch", logged === 1);
  ev(`$("qc-close") && $("qc-close").click()`);
  const nav = k => d.querySelector(`#bnav [data-nav="${k}"]`);
  // Play
  nav("play").click(); await wait(100);
  check("Play opens the tank page", !$("view-tank").hidden && nav("play").classList.contains("on") && !nav("stats").classList.contains("on"));
  check("Play: Tank sub-tab first, coins box on the page", !$("play-tank").hidden && $("fk-card").hidden && $("race-card").hidden && $("view-tank").contains($("wallet-box")));
  d.querySelector('#play-sw [data-sub="fish"]').click(); await wait(50);
  check("My fish sub-tab shows only My fish", !$("fk-card").hidden && $("play-tank").hidden && $("race-card").hidden && $("fk-body").childNodes.length > 0);
  d.querySelector('#play-sw [data-sub="games"]').click(); await wait(50);   // 🎮 Games (Games step 1): the race opens from its card
  d.querySelector('#games-body .game-card[data-game="race"]').click(); await wait(50);
  check("Fish race sub-tab shows only the race", !$("race-card").hidden && $("fk-card").hidden && $("race-body").childNodes.length > 0);
  check("sub-tab remembered", w.localStorage.getItem("fm-play-sub") === "race");
  // Stats no longer holds the games
  nav("stats").click(); await wait(100);
  check("Stats has no My fish / race / tank", !$("view-insights").contains($("fk-card")) && !$("view-insights").contains($("race-card")) && ![...d.querySelectorAll("#view-insights .sub-tabs button")].some(b => /Tank/.test(b.textContent)));
  // Compete
  nav("compete").click(); await wait(150);
  check("Compete page shows contests", !$("view-compete").hidden && !$("contests").hidden && $("view-compete").contains($("contests")) && nav("compete").classList.contains("on"));
  check("Community no longer has a Compete button", $("feed-mode-contests").hidden);
  // old paths into contests land on Compete
  nav("community").click(); await wait(100);
  ev(`setFeedMode("contests")`); await wait(150);
  check("old 'contests' feed mode opens Compete", !$("view-compete").hidden && $("view-feed").hidden);
  ev(`handleGo("?go=contest&id=t1")`); await wait(150);
  check("contest alert link opens Compete", !$("view-compete").hidden && nav("compete").classList.contains("on"));
  nav("community").click(); await wait(100);
  check("back on Community shows the feed, not contests", !$("view-feed").hidden && !$("feed-circle-card").hidden);
  // race alert link → Play › Fish race
  ev(`raceOpenRoom(5)`); await wait(150);
  check("race alert link opens Play › Fish race", !$("view-tank").hidden && !$("race-card").hidden);
  // map: + moves up out of the map buttons' way
  nav("map").click(); await wait(100);
  check("on the map the page knows it", d.body.classList.contains("on-map"));
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
