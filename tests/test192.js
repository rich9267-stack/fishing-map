// test192: 📚 Learn page, step 2 (js/62): Fish tile = searchable list + long fish cards; limits come only from the chosen state's rules rows.
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const cut = (s, a, b) => { const i = s.indexOf(a); if (i < 0) throw new Error("missing " + a); return s.slice(i, s.indexOf(b, i)); };
// (setting textContent = "" empties a node, as in a browser)
const withText = o => { let t = o.textContent; Object.defineProperty(o, "textContent", { get: () => t, set: v => { t = v; if (v === "") o.children.length = 0; } }); return o; };
const mk = (tag, cls, text) => withText({ tag, className: cls || "", textContent: text || "", children: [], attrs: {}, hidden: false, handlers: {}, style: {}, dataset: {}, value: "", selected: false,
  appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; } });
const nodes = { "learn-body": mk("div"), "view-learn": mk("div"), "learn-card": mk("button"), "learn-back": mk("button") };
nodes["view-learn"].hidden = false;
{ const b = nodes["learn-body"]; let t = ""; Object.defineProperty(b, "textContent", { get: () => t, set: v => { t = v; if (v === "") b.children.length = 0; } }); }
const allText = n => (n.textContent || "") + " " + n.children.map(allText).join(" ");
const walk = (n, f) => { f(n); n.children.forEach(c => walk(c, f)); };
const fishJson = JSON.parse(read("data/learn/fish.json"));
let fetched = [], failFetch = false;
const ctx = { console, Date, JSON, Math, isFinite, Array, Object, Promise, String, Number, RegExp, parseInt, setTimeout, $: id => nodes[id], el: mk, window: { scrollTo() {} },
  LAT: 26.24, LNG: -80.10, showView() {}, loadRules: async () => {}, zonesEnsure: () => null, zn: { rows: [] },
  fishSvg: (n, px) => mk("svg", "fishsvg", ""),
  fetch: async u => { fetched.push(u); if (failFetch) return { ok: false, status: 404 }; return { ok: true, json: async () => fishJson }; } };
vm.createContext(ctx);
const t10 = read("js/10-tools-safety.js");
const helpers = cut(t10, "  let fishRules = [];", "  async function loadRules") + cut(t10, "  const RULE_TAG_NAMES", "  function pickRegionRow") + cut(t10, "  const mdOf", "  function keeperCheck");
vm.runInContext(read("js/53-us-states.js") + "\n" + read("js/54-state-agencies.js") + "\n" + helpers + "\n" + read("js/62-learn.js") +
  "\nthis.api = { LN, renderLearn, setRules(f, s) { fishRules = f; stateRules = s; } };", ctx);
const A = ctx.api;
const row = (species, match, regions, extra) => Object.assign({ species, match, regions, min_in: null, max_in: null, measure: "total", bag: null, release_only: false, closed: null, open_only: null, note: null, source_url: "https://example.org/rule", verified_on: "2026-10-15", active: true }, extra || {});
A.setRules(
  [row("Snook", ["snook"], null, { min_in: 28, max_in: 33, bag: "1 per person", closed: [["12-15", "01-31"]] }), row("Red drum", ["redfish", "red drum"], ["atlantic"], { min_in: 18, max_in: 27, bag: "1 per person" }), row("Red drum", ["redfish", "red drum"], ["gulf"], { min_in: 16, max_in: 26, bag: "2 per person" })],
  [row("Redfish", ["redfish"], ["TX"], { min_in: 20, max_in: 28, bag: "3 per person" }), row("Walleye", ["walleye"], ["MN"], { bag: "6" })]);
const text = () => allText(nodes["learn-body"]);
const find = f => { let r = null; walk(nodes["learn-body"], n => { if (!r && f(n)) r = n; }); return r; };
const all = f => { const r = []; walk(nodes["learn-body"], n => { if (f(n)) r.push(n); }); return r; };
const tick = () => new Promise(r => setTimeout(r, 5));

