// Fish rank shown in tank info, feed text and leaderboard. The database (view catch_ranks) is the judge; the app's own copy of
// the rules is only used while waiting for it or offline, and only for catches it knows have a photo.
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/../js/15-fish-rank.js", "utf8");
const wsrc = fs.readFileSync(__dirname + "/../js/07-measure-fishid.js", "utf8");
const ref = wsrc.match(/const WEIGHT_REF = \[[\s\S]*?\n  \];/)[0], wr = wsrc.match(/function weightRef[\s\S]*?\n  }\n/)[0];
const { JSDOM } = require("jsdom"); const dom = new JSDOM("<div id=t></div>"); const document = dom.window.document;
let asked = [], tables = [], redraws = 0, offline = false;
const photosBySpot = { s1: [{ catch_id: "mine" }, { catch_id: "hidden" }, { catch_id: "off" }] };
const me = { id: "u1" };
// what the database says: "theirs" is Epic 777 (deliberately different from the app's own answer, to prove the database wins);
// "mine" gets the normal answer; "hidden" (e.g. blurred for review or not allowed) gets no row.
const ROWS = { theirs: { catch_id: "theirs", species: "Snook", power: 777, tier: "Epic", strength: 70, speed: 71, stamina: 72, size_pct: 88 },
  mine: { catch_id: "mine", species: "Snook", power: 545, tier: "Rare", strength: 77, speed: 77, stamina: 66, size_pct: 88 } };
const db = { from: t => ({ select: () => ({ in: async (col, ids) => {
  tables.push(t); asked.push(ids.slice());
  if (offline) return { data: null, error: { message: "offline" } };
  return { data: ids.map(id => ROWS[id]).filter(Boolean), error: null };
} }) }) };
const renderSpots = () => redraws++;
const R = new Function("document", "photosBySpot", "me", "db", "renderSpots", `${ref} ${wr} ${src}; return { rankOf, rankTag, rankWarm, rankFill, rankBlock, fishRank, rankServer };`)(document, photosBySpot, me, db, renderSpots);
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const tick = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const mine = { id: "mine", spot_id: "s1", species: "Snook", length_in: 30, created_by: "u1" };
  ok("my photographed catch ranks right away (app's own copy)", !!R.rankOf(mine) && /💙|💜/.test(R.rankTag(mine)));
  const theirs = { id: "theirs", spot_id: "s9", species: "Snook", length_in: 30, created_by: "u2" };
  ok("other catch unknown at first", R.rankOf(theirs) === null);
  const hidden = { id: "hidden", spot_id: "s1", species: "Snook", length_in: 30, created_by: "u1" };
  ok("own photographed catch the database won't rank: app shows it until it hears back", R.rankOf(hidden) !== null);
  await tick(450);
  ok("one lookup, to catch_ranks, for all three", asked.length === 1 && tables[0] === "catch_ranks" && ["mine", "theirs", "hidden"].every(id => asked[0].includes(id)));
  const t = R.rankOf(theirs);
  ok("then the database's answer is shown (Epic 777) and screens redraw", t && t.power === 777 && t.tier === "Epic" && t.stats.stamina === 72 && t.size === 88 && redraws >= 1);
  ok("database says no rank → no rank", R.rankOf(hidden) === null);
  ok("no new lookups for answers we already have", (R.rankOf(mine), R.rankOf(theirs), await tick(400), asked.length === 1));
  theirs.length_in = 20;
  ok("length changed → app's own answer while it asks again", R.rankOf(theirs) === null);   // not mine, no known photo
  await tick(400);
  ok("…and it asked again about that catch only", asked.length === 2 && asked[1].length === 1 && asked[1][0] === "theirs");
  ok("blurred catch never ranks in the app either", R.fishRank({ species: "Snook", length_in: 30, review_state: "blurred" }, true) === null);
  offline = true;
  const off = { id: "off", spot_id: "s1", species: "Snook", length_in: 26, created_by: "u1" };
  R.rankOf(off); await tick(400);
  ok("offline: own photographed catch keeps the app's answer", R.rankOf(off) !== null);
  const n = asked.length; R.rankOf(off); await tick(400);
  ok("offline: doesn't keep re-asking", asked.length === n);
  offline = false;
  const nop = { id: "nop", spot_id: "s9", species: "Snook", length_in: 30, created_by: "u1" };
  const box = document.getElementById("t");
  R.rankFill(box, nop); await tick(50);
  ok("own catch without photo gets the add-a-photo hint", /Add a photo/.test(box.textContent));
  const box2 = document.createElement("div"); R.rankFill(box2, mine); await tick(50);
  ok("rank card shows tier, Power and 3 stats", /Power \d+/.test(box2.textContent) && /Strength \d+/.test(box2.textContent) && /Stamina \d+/.test(box2.textContent));
  const box3 = document.createElement("div"); R.rankFill(box3, hidden); await tick(50);
  ok("photographed catch the database won't rank: no card and no add-a-photo hint", box3.textContent === "");
  process.exit(bad ? 1 : 0);
})();
