// test134: (1) pulling down inside a full-screen page (Weather, tides & moon) or a scrolled box must NOT refresh the app;
//          (2) the pressure trend shows up even when a weather station skips readings, or when the first station has too few.
// Runs the app's REAL pull-to-refresh and loadPressure code against fakes.
process.env.TZ = process.env.TZ || "America/New_York";
const fs = require("fs");
const path = require("path");
const read = f => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
const S01 = read("01-core.js"), S13 = read("13-groups-misc.js");
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) pass++; else { fail++; console.log("FAIL", name); } };

function fn(src, name) {
  const m = new RegExp("^ *(async )?function " + name + "\\(", "m").exec(src);
  if (!m) throw new Error("cannot find function " + name);
  let i = src.indexOf("{", m.index), depth = 0;
  for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}") { depth--; if (!depth) break; } }
  return src.slice(m.index, i + 1);
}

// ---------- (1) pull to refresh ----------
function runPull(touch) {
  const s = S13.indexOf("(function pullToRefresh() {");
  const e = S13.indexOf("\n  })();", s) + 8;
  const code = S13.slice(s, e);
  const els = {};
  const el = id => els[id] || (els[id] = { style: {}, textContent: "", classList: { add() {}, remove() {}, toggle() {} } });
  const handlers = {};
  const document = { body: { id: "body" }, documentElement: {}, addEventListener: (t, f) => { handlers[t] = f; } };
  const window = { scrollY: touch.pageScroll || 0 };
  let reloaded = 0;
  const $ = el, busy = () => false, refreshApp = () => { reloaded++; };
  new Function("document", "window", "$", "busy", "refreshApp", code)(document, window, $, busy, refreshApp);
  // build a target with a chain of parents
  const chain = touch.chain || [];
  let parent = document.body;
  for (let i = chain.length - 1; i >= 0; i--) parent = { scrollTop: chain[i], parentElement: parent };
  const target = Object.assign(parent === document.body ? { scrollTop: 0, parentElement: document.body } : parent, {
    closest: sel => (touch.inSheet && sel.includes("#cond-more.as-sheet")) ? {} : null,
  });
  handlers.touchstart({ target, touches: [{ clientY: 100 }] });
  handlers.touchmove({ touches: [{ clientY: 100 + touch.pull }] });
  handlers.touchend();
  return reloaded;
}
check("plain page, long pull refreshes", runPull({ pull: 150 }) === 1);
check("plain page, short pull does not", runPull({ pull: 40 }) === 0);
check("inside the weather page, long pull does NOT refresh", runPull({ pull: 150, inSheet: true }) === 0);
check("inside a box that is scrolled down, pull does NOT refresh", runPull({ pull: 150, chain: [0, 220] }) === 0);
check("inside a box at its very top, pull still refreshes", runPull({ pull: 150, chain: [0, 0] }) === 1);
check("page scrolled down, pull does NOT refresh", runPull({ pull: 150, pageScroll: 300 }) === 0);

// ---------- (2) pressure trend ----------
async function runPressure(stations) {
  const out = { textContent: "" };
  const cond = {};
  const now = Date.now(), H = 3600000;
  const pa = inHg => inHg * 3386.39;
  const getJson = async url => {
    const st = /stations\/(\w+)\/observations/.exec(url)[1];
    const list = stations[st] || [];
    return { features: list.map(([hoursAgo, inHg]) => ({ properties: { timestamp: new Date(now - hoursAgo * H).toISOString(), barometricPressure: { value: inHg == null ? null : pa(inHg) } } })) };
  };
  const code = fn(S01, "loadPressure");
  const $ = () => out;
  const pressureStationsNow = async () => ["KPMP", "KFLL"];
  const refreshConditions = () => {};
  await new Function("cond", "getJson", "$", "pressureStationsNow", "refreshConditions", code + "; return loadPressure();")(cond, getJson, $, pressureStationsNow, refreshConditions);
  return { cond, text: out.textContent };
}
(async () => {
  let r = await runPressure({ KPMP: [[0.2, 30.00], [1, 30.01], [2, 30.03], [3, 30.06], [4, 30.08]] });
  check("normal station: falling trend", r.cond.pressureTrend === "falling" && /falling/.test(r.text));

  r = await runPressure({ KPMP: [[0.2, 30.10], [1, 30.07], [2.9, 30.02], [4, 30.00]] });
  check("rising trend", r.cond.pressureTrend === "rising");

  r = await runPressure({ KPMP: [[0.2, 30.00], [3, 30.01]] });
  check("steady trend", r.cond.pressureTrend === "steady");

  // station skips readings: nothing between 2 and 4 hours back, only a reading 5 hours back
  r = await runPressure({ KPMP: [[0.2, 30.00], [1, 30.01], [5, 30.12]] });
  check("sparse station still gives a trend (5 h back, scaled to 3 h)", r.cond.pressureTrend === "falling");

  // first station has no old reading at all; backup station does
  r = await runPressure({ KPMP: [[0.2, 30.00], [0.5, 30.00]], KFLL: [[0.3, 29.99], [3, 30.05]] });
  check("first station has no trend: backup station supplies one", r.cond.pressureTrend === "falling" && Math.abs(r.cond.pressure - 29.99) < 0.006);

  // nobody can give a trend: still show the pressure, just no arrow
  r = await runPressure({ KPMP: [[0.2, 30.00]], KFLL: [[0.4, 30.01]] });
  check("no trend anywhere: shows pressure without an arrow", r.cond.pressureTrend === null && r.cond.pressure === 30 && !/rising|falling|steady/.test(r.text));

  // nothing at all
  r = await runPressure({});
  check("no data: friendly message", /not available/.test(r.text));

  console.log(`test134: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
