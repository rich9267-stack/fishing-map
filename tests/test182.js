// test182: US plan step 7 "The extras": Guess the fish asks iNaturalist for US photos near the place on screen (js/52), bingo uses the
// region's Seasons cards (js/52), the map's dashed 🚫 "rules apply" outlines come from NOAA's national list outside Florida (js/09).
// Florida must look exactly the same: the code from the last commit (git show HEAD) and the new code are run side by side in Florida.
const fs = require("fs"), vm = require("vm"), path = require("path"), { execSync } = require("child_process");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const old = f => execSync("git show 0571e3b:" + f, { cwd: root, encoding: "utf8" });   // v169, the last version before this step
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const cut = (s, a, b) => { const i = s.indexOf(a); if (i < 0) throw new Error("missing " + a); return s.slice(i, s.indexOf(b, i)); };
const mk = (tag, cls, text) => ({ tag, className: cls || "", textContent: text || "", children: [], attrs: {}, hidden: false, handlers: {}, dataset: {}, classList: { toggle() {}, add() {} },
  appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; } });
const fakeState = (lat, lng) => (lat < 24 || lat > 50 || lng < -125 || lng > -66) ? null : (lat < 30.7 && lng > -87.6 && lng < -79.8) ? "FL" : lat > 43 ? "MN" : lng < -85 ? "AL" : "GA";

// ---------- 1) the map's dashed outlines (js/09) ----------
const FWC = "services1.arcgis.com/eGSDp8lpKe5izqVc", NOAA = "services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/NOAA_MPA_Inventory_2023";
const FLF = [{ type: "Feature", properties: { Site_Name: "Biscayne National Park", Fish_Rstr: "Commercial Fishing Restricted", Mgmt_Agen: "National Park Service", State: "FL" }, geometry: { type: "Polygon", coordinates: [[[-80.3, 25.4], [-80.1, 25.4], [-80.1, 25.6], [-80.3, 25.4]]] } }];
const USF = [{ type: "Feature", properties: { Site_Name: "Gray's Reef National Marine Sanctuary", Fish_Rstr: "Commercial and Recreational Fishing Restricted", Prot_Lvl: "Uniform Multiple Use", Mgmt_Agen: "NOAA", State: "GA", URL: "https://graysreef.noaa.gov/" }, geometry: { type: "Polygon", coordinates: [[[-80.9, 31.36], [-80.83, 31.36], [-80.83, 31.42], [-80.9, 31.36]]] } }];
function mapCtx(src, view, net) {
  const notes = {}, fetched = [], drawn = [];
  const c = {
    console, Date, JSON, Math, isFinite, Array, Object, Promise, encodeURIComponent, String, Number,
    $: id => notes[id] || (notes[id] = mk("div")), el: mk, document: { createElement: t => mk(t) },
    map: { getZoom: () => 9, removeLayer() {}, getBounds: () => ({ getWest: () => view[0], getSouth: () => view[1], getEast: () => view[2], getNorth: () => view[3],
      getCenter: () => ({ lat: (view[1] + view[3]) / 2, lng: (view[0] + view[2]) / 2 }) }) },
    L: { geoJSON: (d, o) => { const layers = d.features.map(f => { const l = { options: {}, bindPopup(fn) { this.pop = fn; } }; o.onEachFeature(f, l); return l; }); const g = { d, o, layers, addTo() { drawn.push(g); return g; } }; return g; } },
    fetch: async u => { fetched.push(u); const fwc = u.includes(FWC), us = u.includes(NOAA);
      if ((fwc && net.fwc === "down") || (us && net.us === "down")) throw new Error("offline");
      return { ok: true, json: async () => ({ type: "FeatureCollection", features: fwc ? FLF : us ? USF : [] }) }; },
    stateOf: fakeState, zonesEnsure() {}, znDraw() {}, zn: { rows: [] },
    rulesInfo: () => { const st = fakeState((view[1] + view[3]) / 2, (view[0] + view[2]) / 2); return st === "FL" ? { tags: ["atlantic"] } : { outside: true, state: st }; }
  };
  vm.createContext(c);
  vm.runInContext(read("js/54-state-agencies.js") + "\n" + cut(src, "  const MX = {", "  function mxRefresh()") + "\nthis.api = { mxLoadZones, mxOn, mxMsg, mxNote };", c);
  c.api.mxOn.zone = true;
  return { c, notes, fetched, drawn };
}
const t09 = read("js/09-map-forecast.js"), o09 = old("js/09-map-forecast.js");
const FL_VIEW = [-80.6, 25.3, -79.9, 26.4], GA_VIEW = [-81.6, 31.0, -80.6, 31.8], BORDER = [-82.2, 30.2, -81.2, 31.0];   // Miami · off Savannah · Jacksonville + Georgia

