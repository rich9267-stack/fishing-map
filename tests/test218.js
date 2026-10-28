// test218: 🐟 Freshwater bait collection (v231, setup/116): 8 fish all required (the four northern ones are "far" but still count),
// it does not change the Freshwater group, its fish go in the freshwater tank / games rules, every card has a source + live-bait line.
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
const seaSrc = read("js/05-seasons-records.js"), tankSrc = read("js/14-tank.js"), wsrc = read("js/07-measure-fishid.js"), catchSrc = read("js/06-catching.js"), gamesSrc = read("js/52-games-more.js");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };

const seaSlice = seaSrc.match(/const SEASON_GROUPS = .*;/)[0] + "\n" + seaSrc.match(/const SEASONS = \[[\s\S]*?\n  \];/)[0];
const S = new Function(`${seaSlice} ${seaSrc.match(/function seasonFor[\s\S]*?\n  }\n/)[0]}; return { SEASONS, SEASON_GROUPS, seasonFor };`)();
const tc = new Function("SEASONS", "SEASON_GROUPS", "seasonFor", tankSrc.match(/function tankCollection[\s\S]*?\n  }\n/)[0] + "; return tankCollection;")(S.SEASONS, S.SEASON_GROUPS, S.seasonFor);

const FRESH = ["Golden shiner", "Threadfin shad", "Gizzard shad", "Eastern mosquitofish", "Fathead minnow", "Emerald shiner", "Alewife", "Creek chub"];
const NORTH = ["Fathead minnow", "Emerald shiner", "Alewife", "Creek chub"];
const g = tc([]).find(x => x.key === "baitfresh");
ok("there is a Freshwater bait group of 8", g && g.total === 8 && g.label === "Freshwater bait");
ok("all 8 are required, including the four northern 'far' fish", g && FRESH.every(n => g.missing.includes(n)));
ok("the four northern fish are marked far (not found in Florida)", NORTH.every(n => S.SEASONS.find(f => f.name === n).far));
ok("the other collections did not grow", ["inshore", "beach", "offshore", "fresh", "bait"].every(k => !tc([]).find(x => x.key === k).missing.some(n => FRESH.includes(n))));
ok("far fish are still left out of the other groups", !tc([]).find(x => x.key === "fresh").missing.includes("Blue catfish"));
const done = tc(FRESH.map(n => ({ species: n }))).find(x => x.key === "baitfresh");
ok("catching all 8 completes it", done.got.length === 8 && !done.missing.length);
ok("names people type find the right fish", ["mosquitofish", "Gambusia", "Alewife", "creek chub"].every(n => S.seasonFor(n)) && S.seasonFor("Gambusia").name === "Eastern mosquitofish");
ok("Gizzard shad and Threadfin shad are different fish", S.seasonFor("gizzard shad").name === "Gizzard shad" && S.seasonFor("Threadfin shad").name === "Threadfin shad" && S.seasonFor("Threadfin herring").name === "Threadfin herring");
ok("every card has a rule line (live bait) and a tip", S.SEASONS.filter(f => f.group === "baitfresh").every(f => /live-bait|bait/i.test(f.rule) && f.tip));
ok("these fish live in the freshwater tank, not the saltwater one", /sf\.group === "fresh" \|\| sf\.group === "baitfresh"/.test(tankSrc));
ok("the games keep them off the saltwater lists and the temperature read-out", /f\.group !== "baitfresh"/.test(gamesSrc) && /f\.group !== "baitfresh"/.test(seaSrc));

const cards = JSON.parse(read("data/learn/fish.json")).fish;
FRESH.forEach(n => { const c = cards.find(x => x.name === n); ok(`Learn card: ${n} (fresh, source, checked date, live-bait line)`, c && c.kind === "fresh" && c.source && /^https:\/\//.test(c.source.url) && /^2026-/.test(c.checked || "") && /live-bait rules/.test(JSON.stringify(c.general))); });
ok("Learn cards cite agency pages only (USGS NAS or TPWD)", FRESH.every(n => /nas\.er\.usgs\.gov|tpwd\.texas\.gov/.test(cards.find(x => x.name === n).source.url)));

const pics = JSON.parse(read("data/learn/fish-pictures.json"));
["Golden shiner", "Gizzard shad", "Eastern mosquitofish", "Fathead minnow", "Alewife", "Menhaden", "Ballyhoo", "Bay anchovy", "Cigar minnow"].forEach(n => ok(`a free illustration is linked: ${n}`, pics.pictures[n] && /^Public domain/.test(pics.pictures[n].licence) && !pics.none.includes(n)));
["Threadfin shad", "Emerald shiner", "Creek chub"].forEach(n => ok(`no illustration found (only photos): ${n}`, pics.none.includes(n) && !pics.pictures[n]));

const looks = new Function(tankSrc.match(/const TANK_LOOKS = \[[\s\S]*?\n  \];/)[0] + "; return TANK_LOOKS;")();
FRESH.forEach(n => { const l = looks.find(x => x.m.test(n.toLowerCase())); ok(`tank picture: ${n} has its own look`, l && l.m.source.split("|").some(w => n.toLowerCase().includes(w.replace(/\\b/g, "")))); });

const wr = new Function(wsrc.match(/const WEIGHT_REF = \[[\s\S]*?\n  \];/)[0] + "\n" + wsrc.match(/const WEIGHT_MORE = \[[\s\S]*?\n  \];/)[0] + "; return WEIGHT_REF.concat(WEIGHT_MORE);")();
const hit = sp => { let best = null, bl = 0; wr.forEach(r => r[0].forEach(w => { if (w.length > bl && new RegExp("\\b" + w + "\\b", "i").test(sp)) { best = r; bl = w.length; } })); return best; };
ok("every one gets a weight guess", FRESH.every(n => hit(n)));
ok("Gizzard shad is not the 'american shad' row", hit("Gizzard shad")[0][0] === "gizzard shad");
FRESH.forEach(n => ok(`catch-form suggestion: ${n}`, catchSrc.includes(`"${n}"`)));

const sql = read("setup/116-freshwater-bait-collection.sql");
ok("setup/116 allows 'baitfresh' (and the older groups) and keeps the 5-species minimum", /'fresh','bait','baitfresh'/.test(sql) && /n < 5/.test(sql));
console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
