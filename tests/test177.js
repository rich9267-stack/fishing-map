// test177: Mountain West (MT, ID, WY, CO, UT, NV, AZ, NM rows; Oregon is the honest gap): state rows, keeper check, closed dates, one-over slots, Seasons cards, SQL file (US plan step 4)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const t10 = read("js/10-tools-safety.js"), s31 = read("js/31-regional-rules.js"), s05 = read("js/05-seasons-records.js");
const cut = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b));
const sql = read("setup/103-mountain-west-rules.sql");

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
  "const STATE_NAMES = { MT: 'Montana', ID: 'Idaho', WY: 'Wyoming', CO: 'Colorado', UT: 'Utah', NV: 'Nevada', AZ: 'Arizona', NM: 'New Mexico', OR: 'Oregon', KS: 'Kansas', SD: 'South Dakota' };",
  "const me = {}, db = { from: () => ({ select: () => ({ eq: async () => ({ data: ROWS }) }) }) }; const renderSeasons = null;",
  "let CURX = null; const rulesInfo = () => CURX;",
  read("js/54-state-agencies.js"),
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
const STATES = [["MT", 18], ["ID", 10], ["WY", 12], ["CO", 14], ["UT", 14], ["NV", 7], ["AZ", 9], ["NM", 14]];
const MW = ["MT", "ID", "WY", "CO", "UT", "NV", "AZ", "NM"];

