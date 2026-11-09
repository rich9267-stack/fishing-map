// test241: v260 (speed plan step 2) — admin, games, Learn, business pages and the tank screen are not read at app start;
// they load the first time they are opened (js/48 needCode / codeThen) and then work as before. Members never load the admin files;
// admins get them in the background. A file that can't load shows a short message and is tried again on the next tap.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const root = path.join(__dirname, "..");
const ME = "u-sam";
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const SPOTS = [{ id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, visibility: "friends", added_by: "Sam" }];
const CATCHES = [{ id: "c1", spot_id: "s1", created_by: ME, species: "Snook", how_many: 1, length_in: 28, caught_at: new Date(Date.now() - 86400000).toISOString(), visibility: "friends" }];
let ADMIN = false;
const START = () => ({ member: { email: "sam@x.com", display_name: "Sam", is_admin: ADMIN, is_owner: ADMIN, status: "approved", terms_version: 1 }, me_extras: null, home_waters: null, app_prefs: { palette: "original", wn_seen: "2099" },
  tutorials: [], unread: 0, blocks: [], follows: [], notif_welcomed: { welcomed_at: "2026-01-01" }, hidden_spots: [], licenses: [], shares: [], picks: [],
  friendships: [], friends_accepted: [], float_plans: [], tackle: [], tournaments: [], tournament_members: [], hall_of_fame: [],
  notifications: [], trip_plans: [], trip_plan_rsvps: [], rules_ver: "v1" });

async function open() {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/fishing-map/", beforeParse(w) {
    w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
    const rows = t => t === "spots_visible" || t === "spots" ? SPOTS : t === "catches" ? CATCHES : [];
    const chain = t => { const p = () => Promise.resolve({ data: rows(t), error: null, count: 0 });
      const o = {}; ["eq", "is", "in", "or", "ilike", "gte", "lte", "gt", "lt", "neq", "order", "select", "not", "contains", "match", "filter", "overlaps", "limit"].forEach(k => { o[k] = () => o; });
      o.range = () => p(); o.single = () => Promise.resolve({ data: null, error: null }); o.maybeSingle = () => Promise.resolve({ data: t === "members" ? START().member : null, error: null });
      o.then = (a, b) => p().then(a, b); return o; };
    w.supabase = { createClient: () => ({
      auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
      rpc: async fn => fn === "ensure_profile" ? { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null } : fn === "app_start" ? { data: START(), error: null } : fn === "host_pages_list" ? { data: { pages: [], business_allowed: 1, business_used: 0 }, error: null } : { data: null, error: null },
      channel: () => { const c = { on: () => c, subscribe: () => c }; return c; }, removeChannel: () => {},
      storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }), createSignedUrl: async () => ({ data: null }), list: async () => ({ data: [] }) }) },
      from: t => ({ select: () => chain(t), delete: () => chain(t), insert: () => chain(t), upsert: () => Promise.resolve({ error: null }), update: () => chain(t) }) }) };
    w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], items: [] }) });
  }});
  const w = dom.window; w.scrollTo = () => {}; w.requestAnimationFrame = f => setTimeout(f, 16); w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
  await wait(4000);
  return w;
}
const has = (w, fn) => w.eval(`typeof ${fn} === "function"`);
const loaded = (w, part) => w.eval(`!!lazyDone["${part}"]`);

