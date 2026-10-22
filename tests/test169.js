// test169: Gulf region (Texas rules setup/95, Louisiana rules setup/96, Gulf Seasons cards) (US plan step 4)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const t10 = read("js/10-tools-safety.js"), s31 = read("js/31-regional-rules.js"), s05 = read("js/05-seasons-records.js");
const cut = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b));
const sql = read("setup/95-gulf-rules.sql");

const row = (species, match, regions, o) => Object.assign({ species, match, regions, min_in: null, max_in: null, measure: "total", one_over: false, bag: null, release_only: false, closed: null, open_only: null, note: null, verified_on: new Date().toISOString().slice(0, 10), active: true }, o || {});
const ROWS = [
  row("Redfish (red drum)", ["redfish", "red drum"], null, { min_in: 18, max_in: 27, bag: "2 per boat" }),
  row("Red drum", ["red drum", "redfish"], ["TX"], { min_in: 20, max_in: 28, bag: "3 per person" }),
  row("Flounder", ["flounder"], ["TX"], { min_in: 15, bag: "5 per person", closed: [["11-01", "12-14"]] }),
  row("Tarpon", ["tarpon"], ["TX"], { min_in: 85, bag: "1 per person" }),
  row("Red drum", ["red drum", "redfish"], ["LA"], { min_in: 18, max_in: 27, bag: "4 per person" }),
  row("Southern flounder", ["flounder"], ["LA"], { bag: "10 per person", closed: [["10-15", "11-30"]] }),
  row("Channel & blue catfish", ["channel catfish", "blue catfish", "catfish"], ["TX"], { bag: "25 per person" }),
  row("Flathead catfish", ["flathead catfish", "flathead"], ["TX"], { min_in: 18, bag: "5 per person" })
];
const code = [
  "const STATE_NAMES = { TX: 'Texas', LA: 'Louisiana', GA: 'Georgia' };",
  "const me = {}, db = { from: () => ({ select: () => ({ eq: async () => ({ data: ROWS }) }) }) }; const renderSeasons = null;",
  "let CURX = null; const rulesInfo = () => CURX;",
  read("js/54-state-agencies.js"),
  cut(t10, "  let fishRules = [];", "  // Admin: edit the rules table"),
  cut(s31, "  // Seasons cards: closed dates", "  // The chips under the month"),
  cut(s05, "  // US plan step 4: the Seasons list", "  const mmdd"),
  "const SEASONS = ['FL'], SE_STATES = ['GA'], SEASONS_SE = ['SE'], GULF_STATES = ['LA', 'TX'], SEASONS_GULF = ['GULF'], MIDATL_STATES = ['VA', 'MD', 'DE', 'NJ', 'PA', 'DC'], SEASONS_MIDATL = ['MIDATL'], NE_STATES = ['NY', 'CT', 'RI', 'MA', 'NH', 'VT', 'ME'], SEASONS_NE = ['NE'], GL_STATES = ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO'], SEASONS_GL = ['GL'], PLAINS_STATES = ['KS', 'NE', 'SD', 'ND', 'OK', 'AR', 'KY', 'TN', 'WV'], SEASONS_PLAINS = ['PLAINS'], MW_STATES = ['MT', 'ID', 'WY', 'CO', 'UT', 'NV', 'AZ', 'NM'], SEASONS_MW = ['MW'];",
  "return { loadRules, keeperCheck, ruleFor, seasonView, seasonList, setInfo: i => { CURX = i; } };"
].join("\n");
const S = new Function("ROWS", code)(ROWS);
const TX = { tags: ["gulf"], label: "Texas", outside: true, state: "TX" }, LA = { tags: ["gulf"], label: "Louisiana", outside: true, state: "LA" };
const FL = { tags: ["atlantic"], label: "Atlantic coast (Southeast Florida)" };
const day = s => new Date(s + "T12:00:00");

