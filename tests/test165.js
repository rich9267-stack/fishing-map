// test165: better weight-from-length guesses (js/07 WEIGHT_REF growth numbers + WEIGHT_MORE, setup/93; data in docs/weight-data.md)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const src = read("js/07-measure-fishid.js");
const W = new Function(src.slice(src.indexOf("const WEIGHT_REF"), src.indexOf("function sizeText")) +
  "; return { WEIGHT_REF, WEIGHT_MORE, weightRef, weightRow, estWeight, sizeFields, wtName };")();
const name = sp => { const r = W.weightRow(sp); return r ? W.wtName(r) : null; };
const near = (a, b, pct) => Math.abs(a / b - 1) <= pct / 100;

// 1. the formula: ref weight at the ref length, growth number b (none = 3)
ok("30″ snook = 8.1 lb", near(W.estWeight("Snook", 30), 8.1, 0.1));
ok("15″ snook uses b 3.03 (8.1 × 0.5^3.03)", near(W.estWeight("Snook", 15), 8.1 * Math.pow(0.5, 3.03), 0.1));
ok("a fish without b still uses 3 (tarpon 30″ = 85/8)", near(W.estWeight("Tarpon", 30), 85 / 8, 0.1));
ok("thin ladyfish grows slower than a deep blue catfish", W.WEIGHT_REF.find(r => r[0][0] === "ladyfish")[3] < W.WEIGHT_REF.find(r => r[0][0] === "blue catfish")[3]);
ok("every growth number is between 2.5 and 3.5", W.WEIGHT_REF.concat(W.WEIGHT_MORE).every(r => r[3] == null || (r[3] >= 2.5 && r[3] <= 3.5)));
ok("every row has a length and a weight", W.WEIGHT_REF.concat(W.WEIGHT_MORE).every(r => r[1] > 0 && r[2] > 0));

// 2. names find the right fish (longest matching name wins)
const want = {
  "Lake trout": "lake trout", "Rainbow trout": "rainbow trout", "Steelhead": "rainbow trout", "Brown trout": "brown trout", "Spotted seatrout": "seatrout",
  "Sand seatrout": "sand seatrout", "Trout": "seatrout", "Black sea bass": "sea bass", "Striped bass": "striped bass", "Largemouth bass": "largemouth",
  "Smallmouth bass": "smallmouth", "Spot": "spot", "Spotted moray": null, "Spotted bullhead": "spotted bullhead", "Yellowtail snapper": "yellowtail",
  "Yellow perch": "yellow perch", "Speckled perch": "crappie", "Bar jack": "bar jack", "Skipjack tuna": "skipjack", "Jack crevalle": "crevalle",
  "False albacore": "little tunny", "Albacore": "albacore", "Bluefin tuna": "bluefin tuna", "King salmon": "chinook", "King mackerel": "kingfish",
  "Checkered puffer": "puffer", "Mojarra": "mojarra", "Porkfish": "porkfish", "Warmouth": "warmouth", "Redear sunfish": "redear",
  "Summer flounder": "summer flounder", "Southern flounder": "flounder", "Freshwater drum": "freshwater drum", "Black drum": "black drum",
  "Red drum": "redfish", "Gray triggerfish": "triggerfish", "Grunts": "grunt", "Porgy": "porgy", "Gulf toadfish": "gulf toadfish", "Muskie": "muskellunge"
};
Object.entries(want).forEach(([sp, row]) => ok(`"${sp}" → ${row || "no guess"}`, name(sp) === row));

// 3. fish rank keeps the database's row choice (weightRef = WEIGHT_REF only, same order as fish_rank_species)
ok("rank lookup ignores the weight-only list", W.weightRef("Lake trout")[0][0] === "seatrout" && W.weightRef("Warmouth") === undefined);
const rank = read("js/15-fish-rank.js");
ok("rank length from a weighed fish uses the growth number", rank.includes("1 / (w[3] || 3)"));

// 4. saving: a typed weight is never replaced; a length alone gives a marked estimate
ok("weighed fish keeps its weight", JSON.stringify(W.sizeFields("Snook", "30", "10")) === JSON.stringify({ length_in: 30, weight_lb: 10, weight_est: false }));
ok("length only → estimate marked ≈", (f => f.weight_est && f.weight_lb === 0.36)(W.sizeFields("Checkered puffer", "7.75", "")));

// 5. setup/93 re-estimates logged catches with the same numbers the app uses now
const sql = read("setup/93-better-weight-guesses.sql");
const vals = [...sql.slice(sql.indexOf("from (values"), sql.indexOf("v(sp, l, w, b)")).matchAll(/\('([^']+)', ([\d.]+), ([\d.]+), ([\d.]+)\)/g)];
ok(`${vals.length} logged species in setup/93`, vals.length >= 10);
ok("each one matches js/07's row", vals.every(m => { const r = W.weightRow(m[1]); return r && r[1] === +m[2] && r[2] === +m[3] && (r[3] || 3) === +m[4]; }));
ok("only estimated or empty weights are changed", /\(c\.weight_est or c\.weight_lb is null\)/.test(sql) && /c\.deleted_at is null/.test(sql));
ok("fish_rank_calc uses ref_b", sql.includes("1.0 / coalesce(ref_b, 3)"));
ok("undo written", sql.includes("-- UNDO"));

console.log(bad ? `test165 FAILED (${bad})` : "test165 OK");
process.exit(bad ? 1 : 0);
