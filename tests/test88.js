// test88: the app's fish rank (js/15-fish-rank.js) must give exactly the same Power, tier, stats and size % as the database
// function fish_rank_calc (setup/44-fish-rank.sql). fish-rank-sql.json holds the database's answers (one fingerprint per species
// name over 39 sizes each: 26 lengths, 6 real weights, 6 estimated weights, no size).
// If you change the rank rules: change BOTH files, run `node rank-grid.js` to get the SQL, run it in Supabase, and paste the
// result (the "j" object) into fish-rank-sql.json.
const g = require("./rank-grid.js");
const db = require("./fish-rank-sql.json");
const ctx = g.loadRank();
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? "ok   " : "FAIL ") + msg); if (!cond) fail = 1; };

const app = g.appPrints(ctx);
const names = Object.keys(app);
const bad = names.filter(k => app[k] !== db[k]);
ok(names.length === Object.keys(db).length, `${names.length} species names checked (database has ${Object.keys(db).length})`);
ok(bad.length === 0, "app and database agree on every size" + (bad.length ? " — differ for: " + bad.join(", ") : ""));

// a few known answers, so a broken loader can't pass by giving "no rank" everywhere
const rk = (sp, len, wt, est) => ctx.fishRank({ species: sp, length_in: len, weight_lb: wt, weight_est: est }, true);
const s30 = rk("Snook", 30);
ok(s30 && s30.power === 545 && s30.tier === "Rare", `30" snook = ${s30 && s30.power} ${s30 && s30.tier} (want 545 Rare)`);
const s20 = rk("Snook", 20);
ok(s20 && s20.power === 293 && s20.tier === "Uncommon", `20" snook = ${s20 && s20.power} ${s20 && s20.tier} (want 293 Uncommon)`);
ok(rk("Tarpon", 95).tier === "Legendary", "record-size tarpon is Legendary");
ok(rk("Pinfish", 6).tier === "Common", "typical 6\" pinfish is Common");
ok(rk("Snook", null, 8.7, true) === null, "estimated weight only → no rank");
ok(rk("Snook", null, 8.7, false) !== null, "real weight only → ranked");
ok(rk("Mystery fish", 30) === null, "unknown species → no rank");
ok(ctx.fishRank({ species: "Snook", length_in: 30 }, false) === null, "no photo → no rank");
ok(ctx.fishRank({ species: "Snook", length_in: 30, review_state: "blurred" }, true) === null, "blurred for review → no rank (same as the database)");

console.log(fail ? "test88 FAILED" : "test88 OK");
process.exit(fail);
