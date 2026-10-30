// Tackle box polish + new kinds spear / net / bow (plans/ui-review.md item 6, js/13, setup/91).
// Runs just the tackle section of js/13 in a small page (jsdom) with a fake database.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const idx = read("index.html");
const card = idx.slice(idx.indexOf('<div class="card" id="tackle-card"'), idx.indexOf('<div class="card" data-pane="insights">'));
const js13 = read("js/13-groups-misc.js");
const sec = js13.slice(js13.indexOf("  // ---- 🎒 Tackle box"), js13.indexOf("  // ---- ✨ What's new"));
const dom = new JSDOM(`<body>${card}<datalist id="bait-list"></datalist></body>`, { runScripts: "outside-only" });
const w = dom.window, d = w.document;
w.__rows = [
  { id: "t1", name: "Live shrimp", kind: "bait" }, { id: "t2", name: "Cast net", kind: "net" }, { id: "t3", name: "Pole spear", kind: "spear" },
  { id: "t4", name: "Bowfishing rig", kind: "bow" }, { id: "t5", name: "7 ft spinning rod", kind: "rod" }, { id: "t6", name: "White jig", kind: "lure" }];
w.__ins = []; w.__upd = []; w.__toasts = [];
w.__catches = [
  { id: "c1", species: "snook", bait: "live shrimp", length_in: 24, how_many: 1 }, { id: "c2", species: "snook", bait: "Live Shrimp", length_in: 28, how_many: 1 },
  { id: "c3", species: "mullet", bait: "cast net", how_many: 20 }, { id: "c4", species: "hogfish", bait: "pole spear", length_in: 16, how_many: 1 },
  { id: "c5", species: "jack", bait: "gold spoon", how_many: 1 }];
w.eval(`
  var me = { id: "u1" };
  const $ = id => document.getElementById(id);
  function el(t, c, txt) { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const toast = m => __toasts.push(m);
  const isMine = () => true;
  var catchesBySpot = { s1: __catches };
  const myCatches = () => __catches;
  const chain = data => { const o = { is: () => o, order: () => Promise.resolve({ data, error: null }), eq: () => Promise.resolve({ error: null }) }; return o; };
  const bootTake = (k, q) => q();   // v249: no app_start in this test
  const db = { from: () => ({ select: () => chain(__rows.slice()), insert: row => { __ins.push(row); __rows.push({ id: "n" + __rows.length, ...row }); return Promise.resolve({ error: null }); },
    update: row => { __upd.push(row); return { eq: (k, v) => { __rows = __rows.filter(r => r.id !== v); return Promise.resolve({ error: null }); } }; } }) };
` + sec + `\nwindow.tk = { loadTackle, tkGuess, TK_KIND };`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const groups = () => [...d.querySelectorAll("#tk-list .lyr-group")].map(g => g.textContent);
const item = n => [...d.querySelectorAll("#tk-list .tk-item")].find(r => r.querySelector(".tk-name").textContent.includes(n));
(async () => {
  await w.tk.loadTackle();
  ok(JSON.stringify(groups()) === JSON.stringify(["Baits", "Lures", "Spear, net and bow", "Rods and line"]), "grouped like a shelf: " + groups().join(" · "));
  const net = item("Cast net"), shrimp = item("Live shrimp");
  ok(/🐟 20 fish/.test(net.textContent) && /mostly mullet/.test(net.textContent), "cast net counts its fish (20 mullet)");
  ok(/🐟 1 fish/.test(item("Pole spear").textContent) && /📏 16\.0″ avg/.test(item("Pole spear").textContent), "pole spear counts fish and length");
  ok(/Not used on a logged catch yet/.test(item("Bowfishing rig").textContent), "unused bow says so");
  ok(/Gear/.test(item("spinning rod").textContent) && !/fish/.test(item("spinning rod").querySelector(".tk-stat").textContent), "rod is gear only");
  ok(/🐟 2 fish/.test(shrimp.textContent) && /📏 26\.0″ avg/.test(shrimp.textContent), "bait stats unchanged (2 snook, 26″ avg)");
  ok(!!net.querySelector(".tk-top") && d.querySelectorAll(".tk-top").length === 1, "🏆 Most fish on the one item with the most fish");
  ok(d.querySelectorAll("#tk-list .tk-item").length === 6, "all six items shown");
  // remove is inside ⋯
  const acts = shrimp.querySelector(".tk-acts"), more = shrimp.querySelector(".tk-more");
  ok(acts.hidden && more.getAttribute("aria-expanded") === "false", "remove starts hidden behind ⋯");
  more.click(); ok(!acts.hidden && more.getAttribute("aria-expanded") === "true", "⋯ shows Remove");
  acts.querySelector(".danger").click(); await wait(20);
  ok(w.__upd.some(u => u.deleted_at) && !item("Live shrimp"), "Remove soft-deletes and the row goes");
  // the add form
  const form = d.getElementById("tk-form"), open = d.getElementById("tk-open");
  ok(form.hidden, "add form starts folded");
  open.click(); ok(!form.hidden && open.getAttribute("aria-expanded") === "true", "+ Add tackle opens it");
  const kinds = [...d.querySelectorAll("#tk-kinds .tk-kind")];
  ok(kinds.map(b => b.dataset.kind).join(",") === "bait,lure,spear,net,bow,rod,line,other", "eight picture buttons incl. spear, cast net, bow");
  ok(kinds[0].getAttribute("aria-checked") === "true" && d.getElementById("tk-kind").value === "bait", "Bait picked at first");
  kinds.find(b => b.dataset.kind === "bow").click();
  ok(d.getElementById("tk-kind").value === "bow" && kinds.filter(b => b.classList.contains("on")).length === 1, "tapping Bow picks it");
  kinds.find(b => b.dataset.kind === "bow").dispatchEvent(new w.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  ok(d.getElementById("tk-kind").value === "rod", "arrow key moves to the next kind");
  kinds.find(b => b.dataset.kind === "spear").click();
  d.getElementById("tk-name").value = "Hawaiian sling";
  form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); await wait(20);
  ok(w.__ins.some(r => r.name === "Hawaiian sling" && r.kind === "spear"), "form saves the picked kind (spear)");
  ok(!form.hidden && d.getElementById("tk-name").value === "", "form stays open, name cleared for the next one");
  d.getElementById("tk-cancel").click(); ok(form.hidden, "Cancel folds it");
  // suggestion chips guess the kind
  ok(w.tk.tkGuess("8 ft cast net") === "net" && w.tk.tkGuess("speargun") === "spear" && w.tk.tkGuess("bow and arrow") === "bow" && w.tk.tkGuess("rainbow trout bait") === "bait" && w.tk.tkGuess("gold spoon") === "lure", "suggestions guess spear / net / bow / lure / bait");
  ok([...d.querySelectorAll("#tk-sugg .fchip")].some(b => b.textContent === "+ gold spoon"), "unused bait from catches offered");
  // bait suggestions while logging include the new kinds, not rods
  const opts = [...d.querySelectorAll("#bait-list option")].map(o => o.value);
  ok(opts.includes("Cast net") && opts.includes("Bowfishing rig") && !opts.includes("7 ft spinning rod"), "logging suggestions include net/bow, not rods");
  // database rule file + migration list
  const sql = read("setup/91-tackle-kinds.sql");
  ok(/'spear','net','bow'/.test(sql) && /drop constraint if exists tackle_kind_check/.test(sql), "setup/91 widens the kind rule");
  console.log(bad ? "SOME FAILED" : "ALL OK"); process.exit(bad ? 1 : 0);
})();
