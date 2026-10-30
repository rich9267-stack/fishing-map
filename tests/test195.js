// test195: 📚 Learn page, step 5 (js/62): Bait & lures tile = searchable list + cards built only from official pages (data/learn/bait.json);
// every line has a source, fish names tap through to the fish card.
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
const baitJson = J("bait"), fishJson = J("fish");
let fetched = [], failBait = false;
const ctx = { console, Date, JSON, Math, isFinite, Array, Object, Promise, String, Number, RegExp, parseInt, setTimeout, $: id => nodes[id], el: mk, window: { scrollTo() {} },
  LAT: 26.24, LNG: -80.10, showView() {}, loadRules: async () => {}, zonesEnsure: () => null, zn: { rows: [] }, fishSvg: () => mk("svg", "fishsvg", ""),
  fetch: async u => {
    fetched.push(u);
    if (/bait\.json/.test(u)) return failBait ? { ok: false, status: 404 } : { ok: true, json: async () => baitJson };
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

process.on("unhandledRejection", e => { console.log("FAIL crashed: " + (e && e.stack || e)); process.exit(1); });
(async () => {
  const bait =baitJson.bait, src = baitJson.sources, fishNames = fishJson.fish.map(f => f.name);
  const official = bait.filter(b => !b.general), general = bait.filter(b => b.general);
  ok(official.length >= 10 && bait.every(b => b.name && /^(bait|lure)$/.test(b.kind)) && official.every(b => b.facts.length >= 1), "data/learn/bait.json: " + official.length + " cards from official pages, each with at least one sourced line");
  ok(general.length >= 8 && general.every(b => b.lines && b.lines.length >= 2 && !b.facts), general.length + " general-advice cards, kept apart (lines, no source marks)");
  ok(official.every(b => b.facts.every(f => f.t && src[f.s] && /^https:\/\/(myfwc\.com|www\.fisheries\.noaa\.gov|www\.dnr\.state\.mn\.us|nas\.er\.usgs\.gov)\//.test(src[f.s].url))), "every line points at an official source (https link on an agency site)");
  ok(bait.every(b => b.fish.every(n => fishNames.includes(n))), "every fish named under a card is a real fish card");
  ok(/^\d{4}-\d\d-\d\d$/.test(baitJson.t), "the file has its checked date");
  ok(bait.every(b => !/(per person|per day|bag limit|minimum size|slot limit)/i.test((b.facts ? b.facts.map(f => f.t) : b.lines).join(" "))), "no bag or size limits (those only come from the rules data)");

  A.LN.st = "TX"; A.LN.tile = "bait"; A.renderLearn();
  ok(/Loading the baits/.test(text()) && fetched.length === 1 && fetched[0] === "data/learn/bait.json", "Bait tile asks for the file once and says Loading");
  await tick();
  ok(all(n => n.className === "learn-fishrow").length === bait.length, "one row per bait or lure");
  const search = all(n => n.tag === "input").pop();
  search.value = "pinfish"; search.handlers.input(); ok(all(n => n.className === "learn-fishrow").some(n => /Live baitfish/.test(n.textContent)), "a nickname (pinfish) finds Live baitfish");
  search.value = "zzz"; search.handlers.input(); ok(/No bait or lure matches/.test(text()), "no match says so");
  search.value = ""; search.handlers.input();
  all(n => n.className === "learn-fishrow").find(n => /Live shrimp/.test(n.textContent)).handlers.click();
  ok(/What the official pages say/.test(text()) && /\[1\]/.test(text()) && /Not a rule/.test(text()), "a card shows the sourced lines with [n] marks and says it is not a rule");
  const links = all(n => n.tag === "a");
  ok(links.length >= 2 && links.every(a => /^https:\/\//.test(a.href)) && /checked Oct 23, 2026/.test(text()), "sources are listed with links and the checked date");
  const fl = find(n => n.className === "learn-link" && /Redfish/.test(n.textContent));
  ok(!!fl, "the card lists the fish that name it as taps");
  fl.handlers.click(); await tick();
  ok(A.LN.tile === "fish" && A.LN.fishOpen === "Redfish (red drum)" && /Habitat/.test(text()), "tapping a fish opens its fish card");

  A.LN.tile = "bait"; A.renderLearn();
  find(n => /All baits/.test(n.textContent) && n.tag === "button").handlers.click();
  ok(A.LN.baitOpen === null && all(n => n.className === "learn-fishrow").length === bait.length, "‹ All baits & lures returns to the list");
  ok(all(n => /learn-tile/.test(n.className)).filter(t => /soon/.test(t.className)).length === 0, "all six tiles work; none says Coming soon");

  // a general-advice card says so and shows no source marks
  A.LN.tile = "bait"; A.LN.baitOpen = "Plastic worms"; A.renderLearn();
  ok(/General advice, not from an official source/.test(text()) && !/What the official pages say/.test(text()) && !/[1]/.test(text()) && all(n => n.tag === "a").length === 0, "a general card is labelled as general advice, with no source link or [n] marks");
  A.LN.baitQ = ""; A.LN.baitOpen = null; A.renderLearn();
  const rows = all(n => n.className === "learn-fishrow").map(n => n.textContent);
  ok(rows.some(x => /Plastic worms · general advice/.test(x)) && rows.some(x => /^🪱 Live shrimp$/.test(x.trim())), "the list marks general cards; official cards carry no mark");
  A.LN.bait = null; A.LN.baitLoading = false; failBait = true; A.renderLearn(); await tick();
  ok(/could not load/.test(text()), "if the file can't be read, an honest message");

  ok(read("sw.js").includes('"learn/bait.json":"'), "sw.js keeps data/learn/bait.json on the phone");
  ok(/2026-10-23d/.test(read("js/13-groups-misc.js")) && /Bait & lures/.test(read("js/13-groups-misc.js")), "What's new mentions the bait tile");
  ok(/v184/.test(read("docs/build_history.md")), "build history has v184");
  ok(!/\.from\(/.test(read("js/62-learn.js")), "no database call in js/62");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
