// test181: US plan step 5 "Spots everywhere": national no-fishing zones (setup/107, js/33) + boat ramps and piers from OpenStreetMap outside Florida (js/58, js/37)
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const cut = (s, a, b) => { const i = s.indexOf(a); return s.slice(i, s.indexOf(b, i)); };
const flRows = JSON.parse(fs.readFileSync(path.join(__dirname, "protected-zones.json"), "utf8"));
const t09 = read("js/09-map-forecast.js"), z33 = read("js/33-zones.js"), o37 = read("js/37-official-layer.js"), o58 = read("js/58-osm-ramps-piers.js");
const sql = read("setup/107-national-zones.sql"), html = read("index.html"), sw = read("sw.js");

// Two real rows from the live table (Oct 22 2026), Washington
const SUND = { id: 215, name: "Sund Rock Conservation Area", level: "no_fishing", rule: "Commercial and Recreational Fishing Prohibited", protection: "No Take",
  agency: "Washington Department of Fish and Wildlife", url: "https://wdfw.wa.gov/fishing/management/mpa/conservation-areas#", anchor: null, vessel: null, state: "WA",
  geom: { type: "Polygon", coordinates: [[[-123.12033, 47.43358], [-123.1198, 47.43458], [-123.12016, 47.43471], [-123.1203, 47.43504], [-123.12042, 47.43639], [-123.12027, 47.43771], [-123.12081, 47.43834], [-123.12099, 47.43898], [-123.12089, 47.43939], [-123.12048, 47.4396], [-123.11969, 47.43963], [-123.11934, 47.43995], [-123.11891, 47.44001], [-123.115, 47.44], [-123.115, 47.43358], [-123.12033, 47.43358]]] },
  min_lat: 47.43358, min_lng: -123.12099, max_lat: 47.44001, max_lng: -123.115 };
const PROT = { id: 214, name: "Zella M. Schultz/Protection Island Seabird Sanctuary", level: "no_fishing", rule: "Commercial and Recreational Fishing Prohibited", protection: "No Access",
  agency: "Washington Department of Fish and Wildlife", url: "https://www.dnr.wa.gov/managed-lands/aquatic-reserves/protection-island-aquatic-reserve", anchor: null, vessel: null, state: "WA",
  geom: { type: "Polygon", coordinates: [[[-122.94097, 48.12449], [-122.93671, 48.12124], [-122.93949, 48.12105], [-122.94259, 48.12115], [-122.94454, 48.1203], [-122.94554, 48.119], [-122.94587, 48.11883], [-122.94581, 48.11918], [-122.94429, 48.12084], [-122.9434, 48.12246], [-122.94097, 48.12449]]] },
  min_lat: 48.11883, min_lng: -122.94587, max_lat: 48.12449, max_lng: -122.93671 };

// ---------- 1) the SQL file ----------
ok(/add column if not exists state text/.test(sql) && /update public\.protected_zones set state = 'FL' where state is null;/.test(sql), "SQL: new `state` column; Florida rows only get state = 'FL'");
ok(/NOAA_MPA_Inventory_2023/.test(sql) && /net\._http_response/.test(sql) && /on conflict \(source_id\) do nothing/.test(sql), "SQL: loads NOAA's national 2023 inventory with pg_net, never twice");
ok(!/%27FL%27/.test(sql) && /%27CA%27/.test(sql) && /%27WA%27/.test(sql) && !/%27AK%27|%27HI%27|%27PR%27/.test(sql), "SQL: asks for continental states other than Florida (no FL, AK, HI, PR)");
ok(/'us23-' \|\| \(p->>'Site_ID'\)/.test(sql), "SQL: new rows get their own 'us23-' ids (can't clash with Florida's)");
ok(/pg_temp\.zn_ring/.test(sql) && /0\.0001/.test(sql), "SQL: shapes simplified to Florida's detail (~11 m) by a temporary function (nothing left behind)");
ok(/where not \(p->>'Prot_Lvl' = 'No Take' and p->>'Fish_Rstr' in \('Commercial Fishing Prohibited', 'Commercial Fishing Restricted', 'Commercial and Recreational Fishing Restricted'\)\)/.test(sql),
  "SQL: 'No Take' areas that still allow some fishing are left out (no false 'fishing is not allowed')");
