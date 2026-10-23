// test197: 📚 Learn page, step 7 (js/62): one search box over fish, rigs, baits & lures and knots + cross-links taken from the existing data.
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
const J = n => JSON.parse(read("data/learn/" + n + ".json"));
const files = { fish: J("fish"), knots: J("knots"), rigs: J("rigs"), bait: J("bait") };
let fetched = [], failKnots = false;
const ctx = { console, Date, JSON, Math, isFinite, Array, Object, Promise, String, Number, RegExp, parseInt, setTimeout, $: id => nodes[id], el: mk, window: { scrollTo() {} },
  LAT: 26.24, LNG: -80.10, showView() {}, loadRules: async () => {}, zonesEnsure: () => null, zn: { rows: [] }, fishSvg: () => mk("svg", "fishsvg", ""),
  fetch: async u => { fetched.push(u); const k = (/learn\/(\w+)\.json/.exec(u) || [])[1]; if (!k) return { ok: false, status: 404 }; if (k === "knots" && failKnots) return { ok: false, status: 404 }; return { ok: true, json: async () => files[k] }; } };
vm.createContext(ctx);
const t10 = read("js/10-tools-safety.js");
const helpers = cut(t10, "  let fishRules = [];", "  async function loadRules") + cut(t10, "  const RULE_TAG_NAMES", "  function pickRegionRow") + cut(t10, "  const mdOf", "  function keeperCheck");
vm.runInContext(read("js/53-us-states.js") + "\n" + read("js/54-state-agencies.js") + "\n" + helpers + "\n" + read("js/62-learn.js") +
  "\nthis.api = { LN, renderLearn, openLearn, setRules(f, s) { fishRules = f; stateRules = s; } };", ctx);
const A = ctx.api;
A.setRules([], []);
const text = () => allText(nodes["learn-body"]);
const find = f => { let r = null; walk(nodes["learn-body"], n => { if (!r && f(n)) r = n; }); return r; };
const all = f => { const r = []; walk(nodes["learn-body"], n => { if (f(n)) r.push(n); }); return r; };
const tick = () => new Promise(r => setTimeout(r, 15));
const rows = () => all(n => n.className === "learn-fishrow").map(n => n.textContent);
const top = () => all(n => n.tag === "input")[0];

(async () => {
  A.LN.st = "TX"; A.LN.tile = "rules"; A.renderLearn();
  ok(!!top() && /Search all of Learn/.test(top().attrs["aria-label"]) && fetched.length === 0, "the top search box is there and nothing is fetched until you type");
  top().value = "shrimp"; top().handlers.input();
  ok(fetched.length === 4, "the first search asks for the four data files once");
  await tick();
  ok(rows().some(x => /Live shrimp · Bait/.test(x)), "shrimp finds the Live shrimp bait card");
  top().value = "palomar"; top().handlers.input(); ok(rows().length === 1 && /Palomar · Knot/.test(rows()[0]), "a knot is found by name");
  top().value = "dolphin"; top().handlers.input(); ok(rows().some(x => /Mahi/.test(x) && /Fish/.test(x)), "a fish is found by nickname");
  top().value = "carolina"; top().handlers.input(); ok(rows().some(x => /Carolina rig · Rig/.test(x)), "a rig is found by name");
  top().value = "jig"; top().handlers.input(); ok(rows().some(x => /Jigs · Lure/.test(x)), "a lure is found and labelled Lure");
  top().value = "zzz"; top().handlers.input(); ok(/Nothing matches/.test(text()), "no match says so");
  top().value = "s"; top().handlers.input(); ok(rows().length === 0, "one letter shows nothing");
  top().value = "shrimp"; top().handlers.input();
  const fetchedBefore = fetched.length;
  all(n => n.className === "learn-fishrow").find(n => /Live shrimp/.test(n.textContent)).handlers.click();
  ok(A.LN.tile === "bait" && A.LN.baitOpen === "Live shrimp" && A.LN.gq === "" && /What the official pages say/.test(text()) && fetched.length === fetchedBefore, "tapping the result opens that card in its tile and clears the search");

  // cross-links
  A.LN.tile = "fish"; A.LN.fishOpen = "Redfish (red drum)"; A.renderLearn();
  const bl = all(n => n.className === "learn-link" && /Live shrimp ›/.test(n.textContent));
  ok(/Bait & lure cards that name it/.test(text()) && bl.length === 1, "a fish card lists the bait cards that name it");
  bl[0].handlers.click(); ok(A.LN.tile === "bait" && A.LN.baitOpen === "Live shrimp", "…and the tap opens that bait card");
  A.LN.tile = "rigs"; A.LN.rigOpen = "Fish-finder rig"; A.renderLearn();
  const fl = all(n => n.className === "learn-link" && /Snook ›/.test(n.textContent));
  ok(/Fish cards that name it/.test(text()) && fl.length === 1, "a rig card lists the fish cards that point at it (Snook → fish-finder rig)");
  fl[0].handlers.click(); ok(A.LN.tile === "fish" && A.LN.fishOpen === "Snook", "…and the tap opens that fish card");
  A.LN.tile = "rigs"; A.LN.rigOpen = "Texas rig"; A.renderLearn();
  ok(!/Fish cards that name it/.test(text()), "a rig no fish card names shows no empty section");
  // every cross-link target is a real card
  const names = new Set(files.fish.fish.map(f => f.name));
  ok(files.bait.bait.every(b => b.fish.every(n => names.has(n))), "every fish a bait card names is a real fish card");

  // one file can't load: the rest still search
  A.LN.knots = null; A.LN.knotsLoading = false; A.LN.knotsErr = false; failKnots = true; A.LN.tile = "rules"; A.LN.gq = "";
  A.renderLearn(); top().value = "clinch"; top().handlers.input(); await tick();
  ok(/Some cards could not load/.test(text()), "if a file can't load, the search says it is missing some cards");
  top().value = "snook"; top().handlers.input(); ok(rows().some(x => /Snook/.test(x)), "…and the other cards still search");
  const nBefore = fetched.length; A.renderLearn(); await tick(); ok(fetched.length === nBefore, "a failed file is not asked for again and again");

  A.LN.gq = "abc"; A.openLearn(); ok(A.LN.gq === "", "opening Learn again starts with an empty search");
  ok(/2026-10-23f/.test(read("js/13-groups-misc.js")) && /Search all of Learn/.test(read("js/13-groups-misc.js")), "What's new mentions the search");
  ok(/v186/.test(read("docs/build_history.md")), "build history has v186");
  ok(!/\.from\(/.test(read("js/62-learn.js")), "no database call in js/62");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
