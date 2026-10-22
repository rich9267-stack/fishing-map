// test180: the rule gaps filled (KS, NE, MA, RI, ME rows; MI, WI, IN trout and salmon): state rows, keeper check, stricter area held, closed dates, cards, SQL file (US plan step 4)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const t10 = read("js/10-tools-safety.js"), s31 = read("js/31-regional-rules.js"), s05 = read("js/05-seasons-records.js");
const cut = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b));
const sql = read("setup/106-rule-gaps.sql");

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
  "const STATE_NAMES = { KS: 'Kansas', NE: 'Nebraska', MA: 'Massachusetts', RI: 'Rhode Island', ME: 'Maine', MI: 'Michigan', WI: 'Wisconsin', IN: 'Indiana', GA: 'Georgia', ZZ: 'Testland' };",
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
const chk = (st, sp, len, d) => S.keeperCheck(sp, len, day(d || "2026-10-22"), inf(st));
const STATES = [["KS", 10], ["NE", 14], ["MA", 28], ["RI", 16], ["ME", 24], ["MI", 4], ["WI", 5], ["IN", 4]];
const ALL = STATES.map(s => s[0]);

(async () => {
  await S.loadRules();
  const per = c => ROWS.filter(r => r.regions && r.regions[0] === c).length;
  const lv = (st, sp, len, d) => chk(st, sp, len, d).level;
  ok("the SQL parses into 105 rows: KS 10, NE 14, MA 28, RI 16, ME 24, MI 4, WI 5, IN 4", ROWS.length === 106 && STATES.every(([c, n]) => per(c) === n));
  ok("state rows are kept apart from Florida's", S.stateRules.length === 105 && S.fishRules.length === 1);

  // Florida untouched
  const fl = S.keeperCheck("Redfish", 20, day("2026-10-22"), FL);
  ok("Florida redfish: Florida row, FWC, no new state words", /FWC/.test(fl.text) && !/Kansas|Nebraska|Massachusetts|Rhode Island|Maine|Michigan|Wisconsin|Indiana/.test(fl.text));
  S.setInfo(FL);
  ok("Florida seasons cards still the Florida list", S.seasonList()[0] === "FL");

  // Kansas
  ok("Kansas walleye and black bass 15″", lv("KS", "Walleye", 14) === "bad" && lv("KS", "Walleye", 16) === "ok" && lv("KS", "Largemouth bass", 14) === "bad" && lv("KS", "Spotted bass", 15) === "ok");
  ok("Kansas pike 30″; blue catfish only 1 over 30″ (warn)", lv("KS", "Northern pike", 29) === "bad" && lv("KS", "Blue catfish", 35) === "warn" && lv("KS", "Blue catfish", 20) === "ok");
  ok("Kansas crappie 50, wiper uses its own row", /50 per day/.test(chk("KS", "Crappie", 9).text) && /5 per day/.test(chk("KS", "Wiper", 15).text) && !/50/.test(chk("KS", "Wiper", 15).text));
  ok("Kansas is no longer a 'no rules yet' state", !/rules yet/.test(chk("KS", "Walleye", 20).text));

  // Nebraska
  ok("Nebraska walleye 15″, only 1 over 22″", lv("NE", "Walleye", 14) === "bad" && lv("NE", "Walleye", 18) === "ok" && lv("NE", "Walleye", 24) === "warn");
  ok("Nebraska bass 15″, only 1 over 21″; catfish 1 over 30″", lv("NE", "Largemouth bass", 14) === "bad" && lv("NE", "Smallmouth bass", 22) === "warn" && lv("NE", "Channel catfish", 31) === "warn");
  ok("Nebraska trout: brook 1 over 12″, brown 1 over 16″", lv("NE", "Brook trout", 13) === "warn" && lv("NE", "Brown trout", 15) === "ok" && lv("NE", "Brown trout", 17) === "warn");
  ok("Nebraska muskie 40″, pallid sturgeon never, shovelnose its own row", lv("NE", "Muskellunge", 38) === "bad" && lv("NE", "Pallid sturgeon", 30) === "bad" && /10 per day/.test(chk("NE", "Shovelnose sturgeon", 25).text));

  // Massachusetts
  ok("Massachusetts striped bass 28–31″ slot", lv("MA", "Striped bass", 27) === "bad" && lv("MA", "Striped bass", 29) === "ok" && lv("MA", "Striped bass", 32) === "bad");
  ok("Massachusetts black sea bass 16″, open May 16 – Oct 14", lv("MA", "Black sea bass", 17, "2026-06-01") === "ok" && lv("MA", "Black sea bass", 17, "2026-11-01") === "bad" && lv("MA", "Black sea bass", 15, "2026-06-01") === "bad");
  ok("Massachusetts fluke 17.5″ (boats held), shore size in the note", lv("MA", "Summer flounder", 17, "2026-07-01") === "bad" && lv("MA", "Fluke", 18, "2026-07-01") === "ok" && /from shore: 16\.5″/.test(sql));
  ok("Massachusetts winter flounder beats the fluke row", /8 north/.test(chk("MA", "Winter flounder", 13, "2026-06-01").text) && lv("MA", "Winter flounder", 13, "2026-02-10") === "bad");
  ok("Massachusetts cod: release (south of Cape Cod held), north rule in the note", lv("MA", "Atlantic cod", 25, "2026-09-15") === "bad" && /North of Cape Cod \(Gulf of Maine\): 1 per day, 23″/.test(sql));
  ok("Massachusetts tautog 16″, 1 over 21″ warns; closed Jan – Mar", lv("MA", "Tautog", 15, "2026-06-15") === "bad" && lv("MA", "Tautog", 22, "2026-06-15") === "warn" && lv("MA", "Tautog", 18, "2026-02-01") === "bad");
  ok("Massachusetts false albacore measured by fork length", S.stateRules.find(r => r.regions[0] === "MA" && r.match.includes("false albacore")).measure === "fork");
  ok("Massachusetts lake trout 18″, walleye 14″, pike 28″", lv("MA", "Lake trout", 17) === "bad" && lv("MA", "Walleye", 13) === "bad" && lv("MA", "Northern pike", 27) === "bad");
  ok("Massachusetts sea-run salmon never, landlocked salmon 15″", lv("MA", "Atlantic salmon", 20) === "bad" && lv("MA", "Landlocked salmon", 16) === "ok");
  ok("gizzard shad and Spanish mackerel don't use the shad / mackerel rows", !/American shad/.test(chk("MA", "Gizzard shad", 8).text) && !/25 per day/.test(chk("MA", "Spanish mackerel", 15).text));

  // Rhode Island
  ok("Rhode Island trout 8″, closed March to early April", lv("RI", "Rainbow trout", 7, "2026-06-01") === "bad" && lv("RI", "Rainbow trout", 10, "2026-03-15") === "bad" && lv("RI", "Rainbow trout", 10, "2026-05-01") === "ok");
  ok("Rhode Island tautog closed June – July; fluke 19″", lv("RI", "Tautog", 18, "2026-07-01") === "bad" && lv("RI", "Tautog", 18, "2026-09-01") === "ok" && lv("RI", "Fluke", 18, "2026-07-01") === "bad");
  ok("Rhode Island black sea bass opens May 16; pike 24″, bass 12″", lv("RI", "Black sea bass", 17, "2026-05-01") === "bad" && lv("RI", "Black sea bass", 17, "2026-06-01") === "ok" && lv("RI", "Northern pike", 23) === "bad" && lv("RI", "Largemouth bass", 11) === "bad");

  // Maine
  ok("Maine striped bass 28–31″", lv("ME", "Striped bass", 32) === "bad" && lv("ME", "Striped bass", 30) === "ok");
  ok("Maine cod only Sep 1 – Oct 31, 23″; haddock not in March", lv("ME", "Atlantic cod", 25, "2026-09-15") === "ok" && lv("ME", "Atlantic cod", 25, "2026-07-01") === "bad" && lv("ME", "Haddock", 18, "2026-03-10") === "bad");
  ok("Maine bass: only 1 over 14″ (warn)", lv("ME", "Smallmouth bass", 16) === "warn" && lv("ME", "Smallmouth bass", 12) === "ok");
  ok("Maine sea-run salmon never; landlocked salmon 14″; brown trout 14″ (lakes held)", lv("ME", "Atlantic salmon", 20) === "bad" && lv("ME", "Landlocked salmon", 15) === "ok" && lv("ME", "Brown trout", 13) === "bad");
  ok("Maine Acadian redfish is not the southern redfish", /9″ minimum/.test(chk("ME", "Acadian redfish", 10).text) && !/9″ minimum/.test(chk("ME", "Redfish", 20).text));
  ok("Maine black sea bass closed Sep 22 – Oct 17; wolffish never", lv("ME", "Black sea bass", 14, "2026-10-01") === "bad" && lv("ME", "Black sea bass", 14, "2026-08-01") === "ok" && lv("ME", "Atlantic wolffish", 30) === "bad");

  // Michigan, Wisconsin, Indiana trout and salmon (stricter area held)
  ok("Michigan brook trout 20″ (Lake Superior held), rest in the note", lv("MI", "Brook trout", 15) === "bad" && /Inland streams not on the trout-type list: 7″/.test(sql));
  ok("Michigan steelhead / brown 10″, salmon 10″", lv("MI", "Steelhead", 9) === "bad" && lv("MI", "Brown trout", 12) === "ok" && lv("MI", "Chinook salmon", 12) === "ok" && lv("MI", "Coho salmon", 9) === "bad");
  ok("Michigan lake trout 15″, 1 over 34″, closed Oct – Dec", lv("MI", "Lake trout", 20, "2026-06-01") === "ok" && lv("MI", "Lake trout", 36, "2026-06-01") === "warn" && lv("MI", "Lake trout", 20, "2026-10-15") === "bad");
  ok("Wisconsin rainbow 26″ and brook 20″ (Lake Superior held)", lv("WI", "Rainbow trout", 20) === "bad" && lv("WI", "Brook trout", 15) === "bad" && lv("WI", "Brown trout", 16) === "ok");
  ok("Wisconsin lake trout 15″, 1 over 25″, closed Oct – Nov", lv("WI", "Lake trout", 26, "2026-06-01") === "warn" && lv("WI", "Lake trout", 20, "2026-10-15") === "bad" && lv("WI", "Chinook salmon", 12) === "ok");
  ok("Indiana trout 14″ (Lake Michigan held), brown trout 1 per day inland", lv("IN", "Rainbow trout", 12) === "bad" && /1 per day on inland waters/.test(chk("IN", "Brown trout", 15).text) && lv("IN", "Lake trout", 15) === "ok");
  ok("no generic 'salmon' word: kokanee salmon gets no Great Lakes row", !/Chinook/.test(chk("MI", "Kokanee salmon", 12).text));

  // honest gaps
  ok("a made-up place (no rows) says no rules yet", /We don't have Testland rules yet/.test(chk("ZZ", "Walleye", 20).text));
  ok("a Maine rule is never used in Massachusetts", !/Maine/.test(chk("MA", "Haddock", 18).text));

  // Seasons cards (unchanged lists, now with rules)
  S.setInfo(inf("MA"));
  const v = S.seasonView({ name: "Striped bass", match: ["striped bass"] });
  ok("Massachusetts striped bass card shows the rule and the checked date", /Massachusetts/.test(v.rule) && /checked 2026-10-22/.test(v.rule));
  [["KS", "PLAINS"], ["NE", "PLAINS"], ["MA", "NE"], ["RI", "NE"], ["ME", "NE"], ["MI", "GL"], ["WI", "GL"], ["IN", "GL"], ["XX", "FL"]].forEach(([c, l]) => { S.setInfo(inf(c)); ok(c + " → the " + l + " cards", S.seasonList()[0] === l); });
  const SHORT = ["pike", "trout", "bass", "spot", "perch", "cod", "crab", "salmon", "shad", "mackerel"];
  ok("no row uses a short word that would match other fish", S.stateRules.every(r => r.match.every(w => !SHORT.includes(w))));

  // the SQL file
  const code106 = sql.replace(/--.*$/gm, "");
  ok("every row dated 2026-10-22 and linked to an https source", (sql.match(/'2026-10-22', true\)/g) || []).length === 105 && (sql.match(/'https:\/\/[^']+', '2026-10-22'/g) || []).length === 105);
  ok("no delete / truncate / drop / update in the SQL", !/\b(delete|truncate|drop|update)\b/i.test(code106));
  ok("rows only for the eight states", !/array\['(?!KS|NE|MA|RI|ME|MI|WI|IN)[A-Z]{2}'\]/.test(code106));
  ok("Michigan, Wisconsin, Indiana rows are only trout and salmon", S.stateRules.filter(r => ["MI", "WI", "IN"].includes(r.regions[0])).every(r => r.match.every(w => /trout|salmon|steelhead|chinook|coho|splake|laker|mackinaw/.test(w))));
  ok("closed dates are valid MM-DD pairs, start before end", ROWS.every(r => [r.closed, r.open_only].every(x => !x || x.every(([a, b]) => /^\d\d-\d\d$/.test(a) && /^\d\d-\d\d$/.test(b) && a <= b))));
  ok("one-over rows all have a max size", ROWS.every(r => !r.one_over || r.max_in != null));
  ok("no crab or lobster rows (shell sizes don't fit)", !/lobster|crab/i.test(code106));
  ok("setup/94 already allows these state codes", ALL.every(c => read("setup/94-southeast-rules.sql").includes("'" + c + "'")));
  const agencies = Object.keys(new Function(read("js/54-state-agencies.js") + "; return STATE_AGENCIES;")());
  const files = fs.readdirSync(__dirname + "/../setup").filter(f => /^(9[4-9]|10[0-9])-.*rules.*\.sql$|^106-/.test(f)).map(f => read("setup/" + f)).join("\n");
  const missing = agencies.filter(c => c !== "FL" && !files.includes("array['" + c + "']"));
  ok("every state + DC now has at least one rule row (missing: " + (missing.join(" ") || "none") + ")", missing.length === 0);

  console.log(bad ? `test180 FAILED (${bad})` : "test180 OK");
  process.exit(bad ? 1 : 0);
})();
