// test198: 📚 Learn data check: every fish a bait card names is a fish card, every rig line on a fish card that names a rig points to a rig card,
// every rig's knot is a knot card, no match word belongs to two fish cards, and every source link is https.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const J = n => JSON.parse(fs.readFileSync(path.join(root, "data/learn/" + n + ".json"), "utf8"));
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const fish = J("fish").fish, bait = J("bait"), rigs = J("rigs").rigs, knots = J("knots").knots;
const fishNames = new Set(fish.map(f => f.name));

const missing = [];
bait.bait.forEach(b => (b.fish || []).forEach(n => { if (!fishNames.has(n)) missing.push(b.name + " → " + n); }));
ok(!missing.length, "every fish a bait card names has a fish card" + (missing.length ? ": " + missing.join(", ") : ""));

// rig lines: a line that names a rig (by its name, e.g. "Texas rig") must be found by that rig's find words, as the card links it
const rigFor = t => rigs.find(r => (r.find || []).some(w => String(t).toLowerCase().includes(String(w).toLowerCase()))) || null;
const lost = [];
fish.forEach(f => [].concat(f.rigs || [], (f.general && f.general.rigs) || []).forEach(line => {
  const named = rigs.find(r => line.toLowerCase().includes(r.name.toLowerCase()));
  if (named && rigFor(line) !== named) lost.push(f.name + ": " + line);
}));
ok(!lost.length, "every rig named on a fish card links to that rig card" + (lost.length ? ": " + lost.join(" | ") : ""));

const knotNames = new Set(knots.map(k => k.name));
ok(rigs.every(r => knotNames.has(r.knot)), "every rig's knot has a knot card");

const owner = {}, shared = [];
fish.forEach(f => f.match.forEach(w => { w = w.toLowerCase(); if (owner[w] && owner[w] !== f.name) shared.push(w + " (" + owner[w] + ", " + f.name + ")"); owner[w] = f.name; }));
ok(!shared.length, "no match word belongs to two fish cards" + (shared.length ? ": " + shared.join(", ") : ""));
ok(!["catfish", "bass", "gar", "trout"].some(w => owner[w] && !["Channel catfish", "Largemouth bass", "Spotted seatrout"].includes(owner[w])), "the short words catfish / bass / trout stay with their original cards; 'gar' alone is not used by a new card");

const urls = [].concat(fish.filter(f => f.source).map(f => f.source.url), Object.values(bait.sources).map(s => s.url));
ok(urls.every(u => /^https:\/\//.test(u)), "every fish and bait source link is https (" + urls.length + " links)");
ok(fish.filter(f => f.source).every(f => /myfwc\.com|fisheries\.noaa\.gov|dnr\.state\.mn\.us|nas\.er\.usgs\.gov|tpwd\.texas\.gov/.test(f.source.url)), "every fish source is an agency site (FWC, NOAA, MN DNR, USGS, TPWD)");
ok(!/recreational\/how-to-fish/.test(JSON.stringify(bait)), "bait card source uses FWC's current Saltwater Fishing Tips address");
console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
