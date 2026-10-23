// test194: 📚 Learn page, step 4 (js/62): Rigs tile = searchable list + step-by-step rig cards (data/learn/rigs.json);
// a rig's knot is a tap into the Knots tile; rig names inside fish cards tap through to the rig card.
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const cut = (s, a, b) => { const i = s.indexOf(a); if (i < 0) throw new Error("missing " + a); return s.slice(i, s.indexOf(b, i)); };
const withText = o => { let t = o.textContent; Object.defineProperty(o, "textContent", { get: () => t, set: v => { t = v; if (v === "") o.children.length = 0; } }); return o; };
const mk = (tag, cls, text) => withText({ tag, className: cls || "", textContent: text || "", children: [], attrs: {}, hidden: false, handlers: {}, style: {}, dataset: {}, value: "", selected: false,
  appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; } });
const nodes = { "learn-body": mk("div"), "view-learn": mk("div"), "learn-card": mk("button"), "learn-back": mk("button") };
nodes["view-learn"].hidden = false;
const allText = n => (n.textContent || "") + " " + n.children.map(allText).join(" ");
const walk = (n, f) => { f(n); n.children.forEach(c => walk(c, f)); };
const J = n => JSON.parse(read("data/learn/" + n + ".json"));
const rigJson = J("rigs"), knotJson = J("knots"), fishJson = J("fish");
let fetched = [], failRigs = false;
const ctx = { console, Date, JSON, Math, isFinite, Array, Object, Promise, String, Number, RegExp, parseInt, setTimeout, $: id => nodes[id], el: mk, window: { scrollTo() {} },
  LAT: 26.24, LNG: -80.10, showView() {}, loadRules: async () => {}, zonesEnsure: () => null, zn: { rows: [] }, fishSvg: () => mk("svg", "fishsvg", ""),
  fetch: async u => {
    fetched.push(u);
    if (/rigs\.json/.test(u)) return failRigs ? { ok: false, status: 404 } : { ok: true, json: async () => rigJson };
    if (/knots\.json/.test(u)) return { ok: true, json: async () => knotJson };
    return { ok: true, json: async () => fishJson };
  } };
vm.createContext(ctx);
const t10 = read("js/10-tools-safety.js");
const helpers = cut(t10, "  let fishRules = [];", "  async function loadRules") + cut(t10, "  const RULE_TAG_NAMES", "  function pickRegionRow") + cut(t10, "  const mdOf", "  function keeperCheck");
vm.runInContext(read("js/53-us-states.js") + "\n" + read("js/54-state-agencies.js") + "\n" + helpers + "\n" + read("js/62-learn.js") +
  "\nthis.api = { LN, renderLearn, setRules(f, s) { fishRules = f; stateRules = s; } };", ctx);
const A = ctx.api;
A.setRules([], []);
const text = () => allText(nodes["learn-body"]);
const find = f => { let r = null; walk(nodes["learn-body"], n => { if (!r && f(n)) r = n; }); return r; };
const all = f => { const r = []; walk(nodes["learn-body"], n => { if (f(n)) r.push(n); }); return r; };
const tick = () => new Promise(r => setTimeout(r, 10));

