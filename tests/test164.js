// 🎮 Games with members' public photos (js/51–52): Guess the fish, How long is it?, Keeper or release? use 🌎 Public catch photos; Fishing bingo; daily streak. Head copied from test163.
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
let CATCHES = [{ id: "c1", spot_id: "s1", species: "Snook", how_many: 1, caught_at: T, created_by: ME, length_in: 25 },
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
// members' 🌎 Public catches with photos (3 days ago), one from today (left out until tomorrow), one from a blocked person, one with no photo
const OLD = new Date(Date.now() - 3 * 86400000).toISOString(), NOWISH = new Date(Date.now() - 600000).toISOString();
const PC = (id, sp, len, by, at) => ({ id, spot_id: "s9", species: sp, how_many: 1, caught_at: at || OLD, created_by: by, length_in: len, visibility: "public" });
const PUB = [PC("p-a", "Snook", 26, "p1"), PC("p-b", "Tarpon", 40, "p2"), PC("p-c", "Mangrove snapper", 12, "p1"), PC("p-d", "Sheepshead", 14, "p2"), PC("p-e", "Jack crevalle", null, "p1"),
  PC("p-f", "Spanish mackerel", 15, "p2"), PC("p-g", "Redfish", 24, "p1"), PC("p-h", "Bluefish", 18, "p1", NOWISH), PC("p-i", "Cobia", 30, "p9"), PC("p-j", "Pinfish", 6, "p2")];
const PHOTOS = PUB.filter(c => c.id !== "p-j").map(c => ({ id: "ph-" + c.id, catch_id: c.id, path: c.created_by + "/" + c.id + ".jpg", created_at: c.caught_at }));
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
    storage: { from: b => ({ createSignedUrls: async paths => ({ data: paths.map(path => ({ path, signedUrl: "https://example.org/signed/" + path })) }), createSignedUrl: async () => ({ data: null }),
      list: async folder => ({ data: b === "avatars" && folder === ME ? [{ name: "me.jpg" }] : b === "group-avatars" && folder === "g1" ? [{ name: "pic.jpg" }] : [], error: null }),
      remove: async paths => { REMOVED.push([b, paths]); ORDER.push("remove:" + b); return { data: paths, error: null }; } }) },
    from: t => ({ select: () => chain(t === "spots" || t === "spots_visible" ? SPOTS : t === "catches" ? CATCHES.concat(PUB) : t === "blocks" ? [{ blocked: "p9" }] : t === "photos" ? PHOTOS : t === "groups" ? [{ id: "g1" }] : t === "shop_items" ? ITEMS : t === "user_items" ? [{ item_key: "rock_arch" }] : t === "tank_setups" ? SETUPS : t === "user_tanks" ? UTANKS : t === "tank_species" ? TSPEC : t === "fish_rules" ? RULES : t === "race_results" ? [{ coins: 10 }] : t === "profiles" ? [{ user_id: ME, handle: "sam", display_name: "Sam" }, { user_id: "p1", handle: "joe", display_name: "Joe" }, { user_id: "p2", handle: "ana", display_name: "Ana" }] : []),
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
  d.querySelector('#play-sw [data-sub="games"]').click(); await wait(400);
  ev(`typeof tutClose === "function" && tutClose(false)`);
  // ---- the list + the members' photo pool ----
  ok(["bingo", "guess", "length", "keeper", "race"].every(k => gc(k) && !gc(k).disabled), "all five game cards can be opened");
  ok(/Start a streak/.test(tx(d.querySelector("#games-body .games-streak"))), "streak box: 'Start a streak' before any game is done");
  const pool = JSON.parse(ev(`JSON.stringify(gpList())`));
  ok(pool.length === 7, "pool = members' 🌎 Public catches with a photo: " + pool.map(p => p.species).join(", "));
  ok(!pool.some(p => p.species === "Bluefish"), "a catch from today waits until tomorrow (so everyone has the same pool all day)");
  ok(!pool.some(p => p.species === "Cobia"), "a blocked person's photos are left out");
  ok(!pool.some(p => p.species === "Pinfish"), "a public catch with no photo is left out");
  ok(pool.find(p => p.species === "Snook").by === "Joe" && pool.find(p => p.species === "Tarpon").by === "Ana", "each photo is credited to the member who shared it");
  ok(INAT.length === 0, "enough members' photos today, so iNaturalist isn't asked at all");
  ok(/Today's 5 ready/.test(tx(gc("guess"))) && /Today's 5 ready/.test(tx(gc("length"))) && /Today's 5 ready/.test(tx(gc("keeper"))), "Guess / Length / Keeper cards: Today's 5 ready");
  // ---- Guess the fish ----
  const gq = JSON.parse(ev(`JSON.stringify(gfToday())`));
  ok(gq.length === 5 && gq.every(q => q.app && q.path && q.by), "Guess the fish: all 5 are members' photos");
  ok(new Set(gq.map(q => q.name)).size === 5 && gq.every(q => q.choices.length === 4 && new Set(q.choices).size === 4 && q.choices.includes(q.name)), "5 different fish, each with 4 different choices including the right one");
  ok(ev(`JSON.stringify(gfPick("2026-10-21", gfApp()))`) === ev(`JSON.stringify(gfPick("2026-10-21", gfApp().reverse()))`), "same day = same 5 photos whatever order they load in");
  gc("guess").click(); await wait(150);
  const img = d.querySelector("#games-body .gf-pic img");
  ok(/1 of 5/.test(tx($("games-body"))) && img && img.src.startsWith("https://example.org/signed/"), "Guess the fish shows a member's photo (signed link): " + (img && img.src));
  ok(/^📷 (Joe|Ana)$/.test(tx(d.querySelector("#games-body .gf-credit"))), "credit under the photo: " + tx(d.querySelector("#games-body .gf-credit")));
  for (let i = 0; i < 5; i++) {
    const want = i === 2 ? gq[i].choices.find(c => c !== gq[i].name) : gq[i].name;
    [...d.querySelectorAll("#games-body .gf-btn")].find(b => b.dataset.name === want).click(); await wait(40);
    if (i === 0) ok(/^Right!/.test(tx(d.querySelector("#games-body .kr-why"))), "right answer says Right!");
    if (i === 2) ok(/^Not quite — the answer is /.test(tx(d.querySelector("#games-body .kr-why"))), "wrong answer names the fish: " + tx(d.querySelector("#games-body .kr-why")).slice(0, 70));
    ok([...d.querySelectorAll("#games-body .gf-btn")].every(b => b.disabled), `photo ${i + 1}: choices lock after answering`);
    d.querySelector("#games-body .kr-next").click(); await wait(40);
  }
  ok(/4\/5/.test(tx(d.querySelector("#games-body .kr-score"))) && /members' 🌎 Public catches\.$/.test(tx(d.querySelector("#games-body .kr-fresh"))), "end screen: 4/5, photos from members' public catches");
  backBtn().click(); await wait(80);
  ok(/Done · 4\/5/.test(tx(gc("guess"))), "card: Done · 4/5");
  ok(/1-day streak/.test(tx(d.querySelector("#games-body .games-streak"))) && /Done for today/.test(tx(d.querySelector("#games-body .games-streak"))), "streak: 1-day streak, done for today");
  // today's questions stay put even if the pool changes later in the day
  ev(`gpPool = { day: gamesDay(), list: gpPool.list.slice(0, 2) }`);
  ok(ev(`JSON.stringify(gfToday().map(q => q.name))`) === JSON.stringify(gq.map(q => q.name)), "once started, today's photos never change (kept with your answers)");
  // too few members' photos: iNaturalist fills the gap
  const few = JSON.parse(ev(`JSON.stringify(gfPick("2026-10-21", gfApp().concat([])))`));
  ok(few.length === 2, "only 2 kinds of fish in members' photos = only 2 questions from them");
  ev(`localStorage.removeItem(gKey("guess")); gfToday()`); await wait(150);
  ok(INAT.length === 1 && /place_id=21/.test(INAT[0]) && /photo_license=cc0,cc-by,cc-by-sa&/.test(INAT[0]), "fewer than 5 kinds: iNaturalist (Florida, reusable licences only) is asked to fill in");
  const mix = JSON.parse(ev(`JSON.stringify(gfToday())`));
  ok(mix.length === 5 && mix.filter(q => q.app).length === 2 && mix.slice(0, 2).every(q => q.app), "members' photos come first, iNaturalist fills the rest: " + mix.map(q => q.app ? "member" : "iNat").join(","));
  ok(JSON.parse(ev(`JSON.stringify(gfPhotos)`)).every(p => ![9, 10, 11].includes(p.id)), "iNaturalist photos without a reuse licence, or of fish we don't know, are left out");
  // ---- streak maths ----
  ok(ev(`gamesStreak("2026-10-21", ["2026-10-18","2026-10-19","2026-10-20","2026-10-21"]).n`) === 4, "4 days in a row = 4-day streak");
  ok(ev(`gamesStreak("2026-10-21", ["2026-10-19","2026-10-20"]).n`) === 2, "not played yet today: yesterday's streak still shows");
  ok(ev(`gamesStreak("2026-10-21", ["2026-10-18","2026-10-20","2026-10-21"]).n`) === 2, "a missed day starts over");
  ok(ev(`gamesStreak("2026-03-01", ["2026-02-27","2026-02-28","2026-03-01"]).n`) === 3, "streak runs across the end of a month");
  // ---- How long is it? ----
  ev(`gpPool = null; gpLoad()`); await wait(150);
  const lq = JSON.parse(ev(`JSON.stringify(glToday())`));
  ok(lq.length === 5 && lq.every(q => q.app && q.path), "How long is it?: all 5 are members' measured catches: " + lq.map(q => q.name + " " + q.len).join(", "));
  ok(new Set(lq.map(q => q.name)).size === 5 && lq.every(q => pool.some(p => p.path === q.path && p.len === q.len)), "5 different fish; the answer is the length the member measured");
  ok(!lq.some(q => q.name === "Jack crevalle"), "a photo with no length is never used here");
  const draw = JSON.parse(ev(`JSON.stringify(glPick("2026-10-21", gpList().slice(0, 2)))`));
  ok(draw.length === 5 && draw.filter(q => q.app).length <= 2 && draw.filter(q => !q.app).length >= 3, "too few measured photos: fish drawings fill the rest");
  ok(ev(`[glPts(0), glPts(1), glPts(2.5), glPts(6), glPts(6.5)].join()`) === "3,3,2,1,0", "points: 3 within 1″, 2 within 3″, 1 within 6″, else 0");
  const sc = ev(`(() => { const s = glScene({ name: "Snook", len: 20 }); return [s.querySelector(".gl-fish").style.width, s.querySelector(".gl-bill").style.width]; })()`);
  ok(Math.abs(parseFloat(sc[0]) * 115 / 128 / parseFloat(sc[1]) - 20 / 6.14) < 0.1, "drawing fallback: fish and dollar bill at the same scale: " + sc.join(" / "));
  gc("length").click(); await wait(150);
  ok(d.querySelector("#games-body .gf-pic img") && /measured by the angler/.test(tx(d.querySelector("#games-body .gf-credit"))), "the question shows the member's photo: " + tx(d.querySelector("#games-body .gf-credit")));
  const plus = [...d.querySelectorAll("#games-body .gl-step")][1];
  plus.click(); plus.click(); await wait(20);
  ok(tx(d.querySelector("#games-body .gl-val")) === "21″", "+ twice = 21″");
  for (let i = 0; i < 5; i++) {
    const s2 = d.querySelector("#games-body .gl-slider"); s2.value = String(lq[i].len + (i === 1 ? 10 : 0.5)); s2.dispatchEvent(new w.Event("input")); await wait(10);
    d.querySelector("#games-body .gl-lock").click(); await wait(40);
    if (i === 0) ok(/^Spot on!/.test(tx(d.querySelector("#games-body .kr-why"))) && /measured by (Joe|Ana)/.test(tx(d.querySelector("#games-body .kr-why"))) && /\+3 points/.test(tx(d.querySelector("#games-body .kr-why"))), "Spot on! +3, measured by the member: " + tx(d.querySelector("#games-body .kr-why")));
    if (i === 1) ok(/^Way off/.test(tx(d.querySelector("#games-body .kr-why"))), "10″ off: Way off");
    ok(d.querySelector("#games-body .gl-slider").disabled, `fish ${i + 1}: guess locks`);
    d.querySelector("#games-body .kr-next").click(); await wait(40);
  }
  ok(/12\/15/.test(tx(d.querySelector("#games-body .kr-score"))), "end screen: 12/15");
  backBtn().click(); await wait(80);
  ok(/Done · 12\/15/.test(tx(gc("length"))), "card: Done · 12/15");
  // ---- Keeper or release? with members' photos ----
  const kq = JSON.parse(ev(`JSON.stringify(krToday().map(q => ({ s: q.species, photo: q.photo, len: q.len, keep: q.keep })))`));
  const withPic = kq.filter(q => q.photo);
  ok(kq.length === 5 && withPic.length >= 4, `Keeper or release?: fish with a member's photo go first (${withPic.length} of 5 have one): ` + kq.map(q => q.s + (q.photo ? "📷" : "")).join(", "));
  ok(ev(`krPick("2026-10-21", fishRules).length`) === 5 && ev(`krPick("2026-10-21", fishRules).every(q => !q.photo)`), "with no photos the quiz still works (drawings)");
  gc("keeper").click(); await wait(150);
  const first = kq[0];
  if (first.photo) {
    ok(d.querySelector("#games-body .kr-q .gf-pic img") && /^📷 /.test(tx(d.querySelector("#games-body .kr-q .gf-credit"))), "question 1 shows the member's photo with credit");
    ok(/^If you caught one at /.test(tx(d.querySelector("#games-body .kr-facts"))) && /made up for the quiz, not this angler's catch/.test(tx(d.querySelector("#games-body .kr-made"))), "the size and date are clearly made up, not the member's: " + tx(d.querySelector("#games-body .kr-facts")));
  } else ok(false, "question 1 should have a photo");
  d.querySelector(`#games-body .kr-btn[data-keep="${first.keep}"]`).click(); await wait(50);
  ok(/^Right!/.test(tx(d.querySelector("#games-body .kr-why"))), "Keeper answers still come from the size rules");
  ev(`gpPool = { day: gamesDay(), list: [] }`);
  ok(ev(`JSON.stringify(krToday().map(q => q.species))`) === JSON.stringify(kq.map(q => q.s)), "once started, today's Keeper questions never change");
  // ---- Fishing bingo ----
  ev(`gamesScreen = "list"; renderGames()`); await wait(50);
  const month = ev(`gamesDay().slice(0, 7)`);
  const c1 = ev(`JSON.stringify(bgCard("${month}").map(s => s.id))`);
  ok(c1 === ev(`JSON.stringify(bgCard("${month}").map(s => s.id))`) && JSON.parse(c1).length === 9 && JSON.parse(c1)[4] === "free" && new Set(JSON.parse(c1)).size === 9, "a 3×3 card, the same all month, FREE in the middle");
  ok(c1 !== ev(`JSON.stringify(bgCard("2026-11").map(s => s.id))`), "a new card next month");
  const S = Object.fromEntries(ev(`(() => { const x = { catches: [{ species: "Snook", caught_at: "2026-10-03T11:00:00Z", length_in: 25, how_many: 1, spot_id: "s1" }, { species: "Redfish", caught_at: "2026-10-03T13:00:00Z", how_many: 2, spot_id: "s2" }], trips: [] }; return BG_TASKS.map(t => [t.id, t.ok(x)]); })()`));
  ok(S.dawn && S.three && S["two-sp"] && S.big && S.spots && S.weekend && S.measure && !S.trip && !S.night && !S.five, "bingo squares check out: " + JSON.stringify(S));
  ok(ev(`bgState("2020-01").n`) === 1, "a month with nothing logged: only FREE");
  ok(ev(`bgMine(gamesDay().slice(0, 7)).catches.every(c => c.created_by === "${ME}")`), "bingo counts only your own catches (members' public ones don't count)");
  gc("bingo").click(); await wait(100);
  ok(d.querySelectorAll("#games-body .bg-sq").length === 9 && d.querySelectorAll("#games-body .bg-sq.on").length === ev(`bgState("${month}").n`), "bingo opens with 9 squares, filled from this month");
  // ---- offline (no photos loaded yet) ----
  ev(`gpPool = null; gfPhotos = null; gfErr = null; localStorage.removeItem(GP_KEY); localStorage.removeItem("fm-guess-photos"); localStorage.removeItem(gKey("guess"))`);
  ev(`window.__from = db.from; db.from = t => t === "catches" ? { select: () => { const o = { eq: () => o, is: () => o, order: () => o, limit: () => Promise.resolve({ data: null, error: { message: "offline" } }) }; return o; } } : window.__from(t)`);
  FAILNET.on = true;
  ev(`gamesScreen = "guess"; renderGames()`); await wait(200);
  ok(/Couldn't load today's photos/.test(tx($("games-body"))) && [...d.querySelectorAll("#games-body button")].some(b => /Try again/.test(b.textContent)), "no internet: a clear message and Try again: " + tx($("games-body")).slice(0, 90));
  FAILNET.on = false; ev(`db.from = window.__from`);
  [...d.querySelectorAll("#games-body button")].find(b => /Try again/.test(b.textContent)).click(); await wait(300);
  ok(d.querySelector("#games-body .gf-pic img") && /1 of 5/.test(tx($("games-body"))), "Try again loads the photos");
  // ---- nothing in the database ----
  ok(WRITES.length === 0, "nothing saved to the database by any game: " + JSON.stringify(WRITES.map(x => x[0])));
  const css = [...d.querySelectorAll("style")].map(s => s.textContent).join("\n");
  ok(/\.gl-step \{[^}]*width: 48px; height: 48px/.test(css) && /\.gl-slider \{[^}]*height: 44px/.test(css) && /\.bg-sq \{[^}]*min-height: 88px/.test(css), "tap targets 44px or more");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
