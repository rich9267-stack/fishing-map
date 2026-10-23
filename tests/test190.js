// test190: ℹ️ "special fishing rules may apply" chip for spots inside restricted-but-not-banned areas (js/33 + data/zones-rules.json)
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const solid = JSON.parse(fs.readFileSync(path.join(__dirname, "protected-zones.json"), "utf8"));
const file = JSON.parse(read("data/zones-rules.json"));
const mk = (tag, cls, text) => ({ tag, className: cls || "", textContent: text || "", children: [], attrs: {}, hidden: false, handlers: {},
  appendChild(c) { this.children.push(c); return c; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; } });
const store = {}; let fetched = 0, fileMode = "ok";
const ctx = { console, Date, JSON, Math, isFinite, Array, Object, Promise, setTimeout, $: () => null, el: mk, me: { id: "u1" }, fmtDist: mi => mi.toFixed(1) + " mi",
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } },
  db: { from: () => ({ select: () => ({ limit: async () => ({ data: solid, error: null }) }) }) }, boat: { pos: null }, qc: { pos: null },
  fetch: async url => { fetched++; if (fileMode !== "ok") return { ok: false, status: 404 }; return { ok: true, json: async () => file }; } };
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
  ok(fetched === 1 && A.zr.done && A.zr.rows.length === file.items.length, "the file is read once");
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
  A.zr.done = false; A.zr.rows = []; fileMode = "404"; A.zr.failAt = 0; A.zonesEnsure(); await sleep(50);
  ok(A.zr.done === false && A.zr.failAt > 0 && A.zoneAt(25.24386, -80.16838).rules === null, "if the file can't be read nothing breaks (retry in 5 minutes)");
  const sw = read("sw.js");
  ok(/zones-rules/.test(sw), "sw.js keeps the file on the phone");
  ok(/v178/.test(read("docs/build_history.md")), "build history has v178");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
