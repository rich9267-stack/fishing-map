// test191: 📚 Learn page, step 1 (js/62): Home card, state picker, Rules tile from the rules we already hold, other tiles "Coming soon".
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const cut = (s, a, b) => { const i = s.indexOf(a); if (i < 0) throw new Error("missing " + a); return s.slice(i, s.indexOf(b, i)); };

// a tiny fake page
const mk = (tag, cls, text) => ({ tag, className: cls || "", textContent: text || "", children: [], attrs: {}, hidden: false, handlers: {}, style: {}, dataset: {}, value: "", selected: false,
  appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; } });
const nodes = { "learn-body": mk("div"), "view-learn": mk("div"), "learn-card": mk("button"), "learn-back": mk("button") };
nodes["view-learn"].hidden = false;
{ const b = nodes["learn-body"]; let t = ""; Object.defineProperty(b, "textContent", { get: () => t, set: v => { t = v; if (v === "") b.children.length = 0; } }); }   // (body.textContent = "" empties it, as in a browser)
const allText = n => (n.textContent || "") + " " + n.children.map(allText).join(" ");
const walk = (n, f) => { f(n); n.children.forEach(c => walk(c, f)); };
let shown = null, askedRules = 0, zonesAsked = 0;

const ctx = { console, Date, JSON, Math, isFinite, Array, Object, Promise, String, Number, RegExp, parseInt, setTimeout, $: id => nodes[id], el: mk, window: { scrollTo() {} },
  LAT: 26.24, LNG: -80.10, showView: w => { shown = w; }, loadRules: async () => { askedRules++; },
  zonesEnsure: () => { zonesAsked++; return null; }, zn: { rows: [{ state: "TX", level: "no_fishing" }, { state: "TX", level: "no_entry" }, { state: "FL", level: "no_fishing" }] } };
vm.createContext(ctx);
// the real state outlines/names (js/53), the real agency list (js/54) and the real rule helpers from js/10
const t10 = read("js/10-tools-safety.js");
const helpers = cut(t10, "  let fishRules = [];", "  async function loadRules") + cut(t10, "  const RULE_TAG_NAMES", "  function pickRegionRow") + cut(t10, "  const mdOf", "  function keeperCheck");
vm.runInContext(read("js/53-us-states.js") + "\n" + read("js/54-state-agencies.js") + "\n" + helpers + "\n" + read("js/62-learn.js") +
  "\nthis.api = { LN, renderLearn, openLearn, lnHere, setRules(f, s) { fishRules = f; stateRules = s; } };", ctx);
const A = ctx.api;
const row = (species, regions, extra) => Object.assign({ species, match: [species.toLowerCase()], regions, min_in: null, max_in: null, measure: "total", bag: null, release_only: false, closed: null, open_only: null, note: null, source_url: "https://example.org/rule", verified_on: "2026-10-15", active: true }, extra || {});
A.setRules(
  [row("Snook", null, { min_in: 28, max_in: 33, bag: "1 per person", closed: [["12-15", "01-31"], ["06-01", "08-31"]] }), row("Red drum", null, { min_in: 18, max_in: 27, bag: "1 per person" })],
  [row("Redfish", ["TX"], { min_in: 20, max_in: 28, bag: "3 per person" }), row("Spotted seatrout", ["TX"], { min_in: 15, bag: "5 per person", verified_on: "2026-06-01" }), row("Walleye", ["MN"], { open_only: [["05-14", "02-28"]], bag: "6" })]);

const text = () => allText(nodes["learn-body"]);
const tiles = () => { const t = []; walk(nodes["learn-body"], n => { if (/learn-tile/.test(n.className)) t.push(n); }); return t; };
const select = () => { let s = null; walk(nodes["learn-body"], n => { if (n.tag === "select") s = n; }); return s; };
const links = () => { const l = []; walk(nodes["learn-body"], n => { if (n.tag === "a") l.push(n); }); return l; };

// 1) opens on the state you are in (Pompano Beach → Florida) with the picker
A.openLearn();
ok(shown === "learn", "the Home card opens the Learn page (showView('learn'))");
A.renderLearn();   // (showView draws it in the real app)
ok(A.LN.st === "FL" && /Florida fishing rules/.test(text()), "starts on the state you are in (Florida)");
const sel = select();
ok(sel && sel.children.length === 49 && sel.children.some(o => o.value === "DC") && sel.children.some(o => o.value === "TX") && sel.children.filter(o => o.selected).map(o => o.value).join() === "FL", "the picker lists 48 states + DC with Florida chosen");
ok(tiles().length === 6 && tiles().filter(t => /soon/.test(t.className)).length === 0, "six tiles; none says Coming soon");
ok(/Snook/.test(text()) && /28″–33″/.test(text()) && /1 per person/.test(text()) && /Closed Dec 15 – Jan 31, Jun 1 – Aug 31/.test(text()), "Florida lists its rules, with sizes, bag and closed seasons");
ok(/A guide only — confirm with FWC before keeping a fish/.test(text()) && /Checked Oct 15, 2026/.test(text()), "'guide only — confirm with FWC' and the checked date");
ok(!/Redfish|Walleye/.test(text()), "no other state's rules mixed in");

