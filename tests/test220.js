// test220: 🦀 real shapes for crabs, shrimp, crayfish, squid and sand fleas, own colours for porgies, grunts, whiting and more (v233).
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
const tankSrc = read("js/14-tank.js"), seaSrc = read("js/05-seasons-records.js");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };

const T = new Function(tankSrc.match(/const TANK_LOOKS = \[[\s\S]*?\n  \];/)[0] + "\n" + tankSrc.match(/const TANK_SHAPES = \{[\s\S]*?\n  \};/)[0] + "; return { TANK_LOOKS, TANK_SHAPES };")();
const look = n => T.TANK_LOOKS.find(l => l.m.test(n.toLowerCase()));

["crab", "shrimp", "squid", "egg"].forEach(k => {
  const s = T.TANK_SHAPES[k];
  ok(`shape ${k} has body, tail, two fins and an eye spot`, s && s.body && s.tail && s.fin && s.fin2 && (Array.isArray(s.eye) || Array.isArray(s.eyes)) && s.gill === false);
  if (k !== "shrimp") ok(`shape ${k} draws its legs / arms / feelers`, k === "egg" ? !!s.extra : !!s.extra && s.extra.length > 40);
});
ok("the five fish shapes are unchanged (no eye override)", ["torpedo", "deep", "bass", "long", "flat"].every(k => T.TANK_SHAPES[k] && !T.TANK_SHAPES[k].eye));
ok("every look uses a shape that exists", T.TANK_LOOKS.every(l => T.TANK_SHAPES[l.shape]));
ok("eyes, gill and legs are read from the shape", /S\.eyes \|\| \[S\.eye \|\| \[102, 27\]\]/.test(tankSrc) && /S\.gill !== false/.test(tankSrc) && /if \(S\.extra\)/.test(tankSrc));

// every Seasons species and every Learn card now has its own look
const S = new Function(seaSrc.match(/const SEASON_GROUPS = .*;/)[0] + "\n" + seaSrc.match(/const SEASONS = \[[\s\S]*?\n  \];/)[0] + "; return SEASONS;")();
const none = S.filter(f => !look(f.name)).map(f => f.name);
ok("every Seasons species has its own look (" + none.join(", ") + ")", none.length === 0);
const cards = JSON.parse(read("data/learn/fish.json")).fish;
const none2 = cards.filter(c => !look(c.name)).map(c => c.name);
ok("every Learn card has its own look (" + none2.join(", ") + ")", none2.length === 0);

// the new fish colours must not steal names that already had a look
const old = tankSrc.match(/const TANK_LOOKS = \[[\s\S]*?\n  \];/)[0];
const stripped = new Function(old.replace(/\/\/ Porgies[^\n]*\n(\s*\{ m: [^\n]*\n){10}/, "") + "; return TANK_LOOKS;")();
const same = S.map(f => f.name).concat(cards.map(c => c.name)).filter(n => { const a = stripped.find(l => l.m.test(n.toLowerCase())), b = look(n); return a && (a.body !== b.body || a.shape !== b.shape); });
ok("the 10 new rules were found and stripped for the comparison", stripped.length === T.TANK_LOOKS.length - 10);
ok("the new colour rules only touch porgy, grunt, whiting/kingfish, toadfish, walleye, scamp, rock hind (changed: " + same.join(", ") + ")", same.every(n => !/king mackerel/i.test(n) && /porgy|grunt|whiting|toadfish|walleye|scamp|rock hind|jolthead/i.test(n)));

console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
