// 🎮 Games step 1 (js/51): Play › Races is now 🎮 Games (a list of game cards); Keeper or release? daily quiz from the app's own size rules. Head copied from test162.
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
  w.fetch = async () => ({ ok: true, json: async () => ({ properties: {}, features: [], elements: [], results: [], predictions: [] }) });
}});
const w = dom.window; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(1000);
  let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
  const ev = c => w.eval(c), tx = n => n ? n.textContent.replace(/\s+/g, " ").trim() : "", $ = id => d.getElementById(id);
  const cardsTxt = () => [...d.querySelectorAll("#games-body .game-card")].map(b => b.dataset.game);
  // ---- Races → Games move ----
  ok(!d.querySelector('#play-sw [data-sub="race"]') && /🎮 Games/.test(tx(d.querySelector('#play-sw [data-sub="games"]'))), "Play tab 'Fish race' is now '🎮 Games'");
  d.querySelector('#bnav [data-nav="play"]').click(); await wait(300);
  d.querySelector('#play-sw [data-sub="games"]').click(); await wait(200);
  ok(!$("games-card").hidden && $("race-card").hidden && $("play-tank").hidden && $("fk-card").hidden, "Games tab shows only the Games list");
  ok(cardsTxt().join(",") === "bingo,guess,length,keeper,race", "cards in order: bingo, guess, length, keeper, race: " + cardsTxt());
  const gc = k => d.querySelector(`#games-body .game-card[data-game="${k}"]`);
  ok(["bingo", "guess", "length"].every(k => !gc(k).disabled), "bingo / guess / length can be opened now (built after step 1, see test164)");
  ok(/Keeper or release\?/.test(tx(gc("keeper"))) && /Today's 5 ready/.test(tx(gc("keeper"))), "Keeper card: Today's 5 ready: " + tx(gc("keeper")));
  ok(/Fish race/.test(tx(gc("race"))) && /2 wins left today/.test(tx(gc("race"))), "Fish race card: wins left today (1 paid win so far): " + tx(gc("race")));
  ok(w.localStorage.getItem("fm-play-sub") === "games", "Games tab remembered");
  gc("race").click(); await wait(200);
  ok(!$("race-card").hidden && $("games-card").hidden && $("race-body").childNodes.length > 0, "Fish race card opens the race screen");
  ok(d.querySelector('#play-sw [data-sub="games"]').classList.contains("on"), "Games tab stays lit on the race screen");
  $("race-back").click(); await wait(150);
  ok(!$("games-card").hidden && $("race-card").hidden && cardsTxt().length === 5, "‹ Games on the race screen goes back to the list");
  ev(`showPlay("race")`); await wait(150);
  ok(!$("race-card").hidden && $("games-card").hidden, "showPlay('race') (old links) still opens the race directly");
  ev(`showView("list")`); await wait(100);
  ev(`raceOpenRoom(5)`); await wait(200);
  ok(!$("view-tank").hidden && !$("race-card").hidden, "race-room alert link (?go=race&room=) still opens the race");
  // ---- the daily pick ----
  const pick = day => JSON.parse(ev(`JSON.stringify(krPick(${JSON.stringify(day)}, fishRules).map(q => ({ s: q.species, r: q.rule.id, len: q.len, when: q.when.toISOString(), keep: q.keep })))`));
  ok(ev(`fishRules.length`) === RULES.length, "the fake rules are loaded: " + ev(`fishRules.length`));
  const a = pick("2026-10-20"), b = pick("2026-10-20");
  ok(a.length === 5 && JSON.stringify(a) === JSON.stringify(b), "same date = the same 5 questions");
  ok(JSON.stringify(JSON.parse(ev(`JSON.stringify(krPick("2026-10-20", fishRules.slice().reverse()).map(q => ({ s: q.species, r: q.rule.id, len: q.len, when: q.when.toISOString(), keep: q.keep })))`))) === JSON.stringify(a), "same 5 whatever order the rules arrive in");
  ok(JSON.stringify(pick("2026-10-21")) !== JSON.stringify(a), "the next day gives different questions");
  ok(new Set(a.map(q => q.s)).size === 5, "5 different species");
  const yearRows = RULES.filter(r => (r.open_only || []).some(x => x[0].length > 5)).map(r => r.id);
  let checked = 0, wrong = [], keeps = 0, rels = 0, excluded = 0;
  for (let i = 0; i < 400; i++) {
    const day = new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10);
    const qs = JSON.parse(ev(`JSON.stringify(krPick("${day}", fishRules).map(q => { const k = keeperCheck(q.species, q.len, q.when, { tags: q.tags }); return { id: q.rule.id, keep: q.keep, lvl: k && k.level, same: k && keeperCheck.length && ruleFor(q.species, { tags: q.tags }).id === q.rule.id, n: q.species, why: q.why, src: q.rule.species }; }))`));
    if (qs.length !== 5) wrong.push(day + " gave " + qs.length);
    qs.forEach(q => {
      checked++; q.keep ? keeps++ : rels++;
      if (yearRows.includes(q.id)) excluded++;
      if (!q.same || !(q.keep ? q.lvl === "ok" : q.lvl === "bad")) wrong.push(`${day} ${q.n}: ${q.keep ? "Keep" : "Release"} but checker says ${q.lvl} (${q.why})`);
      if (!RULES.some(r => r.species === q.src)) wrong.push("not from a rule: " + q.n);
    });
  }
  ok(!wrong.length, `every answer matches the keeper checker (${checked} questions over 400 days)` + (wrong.length ? ": " + wrong.slice(0, 3).join(" | ") : ""));
  ok(keeps > checked * 0.3 && rels > checked * 0.3, `a fair mix of keeps (${keeps}) and releases (${rels})`);
  ok(!excluded, "rules with this-year-only dates (red snapper, Gulf gag/amberjack) are never used");
  ok(ev(`krPick("2026-10-20", []).length`) === 0, "no rules loaded = no questions (never made up)");
  // ---- playing today's quiz ----
  const writes0 = WRITES.length, rpc0 = RPCS.length;
  ev(`showPlay("games")`); await wait(150);
  gc("keeper").click(); await wait(100);
  ok(/Keeper or release\?/.test(tx($("games-body"))) && /1 of 5/.test(tx($("games-body"))), "quiz opens on question 1 of 5");
  const q1 = tx(d.querySelector("#games-body .kr-facts"));
  ok(/″ (total|fork) length · [A-Z][a-z]+ \d+ · /.test(q1), "the question shows a length, a date and where: " + q1);
  ok(/check the current FWC rules|confirm with FWC/.test(tx(d.querySelector("#games-body .kr-fresh"))), "the FWC freshness warning is on screen: " + tx(d.querySelector("#games-body .kr-fresh")));
  const today = JSON.parse(ev(`JSON.stringify(krPick(gamesDay(), fishRules).map(q => ({ keep: q.keep, why: q.why })))`));
  for (let i = 0; i < 5; i++) {
    const want = i < 4 ? today[i].keep : !today[i].keep;   // get the last one wrong
    d.querySelector(`#games-body .kr-btn[data-keep="${want}"]`).click(); await wait(40);
    const why = tx(d.querySelector("#games-body .kr-why"));
    if (i === 0) ok(why.includes(today[0].why) && /^Right!/.test(why), "after an answer: one-line reason: " + why);
    if (i === 4) ok(/^Not quite/.test(why), "a wrong answer says so: " + why);
    ok([...d.querySelectorAll("#games-body .kr-btn")].every(x => x.disabled), `Q${i + 1}: buttons lock after answering`);
    d.querySelector("#games-body .kr-next").click(); await wait(40);
  }
  ok(/4\/5/.test(tx(d.querySelector("#games-body .kr-score"))), "end screen: score 4/5");
  ok(d.querySelectorAll("#games-body .kr-review li").length === 5 && /FWC/.test(tx(d.querySelector("#games-body .kr-fresh"))), "end screen lists all 5 and keeps the FWC warning");
  [...d.querySelectorAll("#games-body button")].find(x => /Back to Games/.test(x.textContent)).click(); await wait(80);
  ok(/Done · 4\/5/.test(tx(gc("keeper"))), "card now says Done · 4/5: " + tx(gc("keeper")));
  ok(WRITES.length === writes0 && RPCS.length === rpc0, "nothing saved to the database while playing");
  const saved = JSON.parse(w.localStorage.getItem("fm-keeper-" + ME));
  ok(saved && saved.picks.length === 5 && saved.day === ev(`gamesDay()`), "today's answers kept on this phone only");
  gc("keeper").click(); await wait(60);
  ok(/4\/5/.test(tx(d.querySelector("#games-body .kr-score"))) && !d.querySelector("#games-body .kr-btn"), "reopening today shows the score, no replay");
  // ---- ? intro card ----
  ev(`gamesScreen = "list"; renderGames()`); await wait(30);
  ev(`tutClose(false)`);
  d.querySelector("#games-body .games-help").click(); await wait(50);
  ok(/Quick games 🎮/.test(tx($("tut"))) && /Play a round while you wait for the tide\./.test(tx($("tut"))) && $("tut-ok").textContent === "Got it", "? shows the Games intro card");
  const w0 = WRITES.length; $("tut-ok").click(); await wait(50);
  ok(!$("tut") && !WRITES.slice(w0).some(x => x[0] === "tutorials_seen" && x[1].screen_key === "games"), "Got it closes it; remembered on the phone (no database row)");
  ok(JSON.parse(w.localStorage.getItem("fm-tut-" + ME) || "[]").includes("games"), "Games intro marked seen on this phone");
  ok(ev(`tutCurrentKey()`) === "games", "the top ? button on the Games screen opens the Games card");
  // ---- look ----
  const css = [...d.querySelectorAll("style")].map(s => s.textContent).join("\n");
  ok(/\.game-card \{[^}]*min-height: 72px/.test(css) && /\.kr-btn \{[^}]*min-height: 60px/.test(css) && /\.games-help \{[^}]*width: 44px; height: 44px/.test(css) && /\.games-back \{[^}]*min-height: 44px/.test(css), "tap targets 44px or more");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
