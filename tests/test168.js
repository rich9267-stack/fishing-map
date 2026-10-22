// test168: Southeast rules + seasons (GA, AL, SC, NC, MS): state rows kept apart from Florida's, keeper check, Seasons cards, SQL file (US plan step 4)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const t10 = read("js/10-tools-safety.js"), s31 = read("js/31-regional-rules.js"), s05 = read("js/05-seasons-records.js");
const cut = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b));

// rows as the database would return them (shape of setup/94 + two Florida rows)
const sql = read("setup/94-southeast-rules.sql");
const row = (species, match, regions, o) => Object.assign({ species, match, regions, min_in: null, max_in: null, measure: "total", one_over: false, bag: null, release_only: false, closed: null, open_only: null, note: null, verified_on: new Date().toISOString().slice(0, 10), active: true }, o || {});
const ROWS = [
  row("Snook", ["snook"], null, { min_in: 28, max_in: 32, bag: "1 per person", closed: [["12-15", "01-31"], ["06-01", "08-31"]] }),
  row("Redfish (red drum)", ["redfish", "red drum"], null, { min_in: 18, max_in: 27, bag: "2 per boat" }),
  row("Red drum", ["red drum", "redfish"], ["GA"], { min_in: 14, max_in: 23, bag: "5 per person" }),
  row("Red drum", ["red drum", "redfish"], ["SC"], { min_in: 18, max_in: 25, bag: "1 per person" }),
  row("Flounder", ["flounder"], ["AL"], { min_in: 14, bag: "5 per person", closed: [["11-01", "11-30"]] }),
  row("Flounder", ["flounder"], ["NC"], { min_in: 15, bag: "1 per person", open_only: [["2026-09-01", "2026-09-14"]] }),
  row("Largemouth bass", ["largemouth", "black bass"], ["GA"], { min_in: 12, bag: "10 black bass per person" }),
  row("Striped bass", ["striped bass", "striper"], ["GA"], { bag: "15 per person" })
];
let CUR = { tags: ["atlantic"], label: "Georgia", outside: true, state: "GA" };
const code = [
  "const STATE_NAMES = { GA: 'Georgia', AL: 'Alabama', SC: 'South Carolina', NC: 'North Carolina', OH: 'Ohio' };",
  "const me = {}, db = { from: () => ({ select: () => ({ eq: async () => ({ data: ROWS }) }) }) }; const renderSeasons = null;",
  "const rulesInfo = () => CUR;",
  read("js/54-state-agencies.js"),
  cut(t10, "  let fishRules = [];", "  // Admin: edit the rules table"),
  cut(s31, "  // Seasons cards: closed dates", "  // The chips under the month"),
  cut(s05, "  // US plan step 4: the Seasons list", "  const mmdd"),
  "const SEASONS = ['FL'], SE_STATES = ['GA', 'AL', 'SC', 'NC', 'MS'], SEASONS_SE = ['SE'], GULF_STATES = ['LA', 'TX'], SEASONS_GULF = ['GULF'];",
  "return { loadRules, keeperCheck, ruleFor, stateRuleFor, seasonView, seasonList, stateRulesGate, get fishRules() { return fishRules; }, get stateRules() { return stateRules; }, setInfo: i => { CUR = i; } };"
].join("\n");
const S = new Function("ROWS", "CUR", code.replace("const rulesInfo = () => CUR;", "let CURX = CUR; const rulesInfo = () => CURX;").replace("setInfo: i => { CUR = i; }", "setInfo: i => { CURX = i; }"))(ROWS, CUR);

