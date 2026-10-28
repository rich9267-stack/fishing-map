// test217: 🐟 Saltwater bait collection (v230, setup/115): 10 fish, Pinfish also counts, mullet run is not a catch,
// logged names find the right fish, every new fish has a Learn card, a tank picture, a weight guess and a catch-form suggestion.
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
const seaSrc = read("js/05-seasons-records.js"), tankSrc = read("js/14-tank.js"), wsrc = read("js/07-measure-fishid.js"), catchSrc = read("js/06-catching.js");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };

const seaSlice = seaSrc.match(/const SEASON_GROUPS = .*;/)[0] + "\n" + seaSrc.match(/const SEASONS = \[[\s\S]*?\n  \];/)[0];
const S = new Function(`${seaSlice} ${seaSrc.match(/function seasonFor[\s\S]*?\n  }\n/)[0]}; return { SEASONS, SEASON_GROUPS, seasonFor };`)();
const tc = new Function("SEASONS", "SEASON_GROUPS", "seasonFor", tankSrc.match(/function tankCollection[\s\S]*?\n  }\n/)[0] + "; return tankCollection;")(S.SEASONS, S.SEASON_GROUPS, S.seasonFor);

const BAIT = ["Pinfish", "Mullet", "Mojarra", "Scaled sardine", "Spanish sardine", "Threadfin herring", "Menhaden", "Ballyhoo", "Bay anchovy", "Cigar minnow"];
const g = tc([]).find(x => x.key === "bait");
ok("there is a Saltwater bait group of 10", g && g.total === 10 && g.label === "Saltwater bait");
ok("it holds exactly the 10 planned fish", g && BAIT.every(n => g.missing.includes(n)) && g.missing.length === 10);
ok("Pinfish still counts in Beach & pier too", tc([]).find(x => x.key === "beach").missing.includes("Pinfish"));
ok("the mullet run is not a catch in any group", !tc([]).some(x => x.missing.some(n => /mullet run/i.test(n))));
ok("the other collections did not grow", ["inshore", "offshore", "fresh"].every(k => !tc([]).find(x => x.key === k).missing.some(n => BAIT.includes(n))));
const got = tc([{ species: "Pilchard" }, { species: "finger mullet" }, { species: "Spanish sardine" }, { species: "Spanish mackerel" }]).find(x => x.key === "bait").got;
ok("'Pilchard', 'finger mullet', 'Spanish sardine' count; Spanish mackerel does not", got.join() === "Mullet,Scaled sardine,Spanish sardine" || [...got].sort().join() === ["Mullet", "Scaled sardine", "Spanish sardine"].sort().join());
ok("every bait card has the rule line and a tip", S.SEASONS.filter(f => f.group === "bait").every(f => f.rule && f.tip && f.shore.length === 12 && f.boat.length === 12));

// Learn cards
const cards = JSON.parse(read("data/learn/fish.json")).fish;
BAIT.forEach(n => ok(`Learn card: ${n}`, cards.some(c => c.name === n)));
ok("new cards with a source point at FWC", cards.filter(c => ["Scaled sardine", "Spanish sardine", "Menhaden", "Ballyhoo", "Bay anchovy", "Cigar minnow"].includes(c.name)).every(c => c.source && /^https:\/\/myfwc\.com\//.test(c.source.url)));
ok("threadfin herring is general advice only (no source)", !cards.find(c => c.name === "Threadfin herring").source);

// tank pictures: none of them falls through to a different fish's look
const looks = new Function(tankSrc.match(/const TANK_LOOKS = \[[\s\S]*?\n  \];/)[0] + "; return TANK_LOOKS;")();
const lookOf = sp => looks.find(l => l.m.test(sp.toLowerCase()));
const shape = { "Scaled sardine": "torpedo", "Spanish sardine": "torpedo", "Threadfin herring": "torpedo", Menhaden: "deep", Ballyhoo: "long", "Bay anchovy": "long", "Cigar minnow": "long", Mullet: "torpedo", Mojarra: "deep" };
Object.keys(shape).forEach(n => ok(`tank picture: ${n} is ${shape[n]}`, lookOf(n) && lookOf(n).shape === shape[n]));
ok("Spanish mackerel keeps its own picture", /mackerel/.test(lookOf("Spanish mackerel").m.source));

// weight guesses + catch-form suggestions
const wr = new Function(wsrc.match(/const WEIGHT_REF = \[[\s\S]*?\n  \];/)[0] + "\n" + wsrc.match(/const WEIGHT_MORE = \[[\s\S]*?\n  \];/)[0] + "; return WEIGHT_REF.concat(WEIGHT_MORE);")();
const hit = sp => { let best = null, bl = 0; wr.forEach(r => r[0].forEach(w => { if (w.length > bl && new RegExp("\\b" + w + "\\b", "i").test(sp)) { best = r; bl = w.length; } })); return best; };
ok("Spanish sardine gets its own weight row, not Spanish mackerel's", hit("Spanish sardine")[0][0] === "spanish sardine");
ok("Pilchard and Ballyhoo have weight rows", hit("Pilchard") && hit("Ballyhoo"));
["Scaled sardine (pilchard)", "Spanish sardine", "Threadfin herring", "Menhaden", "Ballyhoo", "Bay anchovy", "Cigar minnow"].forEach(n => ok(`catch-form suggestion: ${n}`, catchSrc.includes(`"${n}"`)));

// database
const sql = read("setup/115-bait-collection.sql");
ok("setup/115 allows 'bait' and keeps the 5-species minimum", /'fresh','bait'/.test(sql) && /n < 5/.test(sql));
console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
