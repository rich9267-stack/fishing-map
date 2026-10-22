// test173: Great Lakes / Midwest (OH, MI, IN, IL, WI, MN, IA, MO rows; Oregon is the honest gap): state rows, keeper check, closed dates, Seasons cards, SQL file (US plan step 4)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const t10 = read("js/10-tools-safety.js"), s31 = read("js/31-regional-rules.js"), s05 = read("js/05-seasons-records.js");
const cut = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b));
const sql = read("setup/100-greatlakes-rules.sql");

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
  "const STATE_NAMES = { OH: 'Ohio', MI: 'Michigan', IN: 'Indiana', IL: 'Illinois', WI: 'Wisconsin', MN: 'Minnesota', IA: 'Iowa', MO: 'Missouri', OR: 'Oregon', KS: 'Kansas', ZZ: 'Testland' };",
  "const me = {}, db = { from: () => ({ select: () => ({ eq: async () => ({ data: ROWS }) }) }) }; const renderSeasons = null;",
  "let CURX = null; const rulesInfo = () => CURX;",
  read("js/54-state-agencies.js"),
  "STATE_AGENCIES.ZZ = ['Testland Fish Dept.', 'Testland Fish', 'https://example.test/rules', 'https://example.test/licence'];   // a made-up place with no rows (every real state now has some)",
  cut(t10, "  let fishRules = [];", "  // Admin: edit the rules table"),
  cut(s31, "  // Seasons cards: closed dates", "  // The chips under the month"),
  cut(s05, "  // US plan step 4: the Seasons list", "  const mmdd"),
  "const SEASONS = ['FL'], SE_STATES = ['GA'], SEASONS_SE = ['SE'], GULF_STATES = ['LA', 'TX'], SEASONS_GULF = ['GULF'], MIDATL_STATES = ['VA','MD','DE','NJ','PA','DC'], SEASONS_MIDATL = ['MIDATL'], NE_STATES = ['NY', 'CT', 'RI', 'MA', 'NH', 'VT', 'ME'], SEASONS_NE = ['NE'], GL_STATES = ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO'], SEASONS_GL = ['GL'], PLAINS_STATES = ['KS', 'NE', 'SD', 'ND', 'OK', 'AR', 'KY', 'TN', 'WV'], SEASONS_PLAINS = ['PLAINS'], MW_STATES = ['MT', 'ID', 'WY', 'CO', 'UT', 'NV', 'AZ', 'NM'], SEASONS_MW = ['MW'], PAC_STATES = ['WA', 'OR', 'CA'], SEASONS_PAC = ['PAC'];",
  "return { loadRules, keeperCheck, ruleFor, seasonView, seasonList, get stateRules() { return stateRules; }, get fishRules() { return fishRules; }, setInfo: i => { CURX = i; } };"
].join("\n");
const S = new Function("ROWS", code)(ROWS);
const inf = st => ({ tags: ["atlantic"], label: st, outside: true, state: st });
const FL = { tags: ["atlantic"], label: "Atlantic coast (Southeast Florida)" };
const day = s => new Date(s + "T12:00:00");
const chk = (st, sp, len, d) => S.keeperCheck(sp, len, day(d || "2026-10-21"), inf(st));


