// test230: v247–v248 — our own data lists (data/**/*.json: ramps, rules zones, Learn cards) stay on the phone. bump.sh writes a fingerprint per file
// into sw.js (tools/data-versions.js); an app update drops only the files whose fingerprint changed, and nothing is re-checked in the background.
// (v247 dropped every Learn + rules list on each update, so the 5.8 MB rules file came down again each time.)
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const O = "https://rich9267-stack.github.io/fishing-map";
const tick = () => new Promise(r => setTimeout(r, 5));

const swText = read("sw.js"), m = swText.match(/^const DATA_VER = (.*);$/m);
const VER = m && JSON.parse(m[1]);
ok(VER && VER["zones-rules.json"] && VER["learn/knots.json"] && VER["ramps/GA.json"] && Object.values(VER).every(v => /^[0-9a-f]{8}$/.test(v)), "sw.js lists a fingerprint for every data file (" + (VER ? Object.keys(VER).length : 0) + ")");
const crypto = require("crypto");
ok(VER && VER["learn/knots.json"] === crypto.createHash("md5").update(fs.readFileSync(path.join(root, "data/learn/knots.json"))).digest("hex").slice(0, 8), "the fingerprints match the files (run sh bump.sh after changing data)");
ok(/node tools\/data-versions\.js/.test(read("bump.sh")), "bump.sh refreshes the fingerprints");

function boot(ver, stores) {
  const net = [], handlers = {};
  const mkCache = name => (stores[name] = stores[name] || { m: new Map(),
    async match(k, o) { const u = typeof k === "string" ? k : k.url; return this.m.get(o && o.ignoreSearch ? u.split("?")[0] : u) || (o && o.ignoreSearch ? undefined : undefined); },
    async put(k, r) { this.m.set(typeof k === "string" ? k : k.url, r); },
    async keys() { return [...this.m.keys()].map(url => ({ url: url.startsWith("./") ? O + url.slice(1) : url })); },
    async delete(k) { const u = typeof k === "string" ? k : k.url; return this.m.delete(u) || this.m.delete(u.replace(O, ".")); }, async addAll() {} });
  const caches = { open: async n => mkCache(n), keys: async () => Object.keys(stores), delete: async n => delete stores[n], match: async () => undefined };
  const resp = body => ({ ok: true, status: 200, body, clone() { return resp(body); }, json: async () => JSON.parse(body) });
  const sw = {
    console, URL, Promise, caches, location: { origin: "https://rich9267-stack.github.io" }, clients: { claim: async () => {} }, skipWaiting: () => {},
    addEventListener: (t, f) => { handlers[t] = f; }, registration: {},
    Response: function (body) { return resp(body); },
    fetch: async u => { const url = typeof u === "string" ? u : u.url; net.push(url); return resp("new:" + new URL(url).pathname); }
  };
  sw.self = sw;
  vm.createContext(sw); vm.runInContext(swText.replace(/^const DATA_VER = .*;$/m, "const DATA_VER = " + JSON.stringify(ver) + ";"), sw);
  const get = async url => { let p = null; handlers.fetch({ request: { url, method: "GET", mode: "cors" }, respondWith: x => { p = x; } }); return p ? await p : "not handled"; };
  const activate = async () => { let w = null; handlers.activate({ waitUntil: p => { w = p; } }); await w; };
  return { net, get, activate, mkCache };
}

(async () => {
  const stores = {};
  const v1 = { "learn/knots.json": "aaaa0001", "zones-rules.json": "bbbb0001", "ramps/GA.json": "cccc0001" };
  let a = boot(v1, stores);
  await a.activate();
  ok((await a.get(O + "/data/learn/knots.json")).body === "new:/fishing-map/data/learn/knots.json" && a.net.length === 1, "first time: the knot list is downloaded");
  await tick();
  ok((await a.get(O + "/data/learn/knots.json")).body === "new:/fishing-map/data/learn/knots.json" && a.net.length === 1, "next time: from the phone, nothing downloaded (no background re-check)");
  await a.get(O + "/data/zones-rules.json"); await a.get(O + "/data/ramps/GA.json"); await tick();
  ok(a.net.length === 3, "the rules zones and a ramp list are downloaded once too");
  stores["fishing-map-photos"] = a.mkCache("fishing-map-photos"); stores["fishing-map-photos"].m.set("p1", "photo");

  // an update where only the knot list changed
  const b = boot(Object.assign({}, v1, { "learn/knots.json": "aaaa0002" }), stores);
  await b.activate();
  await b.get(O + "/data/learn/knots.json"); await b.get(O + "/data/zones-rules.json"); await b.get(O + "/data/ramps/GA.json"); await tick();
  ok(b.net.length === 1 && /knots/.test(b.net[0]), "after an update that changed only the knot list, only that file is downloaded again (not the 5.8 MB rules file): " + b.net.join(", "));
  ok(stores["fishing-map-photos"].m.size === 1, "saved photos are kept across the update");

  // an update with no data change
  const c = boot(Object.assign({}, v1, { "learn/knots.json": "aaaa0002" }), stores);
  await c.activate();
  await c.get(O + "/data/learn/knots.json"); await c.get(O + "/data/zones-rules.json"); await tick();
  ok(c.net.length === 0, "an update with no data change downloads nothing");

  // a file the fingerprint list doesn't know is not kept forever
  stores["fishing-map-data"].m.set(O + "/data/learn/old.json", "x");
  const d = boot(Object.assign({}, v1, { "learn/knots.json": "aaaa0002" }), stores);
  await d.activate();
  ok(!stores["fishing-map-data"].m.has(O + "/data/learn/old.json"), "a saved file that is no longer listed is dropped");
  ok(/v248/.test(read("docs/build_history.md")), "build history has v248");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