(async () => {
  // the data file on disk
  const fish = fishJson.fish;
  ok(fish.length >= 20 && fish.every(f => f.name && Array.isArray(f.match) && f.match.length && /^(salt|fresh)$/.test(f.kind)), "data/learn/fish.json: " + fish.length + " fish, each with a name, match words and salt/fresh");
  ok(fish.every(f => f.source && /^https:\/\//.test(f.source.url) && f.source.label && (f.appearance || f.habitat || (f.habits || []).length)) && fishJson.handling && fishJson.handling.points.length >= 5 && /^https:\/\//.test(fishJson.handling.source.url), "every card names its official source (https link) and has facts from it; handling advice has its own source");
  ok(fish.every(f => !/\d+\s*(inch|in\b|"|per person|per day)/i.test((f.tips || []).join(" "))), "no size or bag numbers are typed into the tips (limits only come from the rules data)");
  ok(new Set(fish.map(f => f.name)).size === fish.length, "no fish listed twice");

  // open the Fish tile in Texas
  A.LN.st = "TX"; A.LN.tile = "fish"; A.renderLearn();
  ok(/Loading the fish cards/.test(text()) && fetched.length === 1 && fetched[0] === "data/learn/fish.json", "Fish tile asks for the fish file once and says Loading");
  await tick();
  ok(A.LN.fish && A.LN.fish.length === fish.length && /Saltwater/.test(text()) && /Freshwater/.test(text()), "the list appears, split into saltwater and freshwater");
  ok(all(n => n.className === "learn-fishrow").length === fish.length, "one row per fish");
  const search = find(n => n.tag === "input");
  search.value = "drum"; search.handlers.input();
  const rows = all(n => n.className === "learn-fishrow").map(n => n.textContent);
  ok(rows.length === 2 && rows.some(x => /Redfish/.test(x)) && rows.some(x => /Black drum/.test(x)), "searching drum finds Redfish (red drum) and Black drum");
  search.value = "zzz"; search.handlers.input(); ok(/No fish matches/.test(text()), "no match says so");
  search.value = "dolphin"; search.handlers.input(); ok(all(n => n.className === "learn-fishrow").some(n => /Mahi/.test(n.textContent)), "a nickname (dolphin) finds Mahi");

  // open Redfish in Texas
  search.value = ""; search.handlers.input();
  all(n => n.className === "learn-fishrow").find(n => /Redfish/.test(n.textContent)).handlers.click();
  ok(/Texas rules/.test(text()) && /20″–28″ total length/.test(text()) && /3 per person/.test(text()) && !/16″|18″–27″/.test(text()), "Redfish card in Texas shows Texas size and bag only");
  ok(/confirm with Texas Parks & Wildlife/.test(text()) && /Checked Oct 15, 2026/.test(text()), "guide-only line names the Texas agency, with the checked date");
  ok(/not a rule/.test(text()) && /What it looks like/.test(text()) && /Habitat/.test(text()) && /Best baits/.test(text()) && /Rigs that work/.test(text()) && /Look-alikes/.test(text()) && /Release & handling/.test(text()) && /wet your hands/.test(text()), "general sections are labelled as not rules, with handling advice for saltwater fish");
  ok(/Source:\s+FWC species profile: Red Drum/.test(text()) && /checked Oct 23, 2026/.test(text()) && !!find(n => n.tag === "a" && /myfwc\.com\/wildlifehabitats\/profiles\/saltwater\/drums\/red-drum/.test(n.href)), "the card ends with its official source link and the date it was checked");
  ok(!!find(n => n.className === "fishsvg"), "the fish picture (tank art) is shown when the app has it");

  // same fish, other states
  A.LN.st = "FL"; A.renderLearn();
  ok(/18″–27″/.test(text()) && /16″–26″/.test(text()) && /Atlantic coast/.test(text()) && /Gulf coast/.test(text()), "Florida shows both coasts' red drum rows");
  A.LN.st = "WY"; A.renderLearn();
  ok(/We don't have a Wyoming rule for this fish on file/.test(text()) && /Wyoming Game & Fish/.test(text()) && !/20″/.test(text()), "a state with no rule says so (no numbers made up)");
  A.LN.st = "FL"; A.LN.fishOpen = "Snook"; A.renderLearn();
  ok(/28″–33″/.test(text()) && /Closed Dec 15 – Jan 31/.test(text()), "Snook in Florida shows the closed season from the rules row");
  find(n => /All fish/.test(n.textContent) && n.tag === "button").handlers.click();
  ok(A.LN.fishOpen === null && all(n => n.className === "learn-fishrow").length === fish.length, "‹ All fish returns to the list");

  // load failure
  A.LN.fish = null; A.LN.fishLoading = false; failFetch = true; A.LN.tile = "fish"; A.renderLearn(); await tick();
  ok(/could not load/.test(text()), "if the file can't be read, an honest message");

  // wiring
  const sw = read("sw.js"), src = read("js/62-learn.js");
  ok(sw.includes("learn\\/(fish|knots|rigs)"), "sw.js keeps data/learn/fish.json on the phone");
  ok(/official sources/.test(read("js/13-groups-misc.js")), "What's new mentions the official sources");
  ok(/v183/.test(read("docs/build_history.md")), "build history has v183");
  ok(!/\.from\(/.test(src), "no database call in js/62");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
