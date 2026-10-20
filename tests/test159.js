// Play: nicer tank finish (plans/ui-review.md item 4B): cabinet frame + name plaque, glass shine, air-stone bubbles, shop price tags, My fish rims. Looks only. Head copied from test156.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-sam";
const ADMIN = process.env.DEL_ADMIN === "1";
const SPOTS = [{ id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0 },
  { id: "s2", name: "Lake Ida", spot_type: "lake", water_type: "freshwater", lat: 26.47, lng: -80.08, created_by: ME, public_access: "yes", tide_offset_min: 0 }];
const T = new Date(Date.now() - 3600000).toISOString();
const CATCHES = [{ id: "c1", spot_id: "s1", species: "Snook", how_many: 1, caught_at: T, created_by: ME, length_in: 25 },
  { id: "c2", spot_id: "s1", species: "Redfish", how_many: 1, caught_at: T, created_by: ME, length_in: 22 },
  { id: "c3", spot_id: "s1", species: "Tarpon", how_many: 1, caught_at: T, created_by: ME, length_in: 40 },
  { id: "c4", spot_id: "s2", species: "Largemouth bass", how_many: 1, caught_at: T, created_by: ME, length_in: 15 }];
const ITEMS = [{ key: "coral_fan", name: "Sea fan", category: "coral", water: "salt", coins: 40, gems: 0, how: "buy", sort: 1 },
  { key: "rock_arch", name: "Rock arch", category: "rock", water: null, coins: 25, gems: 0, how: "buy", sort: 2 },
  { key: "diver", name: "Diver figurine", category: "diver", water: null, coins: 0, gems: 2, how: "buy", sort: 3 },
  { key: "trophy_gold", name: "Gold trophy cup", category: "trophy", water: null, coins: 0, gems: 0, how: "tournament", sort: 4 }];
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
    from: t => ({ select: () => chain(t === "spots" || t === "spots_visible" ? SPOTS : t === "catches" ? CATCHES : t === "photos" ? [{ path: ME + "/a.jpg" }, { path: ME + "/b.jpg" }] : t === "groups" ? [{ id: "g1" }] : t === "shop_items" ? ITEMS : t === "user_items" ? [{ item_key: "rock_arch" }] : t === "profiles" ? [{ user_id: ME, handle: "sam", display_name: "Sam" }] : []),
      delete: () => chain(null), insert: () => chain(null), upsert: () => Promise.resolve({ error: null }), update: () => chain(null) }) }) };
  w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], predictions: [] }) });
}});
const w = dom.window; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(1000);
  let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
  const $ = id => d.getElementById(id), ev = c => w.eval(c);
  d.querySelector('#bnav [data-nav="play"]').click(); await wait(300);
  ev(`wallet = { coins: 30, gems: 3, today: 0, cap: 50, added: null, recent: [] }; walletDraw(); renderTank()`); await wait(100);
  const cabs = [...d.querySelectorAll("#tank-body .tank-cab")];
  ok(cabs.length === 2, "both tanks sit in a cabinet frame: " + cabs.length);
  const plaque = k => [...d.querySelectorAll("#tank-body .tank-cab")].find(c => c.querySelector(".tank-" + k)).querySelector(".tank-plaque");
  ok(plaque("salt").textContent === "Saltwater tank · 3 fish", "salt plaque: " + plaque("salt").textContent);
  ok(plaque("fresh").textContent === "Freshwater tank · 1 fish", "fresh plaque: " + plaque("fresh").textContent);
  const salt = d.querySelector("#tank-body .tank-salt");
  ok(salt.parentNode.classList.contains("tank-cab") && salt.nextElementSibling.classList.contains("tank-plaque"), "the plaque sits under the glass, inside the frame");
  ok(!salt.closest(".tank-card").querySelector(":scope > .label"), "no repeated '🌊 Saltwater tank' label above a tank that has fish (the plaque says it)");
  ok(salt.querySelectorAll(".bubble.stone").length === 5 && salt.querySelectorAll(".bubble:not(.stone)").length === 6, "air-stone bubble column + the old bubbles");
  ok([...salt.querySelectorAll(".bubble")].every(b => b.getAttribute("aria-hidden") === "true"), "bubbles are hidden from screen readers");
  ok(/^Saltwater tank with 3 species\./.test(salt.getAttribute("aria-label") || ""), "tank still has its spoken name");
  ok(salt.querySelectorAll(".tfish").length === 3, "3 fish swim in the salt tank");
  // empty tank keeps its label and has no cabinet
  ev(`catchesBySpot = { s1: catchesBySpot.s1 || [] }; renderTank()`); await wait(50);
  const cards = [...d.querySelectorAll("#tank-body .tank-card")];
  ok(cards.some(c => /Freshwater tank/.test(c.textContent) && c.querySelector(".label") && !c.querySelector(".tank-cab") && /No freshwater fish yet/.test(c.textContent)), "an empty tank keeps its label and empty message, no frame");
  // full screen moves the tank out and puts it back inside the frame
  const fb = d.querySelector("#tank-body .tank-salt").closest(".tank-card").querySelector(".full-btn");
  fb.click(); await wait(80);
  ok(!!d.querySelector(".tank-full .tank-salt"), "full screen shows the tank");
  d.querySelector(".tank-full .tf-bar .btn:last-child").click(); await wait(80);
  const s2 = d.querySelector("#tank-body .tank-salt");
  ok(!d.querySelector(".tank-full") && s2.parentNode.classList.contains("tank-cab") && s2.nextElementSibling.classList.contains("tank-plaque"), "closing full screen puts the tank back above its plaque");
  // shop: picture tiles with price tags
  d.querySelector('#tank-sw [data-mode="shop"]').click(); await wait(100);
  const tile = n => [...d.querySelectorAll("#shop-body .shop-item")].find(c => c.querySelector(".shop-name").textContent === n);
  ok(d.querySelectorAll("#shop-body .shop-item").length === 4, "4 shop tiles");
  ok(tile("Sea fan").querySelector(".shop-price").textContent === "40 🪙" && tile("Sea fan").querySelector(".shop-price").getAttribute("aria-hidden") === "true", "price tag on the tile (40 🪙)");
  ok(tile("Sea fan").querySelector("button").disabled && /Need 10 more 🪙/.test(tile("Sea fan").textContent), "same rule: 30 coins can't buy a 40-coin piece");
  ok(!tile("Rock arch").querySelector(".shop-price") && /✓ Owned/.test(tile("Rock arch").textContent), "owned piece: no price tag");
  ok(!tile("Gold trophy cup").querySelector(".shop-price"), "trophy cup (tournaments only): no price tag");
  ok(tile("Diver figurine").querySelector(".shop-price").textContent === "2 💎" && /Buy · 2 💎/.test(tile("Diver figurine").querySelector("button").textContent), "gem price tag; Buy button unchanged");
  // buying still works the same
  const bb = tile("Diver figurine").querySelector("button"); bb.click(); bb.click(); await wait(100);
  ok(RPCS.some(r => r[0] === "buy_item" && r[1].p_key === "diver"), "Buy still calls buy_item");
  // My fish rims: CSS
  const css = fs.readFileSync(__dirname + "/../css/app.css", "utf8");
  ok(/\.fk-card \{ --rim:[^}]*border: 2px solid var\(--rim\)/.test(css) && /\.fk-card\.t-legendary \{ --rim: #f2b134/.test(css), "My fish cards get a full colored rim by rank");
  ok(/\.tank-cab > \.tank::after \{[^}]*pointer-events: none/.test(css), "glass shine never blocks taps on fish");
  ok(/@media \(prefers-reduced-motion: reduce\) \{ \.tfish, \.bubble \{ animation: none/.test(css), "bubbles still stop for reduced motion");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
