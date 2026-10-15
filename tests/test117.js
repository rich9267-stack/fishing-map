// test117: Gulf + Keys species and sharks (Gulf expansion step 4, setup/61).
// 1) the three rank tables stay identical: FISH_RANK_TABLE (js/15), WEIGHT_REF (js/07) and the database rows in setup/44 + 45 + 61
// 2) every new fish resolves to its own row / Seasons card / tank picture, and look-alike names do not hijack the old fish
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
const rankSrc = read("js/15-fish-rank.js"), wsrc = read("js/07-measure-fishid.js"), seaSrc = read("js/05-seasons-records.js");
const tankSrc = read("js/14-tank.js"), catchSrc = read("js/06-catching.js");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };

const ref = wsrc.match(/const WEIGHT_REF = \[[\s\S]*?\n  \];/)[0];
const wr = wsrc.match(/function weightRef[\s\S]*?\n  }\n/)[0];
const R = new Function("photosBySpot", `${ref} ${wr} ${rankSrc}; return { fishRank, rankEntry, FISH_RANK_TABLE, WEIGHT_REF };`)({});
const T = R.FISH_RANK_TABLE, W = R.WEIGHT_REF;

// ---- 1. the three tables agree ----
ok(`${T.length} rank rows and ${W.length} weight rows`, T.length === W.length);
ok("same words in the same order (js/15 vs js/07)", T.every((r, i) => JSON.stringify(r[0]) === JSON.stringify(W[i][0])));
// the database rows, in the order the migrations ran
const rows = [];
["setup/44-fish-rank.sql", "setup/45-catfish.sql", "setup/61-gulf-species.sql"].forEach(f => {
  const s = read(f);
  const re = /\(array\[([^\]]*)\],\s*([\d.]+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+),\s*([\d.]+)\)/g;
  let m;
  while ((m = re.exec(s))) rows.push({ words: m[1].split(",").map(w => w.trim().replace(/^'|'$/g, "")), big: +m[2], rar: +m[3], p: +m[4], s: +m[5], st: +m[6], rl: +m[7], rw: +m[8] });
});
const hh = rows.find(r => r.words.join() === "hardhead,gafftopsail"); if (hh) hh.words = ["hardhead"];   // setup/45 narrows this row
ok(`${rows.length} database rows in the setup files`, rows.length === T.length);
ok("database words, sizes, traits and weight references match the app tables", rows.every((r, i) =>
  JSON.stringify(r.words) === JSON.stringify(T[i][0]) && r.big === T[i][1] && r.rar === T[i][2] && r.p === T[i][3] && r.s === T[i][4] && r.st === T[i][5] &&
  r.rl === W[i][1] && r.rw === W[i][2]));

// ---- 2. names resolve to the right row ----
const row = sp => { const e = R.rankEntry(sp); return e ? e[0][0] : null; };
const want = {
  "Bonefish": "bonefish", "Cubera snapper": "cubera", "Blackfin tuna": "blackfin tuna", "Yellowfin tuna": "yellowfin tuna", "Skipjack tuna": "skipjack",
  "Bar jack": "bar jack", "Horse-eye jack": "horse-eye", "Sand seatrout": "sand seatrout", "Lionfish": "lionfish",
  "Blacktip shark": "blacktip", "Bull shark": "bull shark", "Bonnethead shark": "bonnethead", "Nurse shark": "nurse shark", "Lemon shark (released)": "lemon shark",
  "Shark (other)": "shark", "Hammerhead shark": "shark", "Tiger shark": "shark", "Spinner shark": "shark",
  // look-alikes: the old fish must keep their rows
  "Jack crevalle": "crevalle", "Almaco jack": "crevalle", "Greater amberjack": "amberjack", "Spotted seatrout": "seatrout", "Bull redfish": "redfish",
  "Yellowtail snapper": "yellowtail", "Red snapper": "red snapper", "Mangrove snapper": "mangrove", "Little tunny (bonito)": "little tunny", "Atlantic bonito": "little tunny"
};
Object.keys(want).forEach(k => ok(`"${k}" → ${want[k]}`, row(k) === want[k]));
["Yellowfin grouper", "Lemon sole", "Mystery fish"].forEach(k => ok(`"${k}" gets no rank`, row(k) === null));
// the named sharks outrank the generic shark row at the same size (a fresh 60" fish with a photo)
const pw = sp => { const r = R.fishRank({ species: sp, length_in: 60 }, true); return r && r.power; };
ok("a 60\" bull shark is ranked", pw("Bull shark") > 0 && pw("Nurse shark") > 0 && pw("Blacktip shark") > 0);
ok("96\" lemon shark (a big adult) is Epic", R.fishRank({ species: "Lemon shark", length_in: 96 }, true).tier === "Epic");
ok("a real 24 lb yellowfin has a length", R.fishRank({ species: "Yellowfin tuna", weight_lb: 24, weight_est: false }, true) !== null);

