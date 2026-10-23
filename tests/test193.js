// test193: 📚 Learn page, step 3 (js/62): Knots tile = searchable list + step-by-step knot cards (data/learn/knots.json).
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
const knotJson = JSON.parse(read("data/learn/knots.json"));
let fetched = [], failFetch = false;
const ctx = { console, Date, JSON, Math, isFinite, Array, Object, Promise, String, Number, RegExp, parseInt, setTimeout, $: id => nodes[id], el: mk, window: { scrollTo() {} },
  LAT: 26.24, LNG: -80.10, showView() {}, loadRules: async () => {}, zonesEnsure: () => null, zn: { rows: [] },
  fishSvg: (n, px) => mk("svg", "fishsvg", ""),
  fetch: async u => { fetched.push(u); if (failFetch) return { ok: false, status: 404 }; return { ok: true, json: async () => knotJson }; } };
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
  const knots = knotJson.knots;
  const want = ["Palomar", "Improved clinch", "Uni", "Loop knot", "Albright", "Double uni", "Nail knot", "Blood knot"];
  ok(knots.length === 8 && want.every(n => knots.some(k => k.name === n)), "data/learn/knots.json has the 8 starter knots");
  ok(knots.every(k => k.what && k.use && k.tip && Array.isArray(k.steps) && k.steps.length >= 3 && k.steps.length <= 6 && "picture" in k && "credit" in k), "each knot: what, when to use, 3-6 steps, a tip, and an empty picture/credit spot");
  ok(knots.every(k => !k.picture && !k.credit), "no pictures yet (nothing to license)");

  A.LN.st = "TX"; A.LN.tile = "knots"; A.renderLearn();
  ok(/Loading the knots/.test(text()) && fetched.length === 1 && fetched[0] === "data/learn/knots.json", "Knots tile asks for the knots file once and says Loading");
  await tick();
  ok(all(n => n.className === "learn-fishrow").length === 8, "one row per knot");
  const search = find(n => n.tag === "input");
  search.value = "clinch"; search.handlers.input();
  ok(all(n => n.className === "learn-fishrow").length === 1, "searching clinch finds one knot");
  search.value = "rapala"; search.handlers.input();
  ok(all(n => n.className === "learn-fishrow").some(n => /Loop knot/.test(n.textContent)), "a nickname finds the knot");
  search.value = "zzz"; search.handlers.input(); ok(/No knot matches/.test(text()), "no match says so");
  search.value = ""; search.handlers.input();
  all(n => n.className === "learn-fishrow").find(n => /Palomar/.test(n.textContent)).handlers.click();
  ok(/Palomar/.test(text()) && /When to use it/.test(text()) && /Steps/.test(text()) && all(n => n.tag === "li").length === knots[0].steps.length && /Tip/.test(text()), "the Palomar card shows use, numbered steps and a tip");
  ok(!find(n => n.tag === "img"), "no picture box while there is no picture");
  A.LN.knots[0].picture = "data/learn/img/palomar.png"; A.LN.knots[0].credit = "Someone, CC0"; A.renderLearn();
  ok(!!find(n => n.tag === "img") && /Picture: Someone, CC0/.test(text()), "once a picture is added, it shows with its credit line");
  find(n => /All knots/.test(n.textContent) && n.tag === "button").handlers.click();
  ok(A.LN.knotOpen === null && all(n => n.className === "learn-fishrow").length === 8, "‹ All knots returns to the list");
  const tiles = all(n => /learn-tile/.test(n.className));
  ok(tiles.filter(t => /soon/.test(t.className)).length === 0, "all six tiles work; none says Coming soon");

  A.LN.knots = null; A.LN.knotsLoading = false; failFetch = true; A.renderLearn(); await tick();
  ok(/could not load/.test(text()), "if the file can't be read, an honest message");

  ok(read("sw.js").includes("learn\\/(fish|knots|rigs|bait)"), "sw.js keeps data/learn/knots.json on the phone");
  ok(/Knots/.test(read("js/13-groups-misc.js").slice(0, 60000)) && /2026-10-23a/.test(read("js/13-groups-misc.js")), "What's new mentions the knots");
  ok(/v181/.test(read("docs/build_history.md")), "build history has v181");
  ok(!/\.from\(/.test(read("js/62-learn.js")), "no database call in js/62");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