(async () => {
  await S.loadRules();
  // Texas rules
  let r = S.keeperCheck("Redfish", 24, day("2026-10-21"), TX);
  ok("Texas redfish 24″ → keeper with Texas rule and Texas Parks & Wildlife", r.level === "ok" && /Rule for Texas: 20″–28″/.test(r.text) && /Texas Parks & Wildlife/.test(r.text) && !/FWC|Florida/.test(r.text));
  ok("Texas redfish 30″ over the slot, 18″ under", S.keeperCheck("Redfish", 30, day("2026-10-21"), TX).level === "bad" && S.keeperCheck("Redfish", 18, day("2026-10-21"), TX).level === "bad");
  ok("Texas flounder closed Nov 20, open Oct 21", S.keeperCheck("Flounder", 16, day("2026-11-20"), TX).level === "bad" && S.keeperCheck("Flounder", 16, day("2026-10-21"), TX).level === "ok");
  ok("Texas tarpon 60″ must be released (under 85″)", S.keeperCheck("Tarpon", 60, day("2026-10-21"), TX).level === "bad");
  ok("flathead uses the flathead row, not the generic catfish row", /18″/.test(S.keeperCheck("Flathead catfish", 20, day("2026-10-21"), TX).text) && /25 per person/.test(S.keeperCheck("Blue catfish", 20, day("2026-10-21"), TX).text));
  // Louisiana rules (from the 2026 LDWF handbook)
  const la = S.keeperCheck("Redfish", 24, day("2026-10-21"), LA);
  ok("Louisiana redfish 24″ → keeper under Louisiana rule", la.level === "ok" && /Rule for Louisiana: 18″–27″/.test(la.text) && /Louisiana Wildlife & Fisheries/.test(la.text) && !/FWC|Texas/.test(la.text));
  ok("Louisiana flounder closed Oct 15 – Nov 30, open Oct 1", S.keeperCheck("Flounder", 16, day("2026-11-05"), LA).level === "bad" && S.keeperCheck("Flounder", 16, day("2026-10-01"), LA).level === "ok");
  const gap = S.keeperCheck("Tarpon", 40, day("2026-10-21"), LA);
  ok("Louisiana fish with no row (tarpon) → We don't have a Louisiana rule for this fish yet + buttons", gap.level === "info" && /We don't have a Louisiana rule for this fish yet/.test(gap.text) && gap.gate.links.length === 2);
  ok("Texas rows are not used in Louisiana", !/Texas/.test(S.keeperCheck("Flounder", 16, day("2026-10-21"), LA).text));
  // Florida unchanged
  const fl = S.keeperCheck("Redfish", 20, day("2026-10-21"), FL);
  ok("Florida redfish still the Florida row with FWC", /FWC/.test(fl.text) && !/Texas/.test(fl.text) && S.ruleFor("tarpon", FL) === null);
  // Seasons
  S.setInfo(TX); ok("Texas → Gulf cards", S.seasonList()[0] === "GULF");
  S.setInfo(LA); ok("Louisiana → Gulf cards", S.seasonList()[0] === "GULF");
  S.setInfo({ outside: true, state: "GA" }); ok("Georgia → Southeast cards", S.seasonList()[0] === "SE");
  S.setInfo({ outside: true, state: "OR" }); ok("Oregon → Florida cards", S.seasonList()[0] === "FL");
  S.setInfo(FL); ok("Florida → Florida cards", S.seasonList()[0] === "FL");
  S.setInfo(TX);
  ok("Texas flounder card carries the Nov 1 – Dec 14 closure", JSON.stringify(S.seasonView({ name: "Flounder", match: ["flounder"] }).closed) === '[["11-01","12-14"]]');
  S.setInfo(LA);
  ok("Louisiana flounder card carries Oct 15 – Nov 30", JSON.stringify(S.seasonView({ name: "Flounder", match: ["flounder"] }).closed) === '[["10-15","11-30"]]');

  // the cards
  const g = new Function(read("js/55-southeast-seasons.js") + "; return { GULF_STATES, SEASONS_GULF };")();
  const names = g.SEASONS_GULF.map(f => f.name);
  ok("Gulf states are LA and TX", g.GULF_STATES.join() === "LA,TX");
  ok("every card complete", g.SEASONS_GULF.every(f => f.name && ["inshore", "beach", "offshore", "fresh"].includes(f.group) && f.match.length && [f.shore, f.boat].every(a => a.length === 12 && a.every(n => n >= 0 && n <= 2)) && f.temp && f.temp.low < f.temp.high && f.temp.cold < f.temp.low && f.tip));
  ok("no repeated names", new Set(names).size === names.length);
  ["Redfish (red drum)", "Spotted seatrout (speckled trout)", "Flounder", "Black drum", "Sheepshead", "Tarpon", "Kingfish (king mackerel)", "Largemouth bass", "Black & white crappie", "Channel catfish"].forEach(n => ok("has the " + n + " card", names.includes(n)));
  ok("spawn windows are real months", g.SEASONS_GULF.every(f => !f.spawn || f.spawn.m.every(m => m >= 1 && m <= 12)));

  // the SQL file
  const tx = sql.match(/array\['TX'\]/g) || [];
  ok("12 Texas rows, none for Louisiana in setup/95", tx.length === 12 && !/array\['LA'\]/.test(sql));
  const sqlLa = read("setup/96-louisiana-rules.sql"), code96 = sqlLa.replace(/--.*$/gm, "");
  ok("11 Louisiana rows, dated and linked, none for sheepshead or tarpon", (sqlLa.match(/array\['LA'\]/g) || []).length === 11 && (sqlLa.match(/'2026-10-21', true\)/g) || []).length === 11 && !/sheepshead|tarpon/i.test(code96) && !/\b(delete|truncate|drop)\b/i.test(code96));
  ok("every row dated 2026-10-21 and linked to tpwd.texas.gov", (sql.match(/'https:\/\/tpwd\.texas\.gov[^']+', '2026-10-21', true\)/g) || []).length === 12);
  ok("no delete / truncate / drop in the SQL", !/\b(delete|truncate|drop)\b/i.test(sql.replace(/--.*$/gm, "")));
  ok("setup/94 already allows the TX and LA codes", /'TX'/.test(read("setup/94-southeast-rules.sql")) && /'LA'/.test(read("setup/94-southeast-rules.sql")));

  console.log(bad ? `test169 FAILED (${bad})` : "test169 OK");
  process.exit(bad ? 1 : 0);
})();
