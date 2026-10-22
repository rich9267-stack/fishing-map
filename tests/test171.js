// test171: Mid-Atlantic (VA, MD, DE, NJ, PA, DC): state rows, keeper check, closed dates, Seasons cards, SQL file (US plan step 4)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const t10 = read("js/10-tools-safety.js"), s31 = read("js/31-regional-rules.js"), s05 = read("js/05-seasons-records.js");
const cut = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b));
const sql = read("setup/98-midatlantic-rules.sql");

// Parse the real SQL rows into fish_rules-shaped objects, so the test uses exactly what the database gets
function parseRows(text) {
  const body = text.replace(/--.*$/gm, "").split("insert into fish_rules")[1];
  const rows = [];
  const re = /\(\s*'((?:[^']|'')*)',\s*array\[([^\]]*)\],\s*array\['([A-Z]{2})'\],\s*([\d.]+|null),\s*([\d.]+|null),\s*'(total|fork)',\s*(true|false),\s*(null|'(?:[^']|'')*'),\s*(true|false),\s*(null|'[^']*'::jsonb),\s*(null|'[^']*'::jsonb),/g;
  let m;
  while ((m = re.exec(body))) {
    const q = s => s === "null" ? null : s.slice(1, -1).replace(/''/g, "'");
    rows.push({ species: m[1].replace(/''/g, "'"), match: m[2].split(",").map(x => x.trim().replace(/^'|'$/g, "")), regions: [m[3]],
      min_in: m[4] === "null" ? null : +m[4], max_in: m[5] === "null" ? null : +m[5], measure: m[6], one_over: m[7] === "true", bag: q(m[8]),
      release_only: m[9] === "true", closed: m[10] === "null" ? null : JSON.parse(m[10].replace(/::jsonb$/, "").slice(1, -1)),
      open_only: m[11] === "null" ? null : JSON.parse(m[11].replace(/::jsonb$/, "").slice(1, -1)), note: null, verified_on: "2026-10-21", active: true });
  }
  return rows;
}
const ROWS = parseRows(sql).concat([
  { species: "Redfish (red drum)", match: ["redfish", "red drum"], regions: null, min_in: 18, max_in: 27, measure: "total", one_over: false, bag: "2 per boat", release_only: false, closed: null, open_only: null, note: null, verified_on: new Date().toISOString().slice(0, 10), active: true }
]);
const code = [
  "const STATE_NAMES = { VA: 'Virginia', MD: 'Maryland', DE: 'Delaware', NJ: 'New Jersey', PA: 'Pennsylvania', DC: 'Washington, D.C.', MT: 'Montana' };",
  "const me = {}, db = { from: () => ({ select: () => ({ eq: async () => ({ data: ROWS }) }) }) }; const renderSeasons = null;",
  "let CURX = null; const rulesInfo = () => CURX;",
  read("js/54-state-agencies.js"),
  cut(t10, "  let fishRules = [];", "  // Admin: edit the rules table"),
  cut(s31, "  // Seasons cards: closed dates", "  // The chips under the month"),
  cut(s05, "  // US plan step 4: the Seasons list", "  const mmdd"),
  "const SEASONS = ['FL'], SE_STATES = ['GA'], SEASONS_SE = ['SE'], GULF_STATES = ['LA', 'TX'], SEASONS_GULF = ['GULF'], MIDATL_STATES = ['VA','MD','DE','NJ','PA','DC'], SEASONS_MIDATL = ['MIDATL'], NE_STATES = ['NY', 'CT', 'RI', 'MA', 'NH', 'VT', 'ME'], SEASONS_NE = ['NE'], GL_STATES = ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO'], SEASONS_GL = ['GL'], PLAINS_STATES = ['KS', 'NE', 'SD', 'ND', 'OK', 'AR', 'KY', 'TN', 'WV'], SEASONS_PLAINS = ['PLAINS'];",
  "return { loadRules, keeperCheck, ruleFor, seasonView, seasonList, get stateRules() { return stateRules; }, get fishRules() { return fishRules; }, setInfo: i => { CURX = i; } };"
].join("\n");
const S = new Function("ROWS", code)(ROWS);
const inf = st => ({ tags: ["atlantic"], label: st, outside: true, state: st });
const FL = { tags: ["atlantic"], label: "Atlantic coast (Southeast Florida)" };
const day = s => new Date(s + "T12:00:00");
const chk = (st, sp, len, d) => S.keeperCheck(sp, len, day(d || "2026-10-21"), inf(st));

