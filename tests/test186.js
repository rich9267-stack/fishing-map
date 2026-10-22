// test186: OpenStreetMap places outside Florida are as strict as Florida's official places (js/09 osmClearlyPublic + osmToSpot, js/58):
// only clearly public, open places; when unsure, left out (Richard found a dock behind a house). Florida must look exactly the same:
// the v173 code (git b2221fb) and the new code are run side by side on Florida places.
const fs = require("fs"), vm = require("vm"), path = require("path"), { execSync } = require("child_process");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const old = f => execSync("git show b2221fb:" + f, { cwd: root, encoding: "utf8" });   // v173, the last version before this change
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const cut = (s, a, b) => { const i = s.indexOf(a); return s.slice(i, s.indexOf(b, i)); };
const t09 = read("js/09-map-forecast.js"), o58 = read("js/58-osm-ramps-piers.js"), o09 = old("js/09-map-forecast.js");
// fake state outlines: Florida box, Georgia everywhere else on land, open sea outside
const fakeState = (lat, lng) => (lat < 24 || lat > 50 || lng < -125 || lng > -66) ? null : (lat < 31 && lng > -87.6 && lng < -79.8) ? "FL" : "GA";

function ctx(src, extra) {
  const store = {};
  const c = Object.assign({ console, Date, JSON, Math, isFinite, Array, Object, Set, Promise, encodeURIComponent, decodeURIComponent, stateOf: fakeState,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } } }, extra || {});
  vm.createContext(c);
  vm.runInContext(src, c);
  return c;
}
// the new and old osmToSpot (+ trust words) on their own
const part = s => cut(s, "  const KIND_EMOJI", "  async function loadSuggestions") + "\n" + cut(s, "  // How sure are we that you can fish here?", "  const suggSourceName") +
  "\nthis.api = { osmToSpot, trustOf };";
const N = ctx(part(t09)).api, O = ctx(part(o09)).api;