(async () => {
  const rigs = rigJson.rigs, knotNames = knotJson.knots.map(k => k.name);
  const want = ["Carolina rig", "Texas rig", "Drop-shot rig", "Fish-finder rig", "Pompano rig", "Knocker rig", "Free-line live bait rig", "Popping cork rig"];
  ok(rigs.length === 8 && want.every(n => rigs.some(r => r.name === n)), "data/learn/rigs.json has the 8 starter rigs");
  ok(rigs.every(r => r.what && r.use && r.tip && r.need.length >= 2 && r.steps.length >= 3 && r.steps.length <= 6 && "picture" in r && "credit" in r && !r.picture && !r.credit), "each rig: what, when, what you need, 3-6 steps, a tip, empty picture/credit");
  ok(rigs.every(r => knotNames.includes(r.knot)), "every rig's knot is one of the knot cards");
  ok(rigs.every(r => Array.isArray(r.find) && r.find.length), "every rig has words for fish cards to find it");

  A.LN.st = "TX"; A.LN.tile = "rigs"; A.renderLearn();
  ok(/Loading the rigs/.test(text()) && fetched.length === 1 && fetched[0] === "data/learn/rigs.json", "Rigs tile asks for the rigs file once and says Loading");
  await tick();
  ok(all(n => n.className === "learn-fishrow").length === 8, "one row per rig");
  const search = find(n => n.tag === "input");
  search.value = "carolina"; search.handlers.input(); ok(all(n => n.className === "learn-fishrow").length === 1, "searching carolina finds one rig");
  search.value = "fish finder"; search.handlers.input(); ok(all(n => n.className === "learn-fishrow").some(n => /Fish-finder/.test(n.textContent)), "a nickname finds the rig");
  search.value = "zzz"; search.handlers.input(); ok(/No rig matches/.test(text()), "no match says so");
  search.value = ""; search.handlers.input();
  all(n => n.className === "learn-fishrow").find(n => /Carolina/.test(n.textContent)).handlers.click();
  ok(/When to use it/.test(text()) && /What you need/.test(text()) && /Steps/.test(text()) && /Tip/.test(text()) && all(n => n.tag === "ol")[0].children.length === rigs[0].steps.length, "the Carolina card shows use, what you need, numbered steps and a tip");
  ok(!find(n => n.tag === "img"), "no picture box while there is no picture");

  // knot tap
  const kb = find(n => n.className === "learn-link" && /Palomar/.test(n.textContent));
  ok(!!kb, "the card names its knot as a tap");
  kb.handlers.click(); await tick();
  ok(A.LN.tile === "knots" && A.LN.knotOpen === "Palomar" && /When to use it/.test(text()) && /Palomar/.test(text()), "tapping the knot opens the Palomar knot card in the Knots tile");

  // fish card -> rig
  A.LN.tile = "fish"; A.LN.fishOpen = "Redfish (red drum)"; A.LN.fish = fishJson.fish; A.renderLearn(); await tick();
  const links = all(n => n.className === "learn-link");
  ok(links.length >= 1 && links.every(l => /›/.test(l.textContent)), "rig lines on a fish card that match a rig become taps (›)");
  A.LN.fishOpen = "Snook"; A.renderLearn();
  const pl = all(n => n.className === "learn-link");
  ok(pl.some(l => /fish finder rig/.test(l.textContent)), "the snook card's 'fish finder rig' line is a tap");
  pl.find(l => /fish finder rig/.test(l.textContent)).handlers.click();
  ok(A.LN.tile === "rigs" && A.LN.rigOpen === "Fish-finder rig" && /What you need/.test(text()), "tapping it opens the Fish-finder rig card");
  A.LN.fishOpen = "Spotted seatrout"; A.LN.tile = "fish"; A.renderLearn();
  ok(all(n => n.className === "learn-link").length === 0 && /drift over grass beds/.test(text()), "a rig line with no matching rig card stays plain text");
  find(n => /All fish/.test(n.textContent) && n.tag === "button").handlers.click();
  A.LN.tile = "rigs"; A.LN.rigOpen = "Texas rig"; A.renderLearn();
  find(n => /All rigs/.test(n.textContent) && n.tag === "button").handlers.click();
  ok(A.LN.rigOpen === null && all(n => n.className === "learn-fishrow").length === 8, "‹ All rigs returns to the list");
  ok(all(n => /learn-tile/.test(n.className)).filter(t => /soon/.test(t.className)).length === 1, "Rules, Fish, Rigs, Bait and Knots work; one tile still says Coming soon");

  A.LN.rigs = null; A.LN.rigsLoading = false; failRigs = true; A.renderLearn(); await tick();
  ok(/could not load/.test(text()), "if the file can't be read, an honest message");

  ok(read("sw.js").includes("learn\\/(fish|knots|rigs|bait)"), "sw.js keeps data/learn/rigs.json on the phone");
  ok(/2026-10-23b/.test(read("js/13-groups-misc.js")) && /Learn: Rigs/.test(read("js/13-groups-misc.js")), "What's new mentions the rigs");
  ok(/v182/.test(read("docs/build_history.md")), "build history has v182");
  ok(!/\.from\(/.test(read("js/62-learn.js")), "no database call in js/62");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
