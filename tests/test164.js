// 🎮 Games, the rest (js/52): Guess the fish (iNaturalist photos), How long is it?, Fishing bingo, daily streak. Head copied from test163.
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
const RULES = JSON.parse(fs.readFileSync(__dirname + "/fish-rules-oct2026.json", "utf8")), WRITES = [];
const INAT = [], FAILNET = { on: false };
const OBS = [["Common Snook", "cc-by", 1], ["Tarpon", "cc0", 2], ["Gray Snapper", "cc-by-sa", 3], ["Sheepshead", "cc-by", 4], ["Crevalle Jack", "cc-by", 5], ["Great Barracuda", "cc0", 6], ["Red Drum", "cc-by", 7], ["Atlantic Spadefish", "cc-by", 8],
  ["Hogfish", null, 9], ["Spotted Moray", "cc-by", 10], ["Blue Catfish", "cc-by", 11], ["Florida Pompano", "cc-by", 12], ["Bluefish", "cc0", 13]]
  .map(([n, lic, id]) => ({ id, uri: "https://www.inaturalist.org/observations/" + id, taxon: { preferred_common_name: n, name: n }, photos: [{ url: "https://static.inaturalist.org/photos/" + id + "/square.jpg", license_code: lic, attribution: "(c) Pat " + id + ", some rights reserved (CC BY)" }] }));