// ---------- 1) outside Florida (Georgia): what is kept and what is left out ----------
const at = (id, tags, kind) => ({ type: kind || "node", id, lat: 32.0 + id / 1000, lon: -81.1, tags });
const GA = [
  [true, "public", at(1, { leisure: "slipway", name: "Savannah River Ramp", access: "public" }), "a ramp tagged access=public"],
  [true, "public", at(2, { man_made: "pier", name: "Tybee Pier", fishing: "yes" }), "a pier tagged fishing=yes"],
  [true, "public", at(3, { leisure: "slipway", access: "yes" }), "an unnamed ramp tagged access=yes"],
  [true, "name", at(4, { leisure: "slipway", name: "Lake Park Boat Ramp" }), "a ramp in a park (by its name)"],
  [true, "name", at(5, { leisure: "slipway", name: "Bull River Public Boat Ramp" }), "a ramp named 'Public'"],
  [true, "name", at(6, { leisure: "slipway", operator: "Georgia Department of Natural Resources" }), "a ramp run by the state (operator)"],
  [true, "name", at(7, { leisure: "slipway", name: "Hwy 17 Landing", "operator:type": "government" }), "a ramp with operator:type=government"],
  [true, "name", at(8, { man_made: "pier", name: "Chatham County Fishing Pier" }), "a county fishing pier (by its name)"],
  [true, "name", at(9, { leisure: "slipway", name: "Lake Lanier Boat Access Area", operator: "US Army Corps of Engineers" }), "a Corps of Engineers access area"],
  [false, null, at(10, { man_made: "pier", name: "Smith Dock" }), "a named dock with no public sign (behind a house)"],
  [false, null, at(11, { man_made: "pier", name: "Johnson Pier" }), "a named pier with no public sign"],
  [false, null, at(12, { leisure: "slipway" }), "an unnamed ramp with no tags"],
  [false, null, at(13, { leisure: "slipway", name: "Marsh Creek Boat Ramp" }), "a named ramp with no public sign (unsure → left out)"],
  [false, null, at(14, { leisure: "slipway", access: "private" }), "access=private"],
  [false, null, at(15, { leisure: "slipway", name: "City Ramp", access: "customers" }), "access=customers (even with 'City' in the name)"],
  [false, null, at(16, { leisure: "slipway", name: "County Ramp", access: "destination" }), "access=destination"],
  [false, null, at(17, { leisure: "slipway", name: "State Ramp", access: "permit" }), "access=permit"],
  [false, null, at(18, { leisure: "slipway", name: "Boat Ramp - Private" }), "a ramp named 'Private'"],
  [false, null, at(19, { leisure: "slipway", name: "Sea Island Residents Ramp" }), "residents only"],
  [false, null, at(20, { man_made: "pier", name: "Marsh Point HOA Dock", fishing: "yes" }), "an HOA dock (even tagged fishing=yes)"],
  [false, null, at(21, { leisure: "slipway", name: "Savannah Yacht Club Ramp" }), "a yacht club ramp"],
  [false, null, at(22, { leisure: "slipway", name: "Harbor Park Condominiums Ramp" }), "a condo ramp (even with 'Park' in the name)"],
  [false, null, at(23, { man_made: "pier", name: "Old Town Pier", disused: "yes" }), "a disused pier"],
  [false, null, at(24, { man_made: "pier", name: "Riverside Park Pier", fishing: "no" }), "a pier tagged fishing=no"],
  [false, null, at(25, { leisure: "slipway", name: "Marina Ramp", ownership: "private" }), "privately owned, no access tag"],
  [false, null, at(26, { leisure: "slipway", name: "Island Marina", "operator:type": "business" }), "a business ramp, no access tag"],
  [false, null, at(27, { leisure: "slipway", name: "City Ramp", boat: "private" }), "boat=private"],
  [false, null, at(28, { man_made: "pier", name: "Estates Pier", operator: "Lakeview Owners Association" }), "run by an owners association"],
  [true, "public", at(29, { leisure: "slipway", name: "Marina Ramp", ownership: "private", access: "yes" }), "privately owned but tagged access=yes (open to all)"],
  [false, null, at(30, { leisure: "slipway", name: "Statesboro Ramp" }), "'Statesboro' is not the word 'state'"]
];
GA.forEach(([keep, via, e, what]) => {
  const g = N.osmToSpot(e);
  if (!keep) return ok(g === null, "left out: " + what);
  ok(g && g.trust === "public" && (via === "name" ? g.via === "name" : g.via === undefined), "kept as ✅ Public" + (via === "name" ? " (by name/owner)" : "") + ": " + what);
});
// the old code kept most of these: this is what was wrong on Richard's phone
ok(O.osmToSpot(at(10, { man_made: "pier", name: "Smith Dock" })) !== null && O.osmToSpot(at(12, { leisure: "slipway" })) !== null, "(the old code kept the named house dock and the unnamed ramp)");

// the tap card wording
ok(N.trustOf(N.osmToSpot(GA[3][2])).badge === "✅ Public" && /name or who runs it says it is public/.test(N.trustOf(N.osmToSpot(GA[3][2])).note), "kept by name: card says its name or who runs it says it is public");
ok(N.trustOf(N.osmToSpot(GA[0][2])).note === "Tagged as public or as a fishing spot on OpenStreetMap.", "kept by tag: the usual card words");

// a place out at sea follows where you are looking: Georgia → strict, Florida → as before
const sea = { type: "node", id: 99, lat: 26.2, lon: -65.0, tags: { man_made: "pier", name: "Offshore Pier" } };
const seaN = c => ctx(part(t09) + "\nfunction suggCenter() { return " + JSON.stringify(c) + "; }").api.osmToSpot(sea);
ok(seaN({ lat: 32, lng: -81 }) === null, "a pier at sea while looking at Georgia: strict (left out)");
ok(JSON.stringify(seaN({ lat: 26.2, lng: -80.1 })) === JSON.stringify(O.osmToSpot(sea)), "a pier at sea while looking at Florida: same as before");

