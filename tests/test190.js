// test190: ℹ️ "special fishing rules may apply" chip for spots inside restricted-but-not-banned areas (js/33 + data/zones-rules/; split by state in v262)
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const solid = JSON.parse(fs.readFileSync(path.join(__dirname, "protected-zones.json"), "utf8"));
const zdir = path.join(root, "data", "zones-rules");
const idx = JSON.parse(read("data/zones-rules/index.json"));
const parts = {}; fs.readdirSync(zdir).filter(f => f !== "index.json").forEach(f => { parts[f.replace(".json", "")] = JSON.parse(read("data/zones-rules/" + f)); });
const file = { items: [].concat(...Object.values(parts).map(p => p.items)) };
const asked = [];
const mk = (tag, cls, text) => ({ tag, className: cls || "", textContent: text || "", children: [], attrs: {}, hidden: false, handlers: {},
  appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; } });
const store = {}; let fetched = 0, fileMode = "ok";
const ctx = { console, Date, JSON, Math, isFinite, Array, Object, Promise, setTimeout, $: () => null, el: mk, me: { id: "u1" }, fmtDist: mi => mi.toFixed(1) + " mi",
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
  db: { from: () => ({ select: () => ({ limit: async () => ({ data: solid, error: null }) }) }) }, boat: { pos: null }, qc: { pos: null },
  fetch: async url => { fetched++; asked.push(url); if (fileMode !== "ok") return { ok: false, status: 404 };
    const m = /zones-rules\/(\w+)\.json$/.exec(url); const body = m && m[1] === "index" ? idx : m ? parts[m[1]] : null;
    return body ? { ok: true, json: async () => body } : { ok: false, status: 404 }; } };
