// 🎨 Free color palettes (v112): js/35-palettes.js + css/app.css + setup/70
const fs = require("fs"), path = require("path");
const { JSDOM } = require("jsdom");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const KEYS = ["deepsea", "bluefin", "seagrass", "mangrove", "basslake", "mahi", "sunrise", "redfish", "snapper", "reef", "dusk", "sandbar", "tarpon", "storm", "nightbite", "midnight"];
const NAMES = ["Deep Sea", "Bluefin", "Seagrass", "Mangrove", "Bass Lake", "Mahi", "Sunrise", "Redfish", "Snapper Red", "Coral Reef", "Dusk Bite", "Sandbar", "Tarpon Silver", "Storm Front", "Night Bite", "Midnight Tide"];

function boot(stored, dbRow, dbFail) {
  const dom = new JSDOM(`<html><body><small id="me-pal-name">Original</small><div id="pal-grid"></div><div id="pal-msg"></div></body></html>`, { runScripts: "outside-only", url: "https://x.test/" });
  const w = dom.window;
  if (stored) w.localStorage.setItem("fm-palette", stored);
  const saved = [];
  w.$ = id => w.document.getElementById(id);
  w.me = { id: "u-rich" };
  w.bootTake = (k, q) => q();   // v249: no app_start in this test
  w.db = { from: t => ({
    upsert: async (row, opt) => { saved.push([t, row, opt]); return { error: dbFail ? { message: "offline" } : null }; },
    select: () => ({ eq: () => ({ maybeSingle: async () => dbFail ? { data: null, error: { message: "x" } } : { data: dbRow, error: null } }) })
  }) };
  // the early bit from js/01 (runs before everything else)
  const one = read("js/01-core.js"); const a = one.indexOf("// ---- 🎨 Color palette"); const b = one.indexOf("// ---- 🐞 Error log");
  w.eval(one.slice(a, b));
  const early = w.document.documentElement.dataset.pal || null;
  w.eval(read("js/35-palettes.js") + "\nwindow.palLoadMine = palLoadMine; window.PALS = PALETTES;");
  return { w, saved, early, root: w.document.documentElement, grid: w.document.getElementById("pal-grid") };
}
const tick = () => new Promise(r => setTimeout(r, 0));