(async () => {
  await S.loadRules();
  ok("the SQL parses into 59 rows: VA 14, MD 13, DE 12, NJ 12, PA 6, DC 2", ROWS.length === 60 && ["VA", "MD", "DE", "NJ", "PA", "DC"].every((c, i) => ROWS.filter(r => r.regions && r.regions[0] === c).length === [14, 13, 12, 12, 6, 2][i]));
  ok("state rows are kept apart from Florida's", S.stateRules.length === 59 && S.fishRules.length === 1);

  // Florida untouched
  const fl = S.keeperCheck("Redfish", 20, day("2026-10-21"), FL);
  ok("Florida redfish: Florida row, FWC, no mid-Atlantic words", /FWC/.test(fl.text) && !/Virginia|Maryland|Delaware|Jersey|Pennsylvania/.test(fl.text));

  // Virginia
  let r = chk("VA", "Red drum", 22);
  ok("Virginia red drum 22″ → keeper, Virginia rule and Virginia agency", r.level === "ok" && /Rule for Virginia: 18″–26″/.test(r.text) && /Virginia DWR/.test(r.text) && !/FWC|Florida/.test(r.text));
  ok("Virginia red drum 28″ → over the slot", chk("VA", "Red drum", 28).level === "bad");
  ok("Virginia spotted seatrout closed in May, open in October", chk("VA", "Spotted seatrout", 16, "2026-05-10").level === "bad" && chk("VA", "Spotted seatrout", 16, "2026-10-10").level === "ok");
  ok("Virginia cobia: open Jul 1, closed Oct 1 and Mar 1", chk("VA", "Cobia", 45, "2026-07-01").level === "ok" && chk("VA", "Cobia", 45, "2026-10-01").level === "bad" && chk("VA", "Cobia", 45, "2026-03-01").level === "bad");
  ok("Virginia fluke uses the stricter 17.5″ all year", chk("VA", "Summer flounder", 17, "2026-07-01").level === "bad" && chk("VA", "Summer flounder", 18, "2026-07-01").level === "ok");
  ok("Virginia tautog closed Jun 1", chk("VA", "Tautog", 18, "2026-06-01").level === "bad");
  ok("Virginia flathead catfish uses the catfish row (20 per day)", /20 per day/.test(chk("VA", "Flathead catfish", 30).text));
  ok("Virginia 'speckled trout' is the seatrout row, never the trout row", /14″ minimum|14″/.test(chk("VA", "Speckled trout", 16, "2026-10-10").text) && !/6 per day/.test(chk("VA", "Speckled trout", 16, "2026-10-10").text));

  // Maryland
  ok("Maryland black sea bass: closed in March, open in October (12.5″)", chk("MD", "Black sea bass", 13, "2026-03-10").level === "bad" && chk("MD", "Black sea bass", 13, "2026-10-10").level === "ok" && chk("MD", "Black sea bass", 12, "2026-10-10").level === "bad");
  ok("Maryland tautog closed Jun 1 (catch and release)", chk("MD", "Tautog", 18, "2026-06-01").level === "bad");
  ok("Maryland largemouth bass closed in April (keeping), open July", chk("MD", "Largemouth bass", 14, "2026-04-10").level === "bad" && chk("MD", "Largemouth bass", 14, "2026-07-10").level === "ok");
  ok("Maryland striped bass has no single number (notes carry the rules)", /Rule for Maryland/.test(chk("MD", "Striped bass", 25).text));

  // Delaware / New Jersey / Pennsylvania / D.C.
  ok("Delaware red drum 20–27″", chk("DE", "Red drum", 22).level === "ok" && chk("DE", "Red drum", 19).level === "bad" && chk("DE", "Red drum", 29).level === "bad");
  ok("Delaware tautog closed in June, open in November", chk("DE", "Tautog", 17, "2026-06-15").level === "bad" && chk("DE", "Tautog", 17, "2026-11-15").level === "ok");
  ok("New Jersey fluke: open Aug 1 (18″), closed Nov 1", chk("NJ", "Fluke", 19, "2026-08-01").level === "ok" && chk("NJ", "Fluke", 17, "2026-08-01").level === "bad" && chk("NJ", "Fluke", 19, "2026-11-01").level === "bad");
  ok("New Jersey striped bass 28–31″", chk("NJ", "Striped bass", 30).level === "ok" && chk("NJ", "Striped bass", 33).level === "bad");
  ok("New Jersey tautog closed Jun 1, open Aug 15", chk("NJ", "Tautog", 16, "2026-06-01").level === "bad" && chk("NJ", "Tautog", 16, "2026-08-15").level === "ok");
  ok("New Jersey walleye closed in March", chk("NJ", "Walleye", 20, "2026-03-15").level === "bad" && chk("NJ", "Walleye", 20, "2026-06-15").level === "ok");
  ok("Pennsylvania bass: no harvest Apr 11 – Jun 12, 15″ in fall", chk("PA", "Largemouth bass", 16, "2026-05-01").level === "bad" && chk("PA", "Largemouth bass", 16, "2026-10-20").level === "ok" && chk("PA", "Largemouth bass", 13, "2026-10-20").level === "bad");
  ok("Pennsylvania walleye closed Apr 1, open Jun 1", chk("PA", "Walleye", 18, "2026-04-01").level === "bad" && chk("PA", "Walleye", 18, "2026-06-01").level === "ok");
  ok("D.C. largemouth bass 15″ minimum; channel catfish 12″", chk("DC", "Largemouth bass", 16).level === "ok" && chk("DC", "Largemouth bass", 13).level === "bad" && chk("DC", "Channel catfish", 13).level === "ok");

  // honest gaps
  const gap = chk("DC", "Striped bass", 25);
  ok("D.C. striped bass (no row) → We don't have a Washington, D.C. rule for this fish yet + buttons", gap.level === "info" && /We don't have a Washington, D\.C\. rule for this fish yet/.test(gap.text) && gap.gate.links.length === 2);
  ok("Delaware walleye (no row) → gap message", /We don't have a Delaware rule for this fish yet/.test(chk("DE", "Walleye", 20).text));
  ok("New Jersey spotted seatrout (no row) → gap message", /We don't have a New Jersey rule for this fish yet/.test(chk("NJ", "Spotted seatrout", 16).text));
  ok("Montana still says no rules yet", /We don't have Montana rules yet/.test(chk("MT", "Walleye", 20).text));
  ok("Virginia rows are not used in Maryland", !/Virginia/.test(chk("MD", "Cobia", 45).text));

  // Seasons cards
  S.setInfo(inf("VA"));
  const v = S.seasonView({ name: "Spotted seatrout", match: ["seatrout", "speckled trout", "spotted trout"] });
  ok("Virginia seatrout card shows the rule, the date and Virginia DWR, with the closed window", /Virginia: 14″/.test(v.rule) && /Virginia DWR/.test(v.rule) && JSON.stringify(v.closed) === '[["04-01","06-30"]]');
  ok("a Virginia card with no row says We don't have…", /We don't have a Virginia rule for this fish yet/.test(S.seasonView({ name: "Tarpon", match: ["tarpon"] }).rule));
  ["VA", "MD", "DE", "NJ", "PA", "DC"].forEach(c => { S.setInfo(inf(c)); ok(c + " → the Mid-Atlantic cards", S.seasonList()[0] === "MIDATL"); });
  S.setInfo(inf("GA")); ok("Georgia → the Southeast cards (unchanged)", S.seasonList()[0] === "SE");
  S.setInfo(inf("TX")); ok("Texas → the Gulf cards (unchanged)", S.seasonList()[0] === "GULF");
  S.setInfo(inf("MT")); ok("Montana → the Florida cards", S.seasonList()[0] === "FL");
  S.setInfo(FL); ok("Florida → the Florida cards", S.seasonList()[0] === "FL");

  // the cards
  const g = new Function(read("js/55-southeast-seasons.js") + "; return { MIDATL_STATES, SEASONS_MIDATL };")();
  const names = g.SEASONS_MIDATL.map(f => f.name);
  ok("six Mid-Atlantic states", g.MIDATL_STATES.join() === "VA,MD,DE,NJ,PA,DC");
  ok("every card complete: name, group, words, 12 shore + 12 boat ratings 0–2, temp, tip", g.SEASONS_MIDATL.every(f => f.name && ["inshore", "beach", "offshore", "fresh"].includes(f.group) && f.match.length && [f.shore, f.boat].every(a => a.length === 12 && a.every(n => n >= 0 && n <= 2)) && f.temp && f.temp.low < f.temp.high && f.temp.cold < f.temp.low && f.tip));
  ok("no repeated names", new Set(names).size === names.length);
  ["Striped bass (rockfish)", "Summer flounder (fluke)", "Black sea bass", "Tautog (blackfish)", "Bluefish", "Largemouth bass", "Smallmouth bass", "Walleye", "Black & white crappie", "Trout"].forEach(n => ok("has the " + n + " card", names.includes(n)));
  ok("spawn windows are real months", g.SEASONS_MIDATL.every(f => !f.spawn || f.spawn.m.every(m => m >= 1 && m <= 12)));
  ok("no card uses a short word that would match other fish (\"spot\", \"trout\" alone)", g.SEASONS_MIDATL.every(f => f.match.every(w => w !== "spot" && w !== "trout")));

  // the SQL file
  const code98 = sql.replace(/--.*$/gm, "");
  ok("every row dated 2026-10-21 and linked to an https source", (sql.match(/'2026-10-21', true\)/g) || []).length === 59 && (sql.match(/'https:\/\/[^']+', '2026-10-21'/g) || []).length === 59);
  ok("no delete / truncate / drop / update in the SQL", !/\b(delete|truncate|drop|update)\b/i.test(code98));
  ok("setup/94 already allows these state codes", ["VA", "MD", "DE", "NJ", "PA", "DC"].every(c => read("setup/94-southeast-rules.sql").includes("'" + c + "'")));
  ok("states and agencies already in js/54", ["VA", "MD", "DE", "NJ", "PA", "DC"].every(c => new RegExp("\\b" + c + ": \\[").test(read("js/54-state-agencies.js"))));

  console.log(bad ? `test171 FAILED (${bad})` : "test171 OK");
  process.exit(bad ? 1 : 0);
})();
