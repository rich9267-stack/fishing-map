// test176: Plains / South-Central (SD, ND, OK, AR, KY, TN, WV rows; Kansas and Nebraska are honest gaps, Oregon still Florida cards): state rows, keeper check, closed / open-only dates, Seasons cards, SQL file (US plan step 4)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const t10 = read("js/10-tools-safety.js"), s31 = read("js/31-regional-rules.js"), s05 = read("js/05-seasons-records.js");
const cut = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b));
const sql = read("setup/102-plains-rules.sql");

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
      open_only: m[11] === "null" ? null : JSON.parse(m[11].replace(/::jsonb$/, "").slice(1, -1)), note: null, verified_on: "2026-10-22", active: true });
  }
  return rows;
}
const ROWS = parseRows(sql).concat([
  { species: "Redfish (red drum)", match: ["redfish", "red drum"], regions: null, min_in: 18, max_in: 27, measure: "total", one_over: false, bag: "2 per boat", release_only: false, closed: null, open_only: null, note: null, verified_on: new Date().toISOString().slice(0, 10), active: true }
]);
const code = [
  "const STATE_NAMES = { SD: 'South Dakota', ND: 'North Dakota', OK: 'Oklahoma', AR: 'Arkansas', KY: 'Kentucky', TN: 'Tennessee', WV: 'West Virginia', KS: 'Kansas', NE: 'Nebraska', OR: 'Oregon' };",
  "const me = {}, db = { from: () => ({ select: () => ({ eq: async () => ({ data: ROWS }) }) }) }; const renderSeasons = null;",
  "let CURX = null; const rulesInfo = () => CURX;",
  read("js/54-state-agencies.js"),
  cut(t10, "  let fishRules = [];", "  // Admin: edit the rules table"),
  cut(s31, "  // Seasons cards: closed dates", "  // The chips under the month"),
  cut(s05, "  // US plan step 4: the Seasons list", "  const mmdd"),
  "const SEASONS = ['FL'], SE_STATES = ['GA'], SEASONS_SE = ['SE'], GULF_STATES = ['LA', 'TX'], SEASONS_GULF = ['GULF'], MIDATL_STATES = ['VA','MD','DE','NJ','PA','DC'], SEASONS_MIDATL = ['MIDATL'], NE_STATES = ['NY', 'CT', 'RI', 'MA', 'NH', 'VT', 'ME'], SEASONS_NE = ['NE'], GL_STATES = ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO'], SEASONS_GL = ['GL'], PLAINS_STATES = ['KS', 'NE', 'SD', 'ND', 'OK', 'AR', 'KY', 'TN', 'WV'], SEASONS_PLAINS = ['PLAINS'], MW_STATES = ['MT', 'ID', 'WY', 'CO', 'UT', 'NV', 'AZ', 'NM'], SEASONS_MW = ['MW'];",
  "return { loadRules, keeperCheck, ruleFor, seasonView, seasonList, get stateRules() { return stateRules; }, get fishRules() { return fishRules; }, setInfo: i => { CURX = i; } };"
].join("\n");
const S = new Function("ROWS", code)(ROWS);
const inf = st => ({ tags: ["atlantic"], label: st, outside: true, state: st });
const FL = { tags: ["atlantic"], label: "Atlantic coast (Southeast Florida)" };
const day = s => new Date(s + "T12:00:00");
const chk = (st, sp, len, d) => S.keeperCheck(sp, len, day(d || "2026-10-22"), inf(st));
const STATES = [["SD", 10], ["ND", 11], ["OK", 10], ["AR", 12], ["KY", 16], ["TN", 14], ["WV", 8]];

