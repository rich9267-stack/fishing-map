// test179: Pacific (WA, OR, CA rows; a made-up place "ZZ" is the honest gap): state rows, keeper check, closed dates, slots, ocean fish, Seasons cards, SQL file (US plan step 4)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const t10 = read("js/10-tools-safety.js"), s31 = read("js/31-regional-rules.js"), s05 = read("js/05-seasons-records.js");
const cut = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b));
const sql = read("setup/105-pacific-rules.sql");

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
  "const STATE_NAMES = { WA: 'Washington', OR: 'Oregon', CA: 'California', KS: 'Kansas', MT: 'Montana', GA: 'Georgia', ZZ: 'Testland' };",
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
const STATES = [["WA", 22], ["OR", 15], ["CA", 27]];
const PAC = ["WA", "OR", "CA"];

(async () => {
  await S.loadRules();
  const per = c => ROWS.filter(r => r.regions && r.regions[0] === c).length;
  ok("the SQL parses into 64 rows: WA 22, OR 15, CA 27", ROWS.length === 65 && STATES.every(([c, n]) => per(c) === n));
  ok("state rows are kept apart from Florida's", S.stateRules.length === 64 && S.fishRules.length === 1);

  // Florida untouched
  const fl = S.keeperCheck("Redfish", 20, day("2026-10-22"), FL);
  ok("Florida redfish: Florida row, FWC, no Pacific words", /FWC/.test(fl.text) && !/Washington|Oregon|California/.test(fl.text));
  S.setInfo(FL);
  ok("Florida seasons cards still the Florida list", S.seasonList()[0] === "FL");

  // Washington (strictest marine area / water type held)
  ok("Washington river trout 8″ minimum, 2 per day", chk("WA", "Rainbow trout", 7).level === "bad" && /2 per day/.test(chk("WA", "Rainbow trout", 10).text));
  ok("Washington steelhead 20″ minimum; bull trout release", chk("WA", "Steelhead", 19).level === "bad" && chk("WA", "Steelhead", 24).level === "ok" && chk("WA", "Bull trout", 20).level === "bad");
  ok("Washington largemouth over 12″ → release (1 over 17″ in the note)", chk("WA", "Largemouth bass", 14).level === "bad" && /except 1 over 17″/.test(sql));
  ok("Washington smallmouth 1 over 14″ (warn); walleye 12″ min, 1 over 22″", chk("WA", "Smallmouth bass", 16).level === "warn" && chk("WA", "Walleye", 11).level === "bad" && chk("WA", "Walleye", 24).level === "warn");
  ok("Washington tiger muskie 50″", chk("WA", "Tiger muskie", 45).level === "bad" && chk("WA", "Tiger muskie", 51).level === "ok");
  ok("Washington Chinook 24″, coho 16″, pink no minimum", chk("WA", "Chinook salmon", 23).level === "bad" && chk("WA", "Coho salmon", 15).level === "bad" && chk("WA", "Pink salmon", 15).level === "ok");
  ok("Washington kokanee salmon uses the kokanee row", /10 per day/.test(chk("WA", "Kokanee salmon", 12).text));
  ok("Washington lingcod: 26–36″ slot, only May 1 – June 15", chk("WA", "Lingcod", 30, "2026-05-20").level === "ok" && chk("WA", "Lingcod", 24, "2026-05-20").level === "bad" && chk("WA", "Lingcod", 38, "2026-05-20").level === "bad" && chk("WA", "Lingcod", 30, "2026-07-01").level === "bad");
  ok("Washington cabezon 18″, closed in winter", chk("WA", "Cabezon", 17, "2026-06-01").level === "bad" && chk("WA", "Cabezon", 20, "2026-06-01").level === "ok" && chk("WA", "Cabezon", 20, "2026-02-01").level === "bad");
  ok("Washington rockfish release (Puget Sound closed), coast 7 in the note", chk("WA", "Black rockfish", 14).level === "bad" && /Ocean coast \(Areas 1–4\): 7 per day/.test(sql));
  ok("Washington sturgeon release; Columbia keep window in the note", chk("WA", "White sturgeon", 45).level === "bad" && /between Bonneville and McNary dams/.test(sql));
  ok("Washington pike must be dead; halibut 1 per day", /must be dead/.test(chk("WA", "Northern pike", 25).text) && /1 per day/.test(chk("WA", "Pacific halibut", 30).text));

  // Oregon (strictest zone held)
  ok("Oregon trout 12″ minimum (Columbia River Zone), 1 over 20″ warns", chk("OR", "Rainbow trout", 10).level === "bad" && chk("OR", "Rainbow trout", 14).level === "ok" && chk("OR", "Rainbow trout", 22).level === "warn");
  ok("Oregon bass 1 over 15″ (Southwest Zone); walleye no limit", chk("OR", "Largemouth bass", 17).level === "warn" && /No limit/.test(chk("OR", "Walleye", 20).text));
  ok("Oregon salmon and steelhead share one row", /2 adults per day/.test(chk("OR", "Chinook salmon", 30).text) && /2 adults per day/.test(chk("OR", "Steelhead", 30).text));
  ok("Oregon lingcod 22″, cabezon 16″", chk("OR", "Lingcod", 21).level === "bad" && chk("OR", "Lingcod", 24).level === "ok" && chk("OR", "Cabezon", 15).level === "bad");
  ok("Oregon yelloweye never, black rockfish uses the rockfish row", chk("OR", "Yelloweye rockfish", 20).level === "bad" && /Set each year/.test(chk("OR", "Black rockfish", 14).text));
  ok("Oregon sturgeon and bull trout release; surfperch 15", chk("OR", "White sturgeon", 45).level === "bad" && chk("OR", "Bull trout", 20).level === "bad" && /15 per day/.test(chk("OR", "Redtail surfperch", 10).text));

  // California
  ok("California black bass 13″ (Colorado River District held), 5 per day", chk("CA", "Largemouth bass", 12.5).level === "bad" && chk("CA", "Largemouth bass", 14).level === "ok" && /5 per day/.test(chk("CA", "Spotted bass", 14).text));
  ok("California brook trout must be under 10″", chk("CA", "Brook trout", 11).level === "bad" && chk("CA", "Brook trout", 8).level === "ok");
  ok("California striped bass 18″, 2 per day", chk("CA", "Striped bass", 17).level === "bad" && /2 per day/.test(chk("CA", "Striped bass", 20).text));
  ok("California Chinook: 24″, closed Nov 1 – Apr 30", chk("CA", "Chinook salmon", 22, "2026-07-01").level === "bad" && chk("CA", "Chinook salmon", 26, "2026-07-01").level === "ok" && chk("CA", "King salmon", 26, "2026-11-15").level === "bad");
  ok("California coho never; sockeye uses the ocean salmon row", chk("CA", "Coho salmon", 26).level === "bad" && chk("CA", "Silver salmon", 26).level === "bad" && /2 per day/.test(chk("CA", "Sockeye salmon", 26, "2026-07-01").text));
  ok("California kokanee salmon beats the 'salmon' word", /5 per day/.test(chk("CA", "Kokanee salmon", 12).text) && !/Ocean salmon/.test(chk("CA", "Kokanee salmon", 12).text));
  ok("California rockfish: boats closed Jan – Mar; 10 per day", chk("CA", "Vermilion rockfish", 14, "2026-02-01").level === "bad" && /10 per day/.test(chk("CA", "Vermilion rockfish", 14, "2026-06-01").text));
  ok("California yelloweye, cowcod, quillback: never", ["Yelloweye rockfish", "Cowcod", "Quillback rockfish"].every(f => chk("CA", f, 15, "2026-06-01").level === "bad"));
  ok("California yellowtail rockfish is a rockfish, yellowtail is its own fish", /rockfish, cabezon/.test(chk("CA", "Yellowtail rockfish", 14, "2026-06-01").text) && /10 per day/.test(chk("CA", "Yellowtail", 30).text) && !/rockfish/.test(chk("CA", "Yellowtail", 30).text));
  ok("California lingcod 22″; halibut 22″ (California), Pacific halibut its own row", chk("CA", "Lingcod", 20, "2026-06-01").level === "bad" && chk("CA", "California halibut", 21).level === "bad" && chk("CA", "Halibut", 23).level === "ok" && /1 per day/.test(chk("CA", "Pacific halibut", 30, "2026-06-01").text) && chk("CA", "Pacific halibut", 30, "2026-12-01").level === "bad");
  ok("California kelp bass 14″, white seabass 28″, sheephead 12″ (boats closed Jan–Feb)", chk("CA", "Kelp bass", 13).level === "bad" && chk("CA", "White seabass", 27).level === "bad" && chk("CA", "California sheephead", 13, "2026-02-10").level === "bad" && chk("CA", "California sheephead", 13, "2026-06-10").level === "ok");
  ok("California redtail surfperch 10½″; other surfperch no minimum", chk("CA", "Redtail surfperch", 10).level === "bad" && chk("CA", "Barred surfperch", 8).level === "ok");
  ok("California giant sea bass and garibaldi: never; leopard shark 36″", chk("CA", "Giant sea bass", 40).level === "bad" && chk("CA", "Garibaldi", 8).level === "bad" && chk("CA", "Leopard shark", 30).level === "bad");
  ok("California sturgeon release; pike must be killed", chk("CA", "White sturgeon", 50).level === "bad" && /killed and reported/.test(chk("CA", "Northern pike", 25).text));
  ok("California ocean whitefish is not the mountain whitefish row", !/Mountain whitefish/.test(chk("CA", "Ocean whitefish", 14).text));
  ok("a crab gets no size check (shell widths don't fit)", /We don't have an? California rule for this fish yet/.test(chk("CA", "Dungeness crab", 6).text));

  // honest gaps
  ok("a made-up place (no rows) says no rules yet", /We don't have Testland rules yet/.test(chk("ZZ", "Walleye", 20).text));
  ok("an Oregon rule is never used in Washington", !/Oregon/.test(chk("WA", "Walleye", 19).text));

  // Seasons cards
  S.setInfo(inf("CA"));
  const v = S.seasonView({ name: "Lingcod", match: ["lingcod"] });
  ok("California lingcod card shows the rule and the checked date", /California/.test(v.rule) && /checked 2026-10-22/.test(v.rule));
  S.setInfo(inf("ZZ"));
  ok("a made-up place's card says We don't have…", /We don't have Testland rules yet/.test(S.seasonView({ name: "Walleye", match: ["walleye"] }).rule));
  PAC.forEach(c => { S.setInfo(inf(c)); ok(c + " → the Pacific cards", S.seasonList()[0] === "PAC"); });
  S.setInfo(inf("MT")); ok("Montana → still the Mountain West cards", S.seasonList()[0] === "MW");
  S.setInfo(inf("KS")); ok("Kansas → still the Plains cards", S.seasonList()[0] === "PLAINS");
  S.setInfo(inf("GA")); ok("Georgia → the Southeast cards (unchanged)", S.seasonList()[0] === "SE");
  S.setInfo(inf("XX")); ok("a place outside every list (XX) → the Florida cards", S.seasonList()[0] === "FL");

  // the cards
  const g = new Function(read("js/55-southeast-seasons.js") + "; return { PAC_STATES, SEASONS_PAC };")();
  const names = g.SEASONS_PAC.map(f => f.name);
  ok("three Pacific states", g.PAC_STATES.join() === PAC.join());
  ok("every card complete: name, group, words, 12 shore + 12 boat ratings 0–2, temp, tip", g.SEASONS_PAC.every(f => f.name && ["inshore", "beach", "offshore", "fresh"].includes(f.group) && f.match.length && [f.shore, f.boat].every(a => a.length === 12 && a.every(n => n >= 0 && n <= 2)) && f.temp && f.temp.low < f.temp.high && f.temp.cold < f.temp.low && f.tip));
  ok("no repeated names", new Set(names).size === names.length);
  ["Chinook (king) salmon", "Coho (silver) salmon", "Rockfish", "Lingcod", "Cabezon & greenling", "California halibut", "Kelp & sand bass", "California sheephead", "Dungeness crab", "Surfperch", "Leopard shark", "Pacific halibut", "Albacore tuna", "Yellowtail", "White seabass", "Steelhead", "Rainbow & cutthroat trout", "Kokanee", "Largemouth bass", "Smallmouth bass", "Walleye", "Striped bass", "White sturgeon", "Catfish", "Crappie & sunfish"].forEach(n => ok("card: " + n, names.includes(n)));
  ok("all four groups have cards (inshore, beach, offshore, fresh)", ["inshore", "beach", "offshore", "fresh"].every(gr => g.SEASONS_PAC.some(f => f.group === gr)));
  ok("spawn windows are real months", g.SEASONS_PAC.every(f => !f.spawn || f.spawn.m.every(m => m >= 1 && m <= 12)));
  const SHORT = ["pike", "trout", "bass", "spot", "perch", "cod", "crab"];
  ok("no card or row uses a short word that would match other fish", g.SEASONS_PAC.every(f => f.match.every(w => !SHORT.includes(w))) && S.stateRules.every(r => r.match.every(w => !SHORT.includes(w))));
  const cardWords = n => g.SEASONS_PAC.find(c => c.name === n).match;
  ok("every state's rows reach its trout, bass, lingcod and sturgeon cards", PAC.every(st => ["Rainbow & cutthroat trout", "Largemouth bass", "Lingcod", "White sturgeon"].every(n => S.stateRules.filter(r => r.regions[0] === st && r.match.some(w => cardWords(n).includes(w))).length >= 1)));

  // the SQL file
  const code105 = sql.replace(/--.*$/gm, "");
  ok("every row dated 2026-10-22 and linked to an https source", (sql.match(/'2026-10-22', true\)/g) || []).length === 64 && (sql.match(/'https:\/\/[^']+', '2026-10-22'/g) || []).length === 64);
  ok("no delete / truncate / drop / update in the SQL", !/\b(delete|truncate|drop|update)\b/i.test(code105));
  ok("rows only for the three states", !/array\['(?!WA|OR|CA)[A-Z]{2}'\]/.test(code105));
  ok("closed / open-only dates are valid MM-DD pairs, start before end", ROWS.every(r => [r.closed, r.open_only].every(x => !x || x.every(([a, b]) => /^\d\d-\d\d$/.test(a) && /^\d\d-\d\d$/.test(b) && a <= b))));
  ok("one-over rows all have a max size", ROWS.every(r => !r.one_over || r.max_in != null));
  ok("no crab or lobster rows (shell sizes don't fit total / fork length)", !/dungeness|lobster/i.test(code105));
  ok("setup/94 already allows these state codes", PAC.every(c => read("setup/94-southeast-rules.sql").includes("'" + c + "'")));
  ok("states and agencies already in js/54", PAC.every(c => new RegExp("\\b" + c + ": \\[").test(read("js/54-state-agencies.js"))));

  console.log(bad ? `test179 FAILED (${bad})` : "test179 OK");
  process.exit(bad ? 1 : 0);
})();