// 2) pick Texas while in Florida
select().value = "TX"; select().handlers.change();
ok(A.LN.st === "TX" && /Texas fishing rules/.test(text()), "picking Texas shows Texas");
ok(/Redfish/.test(text()) && /20″–28″ total length/.test(text()) && /3 per person/.test(text()) && /Spotted seatrout/.test(text()) && !/Snook|Walleye/.test(text()), "only Texas rules are shown (no Florida / Minnesota rows)");
ok(/A guide only — confirm with Texas Parks & Wildlife before keeping a fish/.test(text()), "'guide only — confirm with' names the Texas agency");
ok(/Checked Jun 1, 2026 – Oct 15, 2026/.test(text()) && /older than 90 days/.test(text()), "newest/oldest check dates, and the 90-day warning on the old rule");
const l = links().map(a => a.href);
ok(l.includes("https://tpwd.texas.gov/fishboat/fish/") && l.includes("https://tpwd.texas.gov/licenses/") && l.includes("https://example.org/rule"), "Texas agency rules + licence links and each rule's source link");
ok(/2 no-fishing or closed areas in Texas are on our map/.test(text()) && /may not be on the list/.test(text()), "the closed-areas note counts Texas's areas (2) and says the list is not complete");
ok(zonesAsked > 0, "the closed-area list is asked for");

// 3) a state with no rules yet, and Minnesota's open-only season
select().value = "WY"; select().handlers.change();
ok(/We don't have Wyoming rules yet/.test(text()) && /Wyoming Game & Fish/.test(text()) && /We have no closed areas listed for Wyoming/.test(text()), "a state with no rules says so plainly, with its agency and no made-up closed areas");
select().value = "MN"; select().handlers.change();
ok(/Open only May 14 – Feb 28/.test(text()), "an open-only season is written out");

// 4) 📍 Here, other tiles
let here = null; walk(nodes["learn-body"], n => { if (/Here/.test(n.textContent) && n.tag === "button") here = n; });
here.handlers.click();
ok(A.LN.st === "FL", "📍 Here returns to the state you are in");
ctx.LAT = 32.8; ctx.LNG = -96.8; ok(A.lnHere() === "TX", "…which follows the 'area now' (Dallas → Texas)");
ctx.LAT = 0; ctx.LNG = 0; ok(A.lnHere() === "FL", "…and falls back to Florida when it can't tell");
tiles()[5].handlers.click();
ok(/ info/.test(text()) && /Official/.test(text()) && !/Redfish/.test(text()), "State info opens its own panel");

// 5) rules not loaded yet → asked once, then the honest message
A.setRules([], []); A.LN.loadedRules = false; A.LN.tile = "rules"; A.LN.st = "TX"; A.renderLearn();
ok(/Loading the rules/.test(text()) && askedRules === 1, "rules not loaded: 'Loading…' and they are asked for once");
A.renderLearn(); ok(/We don't have Texas rules yet/.test(text()) && askedRules === 1, "after that, the honest 'we don't have rules' message");

// 6) wiring
const idx = read("index.html"), sw = read("sw.js"), t09 = read("js/09-map-forecast.js");
const order = f => idx.indexOf('src="js/' + f);
ok(/id="learn-card"/.test(idx) && /id="view-learn"/.test(idx) && /id="learn-body"/.test(idx) && /id="learn-back"/.test(idx), "index.html has the Home card and the Learn page");
ok(idx.indexOf('id="learn-card"') > idx.indexOf('id="home-quick"') && idx.indexOf('id="learn-card"') < idx.indexOf('id="best-card"'), "the card sits on Home between the quick buttons and Best spots");
ok(order("61-state-ramps") < order("62-learn") && order("62-learn") < order("99-boot"), "js/62 loads after js/61 and before the start-up file");
ok(/js\/62-learn\.js/.test(sw), "the offline file list (sw.js) has js/62");
ok(/vl\.hidden = which !== "learn"/.test(t09), "showView hides/shows the Learn page");
const names = s => (s.match(/^(?:const|let|function|async function)\s+([A-Za-z_$][\w$]*)/gm) || []).map(x => x.split(/\s+/).pop());
const others = fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js") && !/^62-/.test(f)).map(f => read("js/" + f)).join("\n");
const clash = names(read("js/62-learn.js")).filter(n => new RegExp("(?:^|[\\s;(])(?:const|let|var|function)\\s+" + n + "\\b").test(others));
ok(clash.length === 0, "no top-level name in js/62 is also declared elsewhere" + (clash.length ? " (" + clash.join(", ") + ")" : ""));
const wn = read("js/13-groups-misc.js"); ok(/Learn page/.test(wn.slice(wn.indexOf("WHATS_NEW"), wn.indexOf("WHATS_NEW") + 14000)), "What's new mentions the Learn page");
ok(/v179/.test(read("docs/build_history.md")), "build history has v179");
console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