(async () => {
  await S.loadRules();
  const per = c => ROWS.filter(r => r.regions && r.regions[0] === c).length;
  ok("the SQL parses into 81 rows: SD 10, ND 11, OK 10, AR 12, KY 16, TN 14, WV 8", ROWS.length === 82 && STATES.every(([c, n]) => per(c) === n));
  ok("state rows are kept apart from Florida's", S.stateRules.length === 81 && S.fishRules.length === 1);

  // Florida untouched
  const fl = S.keeperCheck("Redfish", 20, day("2026-10-22"), FL);
  ok("Florida redfish: Florida row, FWC, no Plains words", /FWC/.test(fl.text) && !/Dakota|Oklahoma|Arkansas|Kentucky|Tennessee|West Virginia|Kansas|Nebraska/.test(fl.text));
  S.setInfo(FL);
  ok("Florida seasons cards still the Florida list", S.seasonList()[0] === "FL");

  // South Dakota
  ok("South Dakota walleye: no minimum, 4 per day, South Dakota named, no FWC", chk("SD", "Walleye", 12).level === "ok" && /4 per day/.test(chk("SD", "Walleye", 18).text) && /South Dakota/.test(chk("SD", "Walleye", 18).text) && !/FWC/.test(chk("SD", "Walleye", 18).text));
  ok("South Dakota muskie is catch and release only", chk("SD", "Muskellunge", 50).level === "bad");
  ok("South Dakota bass, pike, perch, crappie, bluegill, catfish rows exist", ["Largemouth bass", "Northern pike", "Yellow perch", "Crappie", "Bluegill", "Channel catfish"].every(f => chk("SD", f, 10).level === "ok"));

  // North Dakota
  ok("North Dakota muskie 48″ minimum", chk("ND", "Muskellunge", 47).level === "bad" && chk("ND", "Muskellunge", 49).level === "ok");
  ok("North Dakota walleye has no statewide minimum, 5 per day; white bass 30", chk("ND", "Walleye", 10).level === "ok" && /5 per day/.test(chk("ND", "Walleye", 16).text) && /30 per day/.test(chk("ND", "White bass", 10).text));

  // Oklahoma
  ok("Oklahoma bass 14″ (stricter rivers rule), walleye 14″", chk("OK", "Largemouth bass", 13).level === "bad" && chk("OK", "Largemouth bass", 15).level === "ok" && chk("OK", "Walleye", 13).level === "bad" && chk("OK", "Saugeye", 15).level === "ok");
  ok("Oklahoma spotted bass has its own no-limit row; flathead its own row", /No limit/.test(chk("OK", "Spotted bass", 8).text) && /5 per day/.test(chk("OK", "Flathead catfish", 30).text));
  ok("Oklahoma hybrid striped bass beats the striped bass row", /20 per day/.test(chk("OK", "Hybrid striped bass", 18).text));
  ok("Oklahoma alligator gar closed in May, open in June", chk("OK", "Alligator gar", 60, "2026-05-15").level === "bad" && chk("OK", "Alligator gar", 60, "2026-06-15").level === "ok");

  // Arkansas
  ok("Arkansas largemouth has no minimum; smallmouth 12″", chk("AR", "Largemouth bass", 8).level === "ok" && chk("AR", "Smallmouth bass", 11).level === "bad" && chk("AR", "Smallmouth bass", 13).level === "ok");
  ok("Arkansas crappie 30, bream 50, catfish 10, trout 5", /30 per day/.test(chk("AR", "Crappie", 10).text) && /50 per day/.test(chk("AR", "Bluegill", 6).text) && /10 per day/.test(chk("AR", "Blue catfish", 20).text) && /5 per day/.test(chk("AR", "Rainbow trout", 12).text));
  ok("Arkansas alligator gar closed May 1 – July 1, open later in July", chk("AR", "Alligator gar", 30, "2026-06-10").level === "bad" && chk("AR", "Alligator gar", 30, "2026-07-01").level === "bad" && chk("AR", "Alligator gar", 30, "2026-07-10").level === "ok");

  // Kentucky
  ok("Kentucky largemouth 12″; spotted bass no minimum", chk("KY", "Largemouth bass", 11).level === "bad" && chk("KY", "Largemouth bass", 13).level === "ok" && chk("KY", "Spotted bass", 8).level === "ok");
  ok("Kentucky walleye 14″, muskie 30″, striped bass 15″", chk("KY", "Walleye", 13).level === "bad" && chk("KY", "Walleye", 15).level === "ok" && chk("KY", "Muskellunge", 29).level === "bad" && chk("KY", "Striped bass", 14).level === "bad");
  ok("Kentucky brown trout 16″, cutthroat 20″, brook trout release only, rainbow 8 per day", chk("KY", "Brown trout", 15).level === "bad" && chk("KY", "Brown trout", 17).level === "ok" && chk("KY", "Cutthroat trout", 19).level === "bad" && chk("KY", "Brook trout", 10).level === "bad" && /8 per day/.test(chk("KY", "Rainbow trout", 10).text));
  ok("Kentucky hybrid striped bass uses the white/hybrid row (no minimum)", chk("KY", "Hybrid striped bass", 10).level === "ok");
  ok("Kentucky channel vs blue catfish rows", /28″/.test(chk("KY", "Channel catfish", 20).text) && /35″/.test(chk("KY", "Blue catfish", 20).text));

  // Tennessee
  ok("Tennessee bass no statewide minimum; crappie 10″; walleye 16″; sauger 15″; muskie 36″; stripers 15″", chk("TN", "Largemouth bass", 10).level === "ok" && chk("TN", "Crappie", 9).level === "bad" && chk("TN", "Crappie", 11).level === "ok" && chk("TN", "Walleye", 15).level === "bad" && chk("TN", "Walleye", 17).level === "ok" && chk("TN", "Sauger", 14).level === "bad" && chk("TN", "Muskellunge", 35).level === "bad" && chk("TN", "Striped bass", 14).level === "bad");
  ok("Tennessee alligator gar: no harvest", chk("TN", "Alligator gar", 40).level === "bad");
  ok("Tennessee paddlefish only Apr 24 – May 31", chk("TN", "Paddlefish", 30, "2026-05-10").level === "ok" && chk("TN", "Paddlefish", 30, "2026-10-22").level === "bad" && chk("TN", "Paddlefish", 30, "2026-04-20").level === "bad");
  ok("Tennessee bluegill and yellow perch: no limit row", /No limit/.test(chk("TN", "Bluegill", 6).text) && /No limit/.test(chk("TN", "Yellow perch", 8).text));

  // West Virginia
  ok("West Virginia bass no minimum, 6 per day; muskie 30″; walleye 8 per day", chk("WV", "Smallmouth bass", 10).level === "ok" && /6 per day/.test(chk("WV", "Smallmouth bass", 13).text) && chk("WV", "Muskellunge", 29).level === "bad" && /8 per day/.test(chk("WV", "Walleye", 15).text));
  ok("West Virginia names West Virginia, not Virginia's agency or Florida", /West Virginia/.test(chk("WV", "Walleye", 15).text) && !/FWC|Florida/.test(chk("WV", "Walleye", 15).text));

  // honest gaps
  ok("Kansas says no rules yet", /We don't have Kansas rules yet/.test(chk("KS", "Walleye", 20).text));
  ok("Nebraska says no rules yet", /We don't have Nebraska rules yet/.test(chk("NE", "Walleye", 20).text));
  ok("Oregon says no rules yet", /We don't have Oregon rules yet/.test(chk("OR", "Walleye", 20).text));
  ok("West Virginia northern pike (no row) → gap message", /We don't have an? West Virginia rule for this fish yet/.test(chk("WV", "Northern pike", 25).text));
  ok("Kentucky bluegill (no row) → gap message", /We don't have an? Kentucky rule for this fish yet/.test(chk("KY", "Bluegill", 6).text));
  ok("a Tennessee rule is never used in Kentucky", !/Tennessee/.test(chk("KY", "Walleye", 19).text));

  // Seasons cards
  S.setInfo(inf("TN"));
  const v = S.seasonView({ name: "Walleye & sauger", match: ["walleye", "sauger", "saugeye"] });
  ok("Tennessee walleye card shows the rule and the checked date", /Tennessee/.test(v.rule) && /checked 2026-10-22/.test(v.rule));
  S.setInfo(inf("KS"));
  ok("a Kansas card says We don't have…", /We don't have Kansas rules yet/.test(S.seasonView({ name: "Walleye & sauger", match: ["walleye"] }).rule));
  ["KS", "NE", "SD", "ND", "OK", "AR", "KY", "TN", "WV"].forEach(c => { S.setInfo(inf(c)); ok(c + " → the Plains cards", S.seasonList()[0] === "PLAINS"); });
  ["OH", "MN", "MO"].forEach(c => { S.setInfo(inf(c)); ok(c + " → still the Great Lakes cards", S.seasonList()[0] === "GL"); });
  S.setInfo(inf("VA")); ok("Virginia → still the Mid-Atlantic cards", S.seasonList()[0] === "MIDATL");
  S.setInfo(inf("GA")); ok("Georgia → the Southeast cards (unchanged)", S.seasonList()[0] === "SE");
  S.setInfo(inf("TX")); ok("Texas → the Gulf cards (unchanged)", S.seasonList()[0] === "GULF");
  S.setInfo(inf("OR")); ok("Oregon → the Florida cards (until its region is built)", S.seasonList()[0] === "FL");

  // the cards
  const g = new Function(read("js/55-southeast-seasons.js") + "; return { PLAINS_STATES, SEASONS_PLAINS };")();
  const names = g.SEASONS_PLAINS.map(f => f.name);
  ok("nine Plains states", g.PLAINS_STATES.join() === "KS,NE,SD,ND,OK,AR,KY,TN,WV");
  ok("every card complete: name, group, words, 12 shore + 12 boat ratings 0–2, temp, tip", g.SEASONS_PLAINS.every(f => f.name && ["inshore", "beach", "offshore", "fresh"].includes(f.group) && f.match.length && [f.shore, f.boat].every(a => a.length === 12 && a.every(n => n >= 0 && n <= 2)) && f.temp && f.temp.low < f.temp.high && f.temp.cold < f.temp.low && f.tip));
  ok("no repeated names", new Set(names).size === names.length);
  ["Largemouth bass", "Smallmouth bass", "Spotted bass", "Walleye & sauger", "Northern pike", "Muskellunge", "Black & white crappie", "White bass & stripers", "Catfish", "Trout", "Yellow perch", "Bluegill & sunfish", "Paddlefish"].forEach(n => ok("card: " + n, names.includes(n)));
  ok("spawn windows are real months", g.SEASONS_PLAINS.every(f => !f.spawn || f.spawn.m.every(m => m >= 1 && m <= 12)));
  ok("no card uses a short word that would match other fish (\"spot\", \"trout\" alone)", g.SEASONS_PLAINS.every(f => f.match.every(w => w !== "spot" && w !== "trout")));
  const cardWords = n => g.SEASONS_PLAINS.find(c => c.name === n).match;
  ok("Tennessee rows reach the walleye, crappie, white bass, catfish and trout cards", ["Walleye & sauger", "Black & white crappie", "White bass & stripers", "Catfish", "Trout"].every(n => S.stateRules.filter(r => r.regions[0] === "TN" && r.match.some(w => cardWords(n).includes(w))).length >= 1));

  // the SQL file
  const code102 = sql.replace(/--.*$/gm, "");
  ok("every row dated 2026-10-22 and linked to an https source", (sql.match(/'2026-10-22', true\)/g) || []).length === 81 && (sql.match(/'https:\/\/[^']+', '2026-10-22'/g) || []).length === 81);
  ok("no delete / truncate / drop / update in the SQL", !/\b(delete|truncate|drop|update)\b/i.test(code102));
  ok("no rows for Kansas, Nebraska or Oregon", !/array\['(KS|NE|OR)'\]/.test(code102));
  ok("closed / open-only dates are valid MM-DD pairs", ROWS.every(r => [r.closed, r.open_only].every(x => !x || x.every(([a, b]) => /^\d\d-\d\d$/.test(a) && /^\d\d-\d\d$/.test(b)))));
  ok("setup/94 already allows these state codes", ["KS", "NE", "SD", "ND", "OK", "AR", "KY", "TN", "WV"].every(c => read("setup/94-southeast-rules.sql").includes("'" + c + "'")));
  ok("states and agencies already in js/54", ["KS", "NE", "SD", "ND", "OK", "AR", "KY", "TN", "WV"].every(c => new RegExp("\\b" + c + ": \\[").test(read("js/54-state-agencies.js"))));

  console.log(bad ? `test176 FAILED (${bad})` : "test176 OK");
  process.exit(bad ? 1 : 0);
})();