(async () => {
  {
    const a = mapCtx(o09, FL_VIEW, {}), b = mapCtx(t09, FL_VIEW, {});
    await a.c.api.mxLoadZones(); await b.c.api.mxLoadZones();
    ok(b.fetched.length === 1 && JSON.stringify(a.fetched) === JSON.stringify(b.fetched), "Florida view: asks only Florida's list, the very same address as before");
    ok(b.drawn.length === 1 && JSON.stringify(b.drawn[0].d.features) === JSON.stringify(FLF) && JSON.stringify(a.drawn[0].o.style) === JSON.stringify(b.drawn[0].o.style), "Florida view: same outlines, same dashed style");
    ok(a.notes["mx-note"].textContent === b.notes["mx-note"].textContent && /check current FWC \/ NOAA rules/.test(b.notes["mx-note"].textContent), "Florida view: the note under the map has the same words (FWC / NOAA)");
    const pa = a.drawn[0].layers[0].pop(), pb = b.drawn[0].layers[0].pop();
    ok(JSON.stringify(pa.children.map(x => x.textContent)) === JSON.stringify(pb.children.map(x => x.textContent)), "Florida view: same popup");
  }
  {
    const b = mapCtx(t09, GA_VIEW, {}), a = mapCtx(o09, GA_VIEW, {});
    await b.c.api.mxLoadZones(); await a.c.api.mxLoadZones();
    const us = b.fetched.find(u => u.includes(NOAA));
    ok(b.fetched.length === 2 && us && /where=State%20IS%20NULL%20OR%20State%20NOT%20LIKE%20'%25FL%25'/.test(us) && /f=geojson/.test(us) && /geometry=-81\.6000,31\.0000,-80\.6000,31\.8000/.test(us),
      "Georgia view: also asks NOAA's national list for this view, Florida's rows left out");
    ok(!a.fetched.some(u => u.includes(NOAA)) && b.drawn.length === 1 && b.drawn[0].d.features.some(f => f.properties.State === "GA"), "Georgia view: Gray's Reef now shows (before: nothing outside Florida)");
    const lay = b.drawn[0].layers.find(l => /Gray/.test(l.options.a11y));
    ok(lay && lay.options.a11y === "Protected zone: Gray's Reef National Marine Sanctuary" && b.drawn[0].o.style.dashArray === "6 4", "Georgia view: dashed, and a screen reader hears its name");
    const pop = lay.pop().children.map(x => x.textContent);
    ok(pop[0] === "🚫 Gray's Reef National Marine Sanctuary" && pop.includes("Fishing rules: Commercial and Recreational Fishing Restricted") && pop.includes("More about this area ↗"), "Georgia view: the popup works with NOAA's columns: " + pop.join(" | "));
    const note = b.notes["mx-note"].textContent;
    ok(/check current Georgia [^/]*\/ NOAA rules/.test(note) && !/FWC/.test(note), "Georgia view: the note names Georgia's agency: " + note.slice(-80));
  }
  {
    const b = mapCtx(t09, BORDER, {});
    await b.c.api.mxLoadZones();
    ok(b.fetched.length === 2 && b.drawn[0].d.features.length === 2, "a view across the Florida–Georgia line: Florida's list + NOAA's other states together");
    const d = mapCtx(t09, GA_VIEW, { fwc: "down" });
    await d.c.api.mxLoadZones();
    ok(d.drawn.length === 1 && d.drawn[0].d.features.length === 1 && d.c.api.mxMsg.zone === "", "Georgia view with Florida's server down: NOAA's outlines still show");
    const e = mapCtx(t09, GA_VIEW, { fwc: "down", us: "down" });
    await e.c.api.mxLoadZones();
    ok(!e.drawn.length && e.c.api.mxMsg.zone === "Couldn't load protected zones right now — try again later.", "both servers down: the usual message");
    const f = mapCtx(t09, FL_VIEW, { fwc: "down" }), g = mapCtx(o09, FL_VIEW, { fwc: "down" });
    await f.c.api.mxLoadZones(); await g.c.api.mxLoadZones();
    ok(f.c.api.mxMsg.zone === g.c.api.mxMsg.zone && !f.fetched.some(u => u.includes(NOAA)), "Florida view, server down: same message as before, NOAA not asked");
  }

  // ---------- 2) Guess the fish + bingo (js/52) ----------
  const s05 = read("js/05-seasons-records.js"), s51 = read("js/51-games.js"), s55 = read("js/55-southeast-seasons.js");
  const seasonsSrc = cut(s05, "  const SEASON_GROUPS", "\n  ];\n") + "\n  ];\n" + cut(s05, "  function seasonFor(species)", "  // Water temperature") + cut(s05, "  function seasonList()", "  const mmdd");
  const helpers = cut(s51, "  const gamesDay", "  // Which rule rows can make");
  const obs = (id, n, lic) => ({ id, uri: "https://www.inaturalist.org/observations/" + id, taxon: { preferred_common_name: n, name: n },
    photos: [{ url: "https://static.inaturalist.org/photos/" + id + "/square.jpg", license_code: lic || "cc-by", attribution: "(c) Pat " + id }] });
  const FL_OBS = [obs(1, "Common Snook"), obs(2, "Tarpon", "cc0"), obs(3, "Gray Snapper"), obs(4, "Sheepshead"), obs(5, "Crevalle Jack"), obs(6, "Great Barracuda"), obs(7, "Red Drum"), obs(8, "Hogfish", null)];
  const NEAR_GA = [obs(21, "Red Drum"), obs(22, "Spotted Seatrout"), obs(23, "Sheepshead"), obs(24, "Red Drum"), obs(25, "Common Snook")];   // 3 kinds of Southeast fish near Savannah (+ a snook: not a Southeast card)
  const US_ALL = [obs(31, "Largemouth Bass"), obs(32, "Bluegill"), obs(33, "Channel Catfish"), obs(34, "Black Crappie"), obs(35, "Striped Bass"), obs(21, "Red Drum"), obs(36, "Walleye"), obs(37, "Northern Pike")];
  const NEAR_MN = [obs(41, "Walleye"), obs(42, "Northern Pike"), obs(43, "Bluegill"), obs(44, "Smallmouth Bass"), obs(45, "Yellow Perch"), obs(46, "Muskellunge"), obs(47, "Black Crappie")];
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  function gameCtx(src, place) {
    const store = { "fm-games-pool": JSON.stringify({ day, list: [] }) }, fetched = [];
    const c = {
      console, Date, JSON, Math, isFinite, Array, Object, Promise, Set, String, Number, RegExp, Intl, setTimeout,
      el: mk, me: { id: "u1" }, db: null, photoUrls: {}, playSub: "games", gamesScreen: "list", renderGames() {}, cap: s => s.charAt(0).toUpperCase() + s.slice(1),
      myCatches: () => [], myTrips: () => [], LAT: 26.24, LNG: -80.1, area: null,
      localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
      fetch: async u => { fetched.push(u); const m = /lat=([\d.-]+)&lng=([\d.-]+)/.exec(u);
        const results = /place_id=21/.test(u) ? FL_OBS : m ? (+m[1] > 40 ? NEAR_MN : NEAR_GA) : US_ALL;
        return { ok: true, json: async () => ({ results }) }; }
    };
    c.place = place;
    c.rulesInfo = () => { const p = c.place; const st = p ? fakeState(p.lat, p.lng) : "FL"; return st === "FL" ? { tags: ["atlantic"] } : { outside: true, state: st }; };
    vm.createContext(c);
    vm.runInContext(helpers + seasonsSrc + s55 + "\n" + src + "\nthis.api = { gfToday, gfLoad, gfFish, gfEnd, bgCard, SEASONS, SEASONS_SE, SEASONS_GL, get gfPhotos() { return gfPhotos; } };", c);
    c.setPlace = p => { c.place = p; c.area = p; };
    if (place) c.area = place;
    return { c, api: c.api, store, fetched };
  }
  const t52 = read("js/52-games-more.js"), o52 = old("js/52-games-more.js");
  const playDay = async g => { g.api.gfToday(); await g.api.gfLoad(); return g.api.gfToday(); };

  // Florida: old and new code give the very same questions from the very same address
  {
    const a = gameCtx(o52, null), b = gameCtx(t52, null);
    const qa = await playDay(a), qb = await playDay(b);
    ok(qb && qb.length === 5 && JSON.stringify(qa) === JSON.stringify(qb), "Florida Guess the fish: the same 5 questions as before: " + qb.map(q => q.name).join(", "));
    ok(b.fetched.length === 1 && a.fetched[0] === b.fetched[0] && /place_id=21/.test(b.fetched[0]), "Florida Guess the fish: iNaturalist is asked the same Florida question");
    ok(JSON.parse(b.store["fm-guess-photos"]).at === undefined && a.store["fm-guess-photos"] === b.store["fm-guess-photos"], "Florida: the saved photo list is stored exactly as before");
    const ea = mk("div"), eb = mk("div"), s = { picks: qb.map(q => q.name) };
    a.api.gfEnd(ea, qa, s); b.api.gfEnd(eb, qb, s);
    ok(JSON.stringify(ea.children.map(x => x.textContent)) === JSON.stringify(eb.children.map(x => x.textContent)), "Florida: the score page reads the same (iNaturalist sightings in Florida)");
    for (const m of ["2026-01", "2026-04", "2026-07", "2026-10"]) {
      const ca = a.api.bgCard(m).map(x => x.label), cb = b.api.bgCard(m).map(x => x.label);
      ok(JSON.stringify(ca) === JSON.stringify(cb), `Florida bingo ${m}: the same card as before (${cb.filter(l => /^Catch /.test(l) && !/after dark|on a weekend/.test(l)).join(", ")})`);
    }
  }
  // Georgia (near Savannah): Southeast cards, nearby photos first, then the rest of the US
  {
    const g = gameCtx(t52, { lat: 32.05, lng: -81.1 });
    const qs = await playDay(g);
    ok(/place_id=1&/.test(g.fetched[0]) && /lat=32\.05&lng=-81\.10&radius=400/.test(g.fetched[0]), "Georgia: asks iNaturalist for US photos within 400 km first");
    ok(g.fetched.length === 2 && /place_id=1&/.test(g.fetched[1]) && !/lat=/.test(g.fetched[1]), "Georgia: only 3 kinds nearby, so the whole US fills in");
    const names = g.api.SEASONS_SE.map(f => f.name);
    ok(qs && qs.length === 5 && qs.every(q => names.includes(q.name) && q.choices.every(n => names.includes(n))), "Georgia: every answer and choice is a Southeast Seasons card: " + qs.map(q => q.name).join(", "));
    ok(qs.filter(q => q.near).length === 3 && qs.slice().sort((x, y) => (y.near ? 1 : 0) - (x.near ? 1 : 0)).slice(0, 3).every(q => q.near) && !qs.some(q => q.name === "Snook"), "Georgia: the 3 nearby fish all made it in (near you first); Florida's snook isn't a choice");
    ok(JSON.parse(g.store["fm-guess-photos"]).at === "GA", "Georgia: the saved photos are marked as Georgia's");
    const end = mk("div"); g.api.gfEnd(end, qs, { picks: qs.map(q => q.name) });
    ok(end.children.some(x => x.textContent === "Photos: members' 🌎 Public catches, plus research-grade iNaturalist sightings in the United States (near you first) shared under open licences."), "Georgia: the score page says the photos are from the US, near you first");
    // moving the map to Minnesota: new photos for there (questions already answered today would stay)
    g.c.setPlace({ lat: 44.98, lng: -93.27 });
    ok(g.api.gfToday() === null && g.api.gfPhotos === null, "moved to Minnesota: Georgia's photos are dropped");
    await new Promise(r => setTimeout(r, 20));   // the load the game started by itself
    const mn = g.api.gfToday(), gl = g.api.SEASONS_GL.map(f => f.name);
    ok(/lat=44\.98&lng=-93\.27/.test(g.fetched[2]) && g.fetched.length === 3 && mn.length === 5 && mn.every(q => gl.includes(q.name) && q.near), "Minnesota: 5 Great Lakes fish, all from nearby (no US-wide ask needed): " + mn.map(q => q.name).join(", "));
    const card = g.api.bgCard("2026-10"), fish = card.filter(x => /^fish:/.test(x.id));
    ok(card.length === 9 && card[4].id === "free" && fish.length === 3 && fish.every(x => gl.includes(x.id.slice(5))), "Minnesota bingo: 3 Great Lakes fish on the card (freshwater counts outside Florida): " + fish.map(x => x.label).join(", "));
    const o = gameCtx(o52, { lat: 44.98, lng: -93.27 });
    ok(o.api.bgCard("2026-10").filter(x => /^fish:/.test(x.id)).some(x => !gl.includes(x.id.slice(5))), "(before this step Minnesota's card had Florida fish on it)");
    g.c.setPlace({ lat: 32.05, lng: -81.1 });
    const se = g.api.SEASONS_SE.map(f => f.name);
    for (const m of ["2026-01", "2026-05", "2026-10"]) {
      const f3 = g.api.bgCard(m).filter(x => /^fish:/.test(x.id));
      ok(f3.length >= (m === "2026-01" ? 1 : 3) && f3.every(x => se.includes(x.id.slice(5))), `Georgia bingo ${m}: Southeast fish in season from shore (${f3.map(x => x.label).join(", ")})`);
    }
  }

  // ---------- 3) wiring ----------
  const sw = read("sw.js"), wn = read("js/13-groups-misc.js");
  ok(/id: "2026-10-22j", title: "🎮 Games and 🚫 zones outside Florida"/.test(wn) && /near you first/.test(wn), "What's new has the step 7 entry");
  ok(/const CACHE = "fishing-map-v(\d+)"/.test(sw) && +/fishing-map-v(\d+)/.exec(sw)[1] >= 170, "sw.js version bumped (v170+)");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK");
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