(async () => {
  // fresh phone
  let t = boot(null, null);
  const btns = [...t.grid.querySelectorAll(".pal-it")];
  ok(btns.length === 17, "17 choices: Original + 16 free palettes (got " + btns.length + ")");
  ok(btns.map(b => b.dataset.pal).join() === ["original"].concat(KEYS).join(), "in the canvas order");
  ok(btns.slice(1).map(b => b.querySelector(".pal-nm").firstChild.textContent).join() === NAMES.join(), "with the right names");
  ok(!t.root.dataset.pal && btns[0].getAttribute("aria-checked") === "true", "nothing chosen = Original colors, Original ticked");
  ok(!/cowboy|southern|florida|northeast|midwest/i.test(t.grid.textContent + read("js/35-palettes.js").replace(/\/\/.*$/gm, "")), "no locked style-pack tiles in the app");
  ok(t.grid.getAttribute === undefined || btns.every(b => b.getAttribute("role") === "radio"), "screen readers hear radio buttons");

  // pick Mahi
  t.grid.querySelector('[data-pal="mahi"]').click(); await tick();
  ok(t.root.dataset.pal === "mahi" && !t.root.dataset.palDark, "tap Mahi: colors switch");
  ok(t.w.localStorage.getItem("fm-palette") === "mahi", "remembered on this phone");
  ok(t.saved.length === 1 && t.saved[0][0] === "app_prefs" && t.saved[0][1].palette === "mahi" && t.saved[0][1].user_id === "u-rich", "saved to the account");
  ok(/Saved/.test(t.w.document.getElementById("pal-msg").textContent), "says it's saved");
  ok(t.w.document.getElementById("me-pal-name").textContent === "Mahi", "Me page shows the name");
  ok(t.grid.querySelector('[data-pal="mahi"]').getAttribute("aria-checked") === "true" && t.grid.querySelectorAll('[aria-checked="true"]').length === 1, "only Mahi is ticked");

  // dark palette
  t.grid.querySelector('[data-pal="nightbite"]').click(); await tick();
  ok(t.root.dataset.pal === "nightbite" && t.root.dataset.palDark === "1", "Night Bite turns on the dark extras");
  t.grid.querySelector('[data-pal="original"]').click(); await tick();
  ok(!t.root.dataset.pal && !t.root.dataset.palDark, "back to Original removes it all");

  // a phone that already picked one: on before the rest of the page loads
  t = boot("midnight", null);
  ok(t.early === "midnight" && t.root.dataset.palDark === "1", "this phone's last choice is put on straight away");
  await t.w.palLoadMine(); await tick();
  ok(t.saved.length === 1 && t.saved[0][1].palette === "midnight", "first time on the account: the phone's choice is saved up");

  // another device chose something else
  t = boot("mahi", { palette: "reef" });
  await t.w.palLoadMine();
  ok(t.root.dataset.pal === "reef" && t.w.localStorage.getItem("fm-palette") === "reef" && t.saved.length === 0, "account choice wins on sign-in (Coral Reef from another phone)");

  // offline
  t = boot(null, null, true);
  t.grid.querySelector('[data-pal="storm"]').click(); await tick();
  ok(t.root.dataset.pal === "storm" && /this phone/.test(t.w.document.getElementById("pal-msg").textContent), "offline: still changes, says saved on this phone");
  await t.w.palLoadMine();
  ok(t.root.dataset.pal === "storm", "a failed account load keeps this phone's choice");

  // junk in storage
  t = boot("<script>", null);
  ok(!t.root.dataset.pal, "junk saved value is ignored");

  // the colors exist for every palette
  const css = read("css/app.css");
  KEYS.forEach(k => { if (!new RegExp(':root\\[data-pal="' + k + '"\\] \\{[^}]*--accent: #[0-9A-Fa-f]{6}').test(css)) ok(false, "CSS colors for " + k); });
  ok(KEYS.every(k => css.includes(':root[data-pal="' + k + '"]')), "every palette has colors in app.css");
  const darkBlock = css.slice(css.indexOf("@media (prefers-color-scheme: dark) {\n    :root[data-pal="));
  ok(KEYS.slice(0, 14).every(k => darkBlock.includes(':root[data-pal="' + k + '"] { --accent:')), "light palettes have a dark-mode version");
  ok(/:root\[data-pal="nightbite"\] \{ color-scheme: dark; --bg: #0F1418/.test(css) && /:root\[data-pal="midnight"\] \{ color-scheme: dark; --bg: #0B1220/.test(css), "Night Bite and Midnight Tide are always dark (canvas colors)");
  ok(/:root\[data-pal="deepsea"\] \{ --accent: #13507A;/.test(css) && /:root\[data-pal="mahi"\] \{ --accent: #1D7A4A;/.test(css), "accent colors match the design canvas");
  ok(/#bnav \{ background: var\(--nav-bg, var\(--card\)\)/.test(css), "bottom bar takes the palette, default unchanged");

  // wiring
  const html = read("index.html"), sw = read("sw.js"), sql = read("setup/70-color-palettes.sql");
  ok(/js\/35-palettes\.js/.test(html) && /js\/35-palettes\.js/.test(sw), "file loaded and cached offline");
  ok(/data-me="look"/.test(html) && /data-sec="look"/.test(html) && /id="pal-grid"/.test(html), "Me → Look → Colors section");
  ok(/look: "🎨 Colors"/.test(read("js/27-me-find.js")) && /data-show="look"\] \.me-sec\[data-sec="look"\]/.test(css), "Me page opens the Colors section");
  ok(/palLoadMine\(\)/.test(read("js/11-accounts-social.js")), "loads your saved choice when you sign in");
  ok(KEYS.every(k => sql.includes("'" + k + "'")) && /'original'/.test(sql) && /user_id = auth\.uid\(\)/.test(sql), "database accepts exactly these keys, own row only (setup/70)");
  console.log(bad ? "\n" + bad + " FAILED" : "\nall passed"); process.exit(bad ? 1 : 0);
})();