(async () => {
  await S.loadRules();
  const per = c => ROWS.filter(r => r.regions && r.regions[0] === c).length;
  ok("the SQL parses into 70 rows: OH 8, MI 9, IN 9, IL 9, WI 6, MN 12, IA 8, MO 9", ROWS.length === 71 && [["OH", 8], ["MI", 9], ["IN", 9], ["IL", 9], ["WI", 6], ["MN", 12], ["IA", 8], ["MO", 9]].every(([c, n]) => per(c) === n));
  ok("state rows are kept apart from Florida's", S.stateRules.length === 70 && S.fishRules.length === 1);

  // Florida untouched
  const fl = S.keeperCheck("Redfish", 20, day("2026-10-21"), FL);
  ok("Florida redfish: Florida row, FWC, no Midwest words", /FWC/.test(fl.text) && !/Ohio|Michigan|Indiana|Illinois|Wisconsin|Minnesota|Iowa|Missouri/.test(fl.text));
  S.setInfo(FL);
  ok("Florida seasons cards still the Florida list", S.seasonList()[0] === "FL");

  // Ohio
  ok("Ohio walleye (no minimum): ok, Ohio named, no FWC", chk("OH", "Walleye", 12).level === "ok" && /Ohio/.test(chk("OH", "Walleye", 20).text) && !/FWC/.test(chk("OH", "Walleye", 20).text));
  ok("Ohio bass has no statewide minimum", chk("OH", "Largemouth bass", 8).level === "ok");
  ok("Ohio muskie, trout, perch and white bass rows exist", ["Muskellunge", "Rainbow trout", "Yellow perch", "White bass"].every(f => chk("OH", f, 20).level !== "info"));

  // Michigan
  ok("Michigan bass 14″: ok in September, bad under 14, closed in March and early June, open late June and Dec 31", chk("MI", "Largemouth bass", 15, "2026-09-10").level === "ok" && chk("MI", "Largemouth bass", 13, "2026-09-10").level === "bad" && chk("MI", "Smallmouth bass", 15, "2026-03-10").level === "bad" && chk("MI", "Largemouth bass", 15, "2026-06-10").level === "bad" && chk("MI", "Largemouth bass", 15, "2026-06-25").level === "ok" && chk("MI", "Largemouth bass", 15, "2026-12-31").level === "ok");
  ok("Michigan walleye 15″, closed Mar 16 – May 14", chk("MI", "Walleye", 16, "2026-10-21").level === "ok" && chk("MI", "Walleye", 14, "2026-10-21").level === "bad" && chk("MI", "Walleye", 16, "2026-04-20").level === "bad" && chk("MI", "Walleye", 16, "2026-05-15").level === "ok");
  ok("Michigan pike 24″; muskie 42″, closed until June 7", chk("MI", "Northern pike", 25).level === "ok" && chk("MI", "Northern pike", 23).level === "bad" && chk("MI", "Muskellunge", 43, "2026-10-01").level === "ok" && chk("MI", "Muskellunge", 40, "2026-10-01").level === "bad" && chk("MI", "Muskellunge", 43, "2026-06-03").level === "bad");
  ok("Michigan channel catfish 12″, flathead 15″, crappie in the sunfish row", chk("MI", "Channel catfish", 11).level === "bad" && chk("MI", "Channel catfish", 13).level === "ok" && chk("MI", "Flathead catfish", 14).level === "bad" && chk("MI", "Crappie", 5).level === "ok");

  // Indiana
  ok("Indiana bass 14″, walleye 16″, muskie 36″, pike 24″", chk("IN", "Largemouth bass", 13).level === "bad" && chk("IN", "Largemouth bass", 15).level === "ok" && chk("IN", "Walleye", 15).level === "bad" && chk("IN", "Walleye", 17).level === "ok" && chk("IN", "Muskellunge", 35).level === "bad" && chk("IN", "Northern pike", 23).level === "bad");
  ok("Indiana catfish 13″ (rivers), crappie and perch have no minimum", chk("IN", "Channel catfish", 12).level === "bad" && chk("IN", "Crappie", 6).level === "ok" && chk("IN", "Yellow perch", 5).level === "ok");

  // Illinois
  ok("Illinois bass has no statewide size limit; walleye 14″; muskie 36″; pike 24″", chk("IL", "Largemouth bass", 8).level === "ok" && chk("IL", "Walleye", 13).level === "bad" && chk("IL", "Walleye", 15).level === "ok" && chk("IL", "Muskellunge", 35).level === "bad" && chk("IL", "Northern pike", 23).level === "bad");
  ok("Illinois names Illinois, not Florida", /Illinois/.test(chk("IL", "Walleye", 15).text) && !/FWC|Florida/.test(chk("IL", "Walleye", 15).text));

  // Wisconsin
  ok("Wisconsin bass 14″, closed until June 20 and from Mar 8", chk("WI", "Largemouth bass", 15, "2026-08-01").level === "ok" && chk("WI", "Largemouth bass", 13, "2026-08-01").level === "bad" && chk("WI", "Smallmouth bass", 15, "2026-06-10").level === "bad" && chk("WI", "Smallmouth bass", 15, "2026-03-20").level === "bad");
  ok("Wisconsin walleye 15″, closed Mar 8 – May 1; pike 26″; muskie 40″, closed Jan 1 – May 1", chk("WI", "Walleye", 16, "2026-07-01").level === "ok" && chk("WI", "Walleye", 14, "2026-07-01").level === "bad" && chk("WI", "Walleye", 16, "2026-04-01").level === "bad" && chk("WI", "Northern pike", 25, "2026-07-01").level === "bad" && chk("WI", "Muskellunge", 41, "2026-02-01").level === "bad" && chk("WI", "Muskellunge", 41, "2026-07-01").level === "ok");
  ok("Wisconsin panfish (crappie, bluegill, yellow perch) share one row", ["Crappie", "Bluegill", "Yellow perch"].every(f => /25 per day/.test(chk("WI", f, 8).text)));

  // Minnesota
  ok("Minnesota largemouth closed until May 29 and from Feb 23; open in August", chk("MN", "Largemouth bass", 15, "2026-08-01").level === "ok" && chk("MN", "Largemouth bass", 15, "2026-05-20").level === "bad" && chk("MN", "Largemouth bass", 15, "2026-03-10").level === "bad");
  ok("Minnesota smallmouth also closed from Sep 9", chk("MN", "Smallmouth bass", 15, "2026-08-01").level === "ok" && chk("MN", "Smallmouth bass", 15, "2026-10-01").level === "bad");
  ok("Minnesota walleye closed Feb 23 – May 14, open in July; pike 24″; muskie 54″ and closed from Dec 1", chk("MN", "Walleye", 16, "2026-07-01").level === "ok" && chk("MN", "Walleye", 16, "2026-04-01").level === "bad" && chk("MN", "Northern pike", 23, "2026-07-01").level === "bad" && chk("MN", "Northern pike", 25, "2026-07-01").level === "ok" && chk("MN", "Muskellunge", 53, "2026-09-01").level === "bad" && chk("MN", "Muskellunge", 55, "2026-09-01").level === "ok" && chk("MN", "Muskellunge", 55, "2026-12-15").level === "bad");
  ok("Minnesota flathead catfish closed in winter, channel catfish open", chk("MN", "Flathead catfish", 20, "2026-01-10").level === "bad" && chk("MN", "Channel catfish", 20, "2026-01-10").level === "ok");

  // Iowa / Missouri
  ok("Iowa bass 15″, muskie 40″, walleye no minimum", chk("IA", "Largemouth bass", 14).level === "bad" && chk("IA", "Largemouth bass", 16).level === "ok" && chk("IA", "Muskellunge", 39).level === "bad" && chk("IA", "Walleye", 10).level === "ok");
  ok("Missouri bass 12″ and closed in spring (stricter streams rule); walleye 15″; muskie 36″", chk("MO", "Largemouth bass", 13, "2026-09-01").level === "ok" && chk("MO", "Largemouth bass", 11, "2026-09-01").level === "bad" && chk("MO", "Largemouth bass", 13, "2026-04-01").level === "bad" && chk("MO", "Walleye", 14).level === "bad" && chk("MO", "Muskellunge", 35).level === "bad");
  ok("Missouri has separate channel, blue and flathead catfish rows", ["Channel catfish", "Blue catfish", "Flathead catfish"].every(f => /Missouri/.test(chk("MO", f, 20).text)));

  // honest gaps
  ok("a made-up place (no rows) still says no rules yet", /We don't have Testland rules yet/.test(chk("ZZ", "Walleye", 20).text));
  ok("Ohio bluegill (no row) → gap message", /We don't have an? Ohio rule for this fish yet/.test(chk("OH", "Bluegill", 6).text));
  ok("Illinois yellow perch (no row) → gap message", /We don't have an? Illinois rule for this fish yet/.test(chk("IL", "Yellow perch", 6).text));
  ok("Michigan / Wisconsin trout (no row) → gap message", /We don't have a/.test(chk("MI", "Rainbow trout", 12).text) && /We don't have a/.test(chk("WI", "Brown trout", 12).text));
  ok("a Michigan rule is never used in Ohio", !/Michigan/.test(chk("OH", "Walleye", 19).text));
  ok("Northeast / Mid-Atlantic words not shown here", !/New York|Virginia/.test(chk("MN", "Walleye", 19).text));

  // Seasons cards
  S.setInfo(inf("MN"));
  const v = S.seasonView({ name: "Walleye", match: ["walleye", "saugeye"] });
  ok("Minnesota walleye card shows the rule, the date, with the closed window", /Minnesota/.test(v.rule) && /checked 2026-10-21/.test(v.rule) && JSON.stringify(v.closed) === '[["02-23","05-14"]]');
  S.setInfo(inf("ZZ"));
  ok("a made-up place's card says We don't have…", /We don't have Testland rules yet/.test(S.seasonView({ name: "Walleye", match: ["walleye"] }).rule));
  ["OH", "MI", "IN", "IL", "WI", "MN", "IA", "MO"].forEach(c => { S.setInfo(inf(c)); ok(c + " → the Great Lakes cards", S.seasonList()[0] === "GL"); });
  ["NY", "CT", "VT"].forEach(c => { S.setInfo(inf(c)); ok(c + " → still the Northeast cards", S.seasonList()[0] === "NE"); });
  ["VA", "PA"].forEach(c => { S.setInfo(inf(c)); ok(c + " → still the Mid-Atlantic cards", S.seasonList()[0] === "MIDATL"); });
  S.setInfo(inf("GA")); ok("Georgia → the Southeast cards (unchanged)", S.seasonList()[0] === "SE");
  S.setInfo(inf("TX")); ok("Texas → the Gulf cards (unchanged)", S.seasonList()[0] === "GULF");
  S.setInfo(inf("OR")); ok("Oregon → the Pacific cards", S.seasonList()[0] === "PAC");
  S.setInfo(inf("XX")); ok("a place outside every list (XX) → the Florida cards", S.seasonList()[0] === "FL");

  // the cards
  const g = new Function(read("js/55-southeast-seasons.js") + "; return { GL_STATES, SEASONS_GL };")();
  const names = g.SEASONS_GL.map(f => f.name);
  ok("eight Great Lakes states", g.GL_STATES.join() === "OH,MI,IN,IL,WI,MN,IA,MO");
  ok("every card complete: name, group, words, 12 shore + 12 boat ratings 0–2, temp, tip", g.SEASONS_GL.every(f => f.name && ["inshore", "beach", "offshore", "fresh"].includes(f.group) && f.match.length && [f.shore, f.boat].every(a => a.length === 12 && a.every(n => n >= 0 && n <= 2)) && f.temp && f.temp.low < f.temp.high && f.temp.cold < f.temp.low && f.tip));
  ok("no repeated names", new Set(names).size === names.length);
  ["Largemouth bass", "Smallmouth bass", "Walleye", "Northern pike", "Muskellunge", "Trout", "Salmon & steelhead", "Yellow perch", "Black & white crappie", "Bluegill & sunfish", "White bass & hybrids", "Catfish"].forEach(n => ok("card: " + n, names.includes(n)));
  ok("spawn windows are real months", g.SEASONS_GL.every(f => !f.spawn || f.spawn.m.every(m => m >= 1 && m <= 12)));
  ok("no card uses a short word that would match other fish (\"spot\", \"trout\" alone)", g.SEASONS_GL.every(f => f.match.every(w => w !== "spot" && w !== "trout")));
  const cardWords = n => g.SEASONS_GL.find(c => c.name === n).match;
  ok("Michigan rows reach the walleye, crappie, sunfish, perch and catfish cards", ["Walleye", "Black & white crappie", "Bluegill & sunfish", "Catfish"].every(n => S.stateRules.filter(r => r.regions[0] === "MI" && r.match.some(w => cardWords(n).includes(w))).length >= 1));

  // the SQL file
  const code100 = sql.replace(/--.*$/gm, "");
  ok("every row dated 2026-10-21 and linked to an https source", (sql.match(/'2026-10-21', true\)/g) || []).length === 70 && (sql.match(/'https:\/\/[^']+', '2026-10-21'/g) || []).length === 70);
  ok("no delete / truncate / drop / update in the SQL", !/\b(delete|truncate|drop|update)\b/i.test(code100));
  ok("rows only for the eight states", ROWS.filter(r => r.regions && r.regions[0] !== undefined && ["NY", "CT", "VT", "NH"].includes(r.regions[0])).length === 0 && !/array\['(KS|NE|ND|SD|OR)'\]/.test(code100));
  ok("closed dates are valid MM-DD pairs", ROWS.every(r => !r.closed || r.closed.every(([a, b]) => /^\d\d-\d\d$/.test(a) && /^\d\d-\d\d$/.test(b))));
  ok("setup/94 already allows these state codes", ["OH", "MI", "IN", "IL", "WI", "MN", "IA", "MO"].every(c => read("setup/94-southeast-rules.sql").includes("'" + c + "'")));
  ok("states and agencies already in js/54", ["OH", "MI", "IN", "IL", "WI", "MN", "IA", "MO"].every(c => new RegExp("\\b" + c + ": \\[").test(read("js/54-state-agencies.js"))));

  console.log(bad ? `test173 FAILED (${bad})` : "test173 OK");
  process.exit(bad ? 1 : 0);
})();