ok(!/\bgrant\b|security definer|create policy/i.test(sql.replace(/--.*$/gm, "")), "SQL: no new grants, functions or policies (members keep read-only access from setup/65)");
ok(/where state <> 'FL' and source_id like 'us23-%'/.test(sql), "SQL: the blank-words clean-up touches the new rows only");

// ---------- 2) js/33 with the new rows ----------
const mk = (tag, cls, text) => ({ tag, className: cls || "", textContent: text || "", children: [], attrs: {}, hidden: false, handlers: {},
  appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; } });
const store = { "fm-zones-v1": JSON.stringify({ t: Date.now(), rows: flRows }) };
let asked = 0, selected = "";
const all = flRows.concat([SUND, PROT]);
const zctx = {
  console, Date, JSON, Math, isFinite, Array, Object,
  $: () => null, el: mk, me: { id: "u1" }, fmtDist: mi => mi.toFixed(1) + " mi",
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
  db: { from: () => ({ select: cols => { selected = cols; return { limit: async () => { asked++; return { data: all, error: null }; } }; } }) },
  boat: { pos: null }, qc: { pos: null }
};
vm.createContext(zctx);
vm.runInContext(read("js/54-state-agencies.js") + "\n" + z33 + "\nthis.api = { zoneAt, znLine, znDetails, zonesEnsure, zn, ZN };", zctx);
const Z = zctx.api;
(async () => {
  await Z.zonesEnsure();
  ok(Z.ZN.key === "fm-zones-v2" && !("fm-zones-v1" in store) && JSON.parse(store["fm-zones-v2"]).rows.length === all.length, "phones drop the Florida-only copy and fetch the national list once");
  ok(asked === 1 && /,state$/.test(selected), "the list is asked for with each zone's state");
  let h = Z.zoneAt(47.437, -123.117);
  ok(h.inside && h.inside.name === SUND.name && Z.znLine(h) === "🚫 Sund Rock Conservation Area — fishing is not allowed", "a spot inside Sund Rock (Washington) is flagged: " + Z.znLine(h));
  h = Z.zoneAt(47.437, -123.1135);
  ok(!h.inside && h.near && h.near.row.name === SUND.name, "just outside Sund Rock: the 'near' warning");
  ok(Z.zoneAt(24.54825, -81.4057).inside.name.startsWith("Looe Key"), "Florida still works (Looe Key)");
  const txt = r => Z.znDetails(r).children.map(c => c.textContent);
  const waLast = txt(SUND).slice(-1)[0];
  ok(waLast === "Source: NOAA's national Marine Protected Areas inventory. A guide only — check Washington Fish & Wildlife / NOAA rules before you fish. Areas not on this list can still have rules.", "a Washington card names Washington's agency: " + waLast);
  ok(!txt(SUND).some(t => /^Anchoring|^Boats/.test(t)), "no empty 'Anchoring:' / 'Boats:' lines for the new rows");
  const FLTEXT = "Source: NOAA's national Marine Protected Areas inventory. A guide only — check FWC / NOAA rules before you fish. Areas not on this list can still have rules.";
  const looe = flRows.find(r => r.name.startsWith("Looe Key"));
  ok(txt(looe).slice(-1)[0] === FLTEXT && txt(Object.assign({}, looe, { state: "FL" })).slice(-1)[0] === FLTEXT, "Florida cards: exactly the same words as before (with or without state)");

  // ---------- 3) js/58: OpenStreetMap ramps and piers outside Florida ----------
  const ostore = {}; let fetches = [], fetchMode = "ok";
  const fakeState = (lat, lng) => (lat < 24 || lat > 50 || lng < -125 || lng > -66) ? null : (lat < 31 && lng > -87.6 && lng < -79.8) ? "FL" : "GA";
  const ELEMENTS = [
    { type: "node", id: 1, lat: 32.05, lon: -81.1, tags: { leisure: "slipway", name: "Savannah River Ramp", access: "public" } },
    { type: "way", id: 2, center: { lat: 32.0, lon: -81.0 }, tags: { man_made: "pier", name: "Tybee Pier", fishing: "yes" } },
    { type: "node", id: 3, lat: 32.1, lon: -81.05, tags: { leisure: "slipway", access: "private" } },
    { type: "node", id: 4, lat: 30.5, lon: -81.45, tags: { leisure: "slipway", name: "A Florida ramp" } },
    { type: "way", id: 5, center: { lat: 32.0, lon: -80.95 }, tags: { man_made: "breakwater", name: "North Jetty" } },
    { type: "node", id: 6, lat: 32.02, lon: -81.02, tags: { leisure: "fishing", name: "Pond" } },
    { type: "node", id: 7, lat: 32.03, lon: -81.03, tags: { leisure: "slipway" } },
    { type: "node", id: 8, lat: 32.04, lon: -81.04, tags: { leisure: "slipway", name: "Boat Ramp - Private" } }
  ];
  const mkCtx = () => {
    const c = {
      console, Date, JSON, Math, isFinite, Array, Object, Set, Promise, encodeURIComponent, decodeURIComponent,
      localStorage: { getItem: k => (k in ostore ? ostore[k] : null), setItem: (k, v) => { ostore[k] = v; } },
      stateOf: fakeState,
      fetch: async (url, opt) => {
        fetches.push({ url, body: decodeURIComponent((opt && opt.body || "").replace(/^data=/, "")) });
        if (fetchMode === "fail") throw new Error("offline");
        return { ok: true, status: 200, json: async () => ({ elements: ELEMENTS }) };
      }
    };
    vm.createContext(c);
    vm.runInContext(cut(t09, "  function osmToSpot(e) {", "  async function loadSuggestions") + "\n" + o58 + "\nthis.api = { osmOlLoad, osmOlItems, osmOlNote, OSMOL };", c);
    return c.api;
  };
  const view = (s, w, n, e) => ({ getSouth: () => s, getWest: () => w, getNorth: () => n, getEast: () => e });
  let O = mkCtx();

  ok(await O.osmOlLoad(view(25.7, -80.4, 26.0, -80.0)) === false && fetches.length === 0 && O.osmOlNote() === "", "a Florida view (Pompano / Miami) asks OpenStreetMap nothing and says nothing");
  ok(await O.osmOlLoad(view(24.4, -82.0, 24.8, -81.2)) === false && fetches.length === 0, "the Keys and open sea: nothing asked");

  const ga = view(31.9, -81.3, 32.2, -80.9);
  const p = O.osmOlLoad(ga);
  ok(/Loading boat ramps and piers/.test(O.osmOlNote()), "while asking: 'Loading boat ramps and piers from OpenStreetMap…'");
  ok(await p === true && fetches.length === 1 && /overpass-api\.de/.test(fetches[0].url), "a Georgia view asks Overpass once");
  ok(fetches[0].body.includes("(31.80,-81.40,32.30,-80.80)") && /leisure"="slipway"/.test(fetches[0].body) && /man_made"="pier"\]\["name"\]/.test(fetches[0].body) && !/man_made"="pier"\]\(/.test(fetches[0].body), "only the view on screen (plus a small margin) is asked for: " + fetches[0].body.match(/\(([-\d.,]+)\)/)[1]);
  const items = O.osmOlItems(), names = items.map(o => o.name).sort();
  ok(items.length === 3 && names.join("|") === "Boat ramp (unnamed)|Savannah River Ramp|Tybee Pier", "kept: public ramp, fishing pier, unnamed ramp (" + names.join(", ") + ")");
  ok(!names.includes("A Florida ramp"), "a place inside Florida is dropped (Florida keeps its official lists)");
  ok(!names.includes("Boat Ramp - Private"), "a ramp named 'Private' is dropped");
  ok(items.every(o => o.source === "osm" && o.id === null && /^osm\//.test(o.key) && (o.kind === "ramp" || o.kind === "pier") && o.state === "GA"), "each place: source 'osm', no database id, kind ramp/pier, its state");
  ok(items.find(o => o.name === "Savannah River Ramp").trust === "public" && items.find(o => o.name === "Boat ramp (unnamed)").trust === "unclear", "trust comes from the OpenStreetMap tags (public / check access)");
  ok(O.osmOlNote() === "", "done: no note");

  ok(await O.osmOlLoad(ga) === false && await O.osmOlLoad(view(31.95, -81.2, 32.1, -81.0)) === false && fetches.length === 1, "the same view (or a smaller one inside it) is not asked again");
  ok(await O.osmOlLoad(view(30.0, -84.0, 33.0, -81.0)) === false && fetches.length === 1 && /Zoom in/.test(O.osmOlNote()), "a very big view: nothing asked, 'Zoom in a little…'");
  ok(await O.osmOlLoad(view(30.6, -82.0, 31.2, -81.5)) === true && fetches.length === 2, "a view across the Florida–Georgia line is asked (the Georgia half)");

  fetchMode = "fail";
  ok(await O.osmOlLoad(view(33.0, -80.0, 33.3, -79.6)) === false && fetches.length === 3 && /Couldn't reach OpenStreetMap/.test(O.osmOlNote()), "no signal: a plain message, nothing breaks");
  ok(await O.osmOlLoad(view(33.0, -80.0, 33.3, -79.6)) === false && fetches.length === 3, "after a failure it waits before asking again");
  ok(O.osmOlItems().length === 3, "what the phone already had is still there");

  const saved = JSON.parse(ostore["fm-osm-ol-v1"]);
  ok(saved.boxes.length === 2 && saved.boxes.every(b => isFinite(b.t) && Array.isArray(b.items)), "answers are kept on the phone (works offline next time)");
  const O2 = mkCtx();
  ok(O2.osmOlItems().length === 3 && await O2.osmOlLoad(ga) === false && fetches.length === 3, "a fresh start uses the phone's copy without asking");

  // ---------- 4) js/37 hooks: Florida path untouched ----------
  ok(/\(officialSpots \|\| \[\]\)\.concat\(osm\)/.test(o37) && /typeof osmOlItems === "function"/.test(o37), "the map layer draws OpenStreetMap places next to the official ones");
  ok(/const osmWait = typeof osmOlLoad === "function" \? osmOlLoad\(b\) : null;/.test(o37) && /if \(changed \|\| osmOlNote\(\) !== said\) olDraw\(skipped\);/.test(o37), "fetched with the view; an all-Florida view is not redrawn a second time");
  ok(/osm: "OpenStreetMap \(a volunteer map, not an official list\)/.test(o37) && /o\.source === "osm" && typeof trustOf === "function" \? trustOf\(o\)\.badge \+ " · " : "✅ "/.test(o37), "OpenStreetMap cards say where they come from and show the trust badge; official ones keep ✅");
  ok(/public_access: osm && o\.trust !== "public" \? "unsure" : "yes"/.test(o37), "saving an unsure OpenStreetMap place marks it 'unsure', official places stay 'yes'");
  ok(/note \|\| "No official spots in this view\."/.test(o37) && /else olSay\(note\);/.test(o37), "Florida messages unchanged (the note is empty there)");
  ok(/fwc-ramp/.test(o37) && /o\.id != null/.test(o37), "'More from FWC' and the admin fix button stay for official places only");

  // ---------- 5) wiring ----------
  ok(html.indexOf("js/58-osm-ramps-piers.js") > html.indexOf("js/37-official-layer.js") && html.indexOf("js/58-osm-ramps-piers.js") < html.indexOf("js/99-boot.js"), "index.html loads js/58 before boot");
  ok(sw.includes('"./js/58-osm-ramps-piers.js"'), "sw.js keeps js/58 for offline use");

  console.log(bad ? bad + " FAILED" : "all passed");
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log("FAIL crashed: " + (e && e.stack || e)); process.exit(1); });
