// Gulf step 7: shore / pier / flat / boat scoring (js/32-spot-style.js + scoreMoment in js/09)
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const nodes = { "f-type": { value: "dock", addEventListener() {} }, "f-type-hint": { textContent: "", hidden: true } };
const ctx = { $: id => nodes[id], TIME_BLOCKS: ["a","b","c","d","e","f","g","h"], cap: s => s, console };
vm.createContext(ctx);
const nine = read("js/09-map-forecast.js");
const chunk = nine.slice(nine.indexOf("const BASELINE"), nine.indexOf("function catchFactors")) +
  nine.slice(nine.indexOf("function scoreMoment"), nine.indexOf("// ---- 3-day outlook"));
vm.runInContext(read("js/32-spot-style.js") + "\n" + chunk + "\nthis.api = { spotStyle, styleLevel, styleWindAdj, styleTideWeight, styleShowsWindKind, updateTypeHint, scoreMoment, SPOT_STYLE_TEXT };", ctx);
const A = ctx.api;

// styles from spot types
const st = t => A.spotStyle({ spot_type: t });
ok(["dock","seawall","ramp","shore","inlet"].every(t => st(t) === "shore"), "docks, seawalls, ramps, shore and inlets stay 'shore'");
ok(["pier","jetty","bridge"].every(t => st(t) === "pier"), "pier, jetty, bridge = pier");
ok(st("flat") === "flat" && st("boat") === "boat" && st(undefined) === "shore", "flat, boat, and a missing type");
ok(A.SPOT_STYLE_TEXT.boat === "by boat" && A.SPOT_STYLE_TEXT.shore === "from shore", "wording for notes");

// season level: king-mackerel-like fish (shore slow, boat peak)
const king = { shore: [0,0,0,0,0,0,0,0,0,0,0,0], boat: [2,2,2,2,2,2,2,2,2,2,2,2] };
ok(A.styleLevel(king, 5, "shore") === 0 && A.styleLevel(king, 5, "boat") === 2, "shore uses the shore column, boat the boat column");
ok(A.styleLevel(king, 5, "pier") === 1, "a pier sits between");
ok(A.styleLevel(king, 5, "flat") === 0, "a flat uses the inshore (shore) column");
ok(A.styleLevel({ shore: [1], boat: undefined }, 0, "boat") === 1, "no boat column: falls back to shore");

// wind
ok(A.styleWindAdj("shore", 30).adj === 0 && A.styleWindAdj(undefined, 30).adj === 0, "shore spots: wind never changes the score (as before)");
ok(A.styleWindAdj("boat", 5).adj > 0 && A.styleWindAdj("boat", 16).adj < 0 && A.styleWindAdj("boat", 22).adj < A.styleWindAdj("boat", 16).adj, "boats: calm up, chop down, rough lower");
ok(/too rough/.test(A.styleWindAdj("boat", 26).warn) && A.styleWindAdj("boat", 26).adj <= -1.5, "boats over 25 mph: too rough");
ok(A.styleWindAdj("flat", 18).adj < 0 && /sight/.test(A.styleWindAdj("flat", 18).warn), "flats: breezy warning");
ok(A.styleWindAdj("pier", 12).adj === 0 && A.styleWindAdj("pier", 27).adj < 0, "piers only mind strong wind");
ok(A.styleWindAdj("boat", null).adj === 0, "no wind number = no change");
ok(A.styleShowsWindKind({ spot_type: "boat" }) === false && A.styleShowsWindKind({ spot_type: "pier" }) === true, "onshore/offshore label hidden for boat spots only");
ok(A.styleTideWeight("boat") < 1 && A.styleTideWeight("flat") > 1 && A.styleTideWeight("shore") === 1, "tide weight by style");

// scoreMoment
const hist = Array.from({ length: 10 }, () => ({ f: { tide: "incoming" }, n: 1 }));
const now = { tide: "incoming", mph: 5 };
const base = A.scoreMoment(now, hist, [], undefined), shore = A.scoreMoment(now, hist, [], "shore");
ok(Math.abs(base.score - shore.score) < 1e-9, "no style = shore (unchanged scoring)");
const flat = A.scoreMoment(now, hist, [], "flat"), boat = A.scoreMoment(now, hist, [], "boat");
ok(flat.score > shore.score, "tide history counts more on a flat: " + flat.score.toFixed(2) + " vs " + shore.score.toFixed(2));
ok(Math.abs(boat.score - (shore.score * 0.5 + 0.2)) < 1e-9, "tide history counts half on a boat spot (+ calm bonus)");
const choppy = A.scoreMoment({ tide: "incoming", mph: 18 }, hist, [], "boat");
ok(choppy.score < boat.score && /choppy/.test(choppy.warn), "same tide, 18 mph: boat score drops and warns");
ok(A.scoreMoment({ tide: "incoming", mph: 18 }, hist, [], "shore").score === shore.score, "shore score ignores wind speed");

// hint under the spot form's Type menu
nodes["f-type"].value = "boat"; A.updateTypeHint();
ok(!nodes["f-type-hint"].hidden && /chop/.test(nodes["f-type-hint"].textContent), "boat hint shows");
nodes["f-type"].value = "dock"; A.updateTypeHint();
ok(nodes["f-type-hint"].hidden, "no hint for a dock");

// wiring
const html = read("index.html"), sw = read("sw.js"), six = read("js/06-catching.js"), eight = read("js/08-feed-plans.js");
ok(/<option value="flat">/.test(html) && /<option value="boat">/.test(html) && /id="f-type-hint"/.test(html), "spot form offers Flat and Boat spot");
ok(/js\/32-spot-style\.js/.test(html) && /js\/32-spot-style\.js/.test(sw), "file is loaded and cached offline");
ok(/\["flat", "Flat"\], \["boat", "Boat spot"\]/.test(six), "spot-type filter has Flat and Boat spot");
ok(/scoreMoment\(f, H\.hist, H\.expo, spotStyle\(s\)\)/.test(eight), "plan-a-trip suggestions pass the style");
ok((nine.match(/spotStyle\(s\)\)/g) || []).length >= 3, "Best spot today and the outlook pass the style");
ok(/'flat','boat'/.test(read("setup/64-spot-type-flat-boat.sql")), "database rule saved as setup/64");
console.log(bad ? "\n" + bad + " FAILED" : "\nall passed"); process.exit(bad ? 1 : 0);