// ---- 3. Seasons cards ----
const seaSlice = seaSrc.match(/const SEASON_GROUPS = .*;/)[0] + "\n" + seaSrc.match(/const SEASONS = \[[\s\S]*?\n  \];/)[0];
const seasonFor = seaSrc.match(/function seasonFor[\s\S]*?\n  }\n/)[0];
const S = new Function(`${seaSlice} ${seasonFor}; return { SEASONS, SEASON_GROUPS, seasonFor };`)();
const NEW = ["Bonefish", "Bonnethead shark", "Bull shark", "Lemon shark", "Sand seatrout", "Blacktip shark", "Nurse shark", "Bar jack", "Horse-eye jack",
  "Cubera snapper", "Blackfin tuna", "Yellowfin tuna", "Lionfish"];
ok("Seasons names are unique", new Set(S.SEASONS.map(f => f.name)).size === S.SEASONS.length);
NEW.forEach(n => {
  const f = S.SEASONS.find(x => x.name === n);
  ok(`Seasons card: ${n}`, !!f && S.SEASON_GROUPS.some(g => g[0] === f.group) && f.shore.length === 12 && f.boat.length === 12 && !!f.rule && !!f.tip && !!f.temp);
});
const sf = sp => { const f = S.seasonFor(sp); return f ? f.name : null; };
const sfWant = { "Bar jack": "Bar jack", "Horse-eye jack": "Horse-eye jack", "Jack crevalle": "Jack crevalle", "Sand seatrout": "Sand seatrout", "Spotted seatrout": "Spotted seatrout",
  "Blacktip shark": "Blacktip shark", "Lemon shark (released)": "Lemon shark", "Cubera snapper": "Cubera snapper", "Yellowfin tuna": "Yellowfin tuna", "Blackfin tuna": "Blackfin tuna",
  "Greater amberjack": "Greater amberjack", "Mangrove snapper": "Mangrove snapper", "Red snapper": "Red snapper" };
Object.keys(sfWant).forEach(k => ok(`Seasons match "${k}" → ${sfWant[k]}`, sf(k) === sfWant[k]));
ok("only sand seatrout is a 'far' fish in this batch", NEW.filter(n => S.SEASONS.find(x => x.name === n).far).join() === "Sand seatrout");
const lem = S.SEASONS.find(f => f.name === "Lemon shark");
ok("lemon shark says it is protected", /prohibited/i.test(lem.rule));
["Blacktip shark", "Bull shark", "Bonnethead shark", "Nurse shark"].forEach(n => ok(`${n}: shore permit + circle hooks in the rule`, /shark permit/.test(S.SEASONS.find(f => f.name === n).rule) && /Circle hooks/.test(S.SEASONS.find(f => f.name === n).rule)));
ok("bull and nurse need 54\" fork length", ["Bull shark", "Nurse shark"].every(n => /54"/.test(S.SEASONS.find(f => f.name === n).rule)));
// collections (inshore / beach / offshore): every new fish except sand seatrout counts
const col = new Function("SEASONS", "SEASON_GROUPS", "seasonFor", tankSrc.match(/function tankCollection[\s\S]*?\n  }\n/)[0] + "; return tankCollection;")(S.SEASONS, S.SEASON_GROUPS, S.seasonFor)([]);
const inCol = n => col.some(g => g.missing.includes(n));
ok("new fish show up in Collections (12), sand seatrout does not", NEW.filter(inCol).length === 12 && !inCol("Sand seatrout"));

// ---- 4. tank pictures and the catch-form list ----
const looks = new Function(tankSrc.match(/const TANK_LOOKS = \[[\s\S]*?\n  \];/)[0] + "; return TANK_LOOKS;")();
const look = sp => looks.find(l => l.m.test(sp.toLowerCase()));
const key = l => l && l.m.source;
[["Lionfish", "lionfish"], ["Bonefish", "bonefish"], ["Yellowfin tuna", "yellowfin tuna"], ["Blackfin tuna", "blackfin tuna"], ["Cubera snapper", "cubera"], ["Bar jack", "bar jack"],
 ["Horse-eye jack", "horse-eye|horse eye"], ["Blacktip shark", "blacktip"], ["Bull shark", "bull shark"], ["Bonnethead shark", "bonnethead"], ["Nurse shark", "nurse shark"],
 ["Lemon shark (released)", "lemon shark"], ["Sand seatrout", "sand seatrout|sand trout|white trout"]
].forEach(([sp, src]) => ok(`tank picture for ${sp}`, key(look(sp)) === src));
ok("old fish keep their pictures (snapper, jack crevalle, spotted seatrout)", /snapper/.test(key(look("Red snapper"))) && /jack\|permit/.test(key(look("Jack crevalle"))) && /trout/.test(key(look("Spotted seatrout"))));
ok("a shark we have no picture for still gets the shark one", /shark/.test(key(look("Hammerhead shark"))));
const list = catchSrc.match(/const SPECIES_SUGGEST = \[([\s\S]*?)\n  \];/)[1];
["Bonefish", "Cubera snapper", "Blackfin tuna", "Yellowfin tuna", "Bar jack", "Horse-eye jack", "Sand seatrout", "Lionfish", "Blacktip shark", "Bull shark", "Bonnethead shark",
 "Nurse shark", "Lemon shark (released)", "Shark (other)"].forEach(n => ok(`catch form suggests "${n}"`, list.includes(`"${n}"`)));

console.log(bad ? `test117 FAILED (${bad})` : "test117 OK");
process.exit(bad ? 1 : 0);