(async () => {
  // (a) the page itself: none of these files are in the start-up list, all of them are kept for offline use
  const page = fs.readFileSync(path.join(root, "index.html"), "utf8"), sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const LAZY = ["39-admin-log", "40-admin-page", "41-admin-people", "42-admin-undo", "43-admin-warn", "44-admin-hide", "45-admin-official", "47-admin-gated",
    "57-fishid-review", "51-games", "52-games-more", "62-learn", "71-business-pages", "72-tank-art", "73-tank-screen", "75-weather-screen", "76-weather-hours", "77-weather-wind-pressure", "78-weather-water", "79-weather-sun-moon", "80-weather-days"];
  ok(LAZY.every(f => !page.includes(`"js/${f}.js?`)), "index.html no longer loads the 19 opened-later files at start");
  ok(LAZY.concat(["48-lazy-code"]).every(f => sw.includes(`"./js/${f}.js"`)), "…and sw.js still keeps every one of them on the phone (works offline)");
  ok(page.includes('"js/48-lazy-code.js?v='), "js/48 (the loader) is loaded at start");
  const lazyList = new Function(fs.readFileSync(path.join(root, "js/48-lazy-code.js"), "utf8").split("// The buttons")[0].replace(/const lazyDone[\s\S]*/, "") + "; return LAZY_CODE;")();
  ok(JSON.stringify(Object.values(lazyList).flat().map(f => f.replace(/^js\/|\.js$/g, "")).sort()) === JSON.stringify(LAZY.slice().sort()), "LAZY_CODE names exactly these files");

  // (b) a member: nothing extra at start
  let w = await open();
  ok(!has(w, "renderGames") && !has(w, "renderLearn") && !has(w, "renderTank") && !has(w, "adminPageShow") && !has(w, "bpPageTop"), "member at start: games, Learn, tank screen, admin and business code not loaded");
  ok(has(w, "fishSvg") && has(w, "tankCheck") && has(w, "walletDraw") && has(w, "snd") && has(w, "bpPlaceLine"), "…the shared bits (fish pictures, New best!, coins, sound, 'Run by' line) are there");

  // (c) Play › Tank: loads the tank screen, then draws as before
  w.document.getElementById("tab-tank").click(); await wait(300);
  w.eval('showPlay("tank")'); await wait(300);
  ok(loaded(w, "tank") && has(w, "renderTank"), "Play › Tank loads the tank screen");
  ok(w.document.getElementById("tank-body").children.length > 0, "…and the tank is drawn (" + w.document.getElementById("tank-body").children.length + " parts)");
  ok(w.document.getElementById("tank-sum").textContent.length > 0, "…with its summary line");

  // (d) Play › Games
  w.document.querySelector('#play-sw [data-sub="games"]').click(); await wait(300);
  ok(loaded(w, "games") && w.document.getElementById("games-body").children.length > 0, "Play › Games loads the games and shows the game cards");
  // the Fish race screen's "‹ Games" button still goes back to the list
  w.eval('showPlay("race")'); await wait(200);
  w.document.getElementById("race-back").click(); await wait(200);
  ok(!w.document.getElementById("games-card").hidden && w.eval("gamesScreen") === "list", "‹ Games on the race screen goes back to the Games list");

  // (e) Learn from the Home card, and its back button
  ok(!loaded(w, "learn"), "Learn not loaded before it is opened");
  w.document.getElementById("learn-card").click(); await wait(400);
  ok(loaded(w, "learn") && !w.document.getElementById("view-learn").hidden && w.document.getElementById("learn-body").textContent.length > 20, "the Learn card loads Learn and opens it");
  w.document.getElementById("learn-back").click(); await wait(200);
  ok(w.document.getElementById("view-learn").hidden, "Learn's back button closes it");

  // (f) business code: loads when Clubs & businesses opens
  ok(!loaded(w, "biz"), "business page code not loaded before Clubs & businesses is opened");
  w.eval("window.openHostPages()"); await wait(400);
  ok(loaded(w, "biz") && has(w, "bpPageTop"), "opening Clubs & businesses loads the business page code");

  // (g) a member never loads the admin files
  ok(!loaded(w, "admin") && !has(w, "adminWarn"), "a member never loads the admin files");

  // (h) a file that can't load: short message, and the next tap tries again
  w.eval('LAZY_CODE.zz = ["js/zz-missing.js"]; codeThen("zz", () => { window.__ran = true; })'); await wait(50);
  const s1 = [...w.document.querySelectorAll("script[src]")].find(s => /zz-missing/.test(s.getAttribute("src")));
  ok(!!s1, "a not-yet-loaded file is added to the page as a script");
  s1.dispatchEvent(new w.Event("error")); await wait(50);
  ok(/Couldn't open that/.test(w.document.body.textContent) && !w.__ran && !w.eval("lazyWait.zz"), "load failed: 'Couldn't open that — check your signal' and it can be tried again");
  w.eval('codeThen("zz", () => { window.__ran = true; })'); await wait(50);
  const s2 = [...w.document.querySelectorAll("script[src]")].find(s => /zz-missing/.test(s.getAttribute("src")));
  ok(!!s2, "…the next tap adds it again");
  s2.dispatchEvent(new w.Event("load")); await wait(50);
  ok(w.__ran === true && w.eval("lazyDone.zz") === true, "…and once it loads, the screen opens");

  // (i) an admin: the admin files load in the background, the Admin page opens as before
  ADMIN = true;
  w = await open();
  ok(loaded(w, "admin") && has(w, "adminPageShow") && has(w, "adminWarn"), "admin: the admin files are loaded in the background after sign-in");
  w.eval('window.adminPageOpen("log")'); await wait(400);
  ok(!w.document.getElementById("invite-card").hidden && w.document.querySelector('#admin-nav [data-asec="log"].on'), "Me › Admin (adminPageOpen) opens the Admin page on the asked section");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