(async () => {
  await S.loadRules();
  const per = c => ROWS.filter(r => r.regions && r.regions[0] === c).length;
  ok("the SQL parses into 98 rows: MT 18, ID 10, WY 12, CO 14, UT 14, NV 7, AZ 9, NM 14", ROWS.length === 99 && STATES.every(([c, n]) => per(c) === n));
  ok("state rows are kept apart from Florida's", S.stateRules.length === 98 && S.fishRules.length === 1);

  // Florida untouched
  const fl = S.keeperCheck("Redfish", 20, day("2026-10-22"), FL);
  ok("Florida redfish: Florida row, FWC, no Mountain West words", /FWC/.test(fl.text) && !/Montana|Idaho|Wyoming|Colorado|Utah|Nevada|Arizona|New Mexico/.test(fl.text));
  S.setInfo(FL);
  ok("Florida seasons cards still the Florida list", S.seasonList()[0] === "FL");

  // Montana (strictest district held)
  ok("Montana rainbow trout: 3 per day, only 1 over 14″ (warn, not bad)", /3 per day/.test(chk("MT", "Rainbow trout", 12).text) && chk("MT", "Rainbow trout", 12).level === "ok" && chk("MT", "Rainbow trout", 16).level === "warn");
  ok("Montana cutthroat over 12″ → release (Western rivers rule)", chk("MT", "Westslope cutthroat trout", 13).level === "bad" && chk("MT", "Cutthroat trout", 11).level === "ok");
  ok("Montana bull trout and pallid sturgeon: release only", chk("MT", "Bull trout", 20).level === "bad" && chk("MT", "Pallid sturgeon", 30).level === "bad");
  ok("Montana shovelnose over 40″ → release", chk("MT", "Shovelnose sturgeon", 41).level === "bad" && chk("MT", "Shovelnose sturgeon", 30).level === "ok");
  ok("Montana tiger muskie must be over 40″", chk("MT", "Tiger muskie", 38).level === "bad" && chk("MT", "Tiger muskie", 42).level === "ok");
  ok("Montana brook trout, lake trout, walleye rows; Montana named, no FWC", /10 per day/.test(chk("MT", "Brook trout", 8).text) && /3 per day/.test(chk("MT", "Lake trout", 20).text) && /only 2 may be sauger/.test(chk("MT", "Walleye", 16).text) && /Montana/.test(chk("MT", "Walleye", 16).text) && !/FWC\b/.test(chk("MT", "Walleye", 16).text));
  ok("Montana kokanee salmon uses the salmon row, not trout", /5 per day/.test(chk("MT", "Kokanee salmon", 12).text));

  // Idaho
  ok("Idaho bass 14″ minimum (Southeast Region rule)", chk("ID", "Smallmouth bass", 13).level === "bad" && chk("ID", "Largemouth bass", 15).level === "ok");
  ok("Idaho trout 2 per day (Clearwater rivers), brook trout 25", /2 per day/.test(chk("ID", "Rainbow trout", 12).text) && /25 per day/.test(chk("ID", "Brook trout", 8).text));
  ok("Idaho bull trout and white sturgeon release only; tiger muskie 40″", chk("ID", "Bull trout", 20).level === "bad" && chk("ID", "White sturgeon", 50).level === "bad" && chk("ID", "Tiger muskie", 39).level === "bad");
  ok("Idaho crappie and perch: no limit row", /No limit/.test(chk("ID", "Crappie", 10).text) && /No limit/.test(chk("ID", "Yellow perch", 8).text));

  // Wyoming
  ok("Wyoming trout: 3 per day in streams, 1 over 16″", /3 per day/.test(chk("WY", "Brown trout", 12).text) && chk("WY", "Brown trout", 18).level === "warn");
  ok("Wyoming lake trout one over 24″; brook trout 16; tiger muskie 36″", chk("WY", "Lake trout", 26).level === "warn" && /16 per day/.test(chk("WY", "Brook trout", 8).text) && chk("WY", "Tiger muskie", 35).level === "bad" && chk("WY", "Tiger muskie", 37).level === "ok");
  ok("Wyoming walleye 6, sauger 2, panfish 50", /6 per day/.test(chk("WY", "Walleye", 15).text) && /2 per day/.test(chk("WY", "Sauger", 12).text) && /50 per day/.test(chk("WY", "Bluegill", 6).text));
  ok("Wyoming northern pike (no row) → gap message", /We don't have an? Wyoming rule for this fish yet/.test(chk("WY", "Northern pike", 25).text));

  // Colorado
  ok("Colorado trout 4 per day; kokanee 10 (own row)", /4 per day/.test(chk("CO", "Rainbow trout", 12).text) && /10 per day/.test(chk("CO", "Kokanee salmon", 12).text));
  ok("Colorado greenback cutthroat release only, ordinary cutthroat in the trout row", chk("CO", "Greenback cutthroat trout", 10).level === "bad" && chk("CO", "Cutthroat trout", 10).level === "ok");
  ok("Colorado pikeminnow is protected, never the pike row", chk("CO", "Colorado pikeminnow", 20).level === "bad");
  ok("Colorado tiger muskie 36″; walleye 5; wiper 10", chk("CO", "Tiger muskie", 35).level === "bad" && /5 per day/.test(chk("CO", "Walleye", 16).text) && /10 per day/.test(chk("CO", "Wiper", 16).text));

  // Utah
  ok("Utah trout 4 per day", /4 per day/.test(chk("UT", "Rainbow trout", 12).text));
  ok("Utah kokanee can't be kept Sept 10 – Nov 30", chk("UT", "Kokanee salmon", 12, "2026-10-01").level === "bad" && chk("UT", "Kokanee salmon", 12, "2026-07-01").level === "ok" && chk("UT", "Kokanee salmon", 12, "2026-09-09").level === "ok");
  ok("Utah walleye 1 over 24″, pike 1 over 36″, tiger muskie over 40″", chk("UT", "Walleye", 25).level === "warn" && chk("UT", "Northern pike", 38).level === "warn" && chk("UT", "Tiger muskie", 39).level === "bad");
  ok("Utah wiper 3 beats the striped bass row", /3 per day/.test(chk("UT", "Wiper", 16).text) && /No limit/.test(chk("UT", "Striped bass", 20).text));

  // Nevada
  ok("Nevada trout 5, black bass 5 (Western Region)", /5 per day/.test(chk("NV", "Rainbow trout", 12).text) && /5 per day/.test(chk("NV", "Largemouth bass", 14).text));
  ok("Nevada pike must be killed; bull trout release only", /must kill/.test(chk("NV", "Northern pike", 25).text) && chk("NV", "Bull trout", 20).level === "bad");
  ok("Nevada striped bass: 15 warmwater game fish row; Mead/Mohave in the SQL note", /15 warmwater/.test(chk("NV", "Striped bass", 20).text) && /Lakes Mead and Mohave: no limit on striped bass/.test(sql));

  // Arizona
  ok("Arizona trout 4 (incl. Apache trout), bass 6, stripers 10, catfish 10", /4 per day/.test(chk("AZ", "Apache trout", 12).text) && /6 per day/.test(chk("AZ", "Largemouth bass", 14).text) && /10 per day/.test(chk("AZ", "Striped bass", 20).text) && /10 per day/.test(chk("AZ", "Flathead catfish", 20).text));
  ok("Arizona roundtail chub release only; crappie no limit", chk("AZ", "Roundtail chub", 12).level === "bad" && /No limit/.test(chk("AZ", "Crappie", 10).text));

  // New Mexico
  ok("New Mexico largemouth 14″; smallmouth 14″ (stricter waters held)", chk("NM", "Largemouth bass", 13).level === "bad" && chk("NM", "Largemouth bass", 15).level === "ok" && chk("NM", "Smallmouth bass", 13).level === "bad");
  ok("New Mexico trout 5, lake trout 2, cutthroat 2", /5 per day/.test(chk("NM", "Rainbow trout", 12).text) && /2 per day/.test(chk("NM", "Lake trout", 20).text) && /2 per day/.test(chk("NM", "Cutthroat trout", 12).text));
  ok("New Mexico tiger muskie 40″; striped bass 1; catfish 2 in summer catfish waters", chk("NM", "Tiger muskie", 39).level === "bad" && /1 per day/.test(chk("NM", "Striped bass", 20).text) && /2 per day/.test(chk("NM", "Channel catfish", 18).text));

  // honest gaps
  ok("Kansas (no rows) says no rules yet", /We don't have Kansas rules yet/.test(chk("KS", "Rainbow trout", 12).text));
  ok("a Utah rule is never used in Colorado", !/Utah/.test(chk("CO", "Walleye", 19).text));
  ok("no Plains rows loaded here → South Dakota says no rules yet", /We don't have South Dakota rules yet/.test(chk("SD", "Walleye", 19).text));

  // Seasons cards
  S.setInfo(inf("UT"));
  const v = S.seasonView({ name: "Kokanee salmon", match: ["kokanee"] });
  ok("Utah kokanee card shows the rule and the checked date", /Utah/.test(v.rule) && /checked 2026-10-22/.test(v.rule));
  S.setInfo(inf("KS"));
  ok("a Kansas card says We don't have…", /We don't have Kansas rules yet/.test(S.seasonView({ name: "Walleye & sauger", match: ["walleye"] }).rule));
  MW.forEach(c => { S.setInfo(inf(c)); ok(c + " → the Mountain West cards", S.seasonList()[0] === "MW"); });
  ["KS", "SD", "WV"].forEach(c => { S.setInfo(inf(c)); ok(c + " → still the Plains cards", S.seasonList()[0] === "PLAINS"); });
  S.setInfo(inf("OH")); ok("Ohio → still the Great Lakes cards", S.seasonList()[0] === "GL");
  S.setInfo(inf("GA")); ok("Georgia → the Southeast cards (unchanged)", S.seasonList()[0] === "SE");
  S.setInfo(inf("TX")); ok("Texas → the Gulf cards (unchanged)", S.seasonList()[0] === "GULF");
  S.setInfo(inf("OR")); ok("Oregon → the Pacific cards", S.seasonList()[0] === "PAC");
  S.setInfo(inf("XX")); ok("a place outside every list (XX) → the Florida cards", S.seasonList()[0] === "FL");

  // the cards
  const g = new Function(read("js/55-southeast-seasons.js") + "; return { MW_STATES, SEASONS_MW };")();
  const names = g.SEASONS_MW.map(f => f.name);
  ok("eight Mountain West states", g.MW_STATES.join() === MW.join());
  ok("every card complete: name, group, words, 12 shore + 12 boat ratings 0–2, temp, tip", g.SEASONS_MW.every(f => f.name && ["inshore", "beach", "offshore", "fresh"].includes(f.group) && f.match.length && [f.shore, f.boat].every(a => a.length === 12 && a.every(n => n >= 0 && n <= 2)) && f.temp && f.temp.low < f.temp.high && f.temp.cold < f.temp.low && f.tip));
  ok("no repeated names", new Set(names).size === names.length);
  ["Rainbow & brown trout", "Cutthroat trout", "Brook trout", "Lake trout", "Kokanee salmon", "Mountain whitefish & grayling", "Largemouth bass", "Smallmouth bass", "Walleye & sauger", "Northern pike", "Tiger muskie", "Striped bass & wipers", "Catfish", "Black & white crappie", "Yellow perch", "Bluegill & sunfish"].forEach(n => ok("card: " + n, names.includes(n)));
  ok("spawn windows are real months", g.SEASONS_MW.every(f => !f.spawn || f.spawn.m.every(m => m >= 1 && m <= 12)));
  const SHORT = ["pike", "trout", "bass", "spot"];
  ok("no card or row uses a short word that would match other fish (pike, trout, bass alone)", g.SEASONS_MW.every(f => f.match.every(w => !SHORT.includes(w))) && S.stateRules.every(r => r.match.every(w => !SHORT.includes(w))));
  const cardWords = n => g.SEASONS_MW.find(c => c.name === n).match;
  ok("every state's rows reach its trout and bass cards", MW.every(st => ["Rainbow & brown trout", "Largemouth bass"].every(n => S.stateRules.filter(r => r.regions[0] === st && r.match.some(w => cardWords(n).includes(w))).length >= 1)));

  // the SQL file
  const code103 = sql.replace(/--.*$/gm, "");
  ok("every row dated 2026-10-22 and linked to an https source", (sql.match(/'2026-10-22', true\)/g) || []).length === 98 && (sql.match(/'https:\/\/[^']+', '2026-10-22'/g) || []).length === 98);
  ok("no delete / truncate / drop / update in the SQL", !/\b(delete|truncate|drop|update)\b/i.test(code103));
  ok("rows only for the eight states", !/array\['(?!MT|ID|WY|CO|UT|NV|AZ|NM)[A-Z]{2}'\]/.test(code103));
  ok("closed / open-only dates are valid MM-DD pairs", ROWS.every(r => [r.closed, r.open_only].every(x => !x || x.every(([a, b]) => /^\d\d-\d\d$/.test(a) && /^\d\d-\d\d$/.test(b)))));
  ok("one-over rows all have a max size", ROWS.every(r => !r.one_over || r.max_in != null));
  ok("setup/94 already allows these state codes", MW.every(c => read("setup/94-southeast-rules.sql").includes("'" + c + "'")));
  ok("states and agencies already in js/54", MW.every(c => new RegExp("\\b" + c + ": \\[").test(read("js/54-state-agencies.js"))));

  console.log(bad ? `test177 FAILED (${bad})` : "test177 OK");
  process.exit(bad ? 1 : 0);
})();
