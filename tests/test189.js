// test189: state ramp lists saved in the app's own files (data/ramps/<ST>.json, made by tools/make-ramp-snapshots.js) are read first by js/61;
// the live agency server is only asked when a state's file can't be read. Files are checked as they are on disk.
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const src61 = read("js/61-state-ramps.js");
let live = [], snapCalls = [], files = {}, stateAt = () => "GA";
const store = {};
const c = { console, Math, isFinite, Array, Object, Set, Promise, Date, JSON, RegExp, String, Number, URLSearchParams, parseInt, setTimeout,
  stateOf: (la, ln) => stateAt(la, ln), localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
  fetch: async url => {
    const m = /data\/ramps\/([A-Z]{2})\.json/.exec(url);
    if (m) { snapCalls.push(m[1]); if (files[m[1]] === "throw") throw new Error("offline"); return files[m[1]] ? { ok: true, json: async () => files[m[1]] } : { ok: false, status: 404 }; }
    live.push(url); return { ok: true, json: async () => ({ features: [{ attributes: { Name: "Live Ramp", Draw: "Public", Status: "Open", Ramp: "Y" }, geometry: { x: -83.5, y: 33.5 } }] }) };
  } };
vm.createContext(c);
vm.runInContext(src61 + "\nthis.api = { STATE_RAMPS, stLoad, stItems, outsideItems, STR };", c);
const S = c.api;
const bounds = (s, w, n, e) => ({ getSouth: () => s, getWest: () => w, getNorth: () => n, getEast: () => e });

(async () => {
  files.GA = { t: "2026-10-22", items: [{ n: "Lake Lanier Ramp", la: 33.52, ln: -83.52, c: "Hall", d: { lanes: 3, owner: "COE" } }, { n: "Carry-in", la: 33.55, ln: -83.55, k: "ramp", d: { type: "Hand launch" } }, { n: "Lake Lanier Ramp", la: 33.52, ln: -83.52 }] };
  let changed = await S.stLoad(bounds(33.4, -83.7, 33.6, -83.4));
  ok(changed === true && snapCalls.join() === "GA" && live.length === 0, "a Georgia view reads Georgia's saved list and does not ask the agency's server");
  const it = S.stItems();
  ok(it.length === 2 && it[0].name === "Lake Lanier Ramp" && it[0].source === "state-ramp" && it[0].trust === "official" && it[0].credit === S.STATE_RAMPS.GA.credit && it[0].state === "GA" && it[0].county === "Hall" && it[0].details.lanes === 3 && it[0].id === null, "places are shaped like live ones (credit, county, card facts); a repeat is counted once");
  ok(it[1].details.type === "Hand launch" && it[1].kind === "ramp", "hand-launch flag and kind survive");
  snapCalls = [];
  changed = await S.stLoad(bounds(33.45, -83.65, 33.55, -83.45));
  ok(changed === false && snapCalls.length === 0 && live.length === 0, "panning in the same state asks for nothing more");
  // a state whose file is missing falls back to the live server
  stateAt = () => "SC"; changed = await S.stLoad(bounds(33.4, -83.7, 33.6, -83.4));
  ok(changed === true && live.length === 1 && live[0].startsWith(S.STATE_RAMPS.SC.url + "/query?"), "no saved list for South Carolina: its live server is asked (as in v176)");
  // offline / broken file
  stateAt = () => "NC"; files.NC = "throw"; live = [];
  await S.stLoad(bounds(35.0, -80.0, 35.2, -79.8));
  ok(live.length === 1 && live[0].startsWith(S.STATE_RAMPS.NC.url + "/query?"), "a saved list that can't be read falls back to the live server");
  stateAt = () => "TX"; files.TX = { items: "nope" }; live = [];
  await S.stLoad(bounds(30.0, -97.0, 30.2, -96.8));
  ok(live.length === 1 && live[0].startsWith(S.STATE_RAMPS.TX.url + "/query?"), "a broken saved list also falls back");
  stateAt = () => "FL"; snapCalls = [];
  ok(await S.stLoad(bounds(26.0, -80.3, 26.3, -80.0)) === false && snapCalls.length === 0, "Florida asks nothing (Florida keeps its own lists)");

  // the files on disk
  const dir = path.join(root, "data", "ramps"), names = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^[A-Z]{2}\.json$/.test(f)) : [];
  const want = Object.keys(S.STATE_RAMPS);
  ok(names.length === want.length && want.every(s => names.includes(s + ".json")), "a saved list exists for each of the " + want.length + " states");
  let good = true, why = "", total = 0;
  names.forEach(f => {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      if (!j.t || !Array.isArray(j.items) || !j.items.length) { good = false; why = f + " empty"; return; }
      j.items.forEach(r => { total++; if (!r.n || !isFinite(r.la) || !isFinite(r.ln) || r.la < 24 || r.la > 50 || r.ln > -66 || r.ln < -125) { good = false; why = f + " " + JSON.stringify(r).slice(0, 80); } });
    } catch (e) { good = false; why = f + " " + e.message; }
  });
  ok(good && total > 15000, "every file is valid (name + place inside the USA): " + total + " places" + (why ? " — " + why : ""));
  const sw = read("sw.js"), s61 = src61;
  ok(/data\\\/ramps\\\//.test(sw) &&/DATA_CACHE/.test(sw) && /k !== DATA_CACHE/.test(sw), "sw.js keeps the saved lists on the phone (and keeps them across updates)");
  ok(fs.existsSync(path.join(root, "tools", "make-ramp-snapshots.js")), "the list-making script is in the project (tools/)");
  ok(/hist/.test("hist") && /v177/.test(read("docs/build_history.md")), "build history has v177");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK");
  process.exit(bad ? 1 : 0);
})();
