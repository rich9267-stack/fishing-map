// test196: 📚 Learn page, step 6 (js/62): State info tile = only what the app already holds, each item with its source and date.
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
process.on("unhandledRejection", e => { console.log("FAIL crashed: " + (e && e.stack || e)); process.exit(1); });
let fetched = [];
const ctx = { console, Date, JSON, Math, isFinite, Array, Object, Promise, String, Number, RegExp, parseInt, setTimeout, $: id => nodes[id], el: mk, window: { scrollTo() {} },
  LAT: 26.24, LNG: -80.10, showView() {}, loadRules: async () => {}, zonesEnsure: () => null, zn: { rows: [] }, fishSvg: () => mk("svg", "fishsvg", ""),
  STATE_RAMPS: { TX: { credit: "Test Texas ramp list" } },
  fetch: async u => { fetched.push(u); if (/ramps\/TX\.json/.test(u)) return { ok: true, json: async () => ({ t: "2026-10-23", items: [{ n: "a" }, { n: "b" }, { n: "c" }] }) }; return { ok: false, status: 404 }; } };
vm.createContext(ctx);
const t10 = read("js/10-tools-safety.js");
const helpers = cut(t10, "  let fishRules = [];", "  async function loadRules") + cut(t10, "  const RULE_TAG_NAMES", "  function pickRegionRow") + cut(t10, "  const mdOf", "  function keeperCheck");
vm.runInContext(read("js/53-us-states.js") + "\n" + read("js/54-state-agencies.js") + "\n" + read("js/60-noaa-stations.js") + "\n" + helpers + "\n" + read("js/62-learn.js") +
  "\nthis.api = { LN, renderLearn, STATE_NAMES, stateAgency, setRules(f, s) { fishRules = f; stateRules = s; } };", ctx);
const A = ctx.api;
const row = (species, regions) => ({ species, match: [species.toLowerCase()], regions, min_in: 20, max_in: 28, measure: "total", bag: "3", release_only: false, closed: null, open_only: null, note: null, source_url: "https://example.org/rule", verified_on: "2026-10-15", active: true });
A.setRules([], [row("Redfish", ["TX"]), row("Walleye", ["MN"])]);
const text = () => allText(nodes["learn-body"]);
const find = f => { let r = null; walk(nodes["learn-body"], n => { if (!r && f(n)) r = n; }); return r; };
const all = f => { const r = []; walk(nodes["learn-body"], n => { if (f(n)) r.push(n); }); return r; };
const tick = () => new Promise(r => setTimeout(r, 10));

(async () => {
  A.LN.st = "TX"; A.LN.tile = "info"; A.renderLearn();
  ok(/Texas info/.test(text()) && /Texas Parks & Wildlife Department/.test(text()), "Texas info names the agency");
  const links = all(n => n.tag === "a").map(a => a.href);
  ok(links.some(h => /tpwd\.texas\.gov\/fishboat/.test(h)) && links.some(h => /tpwd\.texas\.gov\/licenses/.test(h)) && /Source:/.test(text()) && /checked Oct 21, 2026/.test(text()), "rules + licence links and a source line with its checked date");
  ok(/Rules on file/.test(text()) && /1 fish, checked Oct 15, 2026/.test(text()), "rules on file are counted from the real rows, with their checked date");
  await tick();
  ok(fetched.length === 1 && fetched[0] === "data/ramps/TX.json" && /3 public, open ramps/.test(text()) && /Test Texas ramp list/.test(text()) && /checked Oct 23, 2026/.test(text()), "ramp count and credit come from the state's ramp file, with its date");
  ok(/NOAA stations/.test(text()) && /NOAA CO-OPS station list/.test(text()) && /checked Oct 22, 2026/.test(text()) && /\d+ tide and \d+ water-temperature/.test(text()), "NOAA station counts with source and date");
  // an inland state with no ramp list and no rules
  A.LN.st = "WY"; A.renderLearn();
  ok(/Wyoming Game & Fish Dept/.test(text()) && /We have no Wyoming rules yet/.test(text()) && /no official agency ramp list/.test(text()) && /community map, not official/.test(text()) && /inland state/.test(text()), "a state with little data says so plainly");
  A.LN.st = "FL"; A.renderLearn();
  ok(/Florida Fish & Wildlife/.test(text()) && /FWC and Florida DEP/.test(text()), "Florida names its built-in official ramp and pier lists");
  ok(all(n => /learn-tile/.test(n.className)).filter(t => /soon/.test(t.className)).length === 0, "all six tiles work");
  // every state + DC has an agency to show
  ok(Object.keys(A.STATE_NAMES).every(k => A.stateAgency(k)), "every state and DC has an agency entry");
  ok(/2026-10-23e/.test(read("js/13-groups-misc.js")) && /State info/.test(read("js/13-groups-misc.js")), "What's new mentions State info");
  ok(/v185/.test(read("docs/build_history.md")), "build history has v185");
  ok(!/\.from\(/.test(read("js/62-learn.js")), "no database call in js/62");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