// ---------- 2) Florida: exactly the same as v173 ----------
const fl = (id, tags, kind) => ({ type: kind || "way", id, center: { lat: 26.2 + id / 1000, lon: -80.1 }, tags });
const FL = [
  fl(1, { man_made: "pier", name: "Smith Dock" }), fl(2, { leisure: "slipway" }), fl(3, { leisure: "slipway", name: "Boat Ramp - Private" }),
  fl(4, { man_made: "pier", name: "Pompano Beach Fishing Pier", fishing: "yes" }), fl(5, { leisure: "slipway", access: "private" }),
  fl(6, { man_made: "breakwater", name: "Hillsboro Inlet Jetty" }), fl(7, { man_made: "groyne" }), fl(8, { bridge: "yes", fishing: "yes", name: "Old Bridge" }),
  fl(9, { leisure: "fishing", name: "Lake" }), fl(10, { man_made: "pier" }), fl(11, { leisure: "slipway", name: "HOA Ramp", access: "destination" }),
  fl(12, { leisure: "slipway", name: "Yacht Club Ramp" }), fl(13, { man_made: "pier", name: "Old Pier", disused: "yes" }), { type: "node", id: 14, tags: {} }
];
const nf = FL.map(N.osmToSpot), of = FL.map(O.osmToSpot);
ok(JSON.stringify(nf) === JSON.stringify(of), "Florida: every place gives exactly the same result as v173 (" + of.filter(Boolean).length + " kept of " + FL.length + ")");
ok(nf.every((g, i) => !g || JSON.stringify(N.trustOf(g)) === JSON.stringify(O.trustOf(of[i]))), "Florida: same badges and card words");

// ---------- 3) js/58: the ✅ Official public spots layer outside Florida uses the strict check ----------
(async () => {
  const ELEMENTS = GA.map(r => r[2]).concat([{ type: "node", id: 500, lat: 30.5, lon: -81.45, tags: { leisure: "slipway", name: "A Florida ramp" } }]);
  const c = ctx(cut(t09, "  const OSM_PUBLIC_WORDS", "  async function loadSuggestions") + "\n" + o58 + "\nthis.api = { osmOlLoad, osmOlItems, OSMOL };",
    { fetch: async () => ({ ok: true, status: 200, json: async () => ({ elements: ELEMENTS }) }) });
  const L = c.api, view = (s, w, n, e) => ({ getSouth: () => s, getWest: () => w, getNorth: () => n, getEast: () => e });
  ok(L.OSMOL.key === "fm-osm-ol-v2", "the phone's old copies (which may hold private docks) are not used: new storage name fm-osm-ol-v2");
  ok(await L.osmOlLoad(view(31.95, -81.3, 32.1, -80.9)) === true, "a Georgia view loads");
  const items = L.osmOlItems(), want = GA.filter(r => r[0] && (r[2].tags.leisure === "slipway" || r[2].tags.man_made === "pier"));
  ok(items.length === want.length && items.every(o => o.trust === "public" && o.state === "GA"), "the map layer keeps only the clearly public ramps and piers (" + items.length + " of " + GA.length + ")");
  ok(!items.some(o => /Smith Dock|Johnson Pier|HOA|Private|Marsh Creek/.test(o.name)), "no house docks, private, HOA or unsure ramps on the map");
  ok(items.find(o => o.name === "Lake Park Boat Ramp").via === "name" && items.find(o => o.name === "Savannah River Ramp").via === undefined, "the map card knows why it is public (by tag or by name)");
  ok(!items.some(o => o.name === "A Florida ramp"), "Florida places still come only from the official lists");
  ok(/const SUGG_KEY = "fm-suggestions-v4"/.test(t09), "Find new water's old saved list is not reused either (fm-suggestions-v4)");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK");
  process.exit(bad ? 1 : 0);
})();
