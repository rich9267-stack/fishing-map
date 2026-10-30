// test230: v247 — an app update drops the phone's saved copies of our own Learn / rules lists (so new knot + rig pictures show at once),
// but keeps the state ramp lists and the photos. Before, the old knots.json was shown first and the new one only on the next open.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };
const O = "https://rich9267-stack.github.io/fishing-map";

(async () => {
  const stores = {}, net = [], handlers = {};
  const mkCache = name => (stores[name] = stores[name] || { m: new Map(),
    async match(k) { return this.m.get(typeof k === "string" ? k : k.url); }, async put(k, r) { this.m.set(typeof k === "string" ? k : k.url, r); },
    async keys() { return [...this.m.keys()].map(url => ({ url })); }, async delete(k) { return this.m.delete(typeof k === "string" ? k : k.url); }, async addAll() {} });
  const caches = { open: async n => mkCache(n), keys: async () => Object.keys(stores), delete: async n => delete stores[n], match: async () => undefined };
  const resp = body => ({ ok: true, status: 200, body, clone() { return resp(body); } });
  const sw = {
    console, URL, Promise, caches, location: { origin: "https://rich9267-stack.github.io" }, clients: { claim: async () => {} }, skipWaiting: () => {},
    addEventListener: (t, f) => { handlers[t] = f; }, registration: {},
    fetch: async u => { const url = typeof u === "string" ? u : u.url; net.push(url); return resp("new:" + new URL(url).pathname); }
  };
  sw.self = sw;
  vm.createContext(sw); vm.runInContext(read("sw.js"), sw);
  const get = async url => { let p = null; handlers.fetch({ request: { url, method: "GET", mode: "cors" }, respondWith: x => { p = x; } }); return p ? await p : "not handled"; };

  const data = mkCache("fishing-map-data");
  ["learn/knots", "learn/rigs", "learn/fish", "learn/bait", "learn/fish-pictures", "zones-rules", "ramps/GA"].forEach(f => data.m.set(O + "/data/" + f + ".json", resp("old")));
  ok((await get(O + "/data/learn/knots.json")).body === "old", "before an update: the saved knot list is shown first (the old behaviour)");
  await new Promise(r => setTimeout(r, 5));
  data.m.set(O + "/data/learn/knots.json", resp("old"));
  stores["fishing-map-v1"] = mkCache("fishing-map-v1"); mkCache("fishing-map-photos").m.set("p1", resp("photo"));
  let w = null; handlers.activate({ waitUntil: p => { w = p; } }); await w;
  const left = [...data.m.keys()].map(u => u.replace(O + "/data/", ""));
  ok(left.length === 1 && left[0] === "ramps/GA.json", "an app update drops the saved Learn and rules lists, keeps the ramp list: " + left.join(", "));
  ok(stores["fishing-map-photos"].m.size === 1 && !stores["fishing-map-v1"], "photos are kept, the old app copy goes");
  net.length = 0;
  ok((await get(O + "/data/learn/knots.json")).body === "new:/fishing-map/data/learn/knots.json" && net.length === 1, "after the update the knot list comes fresh from the site");
  await new Promise(r => setTimeout(r, 5));
  ok((await get(O + "/data/learn/knots.json")).body === "new:/fishing-map/data/learn/knots.json", "…and is saved again for offline use");
  ok((await get(O + "/data/ramps/GA.json")).body === "old", "the ramp list is still shown from the phone at once");
  ok(/v247/.test(read("docs/build_history.md")), "build history has v247");
  console.log(bad ? `\n${bad} FAILED` : "\nALL OK"); process.exit(bad ? 1 : 0);
})();
