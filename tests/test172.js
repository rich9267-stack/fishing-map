// test172: Northeast (NY, CT, VT, NH rows; MA, RI, ME honest gaps): state rows, keeper check, closed dates, Seasons cards, SQL file (US plan step 4)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const t10 = read("js/10-tools-safety.js"), s31 = read("js/31-regional-rules.js"), s05 = read("js/05-seasons-records.js");
const cut = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b));
const sql = read("setup/99-northeast-rules.sql");

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
  "const STATE_NAMES = { NY: 'New York', CT: 'Connecticut', RI: 'Rhode Island', MA: 'Massachusetts', NH: 'New Hampshire', VT: 'Vermont', ME: 'Maine', KS: 'Kansas' };",
  "const me = {}, db = { from: () => ({ select: () => ({ eq: async () => ({ data: ROWS }) }) }) }; const renderSeasons = null;",
  "let CURX = null; const rulesInfo = () => CURX;",
  read("js/54-state-agencies.js"),
  cut(t10, "  let fishRules = [];", "  // Admin: edit the rules table"),
  cut(s31, "  // Seasons cards: closed dates", "  // The chips under the month"),
  cut(s05, "  // US plan step 4: the Seasons list", "  const mmdd"),
  "const SEASONS = ['FL'], SE_STATES = ['GA'], SEASONS_SE = ['SE'], GULF_STATES = ['LA', 'TX'], SEASONS_GULF = ['GULF'], MIDATL_STATES = ['VA','MD','DE','NJ','PA','DC'], SEASONS_MIDATL = ['MIDATL'], NE_STATES = ['NY', 'CT', 'RI', 'MA', 'NH', 'VT', 'ME'], SEASONS_NE = ['NE'], GL_STATES = ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO'], SEASONS_GL = ['GL'];",
  "return { loadRules, keeperCheck, ruleFor, seasonView, seasonList, get stateRules() { return stateRules; }, get fishRules() { return fishRules; }, setInfo: i => { CURX = i; } };"
].join("\n");
const S = new Function("ROWS", code)(ROWS);
const inf = st => ({ tags: ["atlantic"], label: st, outside: true, state: st });
const FL = { tags: ["atlantic"], label: "Atlantic coast (Southeast Florida)" };
const day = s => new Date(s + "T12:00:00");
const chk = (st, sp, len, d) => S.keeperCheck(sp, len, day(d || "2026-10-21"), inf(st));