const ORDER = [], RPCS = [], REMOVED = [], STATE = { missing: false, fail: false, signedOut: false };
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.requestAnimationFrame = f => setTimeout(f, 0); w.Element.prototype.scrollIntoView = () => {};
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, lte: () => o, neq: () => o, gt: () => o, order: () => o, range: () => p, limit: () => p, select: () => o,
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
    from: t => ({ select: () => chain(t === "spots" || t === "spots_visible" ? SPOTS : t === "catches" ? CATCHES : t === "photos" ? [{ path: ME + "/a.jpg" }, { path: ME + "/b.jpg" }] : t === "groups" ? [{ id: "g1" }] : t === "shop_items" ? ITEMS : t === "user_items" ? [{ item_key: "rock_arch" }] : t === "tank_setups" ? SETUPS : t === "user_tanks" ? UTANKS : t === "tank_species" ? TSPEC : t === "fish_rules" ? RULES : t === "race_results" ? [{ coins: 10 }] : t === "profiles" ? [{ user_id: ME, handle: "sam", display_name: "Sam" }] : []),
      delete: () => chain(null), insert: r => { WRITES.push([t, r]); return chain(null); }, upsert: r => { WRITES.push([t, r]); return Promise.resolve({ error: null }); }, update: r => { WRITES.push([t, r]); return chain(null); } }) }) };
  w.fetch = async u => { if (/inaturalist/.test(String(u)) && /place_id=21/.test(String(u))) { INAT.push(String(u)); if (FAILNET.on) throw new Error("offline"); return { ok: true, json: async () => ({ results: OBS }) }; } return { ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], predictions: [] }) }; };
}});
const w = dom.window; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(1000);
  let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
  const ev = c => w.eval(c), tx = n => n ? n.textContent.replace(/\s+/g, " ").trim() : "", $ = id => d.getElementById(id);
  const gc = k => d.querySelector(`#games-body .game-card[data-game="${k}"]`);
  const backBtn = () => [...d.querySelectorAll("#games-body button")].find(x => /Back to Games/.test(x.textContent));
  d.querySelector('#bnav [data-nav="play"]').click(); await wait(300);
  d.querySelector('#play-sw [data-sub="games"]').click(); await wait(300);
  ev(`typeof tutClose === "function" && tutClose(false)`);
  // ---- the list ----
  ok(["bingo", "guess", "length", "keeper", "race"].every(k => gc(k) && !gc(k).disabled), "all five game cards can be opened (no more 'Coming soon')");
  ok(!/Coming soon/.test(tx($("games-body"))), "no 'Coming soon' left on the Games list");
  ok(/Start a streak/.test(tx(d.querySelector("#games-body .games-streak"))), "streak box: 'Start a streak' before any game is done");
  ok(INAT.length >= 1 && /place_id=21/.test(INAT[0]) && /photo_license=cc0,cc-by,cc-by-sa&/.test(INAT[0]) && /quality_grade=research/.test(INAT[0]), "Guess the fish asks iNaturalist for Florida, research-grade, reusable-licence photos only");
  ok(/Today's 5 ready/.test(tx(gc("guess"))) && /Today's 5 ready/.test(tx(gc("length"))), "Guess / Length cards: Today's 5 ready: " + tx(gc("guess")) + " | " + tx(gc("length")));
  // ---- Guess the fish ----
  const photos = JSON.parse(ev(`JSON.stringify(gfPhotos)`));
  ok(photos.length === 10 && photos.every(p => p.photo.includes("/medium.")) && ![9, 10, 11].some(id => photos.some(p => p.id === id)), "only photos with an allowed licence, mapped to our fish (no-licence, unknown and far-away fish left out): " + photos.map(p => p.id));
  const g1 = ev(`JSON.stringify(gfPick("2026-10-21", gfPhotos))`), g2 = ev(`JSON.stringify(gfPick("2026-10-21", gfPhotos.slice().reverse()))`);
  ok(g1 !== "[]" && JSON.parse(g1).length === 5, "5 photos a day");
  ok(g1 === ev(`JSON.stringify(gfPick("2026-10-21", gfPhotos))`), "same day = same 5 photos");
  const gq = JSON.parse(g1);
  ok(new Set(gq.map(q => q.name)).size === 5 && gq.every(q => q.choices.length === 4 && new Set(q.choices).size === 4 && q.choices.includes(q.name)), "5 different fish, each with 4 different choices including the right one");
  gc("guess").click(); await wait(100);
  ok(/Guess the fish/.test(tx($("games-body"))) && /1 of 5/.test(tx($("games-body"))) && d.querySelector("#games-body .gf-pic img"), "Guess the fish opens on photo 1 of 5");
  ok(/📷 .* · iNaturalist/.test(tx(d.querySelector("#games-body .gf-credit"))) && d.querySelector("#games-body .gf-credit a").href.startsWith("https://www.inaturalist.org/"), "photo credit shown with a link: " + tx(d.querySelector("#games-body .gf-credit")));
  const today = JSON.parse(ev(`JSON.stringify(gfPick(gamesDay(), gfPhotos))`));
  for (let i = 0; i < 5; i++) {
    const want = i === 2 ? today[i].choices.find(c => c !== today[i].name) : today[i].name;
    [...d.querySelectorAll("#games-body .gf-btn")].find(b => b.dataset.name === want).click(); await wait(40);
    if (i === 0) ok(/^Right!/.test(tx(d.querySelector("#games-body .kr-why"))), "right answer says Right!");
    if (i === 2) ok(/^Not quite — the answer is /.test(tx(d.querySelector("#games-body .kr-why"))), "wrong answer names the fish: " + tx(d.querySelector("#games-body .kr-why")).slice(0, 60));
    ok([...d.querySelectorAll("#games-body .gf-btn")].every(b => b.disabled), `photo ${i + 1}: choices lock after answering`);
    d.querySelector("#games-body .kr-next").click(); await wait(40);
  }
  ok(/4\/5/.test(tx(d.querySelector("#games-body .kr-score"))), "Guess the fish end screen: 4/5");
  backBtn().click(); await wait(80);
  ok(/Done · 4\/5/.test(tx(gc("guess"))), "card: Done · 4/5");
  ok(/1-day streak/.test(tx(d.querySelector("#games-body .games-streak"))) && /Done for today/.test(tx(d.querySelector("#games-body .games-streak"))), "streak: 1-day streak, done for today");
  // ---- streak maths ----
  ok(ev(`gamesStreak("2026-10-21", ["2026-10-18","2026-10-19","2026-10-20","2026-10-21"]).n`) === 4, "4 days in a row = 4-day streak");
  ok(ev(`gamesStreak("2026-10-21", ["2026-10-19","2026-10-20"]).n`) === 2, "not played yet today: yesterday's streak still shows");
  ok(ev(`gamesStreak("2026-10-21", ["2026-10-18","2026-10-20","2026-10-21"]).n`) === 2, "a missed day starts over");
  ok(ev(`gamesStreak("2026-03-01", ["2026-02-27","2026-02-28","2026-03-01"]).n`) === 3, "streak runs across the end of a month");
  // ---- How long is it? ----
  const l1 = ev(`JSON.stringify(glPick("2026-10-21"))`);
  ok(l1 === ev(`JSON.stringify(glPick("2026-10-21"))`) && l1 !== ev(`JSON.stringify(glPick("2026-10-22"))`), "same 5 fish all day; new ones tomorrow");
  const lens = JSON.parse(l1);
  ok(lens.length === 5 && lens.every(q => q.len >= 6 && q.len <= 54 && q.len * 2 === Math.round(q.len * 2)), "lengths are believable half inches: " + lens.map(q => q.name + " " + q.len).join(", "));
  ok(ev(`[glPts(0), glPts(1), glPts(2.5), glPts(6), glPts(6.5)].join()`) === "3,3,2,1,0", "points: 3 within 1″, 2 within 3″, 1 within 6″, else 0");
  gc("length").click(); await wait(100);
  const fish = d.querySelector("#games-body .gl-fish"), bill = d.querySelector("#games-body .gl-bill");
  const tq = JSON.parse(ev(`JSON.stringify(glPick(gamesDay()))`));
  const ratio = (parseFloat(fish.style.width) * 115 / 128) / parseFloat(bill.style.width);
  ok(Math.abs(ratio - tq[0].len / 6.14) < 0.1, `fish and dollar bill drawn to the same scale (ratio ${ratio.toFixed(2)} vs ${(tq[0].len / 6.14).toFixed(2)})`);
  ok(/%$/.test(fish.style.width) && /%$/.test(bill.style.width) && parseFloat(fish.style.width) <= 100, "fish and bill sized as shares of the picture, so they fit any phone: " + fish.style.width + " / " + bill.style.width);
  const plus = [...d.querySelectorAll("#games-body .gl-step")][1];
  plus.click(); plus.click(); await wait(20);
  ok(tx(d.querySelector("#games-body .gl-val")) === "21″", "+ twice = 21″: " + tx(d.querySelector("#games-body .gl-val")));
  for (let i = 0; i < 5; i++) {
    const s2 = d.querySelector("#games-body .gl-slider"); s2.value = String(tq[i].len + (i === 1 ? 10 : 0.5)); s2.dispatchEvent(new w.Event("input")); await wait(10);
    d.querySelector("#games-body .gl-lock").click(); await wait(40);
    if (i === 0) ok(/^Spot on!/.test(tx(d.querySelector("#games-body .kr-why"))) && /\+3 points/.test(tx(d.querySelector("#games-body .kr-why"))), "within half an inch: Spot on! +3: " + tx(d.querySelector("#games-body .kr-why")));
    if (i === 1) ok(/^Way off/.test(tx(d.querySelector("#games-body .kr-why"))), "10″ off: Way off");
    ok(d.querySelector("#games-body .gl-slider").disabled, `fish ${i + 1}: guess locks`);
    d.querySelector("#games-body .kr-next").click(); await wait(40);
  }
  ok(/12\/15/.test(tx(d.querySelector("#games-body .kr-score"))), "end screen: 12/15: " + tx(d.querySelector("#games-body .kr-score")));
  backBtn().click(); await wait(80);
  ok(/Done · 12\/15/.test(tx(gc("length"))), "card: Done · 12/15");
  // ---- Fishing bingo ----
  const month = ev(`gamesDay().slice(0, 7)`);
  const c1 = ev(`JSON.stringify(bgCard("${month}").map(s => s.id))`);
  ok(c1 === ev(`JSON.stringify(bgCard("${month}").map(s => s.id))`) && JSON.parse(c1).length === 9 && JSON.parse(c1)[4] === "free" && new Set(JSON.parse(c1)).size === 9, "a 3×3 card, the same all month, FREE in the middle");
  ok(c1 !== ev(`JSON.stringify(bgCard("2026-11").map(s => s.id))`), "a new card next month");
  ok(JSON.parse(c1).filter(x => x.startsWith("fish:")).length === 3, "3 fish squares (in season from shore this month)");
  const S = Object.fromEntries(ev(`(() => { const x = { catches: [{ species: "Snook", caught_at: "2026-10-03T11:00:00Z", length_in: 25, how_many: 1, spot_id: "s1" }, { species: "Redfish", caught_at: "2026-10-03T13:00:00Z", how_many: 2, spot_id: "s2" }], trips: [] }; return BG_TASKS.map(t => [t.id, t.ok(x)]); })()`));
  ok(S.dawn && S.three && S["two-sp"] && S.big && S.spots && S.weekend && S.measure && !S.trip && !S.night && !S.five, "squares check out (7am catch = before 8 am, 3 fish one day, 2 kinds, 25″, 2 spots, Saturday, measured; no trip / night / 5 fish): " + JSON.stringify(S));
  ok(ev(`bgState("2020-01").n`) === 1, "a month with nothing logged: only FREE");
  gc("bingo").click(); await wait(100);
  ok(/Fishing bingo/.test(tx($("games-body"))) && d.querySelectorAll("#games-body .bg-sq").length === 9, "bingo opens with 9 squares");
  const on = d.querySelectorAll("#games-body .bg-sq.on").length, want = ev(`bgState("${month}").n`);
  ok(on === want && on > 1, `squares fill in from this month's catches (${on} of 9)`);
  ok(/of 9 squares|BINGO|Full card/.test(tx(d.querySelector("#games-body .kr-why"))), "bingo message: " + tx(d.querySelector("#games-body .kr-why")));
  ok(ev(`BG_LINES.length`) === 8, "8 ways to make a line (3 rows, 3 columns, 2 diagonals)");
  d.querySelector("#games-body .games-back").click(); await wait(80);
  ok(new RegExp(want + " of 9|BINGO|Full card").test(tx(gc("bingo"))), "bingo card status: " + tx(gc("bingo")));
  // ---- offline ----
  ev(`gfPhotos = null; gfErr = null; localStorage.removeItem("fm-guess-photos")`); FAILNET.on = true;
  ev(`gamesScreen = "guess"; renderGames()`); await wait(150);
  ok(/Couldn't load today's photos/.test(tx($("games-body"))) && [...d.querySelectorAll("#games-body button")].some(b => /Try again/.test(b.textContent)), "no internet: a clear message and Try again");
  FAILNET.on = false;
  [...d.querySelectorAll("#games-body button")].find(b => /Try again/.test(b.textContent)).click(); await wait(200);
  ok(ev("gfPhotos && gfPhotos.length") === 10 && /4\/5/.test(tx($("games-body"))), "Try again loads the photos (today already played, so it shows the score): " + tx($("games-body")).slice(0, 120) + " busy=" + ev("gfBusy") + " n=" + INAT.length);
  // ---- nothing in the database; Keeper still works ----
  ok(WRITES.length === 0, "nothing saved to the database by any game: " + JSON.stringify(WRITES.map(x => x[0])));
  ok(w.localStorage.getItem("fm-guess-" + ME) && w.localStorage.getItem("fm-length-" + ME) && JSON.parse(w.localStorage.getItem("fm-games-days-" + ME)).length === 1, "answers and streak kept on this phone");
  ev(`gamesScreen = "list"; renderGames()`); await wait(50);
  gc("keeper").click(); await wait(60);
  ok(/1 of 5/.test(tx($("games-body"))), "Keeper or release? still opens");
  const css = [...d.querySelectorAll("style")].map(s => s.textContent).join("\n");
  ok(/\.gl-step \{[^}]*width: 48px; height: 48px/.test(css) && /\.gl-slider \{[^}]*height: 44px/.test(css) && /\.bg-sq \{[^}]*min-height: 88px/.test(css), "tap targets 44px or more");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
