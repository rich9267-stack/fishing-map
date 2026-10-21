// test166: which US state a spot is in (js/53 stateOf, US plan step 1; built by docs/us-states-build.py from the Census state file)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const src = read("js/53-us-states.js");
const S = new Function(src + "; return { stateOf, STATE_NAMES, US_STATE_RINGS };")();

// 1. the data: 48 states + DC, every one named, small enough to keep on the phone
const codes = Object.keys(S.US_STATE_RINGS);
ok(`49 outlines (48 states + DC), got ${codes.length}`, codes.length === 49);
ok("no Alaska / Hawaii / Puerto Rico", !codes.some(c => ["AK", "HI", "PR"].includes(c)));
ok("every outline has a name", codes.every(c => S.STATE_NAMES[c]) && Object.keys(S.STATE_NAMES).length === 49);
ok(`file is small (${Math.round(src.length / 1024)} KB ≤ 120 KB)`, src.length <= 120 * 1024);

// 2. spots on land, on the coast, offshore, in big lakes, and in other countries
const want = [
  ["Pompano Beach pier", 26.233, -80.088, "FL"], ["Gulf Stream off Pompano", 26.23, -79.9, "FL"], ["Key West", 24.555, -81.78, "FL"],
  ["off the Keys", 24.4, -81.5, "FL"], ["Dry Tortugas", 24.63, -82.87, "FL"], ["Lake Okeechobee", 26.95, -80.8, "FL"],
  ["Pensacola", 30.42, -87.2, "FL"], ["Mobile Bay", 30.5, -88.0, "AL"], ["Savannah", 32.08, -81.09, "GA"], ["Atlanta", 33.75, -84.39, "GA"],
  ["off the Outer Banks", 35.2, -75.2, "NC"], ["Chesapeake Bay", 38.5, -76.3, "MD"], ["Montauk offshore", 40.9, -71.7, "NY"],
  ["Gulf of Maine", 43.5, -69.5, "ME"], ["Lake Michigan off Chicago", 41.9, -87.5, "IL"], ["Lake Erie off Cleveland", 41.7, -81.7, "OH"],
  ["Lake Ontario off Rochester", 43.4, -77.6, "NY"], ["Lake Superior off Two Harbors", 47.0, -91.6, "MN"], ["Isle Royale", 48.0, -88.9, "MI"],
  ["South Padre offshore", 26.1, -97.0, "TX"], ["San Diego Bay", 32.68, -117.2, "CA"], ["Puget Sound", 47.6, -122.4, "WA"],
  ["San Juan Islands", 48.55, -123.0, "WA"], ["Denver", 39.74, -104.99, "CO"],
  ["middle of the Gulf", 25.5, -90, null], ["Bimini", 25.73, -79.27, null], ["Grand Bahama", 26.6, -78.5, null], ["Cay Sal Bank", 23.95, -80.2, null],
  ["Havana", 23.11, -82.37, null], ["Toronto", 43.65, -79.38, null], ["Windsor, Ontario", 42.3, -83.0, null], ["Victoria, BC", 48.43, -123.37, null],
  ["Tijuana", 32.5, -117.0, null], ["Matamoros", 25.87, -97.5, null], ["Mexico coast south of Texas", 24.5, -97.7, null], ["Anchorage", 61.2, -149.9, null]
];
want.forEach(([n, lat, lng, st]) => ok(`${n} → ${st || "none"}`, S.stateOf(lat, lng) === st));

// 3. odd input never breaks it; text numbers work (spots come from the database as numbers or text)
ok("missing numbers → null", S.stateOf(null, undefined) === null && S.stateOf(NaN, 1) === null && S.stateOf("x", "y") === null);
ok("text numbers work", S.stateOf("33.75", "-84.39") === "GA");

// 4. fast enough for a whole list of spots
const t0 = Date.now(); for (let i = 0; i < 2000; i++) S.stateOf(25 + (i % 200) / 10, -125 + (i % 600) / 10);
ok(`2000 lookups in ${Date.now() - t0} ms (< 2000)`, Date.now() - t0 < 2000);

// 5. wired in: loaded by the page and kept offline; nothing on screen uses it yet
ok("index.html loads js/53", /<script src="js\/53-us-states\.js\?v=\d+"><\/script>/.test(read("index.html")));
ok("sw.js keeps it offline", read("sw.js").includes('"./js/53-us-states.js"'));
ok("build script kept with the Census source named", read("docs/us-states-build.py").includes("cb_2023_us_state_5m"));

console.log(bad ? `test166 FAILED (${bad})` : "test166 OK");
process.exit(bad ? 1 : 0);
