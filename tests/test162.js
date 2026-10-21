// 🏷 Tank names + more tanks (setup/92, js/14): plaque names, extra tanks with chosen fish, locked 'Coming soon', owner test tanks, admin remove name. Head copied from test159.
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
const UT1 = "11111111-1111-4111-8111-111111111111";
let SETUPS = [{ tank: "salt", gravel: null, placed: [], name: "Snook Corner", name_hidden_at: null }];
let UTANKS = [{ id: UT1, user_id: ME, water: "salt", name: null, name_hidden_at: null, gravel: null, placed: [], how: "gift", created_at: "2026-10-20T10:00:00Z" }];
let TSPEC = [{ species_key: "tarpon", tank_id: UT1 }];
const ORDER = [], RPCS = [], REMOVED = [], STATE = { missing: false, fail: false, signedOut: false };
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, lte: () => o, neq: () => o, order: () => o, range: () => p, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new" }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve({ data: { email: "sam@x.com", display_name: "Sam", is_admin: true, is_owner: true, status: "approved" }, error: null }) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "sam@x.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => { STATE.signedOut = true; } },
    rpc: async (fn, a) => {
      RPCS.push([fn, a]); ORDER.push(fn);
      if (fn === "ensure_profile") return { data: { user_id: ME, handle: "sam", display_name: "Sam" }, error: null };
      if (/^delete_my_account/.test(fn) && STATE.missing) return { data: null, error: { message: "Could not find the function public." + fn + " in the schema cache" } };
      if (fn === "delete_my_account_preview") return { data: { spots: 1, catches: 1, photos: 2, messages: 5, friends: 3, groups: 1, admin: ADMIN }, error: null };
      if (fn === "delete_my_account") return STATE.fail ? { data: null, error: { message: "network" } } : { data: { ok: true, spots_handed_over: 0 }, error: null };
      if (fn === "set_tank_name") { if (/sh1t/.test(a.p_name)) return { data: null, error: { message: "Please pick a different name." } }; const n = a.p_name.trim() || null; const row = UTANKS.find(x => x.id === a.p_tank) || SETUPS.find(x => x.tank === a.p_tank); if (row) row.name = n; else SETUPS.push({ tank: a.p_tank, gravel: null, placed: [], name: n }); return { data: n, error: null }; }
      if (fn === "set_tank_fish") { TSPEC = TSPEC.filter(x => x.tank_id !== a.p_tank).concat(a.p_species.map(k => ({ species_key: k, tank_id: a.p_tank }))); return { data: null, error: null }; }
      if (fn === "give_tank") { UTANKS.push({ id: "22222222-2222-4222-8222-22222222222" + UTANKS.length, user_id: a.p_user, water: a.p_water, name: null, gravel: null, placed: [], how: "gift", created_at: new Date().toISOString() }); return { data: "x", error: null }; }
      return { data: null, error: null };
    },
    storage: { from: b => ({ createSignedUrls: async () => ({ data: [] }), createSignedUrl: async () => ({ data: null }),
      list: async folder => ({ data: b === "avatars" && folder === ME ? [{ name: "me.jpg" }] : b === "group-avatars" && folder === "g1" ? [{ name: "pic.jpg" }] : [], error: null }),
      remove: async paths => { REMOVED.push([b, paths]); ORDER.push("remove:" + b); return { data: paths, error: null }; } }) },
    from: t => ({ select: () => chain(t === "spots" || t === "spots_visible" ? SPOTS : t === "catches" ? CATCHES : t === "photos" ? [{ path: ME + "/a.jpg" }, { path: ME + "/b.jpg" }] : t === "groups" ? [{ id: "g1" }] : t === "shop_items" ? ITEMS : t === "user_items" ? [{ item_key: "rock_arch" }] : t === "tank_setups" ? SETUPS : t === "user_tanks" ? UTANKS : t === "tank_species" ? TSPEC : t === "profiles" ? [{ user_id: ME, handle: "sam", display_name: "Sam" }] : []),
      delete: () => chain(null), insert: () => chain(null), upsert: () => Promise.resolve({ error: null }), update: () => chain(null) }) }) };
  w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], predictions: [] }) });
}});
const w = dom.window; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(1000);
  let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
  const ev = c => w.eval(c), tx = n => n ? n.textContent.replace(/\s+/g, " ").trim() : "";
  const cards = () => [...d.querySelectorAll("#tank-body .tank-card[data-tank]")];
  const card = id => d.querySelector(`#tank-body .tank-card[data-tank="${id}"]`);
  const plaque = id => tx(card(id) && card(id).querySelector(".tank-plaque"));
  d.querySelector('#bnav [data-nav="play"]').click(); await wait(300);
  ev(`wallet = { coins: 30, gems: 3, today: 0, cap: 50, added: null, recent: [] }; walletDraw(); renderTank()`); await wait(200);
  ok(cards().map(c => c.dataset.tank).join(",") === "salt,fresh," + UT1, "three tanks: salt, fresh, then the extra one: " + cards().map(c => c.dataset.tank));
  ok(plaque("salt") === "Snook Corner · 2 fish", "named free tank plaque: " + plaque("salt"));
  ok(plaque("fresh") === "Freshwater tank · 1 fish", "unnamed tank keeps the plain plaque: " + plaque("fresh"));
  ok(plaque(UT1) === "Saltwater tank 2 · 1 fish", "extra tank, no name yet: " + plaque(UT1));
  ok(/^Snook Corner, a saltwater tank with 2 species\./.test(card("salt").querySelector(".tank").getAttribute("aria-label")), "spoken name uses the tank name");
  ok(!!card(UT1).querySelector(".tank-salt .tfish") && card(UT1).querySelectorAll(".tfish").length === 1 && card("salt").querySelectorAll(".tfish").length === 2, "the tarpon swims in the extra tank, snook + redfish in the first");
  ok(!!card("salt").querySelector(".tank-name-btn") && !card("salt").querySelector(".tank-fish-btn") && !!card(UT1).querySelector(".tank-fish-btn"), "✏️ Name on every tank, 🐟 Choose fish only on extra tanks");
  // rename the extra tank
  card(UT1).querySelector(".tank-name-btn").click(); await wait(30);
  let inp = card(UT1).querySelector(".tank-name-panel input");
  ok(!!inp && inp.maxLength === 24 && d.activeElement === inp, "name box opens with focus, 24 letters max");
  inp.value = "sh1t tank"; card(UT1).querySelector(".tank-name-panel .btn").click(); await wait(50);
  ok(/Please pick a different name/.test(tx(card(UT1).querySelector(".tank-name-panel .msg"))), "a refused name shows the reason");
  inp.value = "Tarpon Town"; card(UT1).querySelector(".tank-name-panel .btn").click(); await wait(100);
  ok(RPCS.some(r => r[0] === "set_tank_name" && r[1].p_tank === UT1 && r[1].p_name === "Tarpon Town"), "set_tank_name called with the tank's id");
  ok(plaque(UT1) === "Tarpon Town · 1 fish", "plaque shows the new name: " + plaque(UT1));
  // choose fish
  card(UT1).querySelector(".tank-fish-btn").click(); await wait(30);
  const boxes = [...card(UT1).querySelectorAll(".tank-fish-panel input[type=checkbox]")];
  ok(boxes.map(b => b.value).sort().join(",") === "redfish,snook,tarpon", "only saltwater fish to choose from: " + boxes.map(b => b.value));
  ok(boxes.find(b => b.value === "tarpon").checked && !boxes.find(b => b.value === "snook").checked, "tarpon already ticked");
  boxes.find(b => b.value === "snook").click();
  [...card(UT1).querySelectorAll(".tank-fish-panel .btn")].find(b => b.textContent === "Save").click(); await wait(100);
  ok(RPCS.some(r => r[0] === "set_tank_fish" && r[1].p_tank === UT1 && r[1].p_species.slice().sort().join(",") === "snook,tarpon"), "set_tank_fish saves exactly the ticked fish");
  ok(card(UT1).querySelectorAll(".tfish").length === 2 && card("salt").querySelectorAll(".tfish").length === 1, "snook moved into Tarpon Town");
  // move the last one too: the first tank says where they went
  card(UT1).querySelector(".tank-fish-btn").click(); await wait(30);
  card(UT1).querySelector('.tank-fish-panel input[value="redfish"]').click();
  [...card(UT1).querySelectorAll(".tank-fish-panel .btn")].find(b => b.textContent === "Save").click(); await wait(100);
  ok(/All your saltwater fish are swimming in your other tanks/.test(tx(card("salt"))) && !!card("salt").querySelector(".tank-name-btn"), "emptied first tank says so (and can still be named)");
  // customize an extra tank saves to that tank
  ev(`shop.owned.add("rock_arch")`);
  card(UT1).querySelector(".custom-btn").click(); await wait(30);
  [...card(UT1).querySelectorAll(".tank-custom .btn")].find(b => b.textContent === "Save").click(); await wait(80);
  ok(RPCS.some(r => r[0] === "save_tank_setup" && r[1].p_tank === UT1), "Customize on an extra tank saves to that tank");
  // more tanks: locked, owner test buttons
  const more = d.getElementById("more-tanks");
  ok(!!more && /You have 3 of 5 tanks/.test(tx(more)) && d.getElementById("more-tanks-buy").disabled && /Coming soon/.test(tx(d.getElementById("more-tanks-buy"))), "🏴‍☠️ More tanks: 3 of 5, Coming soon is locked");
  ok(!/\$|buy now/i.test(tx(more)), "no price or buy wording while doubloons aren't on sale");
  more.querySelector('[data-give="fresh"]').click(); await wait(200);
  ok(RPCS.some(r => r[0] === "give_tank" && r[1].p_user === ME && r[1].p_water === "fresh"), "owner test: give myself a freshwater tank");
  ok(cards().length === 4 && /Freshwater tank 2/.test(tx(cards()[3])) && /No fish in this tank yet/.test(tx(cards()[3])), "new empty extra tank shows with its hint: " + tx(cards()[3]).slice(0, 60));
  ok(!!d.querySelector("#more-tanks [data-take]"), "owner can take a test tank back");
  // a normal member: no owner buttons
  ev(`me.isOwner = false; renderTank()`); await wait(50);
  ok(!d.querySelector("#more-tanks [data-give]") && !d.querySelector("#more-tanks [data-take]") && d.getElementById("more-tanks-buy").disabled, "members see only the locked Coming soon");
  // someone else's profile: names show; an admin with Reports can remove one; owner can give a test tank
  ev(`me.isOwner = true; me.powers = ["reports"];`);
  const pb = d.createElement("div"); d.body.appendChild(pb);
  ev(`window.__pb = document.body.lastChild; tankProfile(Object.values(catchesBySpot).flat(), spots, window.__pb, false, Object.assign(tankSetupsFrom([{ tank: "salt", name: "Reef Dogs Den", placed: [] }], [], []), { ownerId: "u-other" }))`); await wait(50);
  ok(/Reef Dogs Den · 3 fish/.test(tx(pb)), "a friend's named tank shows its name: " + tx(pb.querySelector(".tank-plaque")));
  ok(!pb.querySelector(".tank-name-btn") && !pb.querySelector(".custom-btn"), "no Name / Customize on someone else's tank");
  const rm = [...pb.querySelectorAll("button")].find(b => /Remove name/.test(b.textContent));
  ok(!!rm, "admin with Reports sees 🙈 Remove name");
  rm.click(); await wait(20);
  pb.querySelector(".tank-hide-panel input").value = "not a nice name";
  [...pb.querySelectorAll(".tank-hide-panel .btn")][0].click(); await wait(60);
  ok(RPCS.some(r => r[0] === "hide_tank_name" && r[1].p_owner === "u-other" && r[1].p_tank === "salt" && r[1].p_reason === "not a nice name"), "Remove name calls hide_tank_name with a reason");
  ok(!!pb.querySelector("#prof-give-tank [data-give]"), "owner sees Give a test tank on a profile");
  const css = fs.readFileSync(__dirname + "/../css/app.css", "utf8");
  ok(!/.me-it small { display: inline; }/.test(css) && /.me-it > small { display: inline; }/.test(css), "Me page: subtitles under the title, only the right-hand tag inline");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
