// test219: 🦐 Shrimp, crabs & other bait collection (v232, setup/117): 7 non-fish, counted by name, left out of the fish games,
// no length-weight guess and no fish rank, crayfish in the freshwater tank, Learn cards without the fish release advice.
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
const seaSrc = read("js/05-seasons-records.js"), tankSrc = read("js/14-tank.js"), wsrc = read("js/07-measure-fishid.js"), catchSrc = read("js/06-catching.js"), gamesSrc = read("js/52-games-more.js"), rankSrc = read("js/15-fish-rank.js");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };

const seaSlice = seaSrc.match(/const SEASON_GROUPS = .*;/)[0] + "\n" + seaSrc.match(/const SEASONS = \[[\s\S]*?\n  \];/)[0];
const S = new Function(`${seaSlice} ${seaSrc.match(/function seasonFor[\s\S]*?\n  }\n/)[0]}; return { SEASONS, SEASON_GROUPS, seasonFor };`)();
const tc = new Function("SEASONS", "SEASON_GROUPS", "seasonFor", tankSrc.match(/function tankCollection[\s\S]*?\n  }\n/)[0] + "; return tankCollection;")(S.SEASONS, S.SEASON_GROUPS, S.seasonFor);

const OTHER = ["Shrimp", "Blue crab", "Fiddler crab", "Sand flea", "Hermit crab", "Crayfish", "Squid"];
const g = tc([]).find(x => x.key === "baitother");
ok("there is a 'Shrimp, crabs & other bait' group of 7", g && g.total === 7 && g.label === "Shrimp, crabs & other bait");
ok("it holds exactly the 7 planned animals", g && OTHER.every(n => g.missing.includes(n)));
ok("the other collections did not grow", ["inshore", "beach", "offshore", "fresh", "bait", "baitfresh"].every(k => !tc([]).find(x => x.key === k).missing.some(n => OTHER.includes(n))));
ok("stone crab and spiny lobster are not in the list", !S.SEASONS.some(f => /stone crab|lobster/i.test(f.name)));
const got = tc([{ species: "Live shrimp" }, { species: "Blue Crab" }, { species: "mole crab" }, { species: "crawfish" }, { species: "Brief squid" }, { species: "Fiddler crab" }, { species: "Hermit Crab" }]).find(x => x.key === "baitother");
ok("everyday names count (live shrimp, mole crab, crawfish, brief squid)", got.got.length === 7 && !got.missing.length);
ok("every card has a rule line and a tip", S.SEASONS.filter(f => f.group === "baitother").every(f => f.rule && f.tip && f.shore.length === 12));
ok("shrimp, crabs and squid are kept out of the fish games", /f\.group !== "baitother"/.test(gamesSrc.match(/const gfFish = [^\n]*/)[0]));
ok("crayfish goes in the freshwater tank, the rest in the saltwater one", /crayfish\|crawfish\|crawdad/.test(tankSrc.match(/if \(sf\) home = [^\n]*/)[0]));

// not fish: no weight guess, no fish rank
const wr = new Function(wsrc.match(/const WEIGHT_REF = \[[\s\S]*?\n  \];/)[0] + "\n" + wsrc.match(/const WEIGHT_MORE = \[[\s\S]*?\n  \];/)[0] + "; return WEIGHT_REF.concat(WEIGHT_MORE);")();
const hit = sp => { let best = null, bl = 0; wr.forEach(r => r[0].forEach(w => { if (w.length > bl && new RegExp("\\b" + w + "\\b", "i").test(sp)) { best = r; bl = w.length; } })); return best; };
ok("no length-to-weight guess for shrimp, crabs, crayfish or squid", ["Shrimp", "Blue crab", "Fiddler crab", "Sand flea", "Hermit crab", "Crayfish", "Squid"].every(n => !hit(n)));
ok("none of them has a fish rank row", !OTHER.some(n => rankSrc.toLowerCase().includes(`["${n.toLowerCase()}"`)));

// Learn cards
const cards = JSON.parse(read("data/learn/fish.json")).fish;
OTHER.forEach(n => ok(`Learn card: ${n}`, cards.some(c => c.name === n)));
const sourced = ["Shrimp", "Blue crab", "Crayfish", "Squid"];
ok("four cards have an agency source (FWC, NOAA, USGS) and a checked date", sourced.every(n => { const c = cards.find(x => x.name === n); return c.source && /myfwc\.com|fisheries\.noaa\.gov|nas\.er\.usgs\.gov/.test(c.source.url) && /^2026-/.test(c.checked || ""); }));
ok("fiddler crab, sand flea and hermit crab are general advice only (no source)", ["Fiddler crab", "Sand flea", "Hermit crab"].every(n => !cards.find(x => x.name === n).source));
ok("saltwater non-fish cards skip the fish release advice", OTHER.filter(n => n !== "Crayfish").every(n => cards.find(x => x.name === n).nohandling));
ok("every card carries the rules / live-bait reminder", OTHER.every(n => /Check your state's rules/.test(JSON.stringify(cards.find(x => x.name === n).general))));
ok("crayfish is a freshwater card, the others saltwater", cards.find(x => x.name === "Crayfish").kind === "fresh" && OTHER.filter(n => n !== "Crayfish").every(n => cards.find(x => x.name === n).kind === "salt"));

const pics = JSON.parse(read("data/learn/fish-pictures.json"));
["Shrimp", "Sand flea", "Squid"].forEach(n => ok(`a free illustration is linked: ${n}`, pics.pictures[n] && /^Public domain/.test(pics.pictures[n].licence) && !pics.none.includes(n)));
["Blue crab", "Fiddler crab", "Hermit crab", "Crayfish"].forEach(n => ok(`no illustration found (only photos): ${n}`, pics.none.includes(n) && !pics.pictures[n]));

// tank pictures and the catch form
const looks = new Function(tankSrc.match(/const TANK_LOOKS = \[[\s\S]*?\n  \];/)[0] + "; return TANK_LOOKS;")();
const shape = { Shrimp: "shrimp", "Blue crab": "crab", "Fiddler crab": "crab", "Sand flea": "egg", "Hermit crab": "crab", Crayfish: "shrimp", Squid: "squid" };
Object.keys(shape).forEach(n => { const l = looks.find(x => x.m.test(n.toLowerCase())); ok(`tank picture: ${n} is ${shape[n]}`, l && l.shape === shape[n]); });
["Shrimp", "Blue crab", "Fiddler crab", "Sand flea (mole crab)", "Hermit crab", "Crayfish", "Squid"].forEach(n => ok(`catch-form suggestion: ${n}`, catchSrc.includes(`"${n}"`)));

const sql = read("setup/117-other-bait-collection.sql");
ok("setup/117 allows 'baitother' (and the older groups) and keeps the 5-species minimum", /'bait','baitfresh','baitother'/.test(sql) && /n < 5/.test(sql));
console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
