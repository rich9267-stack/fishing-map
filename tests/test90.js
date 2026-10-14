// test90: 🏁 Fish race screen — picking a racer, asking run_race, the 5 lanes, places, coins, limits, errors, empty state.
process.env.TZ = "America/New_York";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sun = fs.readFileSync(require.resolve("suncalc"), "utf8");
const leaf = fs.readFileSync(require.resolve("leaflet/dist/leaflet.js"), "utf8");
const html = require("./load")();
const ME = "u-rich";
const SPOTS = [
  { id: "s1", name: "Hillsboro Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.257, lng: -80.081, created_by: ME, public_access: "yes", tide_offset_min: 0, faces_deg: 90 },
  { id: "s4", name: "Black Creek Canal", spot_type: "seawall", water_type: "brackish", lat: 25.55, lng: -80.35, created_by: ME, public_access: "yes", tide_offset_min: 75 },
  { id: "s2", name: "C-14 Canal", spot_type: "seawall", water_type: "freshwater", lat: 26.27, lng: -80.15, created_by: ME, public_access: "yes" },
  { id: "s9", name: "Mike Public", spot_type: "pier", water_type: "saltwater", lat: 26.30, lng: -80.09, created_by: "other", public_access: "yes", visibility: "public", is_exact: false },
  { id: "s3", name: "Jupiter Inlet", spot_type: "inlet", water_type: "saltwater", lat: 26.945, lng: -80.07, created_by: ME, public_access: "yes" }
];
const obs = (id, name, lat, lng, extra = {}) => ({ id, observed_on: "2026-10-0" + (id % 7 + 1), obscured: false, positional_accuracy: 20,
  geojson: { coordinates: [lng, lat] }, taxon: { name: "Sci " + name, preferred_common_name: name }, user: { login: "fisher" + id, name: "" },
  photos: [{ url: "https://inat/photos/" + id + "/square.jpg" }], uri: "https://www.inaturalist.org/observations/" + id, ...extra });
const calls = [];
const ST = process.env.ST || "admin";
let status = ST;
const MEMBER = () => ST === "admin" ? { data: { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved" }, error: null }
  : ST === "error" ? { data: null, error: { message: "boom" } } : ST === "none" ? { data: null, error: null } : { data: { email: "x@y.com", display_name: "Newbie", is_admin: false, status: ST }, error: null };
let PEND = [{ email: "new@x.com", display_name: "Newbie", is_admin: false, status: "pending", note: "Rico's cousin", requested_at: new Date().toISOString() },
  { email: "rich9267@gmail.com", display_name: "Richard", is_admin: true, status: "approved" }, { email: "d@x.com", display_name: "Dee", status: "blocked" }];
const RPCS = [];
const mk = (id, spot, species, h, extra = {}) => ({ id, spot_id: spot, species, how_many: 1, caught_at: new Date(Date.now() - h * 3600000).toISOString(), created_by: ME,
  tide_stage: "outgoing", pressure_trend: "falling", moon_phase: "waning crescent", solunar: "minor", wind_mph: 8, water_temp_f: 81, ...extra });
const CATCHES = [mk("c1", "s1", "Snook", 30, { length_in: 30 }), mk("c2", "s1", "Snook", 54, { length_in: 24 }), mk("c3", "s1", "Snook", 78), mk("c4", "s1", "Jack crevalle", 100, { length_in: 28 }),
  mk("c5", "s3", "Mangrove snapper", 30, { length_in: 14 }), mk("c8", "s2", "Peacock bass", 40), mk("c6", "s3", "Mangrove snapper", 50), mk("c7", "s3", "Mangrove snapper", 70)];
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.eval(sun); w.Element.prototype.scrollIntoView = () => {};
  w.__db = { inserts: [], upserts: [], sessions: [], deletes: [] };
  const chain = data => { const p = Promise.resolve({ data, error: null }); const o = { eq: () => o, is: () => o, in: () => o, or: () => o, ilike: () => o, gte: () => o, order: () => o, limit: () => p, select: () => o,
    single: () => Promise.resolve({ data: { id: "new-" + Math.random().toString(36).slice(2) }, error: null }), then: (a, b) => p.then(a, b),
    maybeSingle: () => Promise.resolve(MEMBER()) }; return o; };
  w.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: ME, email: "rich9267@gmail.com", user_metadata: {} } } } }), onAuthStateChange: () => {}, signOut: async () => {} },
    rpc: async (fn, a) => { RPCS.push([fn, a]); if (fn === 'run_race') return w.__race(a); if (fn === 'request_access') { status = 'pending'; } if (fn === 'review_access') PEND = PEND.map(m => m.email === a.p_email ? { ...m, status: a.p_approve ? 'approved' : 'blocked' } : m); return fn === 'ensure_profile' ? { data: { user_id: 'u-rich', handle: 'richard', display_name: 'Richard', home_area: 'Pompano' }, error: null } : { error: null }; }, storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    from: t => ({ select: () => chain(t === "catch_ranks" ? (w.__ranks || []) : t === "members" ? PEND : (t === "spots" || t === "spots_visible") ? SPOTS : t === "catches" ? CATCHES : t === "sessions" ? w.__db.sessions : t === "profiles" ? [{user_id:'other',handle:'mike',display_name:'Mike',home_area:'Miami'},{user_id:'u3',handle:'sam',display_name:'Sam'},{user_id:'u4',handle:'zed',display_name:'Zed'},{user_id:'u-rich',handle:'richard',display_name:'Richard'}] : t === "friendships" ? [{user_a:'other',user_b:'u-rich',status:'accepted',requested_by:'other'},{user_a:'u-rich',user_b:'u3',status:'pending',requested_by:'u3'}] : t === "trip_plans" ? [{id:'p1',spot_id:'s1',created_by:'other',author:'Mike',plan_at:new Date(Date.now()+86400000).toISOString(),note:'live shrimp'},{id:'p2',spot_id:'s3',created_by:'u-rich',author:'Richard',plan_at:new Date(Date.now()+2*86400000).toISOString(),note:null}] : t === "trip_plan_rsvps" ? [{plan_id:'p1',user_id:'other',name:'Mike'}] : t === "catch_reactions" ? [{catch_id:'c1',user_id:'other'},{catch_id:'c1',user_id:'other2'}] : t === "catch_comments" ? [{id:'m1',catch_id:'c1',created_by:'other',author:'Mike',body:'Nice snook!',created_at:new Date().toISOString()}] : []),
      delete: () => { w.__db.deletes.push(t); return chain(null); },
      insert: row => { w.__db.inserts.push({ t, row }); if (t === "catches") CATCHES.unshift({ id: "n" + CATCHES.length, ...row }); return chain(null); },
      upsert: row => { w.__db.upserts.push({ t, row }); return Promise.resolve({ error: null }); },
      update: row => { w.__db.updates = (w.__db.updates || []).concat([{ t, row }]); return chain(t === 'profiles' ? { user_id: 'u-rich', ...row } : null); } }) }) };
  w.fetch = async url => {
    if (url.includes("inaturalist")) {
      calls.push(url);
      const u = new URL(url);
      const lat = +u.searchParams.get("lat");
      const results = lat < 26.5 ? [
        obs(1, "Common Snook", 26.26, -80.085), obs(2, "Common Snook", 26.25, -80.09), obs(3, "Tarpon", 26.24, -80.1),
        obs(4, "Sergeant Major", 26.255, -80.08), obs(5, "Peacock Bass", 26.262, -80.10), obs(6, "Gray Snapper", 26.3, -80.09, { obscured: true }),
        obs(7, "Butterfly Peacock Bass", 26.272, -80.152), obs(8, "Bar Jack", 26.2, -80.08), obs(9, "Jackknife-fish", 26.25, -80.08),
        obs(10, "Florida Gar", 26.27, -80.16), obs(11, "Common Dolphinfish", 26.4, -80.0)
      ] : [obs(20, "Common Snook", 26.95, -80.07), obs(21, "Atlantic Tarpon", 26.94, -80.075)];
      return { ok: true, json: async () => ({ total_results: results.length, results }) };
    }
    if (url.includes("tidesandcurrents") && url.includes("hilo")) {
      const base = new Date(); base.setHours(0, 0, 0, 0); base.setDate(base.getDate() - 1);
      const preds = []; for (let i = 0; i < 16; i++) { const t = new Date(base.getTime() + (3 + i * 6.2) * 3600000); const pad = n => String(n).padStart(2, "0");
        preds.push({ t: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`, type: i % 2 ? "L" : "H" }); }
      return { ok: true, json: async () => ({ predictions: preds }) };
    }
    if (url.includes("waterservices") && url.includes("00480")) {
      const ts = (code, name, lat, lng, vals) => ({ variable: { variableCode: [{ value: code }] }, sourceInfo: { siteName: name, geoLocation: { geogLocation: { latitude: lat, longitude: lng } } },
        values: [{ value: vals.map((v, i) => ({ value: String(v), dateTime: new Date(Date.now() - (vals.length - i) * 3600000).toISOString() })) }] });
      const lat = +new URL(url).searchParams.get("bBox").split(",")[1];
      return { ok: true, json: async () => ({ value: { timeSeries: lat < 26 ? [ts("00480", "BLACK CREEK CANAL UPSTREAM OF S-21 AT MIAMI, FL", 25.542, -80.347, [5.1, 6.3]), ts("00060", "BLACK CREEK CANAL AT S-21 NR GOULDS, FL", 25.54, -80.34, [20, 140])] : [] } }) };
    }
    if (url.includes("open-meteo") && url.includes("forecast_hours=76")) {
      const t0 = Math.floor(Date.now() / 3600000) * 3600 - 3 * 3600, time = [], sp = [], dr = [], pr = [];
      for (let i = 0; i < 79; i++) { time.push(t0 + i * 3600); sp.push(5 + (i % 12)); dr.push(i < 40 ? 90 : 270); pr.push(1015 - i * 0.2); }
      return { ok: true, json: async () => ({ hourly: { time, wind_speed_10m: sp, wind_direction_10m: dr, pressure_msl: pr } }) };
    }
    return { ok: true, json: async () => ({ properties: {}, features: [], elements: [] }) };
  };
}});
const w = dom.window; w.SVGSVGElement.prototype.createSVGRect = () => ({}); w.eval(leaf);
const d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(800);
  const ev = c => w.eval(c);
  let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
  ev(`photosBySpot = { s1: [{ catch_id: "c1" }, { catch_id: "c2" }, { catch_id: "c4" }], s3: [{ catch_id: "c5" }] }`);
  ev(`window.__ranks = Object.values(catchesBySpot).flat().filter(catchHasPhoto).map(c => { const r = fishRank(c, true); return r && { catch_id: c.id, species: c.species, power: r.power, tier: r.tier, strength: r.stats.strength, speed: r.stats.speed, stamina: r.stats.stamina, size_pct: r.size }; }).filter(Boolean)`);
  ev(`window.matchMedia = q => ({ matches: /reduce/.test(q) })`);   // reduced motion: the race shows its result straight away
  const lane = (lane, kind, who, species, place, t1, t2) => ({ lane, kind, who, species, power: 400, tier: "Rare", speed: 70, stamina: 60, t1, t2, total: t1 + t2, place });
  let calls = 0, nextPlace = 1, fail = null;
  w.__race = async a => { calls++; if (fail) return { data: null, error: { message: fail } };
    const open = a.p_mode === "open", wc = open ? 20 : 10;
    return { data: { id: calls, mode: open ? "open" : "class", class: "A", win_coins: wc, place: nextPlace, coins: nextPlace === 1 && calls <= 3 ? wc : 0, paid_wins_today: Math.min(calls, 3), paid_wins_cap: 3,
      record: { races: calls, wins: calls }, wallet: { coins: 123, gems: 0, today: 0, cap: 50, collections: [], recent: [] },
      lanes: [Object.assign(lane(1, "wild", "Wild", "Mahi", nextPlace === 1 ? 2 : 1, 0.4, 0.5), { class: "S" }), Object.assign(lane(2, "me", "You", "Snook", nextPlace, 0.45, 0.5), { class: "A" }), lane(3, "friend", "Fred", "Snook", 3, 0.5, 0.5),
              lane(4, "wild", "Wild", "Crevalle", 4, 0.5, 0.6), lane(5, "wild", "Wild", "Tarpon", 5, 0.6, 0.6)] }, error: null }; };
  ev(`showView("insights")`); await wait(400);
  const body = d.getElementById("race-body");
  const fishBtns = [...body.querySelectorAll(".race-fish")];
  console.log("racers offered:", fishBtns.map(b => b.querySelector(".race-fname").textContent).join(", "));
  ok("race card sits on the Stats tab under My fish", !!d.getElementById("race-card") && d.getElementById("fk-card").nextElementSibling.id === "race-card");
  ok("one racer per ranked kind (3), strongest picked first", fishBtns.length === 3 && fishBtns[0].getAttribute("aria-checked") === "true");
  // classes: the app's labels match the database's race_class() for these speed/stamina pairs (asked from the database Oct 13)
  const DB = "10/41=C 15/46=C 28/19=C 31/83=B 40/40=B 50/60=A 58/93=A 60/30=A 63/63=A 70/20=A 72/62=A 73/44=A 81/81=S 90/10=A 100/60=S 100/100=S";
  const mism = DB.split(" ").filter(x => { const [ss, c] = x.split("="), [sp, st] = ss.split("/").map(Number); return ev(`raceClass(${sp}, ${st})`) !== c; });
  ok("app classes match the database (" + DB.split(" ").length + " cases)", mism.length === 0);
  ok("each racer shows its class", fishBtns.every(b => /Class [SABC]/.test(b.querySelector(".race-class").textContent)));
  ok("class race chosen by default", body.querySelector('[role=radiogroup][aria-label="Kind of race"] .on').textContent.includes("Class"));
  fishBtns[2].click();
  const picked = [...body.querySelectorAll(".race-fish")][2];
  ok("tapping a fish selects it", picked.getAttribute("aria-checked") === "true");
  const pickedName = picked.querySelector(".race-fname").textContent;
  body.querySelector(".race-go").click(); await wait(300);
  const sent = RPCS.filter(r => r[0] === "run_race").pop();
  const pickedCatch = ev(`myFishList().list.find(x => cap(x.c.species.trim()) === ${JSON.stringify(pickedName)}).c.id`);
  ok("asks the database to run a class race with the picked catch", !!sent && sent[1].p_catch === pickedCatch && sent[1].p_mode === "class");
  ok("5 lanes drawn, mine highlighted", body.querySelectorAll(".race-lane").length === 5 && body.querySelectorAll(".race-lane.me").length === 1);
  ok("places shown on each lane", [...body.querySelectorAll(".race-place")].map(x => x.textContent).join("|") === "🥈 2nd|🥇 1st|🥉 3rd|4th|5th");
  ok("win message with class and coins", /Your fish won in Class A!/.test(body.textContent) && /\+10 coins/.test(body.textContent) && /1 of 3 paid wins/.test(body.textContent));
  ok("lanes show each fish's class", /Mahi · ⚡ Class S/.test(body.textContent) && /You · Snook · Class A/.test(body.textContent));
  ok("friend lane shows the friend's name, wild lanes say Wild", /Fred · Snook/.test(body.textContent) && /🌊 Wild · Mahi/.test(body.textContent));
  ok("wallet updated from the race answer", ev(`wallet && wallet.coins`) === 123);
  ok("record shown", /Your record: 1 win in 1 race/.test(body.textContent));
  ok("coin history label for races", ev(`COIN_WHY.race`) === "won a fish race");
  // 4th win of the day: no coins, still counted
  calls = 3; body.querySelector(".race-go").click(); await wait(300);
  ok("after 3 paid wins: says no coins but still counts", /today's 3 paid wins/.test(body.textContent));
  // a loss
  nextPlace = 3; body.querySelector(".race-go").click(); await wait(300);
  ok("a loss says the place", /came 3rd in Class A\./.test(body.textContent));
  // Open race
  [...body.querySelectorAll(".fchip")].find(b => /Open/.test(b.textContent)).click();
  ok("Open explains it pays 20", /Open: any fish/.test(body.textContent) && /20 per win/.test(body.textContent));
  nextPlace = 1; calls = 0; body.querySelector(".race-go").click(); await wait(300);
  ok("Open race asks with p_mode open", RPCS.filter(r => r[0] === "run_race").pop()[1].p_mode === "open");
  ok("Open win pays 20", /won the Open!/.test(body.textContent) && /\+20 coins/.test(body.textContent));
  ok("remembers Open next time", ev(`localStorage.getItem("fm-race-mode")`) === "open");
  ok("wallet history labels for multiplayer coins", ev(`COIN_WHY.race_fee + "|" + COIN_WHY.race_prize + "|" + COIN_WHY.race_refund`) === "race entry fee|race prize|race fee back");
  // the server refuses
  fail = "That's 50 races today — the fish need a rest. Try again tomorrow."; body.querySelector(".race-go").click(); await wait(300);
  ok("server message shown when it refuses", /50 races today/.test(body.textContent) && !body.querySelector(".race-go").disabled);
  // no ranked fish
  ev(`photosBySpot = {}; window.__ranks = []; rankServer.clear(); renderRace()`);
  ok("no ranked fish: friendly empty screen with a button", /need a ranked fish/.test(body.textContent) && !!body.querySelector(".empty-nice .btn"));
  console.log(bad ? "test90 FAILED" : "test90 OK");
  process.exit(bad ? 1 : 0);
})();
