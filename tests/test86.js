// Fish rank shown in tank info, feed text and leaderboard (photo rule + lookup of other people's photos)
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/../js/15-fish-rank.js", "utf8");
const wsrc = fs.readFileSync(__dirname + "/../js/07-measure-fishid.js", "utf8");
const ref = wsrc.match(/const WEIGHT_REF = \[[\s\S]*?\n  \];/)[0], wr = wsrc.match(/function weightRef[\s\S]*?\n  }\n/)[0];
const { JSDOM } = require("jsdom"); const dom = new JSDOM("<div id=t></div>"); const document = dom.window.document;
let asked = [], redraws = 0;
const photosBySpot = { s1: [{ catch_id: "mine" }] };
const me = { id: "u1" };
const db = { from: () => ({ select: () => ({ in: async (col, ids) => { asked.push(ids.slice()); return { data: ids.includes("theirs") ? [{ catch_id: "theirs" }] : [], error: null }; } }) }) };
const renderSpots = () => redraws++;
const R = new Function("document", "photosBySpot", "me", "db", "renderSpots", `${ref} ${wr} ${src}; return { rankOf, rankTag, rankWarm, rankFill, rankBlock, fishRank, rankPhoto };`)(document, photosBySpot, me, db, renderSpots);
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
(async () => {
  const mine = { id: "mine", spot_id: "s1", species: "Snook", length_in: 30, created_by: "u1" };
  ok("my photographed catch ranks", !!R.rankOf(mine) && /💙|💜/.test(R.rankTag(mine)));
  const theirs = { id: "theirs", spot_id: "s9", species: "Snook", length_in: 30, created_by: "u2" };
  ok("other catch unknown at first", R.rankOf(theirs) === null);
  await new Promise(r => setTimeout(r, 450));
  ok("lookup asked once", asked.length === 1 && asked[0].includes("theirs"));
  ok("then it ranks and the screens redraw", R.rankOf(theirs) !== null && redraws >= 1);
  const nop = { id: "nop", spot_id: "s9", species: "Snook", length_in: 30, created_by: "u1" };
  const box = document.getElementById("t");
  R.rankFill(box, nop); await new Promise(r => setTimeout(r, 50));
  ok("own catch without photo gets the add-a-photo hint", /Add a photo/.test(box.textContent));
  const box2 = document.createElement("div"); R.rankFill(box2, mine);
  ok("rank card shows tier, Power and 3 stats", /Power \d+/.test(box2.textContent) && /Strength \d+/.test(box2.textContent) && /Stamina \d+/.test(box2.textContent));
  process.exit(bad ? 1 : 0);
})();