(async () => {
  await S.loadRules();
  ok("the SQL parses into 44 rows: NY 18, CT 17, VT 8, NH 1", ROWS.length === 45 && ["NY", "CT", "VT", "NH"].every((c, i) => ROWS.filter(r => r.regions && r.regions[0] === c).length === [18, 17, 8, 1][i]));
  ok("state rows are kept apart from Florida's", S.stateRules.length === 44 && S.fishRules.length === 1);

  // Florida untouched
  const fl = S.keeperCheck("Redfish", 20, day("2026-10-21"), FL);
  ok("Florida redfish: Florida row, FWC, no Northeast words", /FWC/.test(fl.text) && !/New York|Connecticut|Vermont|Hampshire|Massachusetts/.test(fl.text));

  // New York saltwater
  let r = chk("NY", "Striped bass", 29, "2026-10-21");
  ok("New York striped bass 29″ in October → keeper, New York rule and New York DEC", r.level === "ok" && /Rule for New York: 28″–31″/.test(r.text) && /New York DEC/.test(r.text) && !/FWC|Florida/.test(r.text));
  ok("New York striped bass 33″ is over the slot; closed in January", chk("NY", "Striped bass", 33).level === "bad" && chk("NY", "Striped bass", 29, "2026-01-10").level === "bad");
  ok("New York fluke: 19.5″ all season, closed in November and April", chk("NY", "Fluke", 19, "2026-06-01").level === "bad" && chk("NY", "Fluke", 20, "2026-06-01").level === "ok" && chk("NY", "Fluke", 20, "2026-11-01").level === "bad" && chk("NY", "Fluke", 20, "2026-04-20").level === "bad");
  ok("New York black sea bass: 16″, closed before May 16", chk("NY", "Black sea bass", 16.5, "2026-10-10").level === "ok" && chk("NY", "Black sea bass", 15, "2026-10-10").level === "bad" && chk("NY", "Black sea bass", 17, "2026-05-10").level === "bad" && chk("NY", "Black sea bass", 17, "2026-05-16").level === "ok");
  ok("New York scup 11″ in July, closed in March", chk("NY", "Scup", 11.5, "2026-07-01").level === "ok" && chk("NY", "Scup", 10, "2026-07-01").level === "bad" && chk("NY", "Scup", 12, "2026-03-01").level === "bad");
  ok("New York tautog: open Apr and Oct 15 – Dec 9 only (the stricter overlap)", chk("NY", "Tautog", 17, "2026-04-10").level === "ok" && chk("NY", "Tautog", 17, "2026-11-01").level === "ok" && chk("NY", "Tautog", 17, "2026-06-01").level === "bad" && chk("NY", "Tautog", 17, "2026-10-12").level === "bad" && chk("NY", "Tautog", 17, "2026-12-15").level === "bad");
  ok("New York winter flounder open Apr 15, closed Jul 1", chk("NY", "Winter flounder", 13, "2026-04-15").level === "ok" && chk("NY", "Winter flounder", 13, "2026-07-01").level === "bad");
  ok("New York 'flounder' alone is the fluke row, not winter flounder", /19\.5/.test(chk("NY", "Flounder", 20, "2026-07-01").text) || chk("NY", "Flounder", 20, "2026-07-01").level === "ok");
  ok("New York cod 23″ in October, closed in July", chk("NY", "Atlantic cod", 24, "2026-10-21").level === "ok" && chk("NY", "Atlantic cod", 24, "2026-07-01").level === "bad");

  // New York freshwater
  ok("New York bass: closed Dec 1 – Jun 14 (catch and release), 12″ in July", chk("NY", "Largemouth bass", 14, "2026-03-10").level === "bad" && chk("NY", "Largemouth bass", 14, "2026-07-01").level === "ok" && chk("NY", "Largemouth bass", 11, "2026-07-01").level === "bad" && chk("NY", "Smallmouth bass", 13, "2026-06-10").level === "bad");
  ok("New York walleye 15″ in June, closed Apr 1", chk("NY", "Walleye", 16, "2026-06-01").level === "ok" && chk("NY", "Walleye", 16, "2026-04-01").level === "bad" && chk("NY", "Walleye", 14, "2026-06-01").level === "bad");
  ok("New York pike 18″, pickerel 15″", chk("NY", "Northern pike", 20, "2026-06-01").level === "ok" && chk("NY", "Chain pickerel", 14, "2026-06-01").level === "bad" && chk("NY", "Chain pickerel", 16, "2026-06-01").level === "ok");
  ok("New York trout closed (keeping) in January, open in May", chk("NY", "Rainbow trout", 10, "2026-01-10").level === "bad" && chk("NY", "Rainbow trout", 10, "2026-05-10").level === "ok");
  ok("New York landlocked salmon 15″; crappie 10″", chk("NY", "Landlocked salmon", 16).level === "ok" && chk("NY", "Landlocked salmon", 14).level === "bad" && chk("NY", "Crappie", 9).level === "bad" && chk("NY", "Crappie", 11).level === "ok");

  // Connecticut
  ok("Connecticut striped bass slot 28 to under 31″", chk("CT", "Striped bass", 30.5).level === "ok" && chk("CT", "Striped bass", 31).level === "bad" && chk("CT", "Striped bass", 27).level === "bad" && /Connecticut DEEP/.test(chk("CT", "Striped bass", 30).text));
  ok("Connecticut black sea bass 15.5″, closed in December", chk("CT", "Black sea bass", 16, "2026-10-10").level === "ok" && chk("CT", "Black sea bass", 15, "2026-10-10").level === "bad" && chk("CT", "Black sea bass", 17, "2026-12-10").level === "bad");
  ok("Connecticut tautog: open Oct 10 – Nov 28, closed Jun 1 and Oct 5", chk("CT", "Tautog", 17, "2026-11-10").level === "ok" && chk("CT", "Tautog", 17, "2026-06-01").level === "bad" && chk("CT", "Tautog", 17, "2026-10-05").level === "bad" && chk("CT", "Tautog", 17, "2026-07-15").level === "ok");
  ok("Connecticut trout 9″ minimum, catch and release in March", chk("CT", "Brown trout", 10, "2026-10-21").level === "ok" && chk("CT", "Brown trout", 8, "2026-10-21").level === "bad" && chk("CT", "Brown trout", 10, "2026-03-20").level === "bad");
  ok("Connecticut pike 26″, walleye 18″", chk("CT", "Northern pike", 27).level === "ok" && chk("CT", "Northern pike", 24).level === "bad" && chk("CT", "Walleye", 17).level === "bad");
  ok("Connecticut perch has no size limit", chk("CT", "Yellow perch", 6).level === "ok");

  // Vermont / New Hampshire
  ok("Vermont bass 10″, closed in June before the 2nd Saturday", chk("VT", "Largemouth bass", 11, "2026-07-01").level === "ok" && chk("VT", "Largemouth bass", 9, "2026-07-01").level === "bad" && chk("VT", "Largemouth bass", 11, "2026-06-01").level === "bad");
  ok("Vermont walleye 18″, closed Apr 1", chk("VT", "Walleye", 19, "2026-06-01").level === "ok" && chk("VT", "Walleye", 19, "2026-04-01").level === "bad");
  ok("Vermont pike 20″, landlocked salmon 17″", chk("VT", "Northern pike", 21).level === "ok" && chk("VT", "Northern pike", 19).level === "bad" && chk("VT", "Landlocked salmon", 16, "2026-06-01").level === "bad");
  ok("Vermont trout closed in winter, open in June", chk("VT", "Brook trout", 8, "2026-12-10").level === "bad" && chk("VT", "Brook trout", 8, "2026-06-10").level === "ok");
  ok("New Hampshire haddock 17″, closed all March", chk("NH", "Haddock", 17.5, "2026-07-01").level === "ok" && chk("NH", "Haddock", 16, "2026-07-01").level === "bad" && chk("NH", "Haddock", 18, "2026-03-15").level === "bad");

  // honest gaps: nothing could be read for these, so no rule is shown
  const gap = chk("MA", "Striped bass", 29);
  ok("Massachusetts striped bass (no rows at all) → We don't have Massachusetts rules yet + buttons", gap.level === "info" && /We don't have Massachusetts rules yet/.test(gap.text) && gap.gate.links.length === 2);
  ok("Rhode Island fluke (no rows) → gap message", /We don't have Rhode Island rules yet/.test(chk("RI", "Fluke", 20).text));
  ok("Maine striped bass (no rows) → gap message", /We don't have Maine rules yet/.test(chk("ME", "Striped bass", 29).text));
  ok("New Hampshire striped bass (no row) → gap message", /We don't have a New Hampshire rule for this fish yet/.test(chk("NH", "Striped bass", 29).text));
  ok("Vermont catfish (no row) → gap message", /We don't have a Vermont rule for this fish yet/.test(chk("VT", "Channel catfish", 20).text));
  ok("Kansas still says no rules yet", /We don't have Kansas rules yet/.test(chk("KS", "Walleye", 20).text));
  ok("New York rows are not used in Connecticut", !/New York/.test(chk("CT", "Walleye", 19).text));
  ok("Mid-Atlantic still its own (Virginia red drum uses a Virginia row only if loaded, never a Northeast one)", !/New York|Connecticut|Vermont/.test(chk("VA", "Red drum", 22).text));

  // Seasons cards
  S.setInfo(inf("NY"));
  const v = S.seasonView({ name: "Black sea bass", match: ["black sea bass", "sea bass"] });
  ok("New York black sea bass card shows the rule, the date and New York DEC, with the closed window", /New York: 16″/.test(v.rule) && /New York DEC/.test(v.rule) && JSON.stringify(v.closed) === '[["01-01","05-15"]]');
  S.setInfo(inf("MA"));
  ok("a Massachusetts card with no rows says We don't have…", /We don't have Massachusetts rules yet/.test(S.seasonView({ name: "Black sea bass", match: ["black sea bass"] }).rule));
  ["NY", "CT", "RI", "MA", "NH", "VT", "ME"].forEach(c => { S.setInfo(inf(c)); ok(c + " → the Northeast cards", S.seasonList()[0] === "NE"); });
  ["VA", "MD", "DE", "NJ", "PA", "DC"].forEach(c => { S.setInfo(inf(c)); ok(c + " → still the Mid-Atlantic cards", S.seasonList()[0] === "MIDATL"); });
  S.setInfo(inf("GA")); ok("Georgia → the Southeast cards (unchanged)", S.seasonList()[0] === "SE");
  S.setInfo(inf("TX")); ok("Texas → the Gulf cards (unchanged)", S.seasonList()[0] === "GULF");
  S.setInfo(inf("KS")); ok("Kansas → the Florida cards", S.seasonList()[0] === "FL");
  S.setInfo(FL); ok("Florida → the Florida cards", S.seasonList()[0] === "FL");

  // the cards
  const g = new Function(read("js/55-southeast-seasons.js") + "; return { NE_STATES, SEASONS_NE };")();
  const names = g.SEASONS_NE.map(f => f.name);
  ok("seven Northeast states", g.NE_STATES.join() === "NY,CT,RI,MA,NH,VT,ME");
  ok("every card complete: name, group, words, 12 shore + 12 boat ratings 0–2, temp, tip", g.SEASONS_NE.every(f => f.name && ["inshore", "beach", "offshore", "fresh"].includes(f.group) && f.match.length && [f.shore, f.boat].every(a => a.length === 12 && a.every(n => n >= 0 && n <= 2)) && f.temp && f.temp.low < f.temp.high && f.temp.cold < f.temp.low && f.tip));
  ok("no repeated names", new Set(names).size === names.length);
  ["Striped bass", "Summer flounder (fluke)", "Black sea bass", "Scup (porgy)", "Tautog (blackfish)", "Winter flounder", "Bluefish", "Atlantic cod", "Haddock", "Largemouth bass", "Smallmouth bass", "Chain pickerel", "Northern pike", "Walleye", "Trout", "Landlocked salmon", "Yellow perch"].forEach(n => ok("card: " + n, names.includes(n)));
  ok("spawn windows are real months", g.SEASONS_NE.every(f => !f.spawn || f.spawn.m.every(m => m >= 1 && m <= 12)));
  ok("no card uses a short word that would match other fish (\"spot\", \"trout\" alone)", g.SEASONS_NE.every(f => f.match.every(w => w !== "spot" && w !== "trout")));

  // the SQL file
  const code99 = sql.replace(/--.*$/gm, "");
  ok("every row dated 2026-10-21 and linked to an https source", (sql.match(/'2026-10-21', true\)/g) || []).length === 44 && (sql.match(/'https:\/\/[^']+', '2026-10-21'/g) || []).length === 44);
  ok("no delete / truncate / drop / update in the SQL", !/\b(delete|truncate|drop|update)\b/i.test(code99));
  ok("no rows for the states whose pages could not be read (MA, RI, ME)", !/array\['(MA|RI|ME)'\]/.test(code99));
  ok("setup/94 already allows these state codes", ["NY", "CT", "RI", "MA", "NH", "VT", "ME"].every(c => read("setup/94-southeast-rules.sql").includes("'" + c + "'")));
  ok("states and agencies already in js/54", ["NY", "CT", "RI", "MA", "NH", "VT", "ME"].every(c => new RegExp("\\b" + c + ": \\[").test(read("js/54-state-agencies.js"))));

  console.log(bad ? `test172 FAILED (${bad})` : "test172 OK");
  process.exit(bad ? 1 : 0);
})();