(async () => {
  await S.loadRules();
  ok("Florida rules list has only Florida rows", S.fishRules.length === 2 && S.fishRules.every(r => !r.regions));
  ok("state rows are kept apart", S.stateRules.length === 6 && S.stateRules.every(r => /^[A-Z]{2}$/.test(r.regions[0])));
  const FL = { tags: ["atlantic"], label: "Atlantic coast (Southeast Florida)" }, GA = { tags: ["atlantic"], label: "Georgia", outside: true, state: "GA" };
  const ga = (sp, len, d, st) => S.keeperCheck(sp, len, d || new Date("2026-10-21T12:00:00"), st ? { tags: ["atlantic"], label: st, outside: true, state: st } : GA);

  // Florida is untouched
  ok("Florida redfish still uses the Florida row", S.ruleFor("redfish", FL).species === "Redfish (red drum)");
  const k = S.keeperCheck("Redfish", 20, new Date("2026-10-21T12:00:00"), FL);
  ok("Florida keeper text still says FWC and never Georgia", /Keeper size/.test(k.text) && /FWC/.test(k.text) && !/Georgia|Georgia DNR/.test(k.text));
  ok("a Florida fish name never finds a state row", S.ruleFor("striped bass", FL) === null);

  // Georgia / South Carolina / Alabama / North Carolina
  let r = ga("Redfish", 20);
  ok("Georgia redfish 20″ → keeper, Georgia rule and Georgia DNR", r.level === "ok" && /Rule for Georgia: 14″–23″/.test(r.text) && /Georgia DNR/.test(r.text) && !/FWC|Florida/.test(r.text));
  ok("Georgia redfish 25″ → over the slot", ga("Redfish", 25).level === "bad" && /Over the 23″ slot/.test(ga("Redfish", 25).text));
  ok("Georgia redfish 12″ → under size", ga("Red drum", 12).level === "bad" && /Under size/.test(ga("Red drum", 12).text));
  ok("South Carolina: 24″ red drum is a keeper, 26″ is not", ga("Redfish", 24, null, "SC").level === "ok" && ga("Redfish", 26, null, "SC").level === "bad");
  ok("Alabama flounder in November → out of season", ga("Flounder", 16, new Date("2026-11-10T12:00:00"), "AL").level === "bad" && /out of season/.test(ga("Flounder", 16, new Date("2026-11-10T12:00:00"), "AL").text));
  ok("Alabama flounder in October → fine", ga("Flounder", 16, new Date("2026-10-10T12:00:00"), "AL").level === "ok");
  ok("North Carolina flounder open Sep 5, closed Sep 20", ga("Flounder", 16, new Date("2026-09-05T12:00:00"), "NC").level === "ok" && ga("Flounder", 16, new Date("2026-09-20T12:00:00"), "NC").level === "bad");
  ok("Georgia black bass uses the black-bass row", /Rule for Georgia: 12″ minimum/.test(ga("Largemouth bass", 13).text));

  // honest gaps
  const gap = ga("Tarpon", 40);
  ok("Georgia fish with no row → \"We don't have a Georgia rule for this fish yet\" + buttons", gap.level === "info" && /We don't have a Georgia rule for this fish yet/.test(gap.text) && gap.gate.links.length === 2);
  ok("a state with no rows at all keeps the old message", /We don't have Ohio rules yet/.test(ga("Redfish", 20, null, "OH").text));
  ok("Georgia rows are not used in Alabama", /We don't have a Alabama rule|We don't have Alabama rules yet|Alabama/.test(ga("Largemouth bass", 13, null, "AL").text) && !/Rule for Georgia/.test(ga("Largemouth bass", 13, null, "AL").text));

  // Seasons cards
  S.setInfo(GA);
  const card = { name: "Redfish (red drum)", match: ["redfish", "red drum"], shore: [0], closed: [["01-01", "12-31"]] };
  const v = S.seasonView(card);
  ok("Georgia card shows the Georgia rule, date and agency; no Florida closed dates", /Georgia: 14″–23″ total length/.test(v.rule) && /checked \d{4}-\d{2}-\d{2}/.test(v.rule) && /Georgia DNR/.test(v.rule) && v.closed === undefined);
  S.setInfo({ tags: ["atlantic"], label: "Alabama", outside: true, state: "AL" });
  const vf = S.seasonView({ name: "Flounder", match: ["flounder"] });
  ok("Alabama flounder card carries the closed window", JSON.stringify(vf.closed) === '[["11-01","11-30"]]');
  S.setInfo({ tags: ["atlantic"], label: "Georgia", outside: true, state: "GA" });
  ok("a Georgia card with no row says We don't have…", /We don't have a Georgia rule for this fish yet/.test(S.seasonView({ name: "Tarpon", match: ["tarpon"] }).rule));
  S.setInfo({ tags: ["atlantic"], label: "Ohio", outside: true, state: "OH" });
  ok("Ohio still says no rules yet", /We don't have Ohio rules yet/.test(S.seasonView({ name: "Redfish", match: ["redfish"] }).rule));
  S.setInfo(FL);
  const same = { name: "Snook", match: ["snook"], rule: "x" };
  ok("Florida card: Florida rule line and closed dates", S.seasonView(same).closed.length === 2 && /1 per person/.test(S.seasonView(same).rule));

  // which card list
  S.setInfo(FL); ok("Florida → the Florida cards", S.seasonList()[0] === "FL");
  S.setInfo(GA); ok("Georgia → the Southeast cards", S.seasonList()[0] === "SE");
  S.setInfo({ outside: true, state: "OH" }); ok("Ohio → still the Florida cards (until its region is built)", S.seasonList()[0] === "FL");
  S.setInfo({ outside: true, state: null }); ok("abroad → the Florida cards", S.seasonList()[0] === "FL");

  // the Southeast cards themselves
  const se = new Function(read("js/55-southeast-seasons.js") + "; return { SE_STATES, SEASONS_SE };")();
  const names = se.SEASONS_SE.map(f => f.name);
  ok("five Southeast states", se.SE_STATES.join() === "GA,AL,SC,NC,MS");
  ok("every card complete: name, group, words, 12 shore + 12 boat ratings 0–2, temp, tip", se.SEASONS_SE.every(f => f.name && ["inshore", "beach", "offshore", "fresh"].includes(f.group) && f.match.length && [f.shore, f.boat].every(a => a.length === 12 && a.every(n => n >= 0 && n <= 2)) && f.temp && f.temp.low < f.temp.high && f.temp.cold < f.temp.low && f.tip));
  ok("no repeated names", new Set(names).size === names.length);
  ["Redfish (red drum)", "Spotted seatrout", "Flounder", "Largemouth bass", "Striped bass & hybrids", "Black & white crappie", "Channel catfish"].forEach(n => ok("has the " + n + " card", names.includes(n)));
  ok("spawn windows are real months", se.SEASONS_SE.every(f => !f.spawn || f.spawn.m.every(m => m >= 1 && m <= 12)));

  // the SQL file
  const tagged = sql.match(/array\['(GA|AL|SC|NC|MS)'\]/g) || [];
  ok("33 state rows: GA 7, AL 7, SC 6, NC 7, MS 6", tagged.length === 33 && ["GA", "AL", "SC", "NC", "MS"].every((c, i) => tagged.filter(t => t.includes(c)).length === [7, 7, 6, 7, 6][i]));
  ok("every row dated and linked", (sql.match(/'2026-10-21', true\)/g) || []).length === 33 && (sql.match(/'https:\/\/[^']+', '2026-10-21'/g) || []).length === 33);
  ok("the regions check now allows state codes", /fish_rules_regions_ok/.test(sql) && /'GA'/.test(sql.split("insert into")[0]) && /'WY'/.test(sql.split("insert into")[0]));
  ok("no delete / truncate in the SQL", !/\b(delete|truncate)\b/i.test(sql.replace(/--.*$/gm, "")));

  // wiring
  ok("js/55 loaded by the page and kept offline", /<script src="js\/55-southeast-seasons\.js\?v=\d+"><\/script>/.test(read("index.html")) && read("sw.js").includes('"./js/55-southeast-seasons.js"'));
  ok("species page, Fish ID and the catch list know the new fish", /stateRuleFor\(title, inf\.state\)/.test(read("js/18-species.js")) && /fishIdState/.test(read("js/07-measure-fishid.js")) && /SPECIES_SUGGEST_US/.test(read("js/06-catching.js")));
  ok("identify-fish accepts a state and lists the US fish", /otherState/.test(read("supabase/functions/identify-fish/index.ts")) && /Striped bass/.test(read("supabase/functions/identify-fish/index.ts")));

  console.log(bad ? `test168 FAILED (${bad})` : "test168 OK");
  process.exit(bad ? 1 : 0);
})();
