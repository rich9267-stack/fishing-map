// 🧭 UX v2 step 3: Stats sub-tabs (Insights · Records · Seasons · Species · Tackle) and Community sub-tabs (Feed · Trips · Friends · Messages · Groups).
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
const w = dom.window; w.scrollTo = () => {}; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(1000);
  let good = true; const check = (name, ok) => { console.log(name + ":", ok ? "yes" : "NO"); if (!ok) good = false; };
  const $ = id => d.getElementById(id), ev = c => w.eval(c);
  const nav = k => d.querySelector(`#bnav [data-nav="${k}"]`);
  const shown = id => !$(id).hidden;
  const labels = sel => [...d.querySelectorAll(sel)].map(b => b.textContent.replace(/\d+$/, "").trim()).join(",");
  const on = sel => [...d.querySelectorAll(sel)].filter(b => b.classList.contains("on")).map(b => b.dataset.sub).join(",");

  // ---------- 📊 Stats ----------
  nav("stats").click(); await wait(300);
  check("Stats opens on Insights", shown("view-insights") && nav("stats").classList.contains("on"));
  check("Insights bar: Insights · Records · Seasons · Species · Tackle", labels("#view-insights .sub-tabs button") === "Insights,Records,Seasons,Species,Tackle");
  check("old Insights/Seasons switch is gone", !d.querySelector(".stats-sw"));
  check("Insights shows the catch insights only", shown("ins-tiles") && shown("ins-charts") && !shown("rec-card") === false ? false : (shown("ins-tiles") && $("rec-card").hidden && $("yir-card").hidden && $("tackle-card").hidden && $("stats-species").hidden));
  check("Insights tab is lit", on("#view-insights .sub-tabs button") === "insights");
  d.querySelector('#view-insights .sub-tabs [data-sub="records"]').click(); await wait(150);
  check("Records shows Records + Year in review", shown("rec-card") && shown("yir-card") && $("ins-tiles").hidden && $("tackle-card").hidden && $("stats-species").hidden && on("#view-insights .sub-tabs button") === "records");
  check("Records sub-tab remembered", w.localStorage.getItem("fm-stats-sub") === "records");
  d.querySelector('#view-insights .sub-tabs [data-sub="tackle"]').click(); await wait(150);
  check("Tackle shows the tackle box only", shown("tackle-card") && $("rec-card").hidden && $("yir-card").hidden && $("ins-tiles").hidden && $("stats-species").hidden);
  d.querySelector('#view-insights .sub-tabs [data-sub="species"]').click(); await wait(250);
  check("Species shows My fish + the species list", shown("stats-species") && shown("fk-card2") && shown("sp-entry-card") && $("tackle-card").hidden && $("ins-tiles").hidden);
  check("My fish card is drawn (here and on Play)", $("fk-body2").childNodes.length > 0 && $("fk-body").childNodes.length > 0);
  const chips = () => [...d.querySelectorAll("#sp-entry-list .fchip")].map(b => b.textContent);
  check("species list has fish, the one I caught first", chips().length > 5 && /^Snook \(1\)$/.test(chips()[0]));
  $("sp-q").value = "snook"; $("sp-q").dispatchEvent(new w.Event("input")); await wait(50);
  check("search narrows the list", chips().length >= 1 && chips().every(t => /snook/i.test(t)));
  d.querySelector("#sp-entry-list .fchip").click(); await wait(250);
  check("tapping a fish opens its species page", !!$("sp-sheet"));
  ev("spClose()");
  $("sp-q").value = "zzzz"; $("sp-q").dispatchEvent(new w.Event("input")); await wait(50);
  check("no match says so", /No fish match/.test($("sp-entry-card").textContent));
  $("sp-q").value = ""; $("sp-q").dispatchEvent(new w.Event("input"));
  d.querySelector('#view-insights .sub-tabs [data-sub="seasons"]').click(); await wait(300);
  check("Seasons opens its own page, Stats still lit", shown("view-seasons") && $("view-insights").hidden && nav("stats").classList.contains("on"));
  check("Seasons bar has the same five and Seasons is lit", labels("#view-seasons .sub-tabs button") === "Insights,Records,Seasons,Species,Tackle" && on("#view-seasons .sub-tabs button") === "seasons");
  d.querySelector('#view-seasons .sub-tabs [data-sub="records"]').click(); await wait(300);
  check("Records from the Seasons page", shown("view-insights") && $("view-seasons").hidden && shown("rec-card"));
  nav("home").click(); await wait(100); nav("stats").click(); await wait(250);
  check("Stats reopens on the sub-tab I left", shown("rec-card") && $("ins-tiles").hidden);
  ev(`handleGo("?go=insights")`); await wait(250);
  check("old go=insights link lands on Insights", shown("ins-tiles") && $("rec-card").hidden);
  ev(`openSpecies("Snook")`); await wait(200);
  d.querySelector("#sp-sheet .sp-actions .btn.ghost") && d.querySelector("#sp-sheet .sp-actions .btn.ghost").click(); await wait(250);
  check("species page 'All charts' lands on Insights", shown("ins-tiles") && !$("sp-sheet"));

  // ---------- 👥 Community ----------
  nav("community").click(); await wait(400);
  check("Community bar: Feed · Trips · Friends · Messages · Groups", labels("#com-sw button") === "Feed,Trips,Friends,Messages,Groups");
  check("opens on Feed with Who's going + the catch feed", on("#com-sw button") === "feed" && shown("feed-plans-card") && shown("feed-circle-card") && shown("com-seg"));
  check("nothing else open", $("feed-trips-card").hidden && $("friends-card").hidden && $("chat-card").hidden && $("groups").hidden && $("pub-feed").hidden);
  check("old button row is hidden", $("feed-mode").style.display === "none" && !!$("feed-mode").querySelector("#friends-btn") && !!$("feed-mode").querySelector("#chat-btn"));
  d.querySelector('#com-seg [data-feedmode="public"]').click(); await wait(300);
  check("Public switch shows public catches", shown("pub-feed") && $("feed-circle-card").hidden && $("feed-plans-card").hidden && d.querySelector('#com-seg [data-feedmode="public"]').classList.contains("on"));
  d.querySelector('#com-seg [data-feedmode="circle"]').click(); await wait(200);
  check("My circle switch is back", $("pub-feed").hidden && shown("feed-circle-card") && shown("feed-plans-card"));
  d.querySelector('#com-sw [data-sub="trips"]').click(); await wait(500);
  check("Trips shows past trips only", on("#com-sw button") === "trips" && shown("feed-trips-card") && $("feed-plans-card").hidden && $("feed-circle-card").hidden && $("com-seg").hidden);
  check("Trips says so when empty", /No past trips yet/.test($("feed-trips-list").textContent));
  d.querySelector('#com-sw [data-sub="friends"]').click(); await wait(300);
  check("Friends shows the friends card", on("#com-sw button") === "friends" && shown("friends-card") && $("feed-trips-card").hidden && $("feed-circle-card").hidden && $("chat-card").hidden && $("com-seg").hidden);
  d.querySelector('#com-sw [data-sub="messages"]').click(); await wait(300);
  check("Messages shows the messages card, Friends closes", on("#com-sw button") === "messages" && shown("chat-card") && $("friends-card").hidden && $("feed-circle-card").hidden);
  d.querySelector('#com-sw [data-sub="groups"]').click(); await wait(400);
  check("Groups shows the groups page, Messages closes", on("#com-sw button") === "groups" && shown("groups") && $("chat-card").hidden && $("feed-circle-card").hidden && $("feed-plans-card").hidden);
  d.querySelector('#com-sw [data-sub="feed"]').click(); await wait(300);
  check("back on Feed everything is as it was", on("#com-sw button") === "feed" && shown("feed-circle-card") && shown("feed-plans-card") && $("groups").hidden && $("friends-card").hidden && $("chat-card").hidden && shown("com-seg"));
  // unread badges
  $("chat-btn").textContent = "💬 Messages (3)"; $("friends-btn").textContent = "👥 Friends (2)"; await wait(50);
  check("Messages badge shows 3, Friends badge shows 2", shown("com-b-messages") && $("com-b-messages").textContent === "3" && shown("com-b-friends") && $("com-b-friends").textContent === "2");
  $("chat-btn").textContent = "💬 Messages"; $("friends-btn").textContent = "👥 Friends"; await wait(50);
  check("badges hide at zero", $("com-b-messages").hidden && $("com-b-friends").hidden);
  // arriving from another page opens the Feed
  d.querySelector('#com-sw [data-sub="messages"]').click(); await wait(200);
  nav("home").click(); await wait(100); nav("community").click(); await wait(300);
  check("leaving and coming back opens on the Feed", on("#com-sw button") === "feed" && $("chat-card").hidden && shown("feed-circle-card"));
  // old buttons and links
  $("friends-btn").click(); await wait(200);
  check("old Friends button lights the Friends sub-tab", on("#com-sw button") === "friends" && shown("friends-card") && $("feed-circle-card").hidden);
  $("feed-mode-groups").click(); await wait(300);
  check("old Groups button lights the Groups sub-tab", on("#com-sw button") === "groups" && shown("groups") && $("friends-card").hidden);
  nav("home").click(); await wait(100);
  ev(`handleGo("?go=friends")`); await wait(300);
  check("link go=friends opens Community › Friends", shown("view-feed") && on("#com-sw button") === "friends" && shown("friends-card"));
  nav("home").click(); await wait(100);
  ev(`handleGo("?go=chat&with=u-rico")`); await wait(300);
  check("link go=chat opens Community › Messages", shown("view-feed") && on("#com-sw button") === "messages" && shown("chat-card"));
  nav("home").click(); await wait(100);
  ev(`handleGo("?go=group&scope=team&id=g1")`); await wait(400);
  check("link go=group (team) opens Community › Groups", shown("view-feed") && on("#com-sw button") === "groups" && shown("groups"));
  ev(`handleGo("?go=feed")`); await wait(300);
  check("link go=feed opens Community › Feed", on("#com-sw button") === "feed" && shown("feed-circle-card") && $("groups").hidden);
  $("friends-btn").click(); await wait(100);
  ev(`handleGo("?go=comment")`); await wait(300);
  check("a comment alert closes Friends and shows the Feed", on("#com-sw button") === "feed" && $("friends-card").hidden && shown("feed-circle-card"));
  console.log(good ? "OK" : "FAIL");
  process.exit(good ? 0 : 1);
})();