vm.createContext(ctx);
vm.runInContext(read("js/33-zones.js") + "\nthis.api = { zoneAt, znLine, znDetails, zoneChip, zonesEnsure, zn, zr };", ctx);
const A = ctx.api;
A.zn.read = true; A.zn.rows = solid; A.zn.t = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  ok(file.items.length > 200 && file.items.every(o => o.n && o.f && /recreational fishing (restricted|prohibited)/i.test(o.f) && o.g && o.b.length === 4), "the file holds " + file.items.length + " areas, each with a name, a rule for anglers and a shape");
  ok(!file.items.some(o => /^(no take|no access)$/i.test(o.p || "")), "no-take / no-access areas are not in it (they are the solid red ones)");
  ok(A.zoneAt(25.24386, -80.16838).rules === null, "before the file is read: no soft answer");
  A.zonesEnsure(); await sleep(50);
  ok(fetched === 1 && asked[0] === "data/zones-rules/index.json" && A.zr.idx && !A.zr.rows.length, "first only the small index is read (" + JSON.stringify(idx).length + " bytes)");
  ok(A.zoneAt(26.24, -80.12).rules === null && fetched === 1, "a Pompano spot (no area box around it): no state file downloaded");
  A.zoneAt(25.24386, -80.16838); await sleep(50);
  ok(fetched === 2 && asked[1] === "data/zones-rules/FL.json" && A.zr.files.FL && A.zr.rows.length === parts.FL.items.length, "a Keys spot: only Florida's file is downloaded");
  A.zoneAt(25.24386, -80.16838); A.zoneAt(25.3, -80.2); await sleep(50);
  ok(fetched === 2, "…once (not again for the next spots)");
  const h = A.zoneAt(25.24386, -80.16838);
  ok(h.inside === null && h.rules && /Florida Keys National Marine Sanctuary/.test(h.rules.name), "the spot inside the Florida Keys sanctuary gets the soft answer");
  ok(/^ℹ️ .*special fishing rules may apply/.test(A.znLine(h)), "its line: " + A.znLine(h));
  const chip = A.zoneChip({ id: "t", lat: 25.24386, lng: -80.16838 });
  ok(chip && chip.children[0].className.indexOf(" in") < 0 && /ℹ️/.test(chip.children[0].textContent), "the spot card gets an ℹ️ chip (not the red 'in' style)");
  const more = A.znDetails(h.rules);
  ok(more.children.some(c => /Special fishing rules may apply/.test(c.textContent)) && !more.children.some(c => /No fishing: commercial/.test(c.textContent)), "the details say 'may apply', not 'no fishing'");
  // a no-fishing area wins over a soft one
  const red = solid.find(r => r.level === "no_fishing" && /Carysfort|Elbow|Dry Tortugas/.test(r.name)) || solid.find(r => r.level === "no_fishing"), c0 = { lat: (red.min_lat + red.max_lat) / 2, lng: (red.min_lng + red.max_lng) / 2 };
  let found = null; for (let i = 1; i < 40 && !found; i++) for (let j = 1; j < 40 && !found; j++) { const lat = red.min_lat + (red.max_lat - red.min_lat) * i / 40, lng = red.min_lng + (red.max_lng - red.min_lng) * j / 40; if (A.zoneAt(lat, lng).inside) found = { lat, lng }; }
  ok(found && A.zoneAt(found.lat, found.lng).inside.level === "no_fishing" && A.zoneAt(found.lat, found.lng).rules === null, "inside a no-fishing area: the red warning only, no soft chip");
  ok(A.zoneAt(26.24, -80.12).rules === null && A.zoneChip({ id: "p", lat: 26.24, lng: -80.12 }) === null, "Pompano Beach (no area): nothing");
  ok(A.zoneChip({ id: "b", lat: 25.24386, lng: -80.16838, is_exact: false }) === null, "approximate pins get no chip");
  // file missing: quiet, asked again later
  // the split files: every area in exactly one file, every file in the index, boxes match, old single file gone
  ok(Object.keys(idx.files).sort().join() === Object.keys(parts).sort().join() && Object.keys(parts).every(f => parts[f].items.every(o => idx.files[f].some(b => b[0] <= o.b[2] && b[2] >= o.b[0] && b[1] <= o.b[3] && b[3] >= o.b[1]))), "index.json lists every state file with each area's box (" + Object.keys(parts).length + " files)");
  ok(file.items.length === new Set(file.items.map(o => o.n + JSON.stringify(o.b))).size && !fs.existsSync(path.join(root, "data", "zones-rules.json")), "each area is in one file only; the old 5.8 MB file is gone");
  ok(parts.FL.items.length > 50 && fs.statSync(path.join(zdir, "FL.json")).size < 600000, "Florida's file is small (" + Math.round(fs.statSync(path.join(zdir, "FL.json")).size / 1000) + " KB)");
  ok(Object.values(idx.files).every(l => l.every(b => b[3] - b[1] < 180)), "no index box goes round the whole world (areas across the 180° line get two boxes)");
  // a Washington spot fetches Washington's file
  const wa = parts.WA.items[0], wlat = (wa.b[0] + wa.b[2]) / 2, wlng = (wa.b[1] + wa.b[3]) / 2;
  A.zoneAt(wlat, wlng); await sleep(50);
  ok(asked.includes("data/zones-rules/WA.json") && !asked.includes("data/zones-rules/AK.json"), "a Washington spot downloads Washington's file (not Alaska's 2.9 MB)");
  // files can't be read: quiet, asked again later
  const ZR = A.zr; ZR.idx = null; ZR.rows = []; ZR.files = {}; fileMode = "404"; ZR.failAt = 0; A.zonesEnsure(); await sleep(50);
  ok(!ZR.idx && ZR.failAt > 0 && A.zoneAt(25.24386, -80.16838).rules === null, "if the index can't be read nothing breaks (retry in 5 minutes)");
  ZR.idx = idx.files; A.zoneAt(25.24386, -80.16838); await sleep(50);
  ok(!ZR.files.FL && ZR.fileFail.FL > 0 && A.zoneAt(25.24386, -80.16838).rules === null, "if a state file can't be read nothing breaks");
  const n0 = fetched; A.zoneAt(25.24386, -80.16838); await sleep(50);
  ok(fetched === n0, "…and it isn't asked again straight away (5 minutes)");
  const sw = read("sw.js");
  ok(/zones-rules/.test(sw), "sw.js keeps the file on the phone");
  ok(/v178/.test(read("docs/build_history.md")), "build history has v178");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
